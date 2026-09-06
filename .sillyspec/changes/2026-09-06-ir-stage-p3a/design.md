---
author: qinyi
created_at: 2026-09-06T23:58:53+08:00
scale: large
---

# 设计文档（Design）— IR 五阶段 P3a：plan target_files 声明与 execute 机器对账

## 背景

archify 借鉴（`docs/sillyspec/archify-reference-analysis-2026-09-04.md`）已把「agent 产出结构化 IR + 机器确定性核验」在 scan 侧落地（诊断信封、`_facts.md`、ref_exists、frontmatter CLI 盖章）。种子稿 `docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md` 提议将该机制推广到五阶段，P3a 是第一块拼图：**plan 声明与 execute 实改的机器对账**。

现状缺口：execute 的 scope creep（做了没声明）只有 gates 的 symbol-impact 试图抓，覆盖不全；plan 侧「计划动了不存在的文件」类幻觉无核验；review.json 的 `changedFiles` 是 agent 手写（`--adopt` 可重算但非默认路径），不能当对账的权威事实源。

代码侧现状（2026-09-06 核实，Design Grill 后修正锚点）：
- `resolveVerifyChangedFiles`（src/verify-postcheck.js:907）已实现 change 级 worktree-aware diff（主仓 base..HEAD），`includeWorkingTree` opt-in 并入 **worktree 存活时**的未提交改动（`--untracked-files=all`）；**post-apply**（apply 成功即 cleanup 删 meta.json）后该分支失效，回退 tracked-only diff——新文件（untracked）不可见（worktree-apply.js:1105 `git apply --3way` 不暂存新文件；apply-pathspec-<change>.txt 落盘于 :1145）。
- verify 侧检查的**唯一接线点是 src/run/gates.js:595-668**（runVerifyTestCheck/Lint/Parity/Deletion/RequiredEvidence 逐一 import+调用）；verify-postcheck.js 只导出纯函数、无聚合入口（与 plan 侧 executePlanPostcheck 不同构）。
- `filterDeliverableFiles`（src/worktree-apply.js:56）已有基建文件过滤口径（`.sillyspec/changes/`、`.sillyspec/.runtime/`、`.sillyspec/quicklog/`、`meta.json`）。
- `executePlanPostcheck`（src/stages/plan-postcheck.js:1210）聚合 6 项独立检查，`failures[]` 统一报错聚合模式，新检查同构可加。
- task 卡 frontmatter 列表字段解析先例：`parseAllowedPaths`（src/stages/plan-postcheck.js:73，接受 glob/引号的**白名单容差**语义）。
- plan 阶段任务展开/TaskCard 生成步 prompt 在 **src/stages/plan.js**（任务清单步 :137、TaskCard 生成步 :405-457、taskcard-rules include :446）；src/run/prompt.js 只做 CLI 计算事实占位符注入，非 prompt 文本落点。

## 设计目标

1. **plan 侧**：task 卡新增 `target_files[]` 声明字段（意图层），plan-postcheck 机器核验（文件存在或显式 `NEW:` 前缀）——消灭「计划动不存在文件」的幻觉出口。
2. **execute/verify 侧**：机器对账 Σ(target_files) vs 实际改动文件，输出三类差集——①声明且做了 ✓；②声明没做（计划落空）= ERROR；③做了没声明（scope creep）= WARNING。对账检查**接线进 gates.js verify 块**（阻断语义照既有检查先例），确保 ERROR 真的会拦。
3. **agent 零手抄事实**：对账的实际改动文件全部由 CLI 从 git diff / status / apply-pathspec 取，agent 只在 plan 阶段写一次意图声明（路径列表，极简格式）。
4. **存量零红门禁**：无 target_files 字段的存量 task 卡 → WARNING 跳过对账。

## 非目标

- **P3b**（verify 验证结论表 + 探针复跑抽查）、**P3c**（brainstorm design facts + design.md 模板渲染）、**P3d**（archive delta 回灌 + 增量 scan 联动）——各自独立变更立项（D-001@v1）。
  - ⚠️ 归档收尾义务（D-003@v1）：本变更 archive/交付时必须向用户列出 P3b/P3c/P3d 待立项提醒；P3d 注意「端点 before 基线」需新建机制（contract-matrix 只有事后快照，种子稿该处描述失实）。
- 不改 review.json schema、不动 worktree-apply allow-set 语义与 apply 流程、不改 quick（quick 有自己的 --files 白名单守卫，语义已覆盖）。
- gates.js **不改既有五项检查的语义与接线，仅新增一条 reconcileTargetFiles import+调用**（原「零改动」措辞经 Grill B-1 修正——verify 侧无其他接线点，不接线则 ERROR 门禁永不触发，设计目标 2 落空；D-004@v1）。
- 不做 per-task 门禁归因（方案B rejected，D-002@v1；尽力归因仅报告附注）。
- 不做 touches_modules[] / wave 依赖预分组（种子稿 §2，属后续分期）。
- 不做跨仓 task 的对账（有 `repo:` 键的卡声明侧剔除 + WARNING 提示；reconcileTargetFiles 显式 `ctx=null`，跨仓 diff 不并入 actual——对齐 runVerifyTestCheck :1067-1068 不传 ctx 的先例，防跨仓文件全落③类噪音，D-004@v1）。
- 不改 dashboard 前端。

## 拆分判断

单 change 不拆分：交付面是一个闭环（声明→核验→对账→接线），文件集中在 plan/verify postcheck + gates 域，任务间同字段强耦合，拆开反而制造字段贯穿两变更的同步负担。不走批量（无重复模式任务）。

## 总体方案

### Wave 1：plan 侧声明机制

**字段设计——为什么新增 `target_files` 而不复用 `allowed_paths`**：`allowed_paths` 是 worktree 写入守卫的**白名单**（hook/apply-set 消费，目录前缀与 glob 合法、容差匹配、可宽泛填写）；`target_files` 是对账用的**精确文件级意图声明**（postcheck 消费，必须逐文件精确路径、可对账）。白名单容差语义若用于对账：目录前缀会把整目录算成「预期」使③类恒空，scope creep 检出失效；从 actual 反推声明则是循环论证。分离为独立字段，各自语义单一。

**target_files 条目格式（精确定义，X-10 修正）**：每条 = 仓根相对路径的**精确文件路径**（正斜杠），禁 glob/目录前缀/引号；当前不存在的文件加 `NEW:` 前缀。已存在文件带 `NEW:` 前缀 = WARNING（应去前缀）；存在文件裸写 = 正常。格式非法（glob、目录前缀、绝对路径）= ERROR。

- `buildTaskcardSkeleton`（src/taskcard.js:69）frontmatter 增加占位注释字段 `target_files:` + 尾注释格式说明；`templates/prompts/taskcard-rules.md` 增加 target_files 可选字段规则（填写正反例）。
- plan 阶段 prompt 指引落在 **src/stages/plan.js**（任务清单步 :137 + TaskCard 生成步 :405-457 的必备字段说明）：每个 task 填 target_files（正反例）；execute/verify prompt 零改动。（Grill B-4 修正：原清单误指 src/run/prompt.js——该文件只注入 CLI 占位符，无 prompt 文本。）
- plan-postcheck 新增第 7 项检查 `validateTargetFiles`：解析仿 `parseAllowedPaths` 同族的列表解析（严格模式：不认 glob/引号）→ 逐条核验（文件存在于主仓/当前 worktree，或 `NEW:` 前缀）。字段缺失 = WARNING（**每变更汇总一条**「N 张卡未声明 target_files」，非每卡一条，防存量噪音淹没，X-13 修正）；格式错/路径不存在且非 NEW = ERROR；声明了 design.md 文件清单之外的路径 = WARNING 提示对齐；target_files ⊆ allowed_paths 交叉（声明了 allowed_paths 白名单外的文件 = WARNING，提前暴露到 apply Gate1 才发现的越权，X-5 附注采纳）。

### Wave 2：verify 侧对账引擎（含接线）

**检查本体**：verify-postcheck 新增纯函数 `reconcileTargetFiles`（与 runVerifyTestCheck/runVerifyLintCheck 同构导出）；**接线**：src/run/gates.js verify 块（:595-668）新增 import + 调用，阻断语义照 runVerifyTestCheck 先例（ERROR 阻断、WARNING 放行），不改既有五项检查。

**actual 侧数据源（三源并集，覆盖 worktree 生命周期两形态，Grill B-2 修正）**：

1. **形态 A（worktree 存活，meta.json 存在）**：`resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true })`——base..HEAD ∪ worktree 未提交改动（`--untracked-files=all`，NEW 文件可见）。显式 `ctx=null`（跨仓不并入）。
2. **形态 B（post-apply，meta 已清理）**：主仓 `git diff --name-only <baseHash>`（tracked 改动；baseHash 锚 `sillyspec/<change>` 分支 merge-base，先例 run/prompt.js:764-769——分支不存在时显式省略该源，status ∪ pathspec 已覆盖标准流，复审缺陷1 吸收）∪ 主仓 `git status --porcelain --untracked-files=all`（未提交/未跟踪——`git apply --3way` 产生的新文件 untracked，必须由此捕获；捕入的并行会话 WIP 用既有 `splitOwnVsForeignDiffFiles`（src/verify-postcheck.js:1004，坑 verify-reconcile-foreign-wip）过滤，复审缺陷2 吸收）∪ 兜底读 `apply-pathspec-<change>.txt`（worktree-apply.js:1145 apply 时落盘，若存在则并入其行）。
3. 统一过 `filterDeliverableFiles` 口径（流程产物不算 scope creep）；git 不可用（diff 返回 null 且 status 失败）→ 对账降级 WARNING 跳过（fail-soft，不误红）。

**声明侧**：change 下全部 task 卡 target_files 并集（`NEW:` 前缀取目标路径）；跨仓卡（有 `repo:` 键）剔除并 WARNING 提示。

**三类差集**：
- ①交集 ✓：计数进 evidence；
- ②声明没做：ERROR，逐条 `task-NN + path`（计划落空必须红）——三源并集后 NEW 文件在两形态下均可见，无假红（R-06 测试锁定）；
- ③做了没声明：WARNING，逐条 path；对有 changedFiles 的 task 附尽力归因（「疑似 task-NN」，仅报告不门禁——方案 B 价值降级保留，D-002 自授权）。

**输出**：checks 条目走诊断信封格式（name/severity/detail + evidence 实测清单 + supportedFixes 枚举修复），落盘对齐 verify 侧产物先例 `.runtime/verify-runs/<ts>/`（复审缺陷3 吸收；postcheck-result.json 为 scan 专属，不沿用），并进 machine-interface envelope（checks 是数据非枚举，机器接口层零改动）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/taskcard.js | buildTaskcardSkeleton frontmatter 加 target_files 占位 + 尾注释格式说明 |
| 修改 | src/stages/plan-postcheck.js | 新增 validateTargetFiles 检查（严格列表解析 + 存在性/格式核验 + design 清单交叉 + allowed_paths 交叉） |
| 修改 | src/verify-postcheck.js | 新增 reconcileTargetFiles 纯函数（三源 actual 口径 + 三类差集 + 过滤 + 降级） |
| 修改 | src/run/gates.js | verify 块新增 reconcileTargetFiles import + 调用（阻断语义照 runVerifyTestCheck 先例；不改既有五项检查） |
| 修改 | src/stages/plan.js | 任务清单步 + TaskCard 生成步 prompt 增加 target_files 填写指引（正反例） |
| 修改 | templates/prompts/taskcard-rules.md | target_files 可选字段规则（格式正反例） |
| 新增 | test/plan-target-files.test.mjs | 声明核验/三类差集/存量跳过/基建过滤/两形态×三模式 actual 口径断言 |

（原清单中 src/run/prompt.js 移除——Grill B-4 核实该文件非 prompt 文本落点。）

**字段数据流标注**（新增对外字段 target_files）：producer = agent（plan 阶段按 src/stages/plan.js prompt 指引填写 task 卡 frontmatter，taskcard 骨架给占位、taskcard-rules.md 给规则）→ 归一化 = plan-postcheck `parseTargetFiles`（严格列表解析，剥 `NEW:` 前缀、路径归一正斜杠）→ consumer = ①plan-postcheck validateTargetFiles（存在性/格式/design 与 allowed_paths 双交叉）②verify-postcheck reconcileTargetFiles（对账）③run/gates.js verify 块接线（阻断）④machine-interface envelope checks（诊断信封透传，additive）。review.json / worktree-apply / quick 不消费该字段（零触碰）。

## 接口定义

```js
// src/stages/plan-postcheck.js
// 解析 task 卡 target_files 字段（仿 parseAllowedPaths 同族列表解析，严格模式：不认 glob/引号）
parseTargetFiles(frontmatterText) // → { entries: [{ raw, isNew, path }], missing: boolean }

validateTargetFiles({ taskCards, designFileList, repoRoot })
// → { errors: string[], warnings: string[] }
//   errors：路径不存在且非 NEW / 格式非法（glob、目录前缀、绝对路径）
//   warnings：字段缺失（每变更汇总一条）/ 声明 design 清单外路径 / 越出 allowed_paths /
//             已存在文件带 NEW: 前缀 / 流程产物路径 / 跨仓卡剔除提示

// src/verify-postcheck.js（纯函数，接线在 src/run/gates.js verify 块）
reconcileTargetFiles({ cwd, changeName })   // 显式 ctx=null：跨仓 diff 不并入（D-004）
// 内部 actual 三源并集（见总体方案 Wave 2），declared = Σ target_files（剔跨仓卡）
// → { status: 'ok'|'missing_declared'|'undeclared'|'skipped'|'degraded',
//     matched: string[],                    // ①
//     missing: [{ task, path }],            // ② → ERROR（gates 接线阻断）
//     undeclared: [{ path, suspectTask? }], // ③ → WARNING（suspectTask=尽力归因，仅报告）
//     skipReason?: string }                 // 存量无声明/git 不可用/全部跨仓
```

envelope code 命名（data 层，无枚举注册）：`target_files_invalid`（plan 侧）、`reconcile_missing_declared`（②）、`reconcile_undeclared_file`（③）、`reconcile_skipped`（降级）。

## 生命周期契约表

不涉及生命周期契约（本变更新增 postcheck 检查、frontmatter 字段与 gates 接线，无 session/lease/状态机语义；gates 阻断→回退沿用既有检查先例语义，不改 stage-contract 转换）。

## 数据模型

无 DB schema 变更。数据模型增量即 task 卡 frontmatter 新字段 `target_files: [path | NEW:path, ...]`（YAML 字符串列表，见接口定义）。

## 兼容策略（brownfield 必填）

- **存量 task 卡**（无 target_files）：plan-postcheck 每变更汇总一条 WARNING；verify 对账 skipped（WARNING），不产生任何存量红门禁。
- **review.json / worktree-apply / quick**：零改动（方案 B 明确否决，D-002@v1）。
- **gates.js**：不改既有五项检查的语义/顺序/接线，仅 append 一条 reconcileTargetFiles 调用（D-004@v1 修正原「零改动」措辞）。
- **SillyHub postcheck-result.json 消费契约**：仅 additive checks 条目 + envelope 字段，不改既有字段语义（本仓不可见消费方，维持参考分析的边界承诺）。
- **known_failures 豁免**：沿用 local.yaml 既有机制，可按 change 声明 ③类豁免（首个真实变更观测期使用）。
- **git 不可用 / diff 返回 null**：对账降级 WARNING 跳过（fail-soft，不误红）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | ③类 WARNING 误报噪音（基建过滤不周，如 packages/dashboard 子包产物） | P1 | 沿用 filterDeliverableFiles 同款口径；known_failures 豁免；首个真实 change 观测噪音率再定收紧/放宽 |
| R-02 | agent 填 target_files 格式纪律（IR 手写前科风险） | P1 | 字段极简（纯路径列表无嵌套）；ERROR 只对格式错/幻觉路径；src/stages/plan.js prompt 与 taskcard-rules.md 双落点正反例；validateTargetFiles 严格解析即兜底（注释行占位不进 placeholders 封闭清单，靠解析核验拦） |
| R-03 | worktree 三模式（git/native/in-place）下 actual 口径差异 | P1 | 三源口径封装单一函数；测试覆盖两形态×三模式矩阵 |
| R-04 | includeWorkingTree 漏开（形态 A）导致对账漏检 | P2 | reconcileTargetFiles 内部定死 true；测试断言未提交改动被捕获 |
| R-05 | post-apply（形态 B）NEW: 文件 untracked 不可见 → ②类假红 | P0 | 三源并集：status --porcelain --untracked-files=all + apply-pathspec-<change>.txt 兜底；R-06 测试矩阵锁定（apply 不暂存新文件 + cleanup 删 meta 为代码实证，Grill B-2） |
| R-06 | 实际门禁行为与设计不符（接线遗漏/阻断语义漂移） | P1 | gates.js 接线入文件清单与测试（阻断冒烟：②类在场时 verify gate 红）；对账测试矩阵覆盖 worktree 存活/post-apply 两形态 |

（原 R-05「不存在中间态」论据经 Grill 证伪删除——post-apply 是 verify 一等场景，gates.js:619-628 与 run/prompt.js:753-783 均显式处理；由新 R-05/R-06 承接。）

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1（范围=P3a） | 非目标章节（P3b/c/d 明确排除 + 收尾提醒义务） | 全覆盖 |
| D-002@v1（方案A 双gate、机器diff权威、②红③黄） | 总体方案 Wave1/2、接口定义、兼容策略 | 全覆盖（gates 接线是对「②红」的兑现手段） |
| D-003@v1（完成后提醒 P3b/c/d） | 非目标章节 ⚠️ 标注 | 全覆盖 |
| D-004@v1（Grill 修正：gates 接线/三源口径/ctx=null/锚点） | 非目标、Wave 2、文件清单、接口定义、R-05/R-06 | 全覆盖 |

无未解决决策。

## 自审

- 章节齐全：背景/设计目标/非目标/拆分判断/总体方案/文件变更清单（含数据流标注）/接口定义/生命周期契约表（豁免短语）/数据模型/兼容策略/风险登记/决策追踪/自审 ✓
- frontmatter：author/created_at/scale ✓；第一行中文标题 ✓
- 生命周期关键词：否定紧邻「生命周期契约」✓
- decisions.md 引用：D-001~D-004 全部当前版本均被引用 ✓
- 字段数据流标注：target_files producer→consumer 链完整（含 gates 接线消费方）✓
- UI 原型：文件清单无前端文件，跳过（分级依据：纯 CLI/postcheck 逻辑，无界面变化；Step 5 已声明）✓
- Design Grill 16 项交叉检查的 2 P0 + 2 P1 + 7 gap 全部落账：B-1 gates 接线（文件清单/兼容/非目标）、B-2 三源口径（Wave2/R-05/R-06）、B-3 ctx=null（接口定义/非目标）、B-4 锚点（plan.js/taskcard-rules.md 入清单）、X-10 格式精确定义、X-13 汇总粒度、X-5 附注 allowed_paths 交叉、X-7 先例指向 parseAllowedPaths、X-14 R-02 措辞、X-12 模块域（decisions.md 同步）✓
- ⚠️ 自审存疑 1：R-01 噪音率是预判，首个真实 change 后复核过滤口径（观测义务在应对策略）。
- ⚠️ 自审存疑 2：三源并集在 in-place-fallback 模式的适用性以 R-03 测试矩阵验证，若有形态外口径再补设计注记。
