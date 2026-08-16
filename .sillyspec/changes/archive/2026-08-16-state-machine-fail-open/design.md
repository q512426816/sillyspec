---
author: qinyi
created_at: 2026-08-16 15:40:35
scale: large
tier: independent
---

# 设计文档（Design）— 状态机 fail-open 组修复（--done 守卫 / auxiliary 只读 / 幽灵变更 / exit code）

## 背景

2026-08-16 五角度自身缺陷审计（docs/sillyspec/self-audit-2026-08-16.md）发现状态机与守卫 4 项 fail-open 缺陷，全部同属「行为语义」类，裁决走完整流程（债单三批次裁决 批次②）：

- **A5** `--done` 阶段产物 gate 失败只打 ❌ 但 exit 0：`src/run/complete.js:328-329` gate 早退 return 不设 `process.exitCode`，实测三次 exit 0。agent/CI/hook 按 exit code 消费即 fail-open（看不到失败）。
- **B6** `--done` 完全绕过阶段转换守卫 + 辅助阶段污染 currentStage：`command.js:903-906` --done 直接进 `completeStep` 不查 `checkTransition`（`stage.js:27-44` 只在 runStage 调）；status/doctor 等 auxiliary 跑一次即写 `progress.currentStage`（`stage.js:128-133` 写库）→ fromStage 变 status 后跳阶段静默放行（`stage-contract.js:810-848` AUXILIARY_STAGES 一律放行）。
- **B7** status/doctor 自称只读实则写库：`command.js:687-712` auxiliary fallback `initChange` 建 default 行 + 落盘 currentStage；与 SKILL「status 只读」矛盾；多 agent 并发 lastActive 互相覆盖。
- **B8** `run brainstorm` 无 --change 在多活跃变更仓静默建幽灵变更：`command.js:717-731` 无条件 initChange。DB 实锤：08-15 一小时内 4 个 `*-new-change-*` 活跃行。
- **8b**（随 B7 覆盖）新项目首跑 auxiliary 即产生幽灵 default 变更：`_ensureChangeDir`（progress.js:227）建空 `changes/default/`。

四者共性强：状态机守卫 fail-open + 幽灵变更/幽灵阶段污染。本变更按方案 B「统一辅助阶段语义」设计修复。

## 设计目标

1. **`--done` 与 `run` 同源守卫**：`--done` 完成阶段前同样执行 `checkTransition(prevStage, stageName)`，未初始化/未合法到达的阶段不可被 --done 静默推进。
2. **辅助阶段不污染主流程状态**：auxiliary 阶段（scan/quick/explore/archive/status/doctor）执行后不写 `progress.currentStage`，主流程当前阶段不被 status/doctor 等查询命令改写。
3. **status/doctor 查询只读**：读模式（无 --fix/--cleanup-remnant --confirm 等显式写 flag）不 initChange、不建 default 变更行、不写 currentStage、不刷新 lastActive。
4. **gate 失败 fail-closed 退出码**：`--done` 阶段产物 gate 失败 → `process.exitCode = 1`（对齐 quick 审计 blocked→exit 1 惯例）。
5. **幽灵变更收敛**：`run brainstorm` 无 --change 仅当无已存在活跃变更时允许 auto-create；多活跃变更仓强制 `--change`（exit 2 引导）。

## 非目标

- **不引入新门控/新命令**（纯减法优先，债单改进原则 1）。
- 不改 `machine-interface.js` 的 gate/derive specBase 分裂（审计 A4，另批裁决）。
- 不改 `docs`/`progress` 未知子命令 exit 0（审计 B10，另批裁决）。
- 不重构 `checkTransition` 契约本身（stage-contract 的 fromStage/toStage 判定逻辑不变，仅补 --done 路径调用）。
- 不为 auxiliary 增加「当前阶段恢复」机制（写前备份写后还原）——方案 B 选「不写」而非「写了再还原」，避免并发下 last-writer-wins 恢复错误。

## 拆分判断

本变更 4 项修复同属状态机 fail-open 类，且 B6/B7 强耦合（--done 转换守卫依赖 currentStage 不被 auxiliary 污染才有意义），拆成独立 quick 会导致中间态仍 fail-open。合并为单一 change 走完整流程。不涉及批量模式（无模板×数据重复结构）。

## 总体方案

**Phase 1 — 常量与分类**（`src/constants.js`）
- 新增 `READONLY_AUXILIARY_STAGES = ['status', 'doctor']`（查询型 auxiliary：无显式写 flag 时零副作用）。
- 复用既有 `AUXILIARY_STAGES`（scan/quick/explore/archive/status/doctor）。

**Phase 2 — currentStage 只归主流程**（`src/run/stage.js`）
- `stage.js:128-133`：仅当 `!AUXILIARY_STAGES.includes(stageName)` 时写 `progress.currentStage = stageName`。
- auxiliary 阶段执行不再改 currentStage；`gates.js:730` 的 auxiliary 重置 `currentStage = ''` 分支保留（幂等，currentStage 本就没被 auxiliary 写过时条件不命中）。

**Phase 3 — --done 同源守卫**（`src/run/command.js`）
- `--done` 分支（`command.js:903-906`）调用 `completeStep` 前补 `checkTransition(progress.currentStage || '', stageName, { fromStageData: progress.stages?.[progress.currentStage] })`，与 `runStage`（`stage.js:35-36`）同源（含 fromStageData 透传，让 scan failed_post_check 门控对 --done 同样生效）；不合法 → 报错 + `--skip-approval` 可绕过（对齐 runStage 行为）。
- auxiliary 的 `--done` 不受影响（checkTransition 对 auxiliary toStage 一律放行）。

**Phase 4 — auxiliary 查询只读**（`src/run/command.js`）
- 只读短路置顶：`READONLY_AUXILIARY_STAGES.includes(stageName)` 且无显式写 flag（progress doctor 的写操作是 `--cleanup-remnant`/`--align-execute-progress` 配 `--confirm`；`--fix` 是 worktree doctor 的 flag 不在此列）时，在 runCommand 流程的 `registerChange`（`command.js:765`）/`ensureStageSteps`（`command.js:871-876`）之前短路：
  - 目标 progress 不存在 → 打印「未找到进度数据（只读查询不建变更）」exit 0（不 initChange、不建 default 行，治 8b）；
  - 目标 progress 存在 → 只读读取展示，不 seed steps、不刷新 lastActive（D-005 零副作用，治多 agent 并发 lastActive 互相覆盖）。
- working auxiliary（scan/quick/explore/archive）保持各自写路径，但 currentStage 写入已被 Phase 2 禁掉。

**Phase 5 — brainstorm 幽灵变更 gating**（`src/run/command.js`）
- `command.js:717-731` brainstorm 无 --change 时：查询已存在活跃变更数，`> 0` → `process.exit(2)` + 引导「--change <名> 指定变更 / 或 change-rename」；`=== 0` → 保留 auto-create（新项目便利）。

**Phase 6 — gate 失败 exit code**（`src/run/complete.js` + `src/run/stage.js` 消费侧）
- 消费侧统一设码：在 `completeStageGates` 的 3 处消费点（`complete.js:328` completeStep / `complete.js:810` continueStep / `stage.js:377` noAI），当返回对象 `stageCompleted === false` 时设 `process.exitCode = 1`。
- 覆盖两条 gate 失败路径：① runStageCompletionGates → `rollbackCompletionAndReturn`（`gates.js:242` 回滚，9 处调用点）；② scan 非平台 failed_post_check 直返（`complete-handlers.js:1228` 返回 `{stageCompleted:false,...}` 不经 rollback）。消费侧 `stageCompleted === false` 统一兜住，避免漏设。
- 用 exitCode 而非 `process.exit(1)`：让回滚/落盘完成后自然退出，保留失败现场。

## 决策与方案选择

完整决策台账见 `decisions.md`（D-001@v1..D-006@v1，D-002/D-005 有 Design Grill 修正 v2）。关键决策：

- **D-001@v1 方案选型**：方案 B「统一辅助阶段语义」（否决方案 A 分点治实例 / 方案 C fail-closed 过强破坏工作流）。
- **D-002@v2 退出码落点**：`completeStageGates` 消费侧 `stageCompleted === false` → `process.exitCode = 1`（v1 落 `rollbackCompletionAndReturn` 漏 scan 非平台 failed_post_check 直返路径，Grill 修正）。
- **D-003@v1 currentStage 语义**：auxiliary 阶段不写 currentStage（选「不写」非「写了再还原」，避免并发 last-writer-wins 恢复错误）。
- **D-004@v1 --done 守卫**：--done 补 checkTransition（含 fromStageData），与 runStage 同源，--skip-approval 可绕过。
- **D-005@v2 查询只读**：READONLY_AUXILIARY_STAGES 置顶短路于 registerChange/ensureStageSteps 之前（v1 只覆盖 !progress 分支，Grill 修正）。
- **D-006@v1 auto-create gating**：brainstorm 无 --change 仅 0 活跃变更仓 auto-create，多活跃变更仓 exit 2 引导。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/constants.js | 新增 READONLY_AUXILIARY_STAGES 常量（status/doctor） |
| 修改 | src/run/stage.js | :128-133 仅非 auxiliary 阶段写 currentStage；:377 noAI 消费点 gate 失败设 exitCode |
| 修改 | src/run/command.js | --done 补 checkTransition（含 fromStageData）；read-only auxiliary 短路（registerChange/ensureStageSteps 之前）；brainstorm auto-create 按活跃变更数 gating |
| 修改 | src/run/complete.js | :328/:810 消费点 gate 失败（stageCompleted===false）设 process.exitCode=1 |
| 修改 | docs/sillyspec/platform-interface-map.md | command.js 增行后 doc-ref-check 锚点行号重校（command.js:874/1032/1082/1090/1257→918/1092/1142/1150/1317 等） |
| 新增 | test/state-machine-guards.test.mjs | 4 项修复回归测试（子进程驱动 CLI 断言 exitCode 等进程级行为） |

无对外字段/接口/DTO/配置键变更（纯内部状态机语义 + 文档锚点重校），文件变更清单无需字段数据流标注。

## 接口定义

内部函数改动，无新公共 API：

- `checkTransition(fromStage, toStage, opts)` —— 已有，本次补 --done 路径调用（含 fromStageData 透传，不改签名）。
- `READONLY_AUXILIARY_STAGES` —— 新常量 `string[]`，`['status', 'doctor']`。
- 无公共 API 变更（exitCode 设在 completeStageGates 消费侧，不改 completeStageGates 签名）。
- 无 CLI 命令新增/删除/改名。

## 生命周期契约表

本变更触及状态机「阶段转换」与「步骤完成」语义（关键词 state transition / complete），契约如下（事件 = CLI 命令）：

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| run &lt;stage&gt;（启动） | agent | CLI/progress DB | stageName、currentStage | checkTransition 校验；非 auxiliary → currentStage=stageName |
| run &lt;stage&gt; --done（完成步骤） | agent | CLI/progress DB | stageName、stepIdx、output | 步骤 completed；末步 → stage completed；gate 失败 → rollback + **exit 1**（本次修复 A5） |
| run &lt;auxiliary&gt; 查询（status/doctor） | agent | CLI/progress DB | stageName | **只读**：不写 currentStage、不 initChange、不刷新 lastActive（本次修复 B6/B7/8b） |
| run brainstorm（无 --change） | agent | CLI/progress DB | — | 0 活跃变更 → auto-create；多活跃变更 → exit 2 引导 --change（本次修复 B8） |

## 数据模型

无 DB schema 变更。`progress.currentStage` 语义收窄为「主流程当前阶段」，auxiliary 不再写入（现有列、表不变）。

## 兼容策略

- **未配置新行为不变**：不涉及新配置项；既有 main-flow 路径（run/--done/--continue）的合法使用不受影响——合法流程中 currentStage 本就指向当前阶段，checkTransition(fromStage===toStage) 放行。
- **回退路径**：若某辅助场景依赖 auxiliary 写 currentStage（execute 前全量回归暴露），可局部放开（working auxiliary 例外清单），不回退整体方案。
- **不改变的 API/表结构**：CLI 命令、progress DB schema、checkTransition 签名均不变。
- **既有测试影响**：`run <stage> --done` 的测试若未先 `run <stage>` 建 currentStage 即直跑 --done，会被新守卫拦（合法收紧）；execute 前全量回归逐一定性。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | --done 加 checkTransition 拦既有测试直跑 `run X --done` 的 setup 路径 | P1 | execute 前全量 npm test 定位受影响用例，逐案定性：合法拦截（测试没建 currentStage）改测试 setup；误伤（合法流程被拦）回调设计 |
| R-02 | archive 属 auxiliary，不写 currentStage 后归档路径（archiveChangeDirectory）依赖 currentStage 处未识别 | P2 | execute 时 grep archive 路径对 currentStage 的读取点，确认归档不依赖 |
| R-03 | doctor --fix/--cleanup-remnant 是写操作，被 Phase 4 只读分支误伤 | P1 | 只读分支仅对「无显式写 flag」生效；--fix/--cleanup-remnant --confirm 显式走写路径 |
| R-04 | machine-interface gate/derive 独立调用 gate（不经 completeStep），exitCode 语义与 --done 不一致 | P2 | 本批不动 machine-interface（A4 另批）；--json 消费方按 envelope status 判，不受 exitCode 影响 |
| R-05 | brainstorm auto-create 判定活跃变更数依赖 progress 查询，平台模式下 specRoot 解析偏差 | P2 | 复用 resolveSpecDir + listChanges（与 progress show 同源）；偏差只影响 gating 判定不崩流程 |

## 自审（Self-Review）

- **Design Grill 修正已并入**（2026-08-16 step7 独立审查子代理）：① A5 落点从 rollbackCompletionAndReturn 内改消费侧 `stageCompleted===false` 统一设码——覆盖 scan 非平台 failed_post_check 直返（complete-handlers.js:1228）这条不经 rollback 的路径；② D-005 只读短路从「!progress 分支」扩展为 registerChange/ensureStageSteps 之前的置顶守卫（已有 progress 的 status/doctor 也不再 seed steps / 刷 lastActive）；③ Phase 3 透传 fromStageData 让 failed_post_check 门控对 --done 生效；④ D-002「10+ 调用点」修正为 9 处。
- **背景/目标/非目标**：覆盖审计 A5/B6/B7/B8/8b 全部锚点，非目标明确排除 A4/B10/machine-interface 与「写了再还原」方案，scope 清晰。
- **生命周期契约表**：state transition / complete 关键词已覆盖，表内事件（run 启动 / --done 完成 / auxiliary 查询 / brainstorm auto-create）各有对应实现（Phase 2/3/4/5）与测试（Phase 6 回归），无遗漏事件。
- **文件变更清单**：4 改 1 新增，均在 cli-entry/runtime 模块边界内；无对外字段变更故无数据流标注需求。
- **兼容策略**：brownfield 回退路径明确（R-01 定性 + R-02 排查），未配置行为不变。
- **风险登记**：5 项风险含等级与应对；R-03（doctor 写操作误伤）设计已用「显式写 flag」区分规避，R-01 已把 scan post-check 路径纳入 A5 覆盖。
- **一致性**：A5 的 exit 1 与 quick 审计 blocked→exit 1（complete-handlers.js:803）同仓惯例对齐；B6/B7 互为依赖已在 Phase 顺序中体现（Phase 2 先于 Phase 3）；8b 随 Phase 4 覆盖。
- **残留疑问**：R-01 的既有测试影响面需 execute 实证（守卫只拦 currentStage 为非前驱主流程阶段或 '' 的 --done，initChange 默认 current_stage='scan' 的测试不受拦）；R-02 archive 依赖经 Grill grep 确认无 currentStage 读取，疑虑基本排除。均留 execute 期复查。
