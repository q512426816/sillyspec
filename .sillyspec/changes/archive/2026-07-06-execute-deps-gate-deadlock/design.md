---
author: qinyi
created_at: 2026-07-07T05:52:33
change: 2026-07-06-execute-deps-gate-deadlock
stage: brainstorm
status: draft
---

# Design — execute deps 门控 worktree cleanup 终态死锁修复

## 1. 背景

multi-agent-platform 项目使用 sillyspec 跑 execute 阶段时卡在 6/12：代码已全部完成、测试通过、已 commit 到 main、worktree 已按正常生命周期 cleanup —— 但 execute 的 step 戳永远盖不上,后续无法正常推进。

根因（已代码核实）：

1. `src/run.js:2515-2517` `completeStep` 中,`enforceDepsGate` 在 `steps[currentIdx].status='completed'` **之前**执行；门控拒绝即 `process.exit(1)`,戳根本盖不上。6/12 是真实进度。
2. `src/run.js:2388 enforceDepsGate`：execute 阶段读 worktree `meta.depsStatus`,仅 `['linked','installed','n/a']` 放行,否则拒绝。
3. worktree cleanup 后 `meta.json` 消失 → `depsStatus=unknown` → 永久拒绝。
4. 自愈 `src/run.js:2412 ensureDepsFreshness` 救不回来：其前提是 `worktreeMeta.worktreePath` 存在,cleanup 后物理目录都没了,自愈不触发。
5. `src/run.js:2307/3147`：sillyspec 设计上 execute 全完成（12/12）才自动 cleanup worktree。中途 cleanup 是异常触发,但一旦触发即死锁。
6. 诊断盲区：门控拒绝走 stderr,但 stdout 残留上一次 `completeStep` 的"✅ Step X/N 完成",agent 用 grep 捞 stdout 进度时会把残留当本次确认,误判已推进。

**设计哲学**：采用 fail-closed + 显式修复,不掏空门。理由：方向"门控直接放行 main commit"会把"验证能力门"降级成"commit 存在性检查",制造 false-positive（没验证就 apply 也能过）,正是门 originally 要防的。execute step 戳是**派生数据**（派生自"在 worktree 里逐 task 跑通"）；治本 = 建从真相源（plan.md）重建派生戳的通道,而非降低门标准。这与 sillyspec 整体哲学一致（CLAUDE.md"只做确定性校验"、archive 以 plan.md 为唯一真相源、doctor 作为已知修复工具）。

## 2. 设计目标

1. **打通死锁**：worktree 已 cleanup（终态）且代码已完成的场景,能通过显式、可审计的路径把 execute 派生戳对齐到完成。
2. **治一类问题**：不只修 cleanup 一种成因 —— meta 损坏、lockfile 变化等任何导致 depsStatus unknown 且代码实际已完成的场景,都用同一条通道重建。
3. **门保持 fail-closed**：`enforceDepsGate` 核心放行标准 `['linked','installed','n/a']` 不变；不引入"main commit 存在性"作为放行条件。
4. **诊断指引正确**：门控在 cleanup 终态拒绝时,提示指向有效修复（doctor 对齐 / 重建 worktree）,而非当前无效的 `doctor --fix` 重供给。
5. **输出 fail-loud**：门控拒绝时不被 stdout 残留掩盖,agent 能从输出可靠判断"本次未完成"。

## 3. 非目标

- **不**改 `enforceDepsGate` 的放行标准或把它降级为 commit 检查。
- **不**让 doctor 自动写 progress（写操作必须显式 flag）。
- **不**复核 plan.md 声明的真实性（doctor 信任 plan.md checkbox,代码验证由 verify 阶段兜底）。
- **不**改 worktree 生命周期（create/cleanup 时机不变）。
- **不**重写 doctor 阶段 prompt 驱动的 bash 自检（只加结构化诊断项 + flag 入口）。
- **不**改 sillyspec.db schema。

## 4. 拆分判断

单一 bug 修复,复杂度低。改动集中在 4 个源文件 + 2 个测试 + 文档,无跨页面状态流转、无多角色、无批量重复模式。不拆分、不走批量模式,作为一个变更交付。

## 5. 总体方案

### Phase 1 — doctor 对齐 plan.md（方向 2,治本）

给死锁开一条"基于真相源重建派生戳"的合法出口,显式触发：

- **诊断项（只读）**：`doctor-diagnostics.js` 的 `runDoctorDiagnostics` 新增 `execute-progress-plan-mismatch` 维度 —— 检测 execute 阶段 status≠completed 但 plan.md 所有 task checkbox 全勾的不一致,在 `safe_actions` 里建议 `sillyspec doctor --align-execute-progress --change <name>`。**不执行,只报告**（遵守该模块"绝不写回 db"硬约束）。
- **写操作**：`ProgressManager` 新增 `alignExecuteToPlan(cwd, changeName, specBase)` 方法 —— 读 progress + 读 plan.md checkbox,全勾则把 execute 阶段所有非 completed 的 step 标 completed（含 pending/in-progress/waiting/blocked）,并**显式置 execute `stageData.status='completed'` + `completedAt`**,`pm._write` 落盘。（Grill G1 修正：`run.js:2299-2305` 的阶段 completed 推导**只在 `completeStep` 内执行**,`alignExecuteToPlan` 直接 `_write` 绕过它,若不显式置 stage status,execute stageData.status 仍≠completed → `checkTransition(execute→verify)` 仍拦截,死锁未真正打通。详见 D-003@v2。）
- **入口**：`index.js` doctor 命令新增 `--align-execute-progress` flag 分支（仿 `--cleanup-remnant` 模式,line 320-334）,调 `ProgressManager.alignExecuteToPlan`,支持 `--confirm`（默认 dry-run 报告将补哪些 step,加 `--confirm` 才写）和 `--change <name>`。输出"已基于 plan.md 声明对齐 N 个 step,请确认 verify 通过"。

### Phase 2 — 门控诊断分支（方向 1′,不放行）

`enforceDepsGate`（`run.js:2388`）拒绝时区分两种 unknown 成因：

- **worktree 存在但 depsStatus 不达标**（`meta` 非空）→ 维持原提示（`doctor --fix` 重供给）。
- **worktree 已 cleanup**（`getMeta(changeName)` 返回 null）→ 改提示：
  `worktree 已 cleanup（终态）。跑 sillyspec doctor --align-execute-progress --change <name> 按 plan.md 对齐进度,或 sillyspec worktree create <change> 重建 worktree 继续跑。`

门核心放行标准不变,终态仍拒绝（fail-closed）,只改提示文案分支。

### Phase 3 — fail-loud（方向 3）

`enforceDepsGate` 拒绝时,在 `console.error` 输出显眼阻断块,明确标注"本次 --done 未完成,进度未推进",例如：

```
❌ ── deps 门控阻断（本次 --done 未完成，进度未推进）──
   原因：依赖未就绪（depsStatus=unknown）/ worktree 已 cleanup（终态）
   修复：<见 Phase 2 分支提示>
```

不动成功侧 stdout 输出（保守,减少对现有 agent 解析的影响）。

### Phase 4 — 测试 + 文档同步

- **测试**：`test/` 新增 doctor 对齐逻辑（全勾→补戳、未全勾→拒绝对齐、--confirm dry-run vs 写）+ 门控诊断分支 + fail-loud,沿用内联 `assertEqual`/`assertThrows` 风格（见 TESTING.md）。
- **文档**（CLAUDE.md 强制同步）：`docs/sillyspec/file-lifecycle.md` 补 doctor `--align-execute-progress` + 新诊断项；`modules/runtime.md`/`modules/worktree.md` 更新对应模块卡片；`.claude/skills/sillyspec-doctor/` 同步 skill。

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | `src/progress.js` | 新增 `alignExecuteToPlan(cwd, changeName, specBase)` + 辅助 `readPlanCheckboxStatus(changeDir)` |
| 修改 | `src/doctor-diagnostics.js` | 新增 `execute-progress-plan-mismatch` 只读诊断项 + safe_action |
| 修改 | `src/index.js` | doctor 命令加 `--align-execute-progress` flag 分支（仿 `--cleanup-remnant`,line 311-364） |
| 修改 | `src/run.js` | `enforceDepsGate` 诊断分支（cleanup 终态判定 + 分支提示）+ fail-loud 输出块（line 2388-2405） |
| 新增 | `test/doctor-align-execute-progress.test.mjs` | 对齐逻辑正向/边界/拒绝/dry-run 测试 |
| 新增 | `test/enforce-deps-gate-diagnostic.test.mjs` | 门控诊断分支 + fail-loud 输出测试 |
| 修改 | `docs/sillyspec/file-lifecycle.md` | doctor `--align-execute-progress` + 诊断项（更新 updated_at） |
| 修改 | `.sillyspec/docs/sillyspec/modules/runtime.md` | progress.js 新方法 |
| 修改 | `.sillyspec/docs/sillyspec/modules/worktree.md` | enforceDepsGate 诊断分支说明（如该卡片覆盖 run.js 门控；否则在 runtime.md） |
| 修改 | `.claude/skills/sillyspec-doctor/SKILL.md` | skill 同步新 flag |

## 7. 接口定义

### `ProgressManager.alignExecuteToPlan(cwd, changeName, specBase)`

```js
/**
 * 按 plan.md 声明对齐 execute 阶段派生进度戳。
 * 仅当 plan.md 所有 task checkbox 全勾时,把 execute 阶段所有非 completed step 标 completed。
 * 不复核代码,信任 plan.md 声明（与 archive 同源,verify 阶段兜底）。
 *
 * @param {string} cwd
 * @param {string} changeName
 * @param {string} specBase  // platformOpts.specRoot || join(cwd,'.sillyspec')
 * @returns {Promise<{ok:boolean, aligned:number, skipped:number, planTotal:number, planChecked:number, reason?:string, dryRun?:boolean}>}
 */
async alignExecuteToPlan(cwd, changeName, specBase) { ... }
```

行为：
- `readPlanCheckboxStatus(changeDir)` → `{total, checked}`（解析 plan.md 的 `- [ ]`/`- [x] task-NN`,回退 tasks.md）。
- `checked < total` → `{ok:false, reason:'plan.md 有未勾选 task（X/Y），拒绝对齐'}`。
- execute 阶段不存在或无 step → `{ok:false, reason:'execute 阶段无进度数据'}`。
- 全勾 → 把 execute steps 中 status≠'completed' 的逐个标 `completed` + `completedAt`;**同时显式置 execute `stageData.status='completed'` + `completedAt`**（D-003@v2,绕过 completeStep 推导）→ `pm._write`。
- `dryRun:true`（无 --confirm）只报告将补哪些 step + 将置 stage status,不写。

### `runDoctorDiagnostics` 新诊断项（只读）

输出 `checks` 增加维度 `execute-progress-plan-mismatch`：
- 触发条件：execute 阶段 status≠completed 且 plan.md checkbox 全勾。
- `safe_actions`: `[{action:'sillyspec doctor --align-execute-progress --change <name>', risk:'low', reason:'plan.md 声明全完成但 execute 派生戳未对齐'}]`。

### `enforceDepsGate` 诊断分支（`run.js:2388`）

```js
const meta = new WorktreeManager({cwd}).getMeta(changeName)
const depsStatus = meta?.depsStatus
if (['linked','installed','n/a'].includes(depsStatus)) return true
if (isCurrentWaveAllNoDepsVerify(...)) return true
// ── 诊断分支（Phase 2，Grill G2 修正：判定基于物理目录而非 !meta）──
const wm = new WorktreeManager({cwd})
const worktreeGone = !existsSync(wm.getWorktreePath(changeName))  // 物理目录不存在=真终态
// ── fail-loud 块（Phase 3）──
console.error('❌ ── deps 门控阻断（本次 --done 未完成，进度未推进）──')
if (worktreeGone) {
  console.error('   worktree 不可用（已 cleanup 或目录不存在）。')
  console.error('   修复：sillyspec doctor --align-execute-progress --change <name> 按 plan.md 对齐进度')
  console.error('   或：  sillyspec worktree create <change> 重建 worktree 继续跑')
} else {
  console.error(`   原因：依赖未就绪（depsStatus=${depsStatus||'unknown'}），不得在无构建/测试能力时声称完成。`)
  console.error(`   修复：sillyspec worktree doctor --fix${changeName?` --change ${changeName}`:''}`)
}
```

### `index.js` doctor flag 分支

```js
const alignFlag = filteredArgs.includes('--align-execute-progress')
if (alignFlag) {
  const alignChange = /* 从 --change 解析,或 resolveChangeNameAuto */
  const confirm = filteredArgs.includes('--confirm')
  const { ProgressManager } = await import('./progress.js')
  const pm = new ProgressManager({ specDir: doctorEffectiveDir })
  const r = await pm.alignExecuteToPlan(doctorEffectiveDir, alignChange, join(doctorEffectiveDir,'.sillyspec'))
  // dry-run vs --confirm 输出 + exitCode
  break
}
```

## 7.5 生命周期契约表 — 判定：不触发

本变更是 sillyspec CLI 本地的进度戳门控/诊断修复,不涉及 session / lease / agent_run / daemon / heartbeat 等分布式生命周期概念。文中出现的 "complete"/"completed" 指 sillyspec 进度数据的 step 状态标记（localStorage 级 SQLite `stages` 表字段）,"state transition" 指阶段流转的本地校验,均非跨进程生命周期事件。故不生成生命周期契约表。

## 8. 数据模型

**不改 sillyspec.db schema**。仅读写现有 `stages` 表的 step 状态（通过 `ProgressManager._write`）。`alignExecuteToPlan` 把 execute 阶段 steps 数组中 status≠completed 的元素改写为 `{status:'completed', completedAt:<ISO>}`,序列化落盘 —— 与 `completeStep`（run.js:2517）完全相同的写入形态。

## 9. 兼容策略（brownfield）

- **未传 `--align-execute-progress`** → doctor 行为与现在完全一致（默认只读自检/prompt 流程）。
- **门控放行标准 `['linked','installed','n/a']` 不变** → 现有 worktree 正常流程（create→execute→apply→cleanup）零影响。
- **`doctor --fix` / `--cleanup-remnant` / `--dump-db` 不受影响** → 新 flag 是独立分支。
- **回退路径**：不信任 doctor 对齐时,`sillyspec worktree create <change>` 重建 worktree 继续跑仍是出路（门控原提示保留）。
- **dry-run 默认**：`--align-execute-progress` 不带 `--confirm` 时只报告,不写 DB。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R1 | plan.md 误勾（agent 勾了但代码没做）→ 对齐后 execute 标完成 → verify 失败 | 中 | doctor 信任 plan.md 声明（同 archive）,输出明确提示"请确认 verify 通过"；verify 阶段对照 design + 跑测试兜底。不削弱此路径的价值（误勾在 archive 同样存在,是声明语义的固有代价） |
| R2 | alignExecuteToPlan 写 DB 与并发 sillyspec 进程冲突 | 低 | sillyspec 单进程 CLI,无并发写；`_write` 是原子序列化。文档提示勿并发跑 |
| R3 | 诊断分支误判 worktree 终态 | 低 | worktreeGone 判定基于 **`!existsSync(getWorktreePath(changeName))`**（物理目录不存在），而非 `!meta`（getMeta 对"目录不存在"和"meta 损坏"都返回 null，后者会误判）。meta 损坏但 worktree 在 → worktreeGone=false → 走"依赖没装"分支提示 `doctor --fix`（worktree doctor 能重建 meta），安全 |
| R4 | fail-loud 改输出格式影响下游 agent 的 stdout 解析 | 低 | 仅在 stderr 加阻断块 + 拒绝侧,不动成功侧 stdout；现有 agent 解析成功行不受影响 |
| R5 | 诊断项把"execute 未完成但 plan 全勾"误报为不一致（正常在跑中） | 低 | 诊断项是 advisory（safe_action 建议）,不阻断任何流程；agent 可忽略 |

## 自审（Step 11）

### 必填章节核对
| 章节 | 状态 |
|---|---|
| 1 背景 | ✅ 含已代码核实的 6 条根因 |
| 2 设计目标 | ✅ 5 条 |
| 3 非目标 | ✅ 显式清单 |
| 4 拆分判断 | ✅ 单一 bug 修复,不拆分/批量 |
| 5 总体方案 | ✅ 4 Phase |
| 6 文件变更清单 | ✅ 10 项 |
| 7 接口定义 | ✅ alignExecuteToPlan + 诊断项 + enforceDepsGate 分支 + index.js flag |
| 7.5 生命周期契约表 | ✅ 判定不触发（本地进度戳,非 session/lease/agent_run/daemon 分布式生命周期,已书面说明） |
| 8 数据模型 | ✅ 不改 schema |
| 9 兼容策略 | ✅ brownfield 4 条 |
| 10 风险登记 | ✅ R1-R5 |

### 查证驱动的修正
- **D-001@v1 → v2**：Step 11 查证发现 `doctor-diagnostics.js` 有"绝不写回 db"硬约束（line 12-18）,写操作改落 `ProgressManager`,诊断项保持只读。

### 一致性
- Phase 1-4 ↔ D-001@v2~D-005 ↔ 文件变更清单 ↔ 接口定义 交叉一致。
- 完整矛盾排查见下方 Step 12 Design Grill（G1 P0、G2 P1 已修正）。

## Design Grill 交叉审查发现（Step 12）

| ID | 层 | 发现 | 等级 | 处置 |
|---|---|---|---|---|
| G1 | 一致性 | D-003@v1"不置 stage status,依赖推导"与 `alignExecuteToPlan` 绕过 `completeStep` 矛盾 → 死锁未真正打通 | P0 | supersede 为 D-003@v2（显式置 stage status）；Phase 1 描述 + 接口定义同步修正 |
| G2 | 定义/可行性 | worktreeGone 判定 `!meta` 把"meta 损坏但 worktree 在"误判为终态（`getMeta` 对两者都返回 null） | P1 | 判定改为 `!existsSync(getWorktreePath(changeName))`；R3 同步修正 |
| G3 | 可行性 | doctor 顶层命令是否解析 `--change`（现仅 worktree 子命令明确支持） | P2 | design 已留 `resolveChangeNameAuto` 兜底,plan 阶段确认 |
| G4 | 可行性 | modules 卡片归属（worktree.md vs runtime.md,run.js 门控归属） | P2 | plan 阶段确认 |

## 决策记录

### D-001@v2: doctor 对齐入口 = 显式 flag + 诊断/写分离（supersede v1）
- type: architecture
- status: accepted（supersede D-001@v1）
- source: code
- question: 方向 2 的对齐写操作落在哪层 doctor？
- v1（已废）：在 doctor-diagnostics.js 加诊断项 + 写操作。
- 修正：doctor-diagnostics.js 有**硬性只读约束**（line 12-18："所有检测只读,绝不写回 db 文件"）。故分层 —— 只读诊断项 `execute-progress-plan-mismatch` 进 doctor-diagnostics.js（safe_action 建议对齐）；**写操作进 ProgressManager**（progress.js 本就管 progress 读写）；入口为 index.js doctor `--align-execute-progress` flag（仿 `--cleanup-remnant`）。
- impacts: [Phase 1 实现,文件变更清单]

### D-002@v1: 对齐判定真相源 = plan.md 所有 task checkbox 全勾
- type: boundary
- status: accepted
- source: code
- question: "代码已完成"如何判定？
- answer: 同 archive.js 第一步（"plan.md 是任务完成的唯一真相源"）,检查所有 `- [x] task-NN` checkbox 全勾。不额外要求 git commit 存在性（避免双真相源；commit 是 agent 行为,doctor 不复核）。doctor 信任声明,verify 兜底。
- impacts: [alignExecuteToPlan 判定逻辑]

### D-003@v2: 对齐动作 = 补 step 戳 + 显式置 stage status（supersede v1）
- type: architecture
- status: accepted（supersede D-003@v1，Design Grill G1）
- source: code
- question: 对齐是补 step 还是置 stage？
- v1（已废）：仅补 step 戳,依赖 run.js:2300-2305 现有推导,不置 stage status。
- 修正：run.js:2299-2305 的"所有 step done → stage completed"推导**只在 `completeStep` 内执行**；`alignExecuteToPlan` 直接 `_write`、不走 `completeStep`,若不显式置 stage status,execute `stageData.status` 仍≠completed → `checkTransition(execute→verify)` 仍拦截 → 死锁未真正打通。
- answer: `alignExecuteToPlan` 补 step 戳 + **显式置 execute `stageData.status='completed'` + `completedAt`**。不触发 worktree cleanup（align 只对齐 progress,worktree 由其自身生命周期管理；典型场景 worktree 已 cleanup）。
- impacts: [Phase 1 写操作、alignExecuteToPlan 接口定义]

### D-004@v1: plan 误勾风险由 verify 兜底
- type: risk
- status: accepted
- source: design
- question: agent 误勾 plan checkbox → 对齐误标完成 → 进 verify 失败。接受？
- answer: 接受。doctor 信任 plan.md 声明（同 archive）,不重新验证代码；verify 阶段对照 design + 跑测试会抓到。输出明确提示"已基于声明对齐,请确认 verify 通过"。
- impacts: [R1 应对]

### D-005@v1: fail-loud 仅改拒绝侧,不动成功侧
- type: boundary
- status: accepted
- source: design
- question: fail-loud 实现范围？
- answer: 仅在 `enforceDepsGate` 拒绝时（stderr）加显眼阻断块 + 明确"本次 --done 未完成"。不动成功侧 stdout 输出（保守,减少对现有 agent 解析的误伤）。
- impacts: [Phase 3 实现]

## 附带候选（非核心,plan 阶段决定是否纳入）

**`run.js:3328` `skipStep` 的 `platformOpts` 未定义 bug**：本次 brainstorm 跑 `--skip` 时实际触发 `ReferenceError: platformOpts is not defined`(skipStep 函数作用域未定义 platformOpts,第 3328 行 `platformOpts?.specRoot` 与第 3339 行 `triggerSync(...,platformOpts)` 均会炸）。与本变更核心无关,但成本极低（透传参数）,可顺手在同一 execute 里修,或单开变更。plan 阶段定。
