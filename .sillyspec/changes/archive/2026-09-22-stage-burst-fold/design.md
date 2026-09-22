---
author: qinyi
created_at: 2026-09-23 00:00:10
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-22-stage-burst-fold

## 背景

R5-L 法证账（round5/r5l-forensic-verdict.md）：旧流程（run 族）每变更 42-106 次 CLI 调用，其中步进往返是大头（①CLI 状态机往返 +29.1M token，106 vs 18 次请求对比 OpenSpec）。37 步状态机每步 ≥2 请求（渲染+完成），而低决策密度任务仍走全仪式。产品裁定（round5/prompt-stage-burst.md 任务书，用户冻结版）：**保留五阶段形状与全部门禁语义，只折叠交互形状**——每阶段压到 2 次调用（渲染 1 + done 1）。用户同时明确不用薄流程（flow 族保留为实验通道，缺省翻回 legacy）。

## 设计目标

1. burst 开启时：brainstorm/plan/execute 三阶段各恰好 2 次 CLI 调用走通（渲染 1 次下发全部剩余步说明书 + done 1 次收口，done 内部逐步推进并打印每步完成行）。
2. 等价性：同 fixture 双跑（burst on/off），各步 postcheck 与 completeStageGates 判定结果一致；burst 中途门禁失败 → 停在失败步、progress 状态与逐步模式失败态一致。
3. burst 缺省 OFF：既有全部测试零回归（缺省路径零迁移）。
4. env 逃生阀 `SILLYSPEC_STAGE_BURST=0` 强制关闭生效。
5. flow.mode 缺省翻回 legacy，flow 族测试修后全绿；全量 npm test + lint 过。

## 非目标

- verify/archive 阶段不动（--init --draft 与就绪度已把这两阶段压到 1-2 次调用）。
- 薄流程（flow 族）除缺省翻转外零改动。
- watcher 接 run 族 + 哨兵规则引擎 = 下一批独立变更，不顺手做。
- burst 全量默认翻转（全量测试面迁移）= 验收后另立变更。
- completeStep 函数本体零改动（D-003 铁律）。

## 拆分判断

不拆分、不批量：burst 折叠与 flow 缺省翻转共一轮交付（翻转是任务书同一裁定面，拆开反而多一轮仪式）；两件事改动面小（4 个 src 文件 + 2 个 test 文件），无批量模式特征。

## 总体方案

### Phase 1 配置面（src/run/shared.js）

新增 `readStageBurst(cwd)`（export）：
- 复用 `readLocalYamlRaw(cwd)`（src/run/shared.js:1938）+ js-yaml 动态 import 读 `doc?.stage?.burst === true`——与 `resolveLivingDocs` 读 `docs-check.living-docs` 同款范式（src/run/shared.js:1331-1340），绕开 parseSimpleYaml 缩进坑（known-issues 实证）。
- env 覆写：`SILLYSPEC_STAGE_BURST=0` → false / `=1` → true，优先于配置；坏 YAML / 缺文件 / import 失败 → false（fail-safe）。
- 锚定 cwd（仓库本地开发偏好，不随平台/worktree specRoot 漂移）。

### Phase 2 渲染面（src/run/stage.js）

1. **抽取 _cliAction 分发助手**：src/run/stage.js:592-629 的 if-链抽为模块局部 `executeNoAiCliAction({ cliAction, stageName, stepName, cwd, specBase, changeName, platformOpts, progress, pm, scanProfile })`，常规单步 noAI 路径与 burst 循环共同调用（D-008，防第三副本；complete.js:437-472 平行副本不动）。行为零变化：同一 if-链、同一入参语义。
2. **抽取阶段完成收尾助手**：src/run/stage.js:640-653 的「全步完成 → completeStageGates → exitCode → persist」块抽为局部助手（如 `finalizeStageAllStepsDone`），noAI 末步路径与 burst 渲染路径共用——gate 失败 rollback 语义微妙，不允许第二份副本。
3. **burst 渲染分支**：runStage 在 defSteps 计算后（src/run/stage.js:585-586 块内、noAI 单步判定之前）加门：`stageName ∈ {brainstorm, plan, execute}`（D-006 白名单）且 `readStageBurst(cwd)` 为真时走单趟遍历：
   - 顺序遍历 defSteps，跳过 DB 状态 completed/skipped 的步；
   - noAI 步（`defSteps[i].noAI || stageData.steps[i]?.noAI`）：打 `⚙️ Step i+1/N: name（burst 就地 CLI 自动执行）` → 调 executeNoAiCliAction → 标 completed + completedAt + `pm._write`（与 :630-632 同语义）；
   - AI 步：`await outputStep(stageName, i, defSteps, cwd, changeName, progress.project || null, platformOpts, null, collectStageWaitHistory(progress, stageName))`（签名照旧，D-002 渲染器零改动）；
   - 遍历后重查剩余：无剩余 → 调阶段完成收尾助手（全 noAI 场景）；有剩余 → 打 burst 尾提示：`📦 burst 模式：本阶段全部说明书已一次下发。干完全部步骤后用一次 --done 收口（CLI 内部逐步推进+逐步校验，失败即停在失败步）。`
   - waiting 步：**burst 分支不可达**——runStage 在 :245-254 对任一 waiting 步硬拦 exit(1) 指引 --continue（burst 分支在 :585 之后，天然继承同款硬拦，零新增判定）；blocked/stale 步按「非 completed/skipped」打印说明书（currentIdx 的 stale/blocked 已在 :264-269 拉回 pending，尾随 stale 步保持 stale 进说明书，其完成侧拉回见 Phase 3）。

### Phase 3 完成面（src/run/complete.js + src/run/command.js）

新增 `completeStepBurst(pm, progress, stageName, cwd, outputText, inputText, options)`（export，与 completeStep 同文件；completeStep 本体零 diff）：
- 整体 --output 打一行横幅 `📦 burst 收口摘要：<outputText>`（省略时跳过；不落步记录，D-009）；
- 循环（上限 50 轮）：
  - **轮首：尾随 stale 拉回**（D-003@v2，Grill P1-1，钉死在轮首先于退出判定——「仅剩尾随 stale、无 pending」的轮必须先拉回再判退出，否则 stale 尾残留阶梯）：若首个非 completed/skipped 步为 stale → 拉回 pending + pm._write（与 runStage :264-269 同语义，在 burst 新代码内实现，不触 completeStep 本体）；
  - 每轮重算 pending 索引（谓词 `pending|in-progress|blocked`，与 completeStep 内部 src/run/complete.js:165 一致）；无 pending → 退出；
  - 调 `completeStep(pm, progress, stageName, cwd, null, inputText, { ...roundOptions, printNext: false })`——outputText=null 走 P0-2 事实合成（src/run/complete.js:224-227）逐步生成纯事实摘要；
  - 每轮后 `progress = pm.read(cwd, options.changeName)` 重读；null（并发归档）→ 报错 + exitCode=1（对齐 src/run/command.js:2078-2084 BUG-05 语义）；
  - **--answer 单次消费**（D-004@v2）：轮前快照全部步 waitAnswer，轮后比对——任一步 waitAnswer 新变为 === doneAnswer → 已消费，后续轮从 options 剥离 doneAnswer（快照比对防 waiting 解析重定向〔complete.js:190-193 可使实际完成步 ≠ 轮前首 pending 索引〕导致的漏检）；
  - **--step 断言仅首轮**（D-005）：首轮后从 options 剥离 stepAssert；
  - completeStep 返回 `{ stageCompleted: false, ... }`（门禁失败返回态）→ 立即透传返回（exitCode 已由内部置位）；
- 循环耗尽仍有 pending → 报错（防死循环）；正常退出透传末轮返回值。

command.js 两处 --done 分发接线（burst 门=白名单+readStageBurst）：
- src/run/command.js:1727（主 --done 分发）：burst 开 → `completeStepBurst(...)`（透传原 options）；
- src/run/command.js:2073（auto --done 路径）：同款接线（该路径本就 printNext:false + 手动渲染后续，burst 下循环直推）；burst 分支跳过该路径 :2064-2070 的 --output 预合成（预合成文本在 burst 下沦为横幅重复打印——burst 直接透传原始 outputText，横幅去重归 D-009 单点）。

### Phase 4 flow 翻转 + 测试面（src/flow.js + src/config-schema.js + test/）

- src/flow.js:66 `let mode = m ? m[1] : 'legacy'`、:76 catch 回退 `{ mode: 'legacy', ... }` 两处 + :62 docstring/:18 模块注释/:124 报错文案「缺省即 thin」三处文案同步（D-010@v2）。
- src/config-schema.js:170 flow.mode 的 desc「thin（缺省）」→「legacy（缺省）」文案同步（Grill P2 附注）。
- 测试面 fixture 补 `flow:\n  mode: thin`（D-010@v2，Grill P1-2 修正枚举）：
  - test/flow-protocol.test.mjs：makeRepo 的 local.yaml 缺省造法补 flow 段（受影响 ①②③⑤⑥ 五测——任务书原估 ①②③⑥ 漏 ⑤，⑤ 也用缺省 makeRepo 且断言 flow start exit 0）；④ 显式 legacy 覆写不变；
  - test/flow-route.test.mjs：cli(['flow','start',...]) 断言 exit 0 依赖缺省 thin，fixture 补行；
  - test/flow-draft.test.mjs：⑥ 真 CLI harness（local.yaml 无 flow 段 + flow start 断言 0），补行；
  - test/fr-index.test.mjs：**核实不受影响**（纯单测直调 indexRequirements，不经 flow start/done——2026-09-23 本会话核实，不补行）。
- 新增 test/stage-burst.test.mjs（NEW，录 module-map）：
  1. readStageBurst 单测：无配置→false / `stage: burst: true`→true / env=0 覆写 true→false / env=1 覆写无配置→true / 坏 YAML→false；
  2. flow 缺省：readFlowConfig 空配置→legacy / 显式 thin→thin；
  3. burst 渲染折叠：fixture 阶段多剩余步，SILLYSPEC_STAGE_BURST=1 spawn `run <stage>` → stdout 含全部剩余步说明书 + burst 尾提示 + noAI 步已就地完成（DB 断言）；
  4. completeStepBurst 等价性：同 fixture 双副本，一份逐步 completeStep（burst off 外部循环）、一份 completeStepBurst（burst on）→ 最终 progress 步态/output 一致、gate 判定一致；
  5. burst 断点：fixture 门禁失败步 → 进程非零退出、progress 停在失败步（与单步模式失败态一致）；
  6. --answer 单次消费：双 requiresWait fixture → 一次 --done --answer 完成首等待步、停在第二等待步（exit 非零、waitAnswer 未错填）；
  7. env 逃生阀：配置 true + SILLYSPEC_STAGE_BURST=0 → 单步渲染（仅当前步说明书）。
- 测试纪律（conventions 实证）：env 门控断言的 spawn 显式剥净相关变量（delete SILLYSPEC_STAGE_BURST 等）后按需注入；行为翻转断言走被跟踪 fixture 文件（local.yaml fixture 在 test 内是跟踪文件），裸跑+套件阀双模式收口前各跑一遍。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/shared.js | 新增 export readStageBurst(cwd)（readLocalYamlRaw + js-yaml 范式） |
| 修改 | src/run/stage.js | 抽取 executeNoAiCliAction + 阶段完成收尾助手；runStage 加 burst 渲染分支（白名单门） |
| 修改 | src/run/complete.js | 新增 export completeStepBurst（循环包装+尾随 stale 拉回+answer 快照消费检测；completeStep 本体零 diff） |
| 修改 | src/run/command.js | :1727 与 :2073 两处 --done 分发按 burst 门接 completeStepBurst（auto 路径跳过 :2064-2070 预合成） |
| 修改 | src/flow.js | readFlowConfig 缺省 thin→legacy（:66/:76 两处 + :18/:62/:124 三处文案） |
| 修改 | src/config-schema.js | :170 flow.mode desc「thin（缺省）」→「legacy（缺省）」 |
| 修改 | test/flow-protocol.test.mjs | makeRepo local.yaml 补 flow: mode: thin（①②③⑤⑥ 受影响） |
| 修改 | test/flow-route.test.mjs | fixture local.yaml 补 flow: mode: thin |
| 修改 | test/flow-draft.test.mjs | ⑥ harness local.yaml 补 flow: mode: thin |
| 新增 | NEW:test/stage-burst.test.mjs | burst 机制测试（配置三态/渲染折叠/等价性/断点/answer 消费/逃生阀）；test 文件不录 module-map（lint 覆盖面仅 src/） |

注：`.sillyspec/local.yaml` 加 `stage: burst: true` 仅本机自举 dogfood（gitignored，不入提交面，D-001）。

## 接口定义

```js
// src/run/shared.js
export async function readStageBurst(cwd)  // → Promise<boolean>
// local.yaml doc?.stage?.burst === true；env SILLYSPEC_STAGE_BURST=0/1 覆写；失败→false

// src/run/stage.js（模块局部，不 export）
async function executeNoAiCliAction({ cliAction, stageName, stepName, cwd, specBase, changeName, platformOpts, progress, pm, scanProfile })
// 原 src/run/stage.js:592-629 if-链原样抽取，行为零变化
async function finalizeStageAllStepsDone({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx })
// 原 src/run/stage.js:640-653 收尾块原样抽取（completeStageGates 调用 + exitCode + persist）

// src/run/complete.js
export async function completeStepBurst(pm, progress, stageName, cwd, outputText, inputText = null, options = {})
// options 透传 completeStep 全量字段；内部覆写 printNext:false、每轮 outputText=null；
// 每轮前尾随 stale 拉回 pending（首个非 completed/skipped 步，同 runStage :264-269 语义）；
// doneAnswer 消费检测=轮前后 waitAnswer 快照比对（消费即剥离）；stepAssert 仅首轮；
// 50 轮上限；返回末轮 completeStep 返回值
```

无数据结构变更：progress.steps 步行形状、waitAnswer 字段、阶段状态机全部沿用既有 schema。

## 生命周期契约表

本设计不新增生命周期契约：步骤状态迁移（pending/in-progress/waiting/blocked/stale→completed）与阶段状态迁移全部经既有 completeStep/completeStageGates 守卫链原样发生，burst 仅改变迁移的触发打包方式（N 次循环调用同一函数），不新增任何事件×发起方×状态变化组合。

## 数据模型

无 schema 变更（见接口定义末注）。burst 零新增持久化字段；--answer 消费检测是读既有 waitAnswer 字段，不写新键。

## 兼容策略（brownfield 必填）

- **burst 缺省 OFF**：未配置 stage.burst 且 env 未设时，渲染与 --done 走既有单步路径，行为与 3.30.x 逐字节一致（等价性验收第 3 项的全量回归锚）。
- **回退路径**：`SILLYSPEC_STAGE_BURST=0` 强制关（配置误开时的逃生阀）；local.yaml 删 stage 段即回单步。
- **flow.mode 翻转**是本变更唯一 intentional 行为变更：未配置 flow 的用户升级后 `flow start` 走厚档 legacy——用户裁定方向（薄道默认不再敞开）；显式 `mode: thin` 照旧生效，无配置迁移需求。
- **不改变的 API**：completeStep / outputStep / runStage 签名与语义全部不变（新增并行包装，不改本体）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | burst 渲染对部分完成阶段（中途开启 burst/--reopen 后 stale 残留）的剩余步遍历错位 | P1 | 单趟遍历按 DB 状态逐索引跳过 completed/skipped；尾随 stale 步由 completeStepBurst 每轮拉回 pending（D-003@v2，渲染集合=完成集合）；测试用例覆盖「步 3 完成后开 burst」与「尾随 stale」场景 |
| R-02 | execute 动态步（plan.md 波次）在 burst 循环内 def↔DB 漂移 | P1 | completeStep 每轮经 getStageStepsAutoAware 重取 def（src/run/complete.js:308-318 漂移守卫逐轮生效），漂移即 exit、重跑自愈——零新增机制 |
| R-03 | burst 自循环触发并发防护 60s 横幅（每轮 warn「上一步 Ns 前刚被完成」） | P2 | 已知化妆性噪音（warn 不阻断、语义真实——确是本进程连推）；不抑制（抑制需改 completeStep 本体，违反 D-003）；design 注明预期 |
| R-04 | triggerStepStartSync 在 burst 渲染连发 N 次 fire-and-forget 平台推送 | P2 | best-effort + 8s 熔断契约不变（src/run/prompt.js:841-846），量级可接受 |
| R-05 | flow 翻转后未配置 thin 的既有 flow 用户走厚档 | P1 | 用户 intentional 裁定（D-010）；AGENTS.md 表述已兼容（薄流程=新默认道的文案在 3.28.3 已铺，翻转后 flow 族=实验通道语义一致） |
| R-06 | --answer 文本恰等于前置步已记录 waitAnswer → 提前剥离 | P2 | fail-safe 方向（多停一次断点重答，不错配）；D-004@v2 故障面已登记 |
| R-07 | burst 循环内 completeStep 抛非退出异常（动态 import 失败等）→ 进程崩溃 | P2 | 进度停在已完成步（幂等可续）；与单步模式同故障语义 |
| R-08 | requiresWait 后续步的渲染形与单步模式不可逐字节对齐（waitHistory 差异） | P2 | D-002@v2 判据改「首访渲染形一致」（前置 waitAnswer 状态相同前提下）；等价性验收以 gate 判定与 progress 态为准，不卡文本逐字节 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | Phase 1（readStageBurst 缺省/env 阀）+ 兼容策略 + 测试 1/7 | 已覆盖 |
| D-002@v2 | Phase 2 burst 渲染分支（outputStep 签名照旧；判据=首访渲染形一致）+ 测试 3 | 已覆盖 |
| D-003@v2 | Phase 3 completeStepBurst（completeStep 本体零 diff + 尾随 stale 拉回 + auto 路径跳过预合成）+ 测试 4/5 | 已覆盖 |
| D-004@v2 | Phase 3 --answer 单次消费（轮前后 waitAnswer 快照比对）+ 测试 6 | 已覆盖 |
| D-005@v1 | Phase 3 stepAssert 仅首轮 | 已覆盖 |
| D-006@v1 | Phase 2/3 白名单门（brainstorm/plan/execute）+ 兼容策略 | 已覆盖 |
| D-007@v1 | Phase 1（readLocalYamlRaw + js-yaml 范式） | 已覆盖 |
| D-008@v1 | Phase 2.1（executeNoAiCliAction 抽取） | 已覆盖 |
| D-009@v1 | Phase 3（横幅打印 + 每轮 null 走 P0-2） | 已覆盖 |
| D-010@v2 | Phase 4（flow.js 两处+三文案 + config-schema desc + 三测试文件 fixtures） | 已覆盖 |
| D-011@v1 | 总体方案整体（方案 A 冻结版） | 已覆盖 |

全部 D-001~D-011（D-002/003/004/010 升 v2）均有实现覆盖点，无未解决决策。Grill 首轮 P1-1/P1-2 已修（见 D-003@v2/D-010@v2 与 Phase 2.3/Phase 3/Phase 4 修订）。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@v1（D-001~D-011 全追踪）
- [x] 生命周期关键词核对：涉及步骤状态迁移但零新增契约——紧邻豁免短语已写（「不新增生命周期契约」）
- [x] UI 原型分级核对：纯 CLI/后端逻辑无界面变化，跳过（brainstorm 步 5 已声明，分级依据「跳过类：纯后端逻辑/CLI/配置/文档」）
- [x] 不确定的问题标注：无「⚠️ 自审存疑」项——四个超任务书设计点（D-004/005/006/008）均已读码定案并落盘
