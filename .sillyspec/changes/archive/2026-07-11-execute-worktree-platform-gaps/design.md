---
author: qinyi
created_at: 2026-07-11T20:34:43
change: 2026-07-11-execute-worktree-platform-gaps
stage: brainstorm
status: draft
scale: large
---

# Design — execute-worktree 平台模式三个工具层坑修复

## 1. 背景

来源：`multi-agent-platform/docs/sillyspec/execute-worktree-platform-gaps.md`（2026-07-10 实测，已核验 sillyspec 3.23.0 全部未解决）。场景：**平台模式（specDir 指向 `~/.sillyhub` 等外部目录）+ worktree 隔离**下跑 execute，代码完成后被三个工具层问题阻断收尾。

三个坑的根因（均已代码核实）：

### 坑 1：worktree apply baseline 漂移，缺降级路径

- 检测点：`src/worktree-apply.js:165-183`（步骤 4.5）。`if (meta.baselineHash) { ... if (currentHash !== meta.baselineHash) { result.errors.push('主工作区 baseline 已变化...'); return result; } }`。
- `currentHash`（:173）= 主工作区脏状态哈希（`diff --cached` + `diff` + `ls-files --others`，排除 `.sillyspec/`），反映 execute 期间主仓库的暂存/未暂存/未跟踪变更。
- 触发：execute 期间主仓库 main 推进 + 工作区 dirty（如 `docs/sillyspec/` 下文件移动未 commit）→ `currentHash !== meta.baselineHash` → `applyWorktree` 直接 return error，patch 无法应用。
- 现状：无降级路径。`worktree.md:84` 明确记录架构决策「补丁方式应用而非 merge | 保持线性历史」。bug 报告诉求：给 `--merge` 选项（git merge worktree 分支替代 patch），git merge 比 patch apply 鲁棒、能处理 baseline 漂移 + 潜在冲突。

### 坑 2：平台模式 review.json 落盘失效（路径错位）

- 写侧（prompt）：`src/stages/execute.js:623` 硬编码 `task-XX 对应：.sillyspec/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json`；`:644` 同样硬编码 `将端点清单写入 .sillyspec/.runtime/contract-artifacts/<task-name>/endpoints.json`。**不用 `{SPEC_ROOT}` 占位符**。
- 读侧（gate）：已对齐平台 specDir——`src/run.js:3291` `effectiveSpecBase = platformOpts?.specRoot || specBase`，`:3297` `runtimeRoot = join(effectiveSpecBase, '.runtime')`，`src/task-review.js:165` 从该 runtimeRoot 读 review.json。
- 路径重写：`src/run.js:731-797` 平台模式只替换 `{SPEC_ROOT}/{DOCS_ROOT}/{PROJECTS_ROOT}/{WORKFLOWS_ROOT}/{KNOWLEDGE_ROOT}` 占位符，**对裸 `.sillyspec/.runtime/` 字面量不替换**。
- 后果：平台模式下 agent 按 prompt 写到 `cwd/.sillyspec/.runtime/...`，gate 去 `~/.sillyhub/.runtime/...` 找 → 路径错位 → `execute --done` Step 15 永远报"task-XX 缺少 review.json"，落盘机制完全不工作。

### 建议 3：阻断信息缺期望路径 + runId

- `src/task-review.js:182` 主阻断文案 `"{taskId}: 缺少 review.json — task 未经过评审"`、`:461` `printReviewResult` 提示、`src/run.js:3329-3333` 补充提示——三处都只有 task id，无期望 review.json 路径、无 runId。平台模式下 agent 不知道该往哪写。

## 2. 设计目标

1. **坑 1**：baseline 漂移时提供 `--merge` 显式降级，走 `git merge sillyspec/<change>` 替代 patch apply；默认 patch 行为不变（线性历史保留）。
2. **坑 2**：execute prompt 中所有 `.runtime` 路径用 `{SPEC_ROOT}/.runtime/` 占位符，复用现有平台路径重写，平台模式下 agent 写到 specDir、gate 能读到。
3. **建议 3**：阻断文案拼接期望 review.json 绝对路径 + runId，agent 知道往哪写。
4. 三坑作为一个变更交付（同源 bug 报告、主题统一），Wave 隔离风险（低风险先行）。

## 3. 非目标

- **不**改 worktree apply 的默认 patch 行为（`--merge` 仅作漂移时的显式 opt-in 降级）。
- **不**自动解决 `--merge` 自身的 git merge 冲突（冲突时报错让用户手动处理）。
- **不**改 gate 读侧逻辑（`task-review.js:165` / `run.js:3291` 已对齐 specDir，仅改写侧 prompt + 文案）。
- **不**改 review gate 的放行标准（仍要求 review.json 落盘，不降级为仅看 plan.md checkbox）。
- **不**改 sillyspec.db schema。
- **不**预创建 review.json 模板（修法选占位符，非 CLI 预创建——见 D-003）。
- **不**改 baseline 漂移检测算法本身（排除规则 `-- . ":(exclude).sillyspec/"` 不变）。

## 4. 拆分判断

单一变更，三坑同源一份 bug 报告、主题统一（平台模式 + worktree execute 收尾）。坑 2 与建议 3 在 review gate 上耦合（路径 + 文案）。规模 large：跨 `worktree-apply.js` + `index.js` + `execute.js` + `task-review.js` + `run.js` 五源文件 + 模块文档同步。不拆分、不走批量模式。Wave 内部分离风险：Wave 1（坑 2 + 建议 3，纯 bugfix 低风险）先行，Wave 2（坑 1，新功能 + 架构张力）独立审查。

## 5. 决策记录

### D-001@v1 — 坑 1 解法 = `--merge` 降级（architecture / accepted / user）
- question：worktree apply baseline 漂移如何解决？
- answer：用户选 `--merge` 降级（AskUserQuestion 轮次）。
- normalized_requirement：`applyWorktree` 加 `merge` 选项；检测到 `currentHash !== meta.baselineHash` 且传 `merge` 时走 `git merge sillyspec/<change>` 分支替代 patch；默认（无 `--merge`）仍 return error 报 BLOCKED。
- impacts：FR-1, FR-2, task-W2-*, verify-W2。
- evidence：用户 AskUserQuestion；`worktree-apply.js:165-183`；`worktree.md:84`。

### D-002@v1 — `--merge` 与「线性历史」架构张力的处理（architecture / accepted / code）
- question：`--merge` 与 `worktree.md:84`「patch 而非 merge 保持线性历史」决策冲突？
- answer：`--merge` 仅作 baseline 漂移时显式 opt-in，不改变默认 patch 行为；线性历史仍是默认，`--merge` 是用户知情下的例外。
- normalized_requirement：`--merge` 不作为默认；help / README / worktree.md 标注「会引入合并提交，仅 baseline 漂移时使用」。
- impacts：task-W2-doc。
- evidence：`worktree.md:84` 架构决策表。

### D-003@v1 — 坑 2 修法 = 占位符（architecture / accepted / code）
- question：review.json 平台模式落盘失效怎么修——改 prompt 占位符 vs CLI 预创建模板？
- answer：改 `execute.js` 硬编码 `.sillyspec/.runtime/` 为 `{SPEC_ROOT}/.runtime/` 占位符，复用 `run.js:731-797` 现有平台路径重写。
- normalized_requirement：execute prompt 中所有 `.runtime` 路径用 `{SPEC_ROOT}/.runtime/` 占位符；不新增 CLI 预创建模板机制。
- impacts：FR-3, task-W1-*, verify-W1。
- evidence：`run.js:731-797`（占位符重写机制已存在）；`execute.js:623/644`（硬编码）。

### D-004@v1 — 坑 2 修复范围（boundary / accepted / code）
- question：`execute.js:644` endpoints.json 同样硬编码，是否一起修？
- answer：一起修（同一根因），并 grep 全量 `.sillyspec/.runtime/` 硬编码一并占位符化。
- normalized_requirement：同一变更内修复 `execute.js` 所有 `.sillyspec/.runtime/` 硬编码（至少 :623 + :644，以 grep 实测为准）。
- impacts：task-W1-1。
- evidence：`execute.js:623/644`。

### D-005@v1 — 建议 3 阻断文案内容（boundary / accepted / code）
- question：阻断信息要包含什么？
- answer：期望 review.json 绝对路径（`<effectiveSpecBase>/.runtime/execute-runs/<runId>/tasks/<task>/review.json`）+ runId。
- normalized_requirement：`task-review.js:182` + `:461` + `run.js:3329-3333` 三处阻断文案拼接期望绝对路径 + runId。
- impacts：FR-4, task-W1-2, verify-W1。
- evidence：`task-review.js:182/461`；`run.js:3329-3333`。

## 6. 总体方案

### Wave 1 — 坑 2 + 建议 3（review gate 平台模式修复，低风险纯 bugfix）

**W1-1 坑 2：execute prompt 路径占位符化**（`src/stages/execute.js`）
- `:623` review.json 路径：`.sillyspec/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json` → `{SPEC_ROOT}/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json`
- `:644` endpoints.json 路径：`.sillyspec/.runtime/contract-artifacts/<task-name>/endpoints.json` → `{SPEC_ROOT}/.runtime/contract-artifacts/<task-name>/endpoints.json`
- grep `execute.js` 全量 `.sillyspec/.runtime/` 硬编码一并改（D-004，以 grep 实测为准）。
- 复用 `run.js:731-797` 平台路径重写：`{SPEC_ROOT}` 在仓库内模式替换为 `.sillyspec`，平台模式替换为 specDir。gate 读侧（`task-review.js:165` / `run.js:3291`）已对齐，无需改。

**W1-2 建议 3：阻断文案加期望路径 + runId**（`src/task-review.js` + `src/run.js`）
- `task-review.js:182` 主阻断文案：`"{taskId}: 缺少 review.json — task 未经过评审"` → 追加期望路径 + runId。
- `task-review.js:461` `printReviewResult` 提示 + `run.js:3329-3333` 补充提示：同步追加期望路径 + runId。
- 期望路径来源：gate 已有的 `runtimeRoot`（`run.js:3297`）+ runId（`EXECUTE_RUN_ID` 标记文件，`run.js:1834`），拼成 `<runtimeRoot>/execute-runs/<runId>/tasks/<taskId>/review.json`。

### Wave 2 — 坑 1（worktree apply `--merge` 降级，新功能独立审查）

**W2-1 applyWorktree 加 `merge` 选项**（`src/worktree-apply.js`）
- 签名：`applyWorktree(changeName, { cwd, checkOnly?, merge? })` —— 新增 `merge` 与 `checkOnly` 并列。
- 改 `:165-183` 步骤 4.5 baseline 漂移分支：
  - `currentHash !== meta.baselineHash` 时，若 `merge === true` → 不 return error，改走 merge 降级路径（见 W2-2）。
  - `merge` 未传 → 维持现状（return error 报 BLOCKED，文案补充「可用 `--merge` 降级」提示）。
- `merge` 与 `checkOnly` 互斥语义：`checkOnly=true` 时只检查不执行（merge 不生效），文档标注。

**W2-2 merge 降级路径**（`src/worktree-apply.js`）
- **流程位置**：在步骤 4.5（baseline 漂移检测，:165-183）触发。`merge=true` 且 `currentHash !== meta.baselineHash` 时，**跳过步骤 5-7**（主工作区 hash 校验、patch 生成、`git apply` —— patch 路径专用，merge 模式不适用），改走 merge 路径。步骤 4（变更文件 ⊆ design.md 清单）保留校验 —— worktree 分支的变更本应 ⊆ 清单，超清单是 worktree 自身问题（非 merge 引入）。
- 执行 `git -C <projectRoot> merge sillyspec/<change>`（分支前缀见 `worktree.js` `BRANCH_PREFIX`，plan 核实确切值）。
- merge 成功 → `result.merged = true` + merge 摘要；按现有 apply 成功流程自动 cleanup worktree（文件头注释第 8 步；cleanup 删 worktree 目录 + 分支，merge 后分支已合并、`git branch -d` 语义安全）。
- merge 失败（冲突）→ `result.errors.push('git merge 冲突，请手动解决：<冲突文件列表>')`，**不自动解决**（D-001 剩余风险），`git merge --abort` 回滚到合并前状态避免半成品。
- git 子进程沿用 `execSync` + `stdio:['pipe','pipe','pipe']` 约定（CONVENTIONS「代码风格」）。

**W2-3 CLI flag 注册**（`src/index.js`）
- `case 'apply'`（:633-668）：`const merge = args.includes('--merge');` + `applyWorktree(wtName, { cwd: dir, checkOnly, merge });`。
- 用法提示（:635）更新：`sillyspec worktree apply <change-name> [--check-only] [--merge]`。
- `assess`（:670-676，用 `assessApplyRisk`）：assessApplyRisk 无 baseline 检测（grep 确认），assess 不执行 apply/merge，`--merge` 对 assess 无意义；若 `assessApplyRisk` 自身有漂移类阻断（待 plan 核实其 BLOCKED 逻辑），文案补充「可用 `apply --merge` 降级」。

**W2-4 文档同步**（D-002）
- `worktree.md:84` 架构决策表补注：「默认 patch 保持线性历史；`--merge` 为 baseline 漂移时的可选降级，会引入合并提交」。
- `bin` / `cli-entry` 模块文档 + help 文案标注 `--merge` 语义。

## 7. 文件变更清单

| 操作 | 文件路径 | 说明 | Wave |
|---|---|---|---|
| 修改 | `src/stages/execute.js` | `:623` review.json + `:644` endpoints.json + grep 全量 `.sillyspec/.runtime/` 硬编码 → `{SPEC_ROOT}/.runtime/` 占位符（D-003/004） | W1 |
| 修改 | `src/task-review.js` | `:182` 主阻断文案 + `:461` printReviewResult 提示 → 拼接期望路径 + runId（D-005） | W1 |
| 修改 | `src/run.js` | `:3329-3333` 补充提示文案 → 拼接期望路径 + runId（D-005） | W1 |
| 修改 | `src/worktree-apply.js` | `applyWorktree` 签名加 `merge`；`:165-183` baseline 漂移分支加 merge 降级；新增 merge 降级路径 + `result.merged`（D-001） | W2 |
| 修改 | `src/index.js` | `case 'apply'`（:633-668）注册 `--merge` flag + 传入；用法提示更新；assess 文案补充降级指引（D-001） | W2 |
| 新增 | `test/execute-prompt-spec-root-placeholder.test.mjs` | execute.js prompt 含 `{SPEC_ROOT}/.runtime/` 占位符、无裸 `.sillyspec/.runtime/` 硬编码（坑 2） | W1 |
| 新增 | `test/review-gate-block-message.test.mjs` | 阻断文案含期望路径 + runId（建议 3） | W1 |
| 新增 | `test/worktree-apply-merge-fallback.test.mjs` | baseline 漂移：`--merge` 走 git merge / 无 `--merge` 仍 BLOCKED / merge 冲突报错回滚（坑 1） | W2 |
| 修改 | `.sillyspec/docs/sillyspec/modules/worktree.md` | applyWorktree `merge` 选项 + 架构决策表 `--merge` 注（D-002） | W2 |
| 修改 | `.sillyspec/docs/sillyspec/modules/stages.md` | execute prompt 占位符化说明（若该卡片覆盖 execute.js prompt） | W1 |
| 修改 | `docs/sillyspec/file-lifecycle.md` | `--merge` flag 说明（若涉及运行时文件，更新 updated_at） | W2 |

> CLAUDE.md 强制：修改 `src/stages/` prompt（坑 2）后同步 `docs/sillyspec/file-lifecycle.md`；涉及 skill 时同步 `.claude/skills/`。本次 execute.js prompt 改路径占位符，不新增/删除输出文件类型，file-lifecycle 主要补 `--merge`。

## 8. 接口定义

### `applyWorktree(changeName, { cwd, checkOnly?, merge? })`（`src/worktree-apply.js`）

```js
/**
 * 将 worktree 变更应用到主工作区。
 * @param {string} changeName
 * @param {object} opts
 * @param {string} opts.cwd - 主仓库根
 * @param {boolean} [opts.checkOnly=false] - 仅检查不执行
 * @param {boolean} [opts.merge=false] - baseline 漂移时用 git merge sillyspec/<change> 替代 patch（D-001）
 * @returns {object} result - { errors, changedFiles, warnings, merged? }
 *   merged: true 表示走了 merge 降级路径（仅 merge=true 且漂移时）
 */
```

行为矩阵：

| baseline 漂移？ | merge | checkOnly | 行为 |
|---|---|---|---|
| 否 | * | false | 现有 patch apply 流程（不变） |
| 否 | * | true | 现有 check-only（不变） |
| 是 | false | * | return error 报 BLOCKED（文案补「可用 --merge 降级」） |
| 是 | true | false | git merge sillyspec/<change>；冲突则 abort + 报错 |
| 是 | true | true | 不执行 merge，按 check-only 报漂移（merge 在 checkOnly 不生效） |

### execute prompt 路径（`src/stages/execute.js`）

```
task-XX 对应：{SPEC_ROOT}/.runtime/execute-runs/{EXECUTE_RUN_ID}/tasks/task-XX/review.json
端点清单写入：{SPEC_ROOT}/.runtime/contract-artifacts/<task-name>/endpoints.json
```

`{SPEC_ROOT}` 由 `run.js:731-797` 平台路径重写消费（仓库内模式→`.sillyspec`，平台模式→specDir）。

### 阻断文案（`task-review.js:182` 示例）

```
{taskId}: 缺少 review.json — task 未经过评审
期望路径：{runtimeRoot}/execute-runs/{runId}/tasks/{taskId}/review.json
（execute run ID: {runId}）
```

## 9. 验收标准

- **FR-1（坑 1a）**：构造 baseline 漂移场景（execute 期间主工作区产生排除范围外的脏变更），`applyWorktree(name, { merge: true })` 不报 error，执行 `git merge sillyspec/<name>`，`result.merged === true`。
- **FR-2（坑 1b）**：同场景 `applyWorktree(name, { merge: false })`（默认）仍 return error 报 BLOCKED，文案含「可用 --merge 降级」。
- **FR-3（坑 2）**：`src/stages/execute.js` grep `\.sillyspec/\.runtime/` 为空（全部占位符化）；prompt 含 `{SPEC_ROOT}/.runtime/execute-runs/` 与 `{SPEC_ROOT}/.runtime/contract-artifacts/`。
- **FR-4（建议 3）**：`task-review.js:182/461` + `run.js:3329-3333` 阻断文案断言含期望 review.json 路径 + runId。
- **FR-5（merge 冲突）**：构造 `git merge` 冲突，`applyWorktree(name, { merge: true })` return error 含冲突文件列表，且主仓库无半成品合并（`git merge --abort` 已回滚）。
- **回归**：现有 `npm test` 全绿；`npm run lint`（check-syntax）0 error。

## 10. 风险与对策

| 风险 | 对策 |
|---|---|
| `--merge` 引入合并提交，破坏线性历史预期（D-002） | 默认不启用；help/worktree.md 标注；仅漂移时显式 opt-in |
| `git merge sillyspec/<change>` 分支前缀不对（BRANCH_PREFIX 待核实） | plan 阶段核实 `worktree.js` 分支命名，execute 阶段测试覆盖 |
| merge 冲突半成品残留 | 冲突时 `git merge --abort` 回滚 + 报错（FR-5） |
| `assessApplyRisk` 自身有漂移阻断逻辑未覆盖 | plan 核实 `assessApplyRisk`（:344）BLOCKED 逻辑，文案补降级指引 |
| execute.js grep 范围不全（除 623/644 外还有遗漏） | W1-1 以 grep 实测全量为准，不只改两行 |
| 占位符化后仓库内模式（非平台）行为回归 | `{SPEC_ROOT}` 仓库内模式重写为 `.sillyspec`，与原硬编码等价；测试覆盖双模式 |

## 11. 回退路径（brownfield 兼容）

- **坑 2**：占位符化是纯文案改动，`{SPEC_ROOT}` 在仓库内模式重写为 `.sillyspec`，与原硬编码 `.sillyspec/.runtime/` 等价 → 仓库内模式零行为变化，仅平台模式修复。回退 = revert execute.js。
- **建议 3**：纯文案追加，不改控制流。回退 = revert 文案。
- **坑 1**：`--merge` 是新增 flag，默认 false → 不传则行为完全不变。回退 = 不使用 `--merge`（漂移时维持原手动 git merge 绕过）。

三个改动均向后兼容，可独立 revert，无数据迁移。

## 12. 测试策略

- **单元**：`applyWorktree` 行为矩阵（FR-1/2/5）；execute.js prompt 占位符 grep 断言（FR-3）；阻断文案断言（FR-4）。
- **集成**：平台模式场景（specDir 指向临时外部目录）构造 execute run，验证 review.json 落盘路径与 gate 读取一致（坑 2 端到端）。
- **回归**：`npm test` 全绿 + `npm run lint`。
- 沿用项目内联 `assertEqual`/`assertThrows` 风格（TESTING.md，`test/run-tests.mjs` 注册新测试文件）。

## 13. 生命周期契约声明

**显式声明：本变更不涉及生命周期契约（session / lease / agent_run / daemon / claim / heartbeat 等有状态实体的事件×状态转换矩阵），无需生命周期契约表。**

理由：
- design 中出现的「worktree 生命周期」「生命周期」均为**泛指 worktree 的 create/cleanup git 操作流程**（`worktree.js` 的物理创建与清理，见 worktree.md「关键数据流」），**不是** sillyspec runtime 层的有状态实体生命周期（session 表、lease 续约、agent_run 状态机等）。
- 本变更不改 worktree create/cleanup 的状态机或时机（非目标已声明），仅在 baseline 漂移时为 apply 增加一条 `--merge` 降级路径（W2-2），不引入任何新的有状态实体或状态转换。
- 不涉及 sillyspec.db schema 变更（非目标已声明），无新表 / 新字段 / 新生命周期事件。

## 14. 自审（brainstorm step 11）

| 检查项 | 结果 | 备注 |
|---|---|---|
| 需求覆盖 | ✅ | 三坑 + 建议3 全覆盖（FR-1~5） |
| Grill 覆盖 | ✅ | 引用全部 D-001~005（§5） |
| 约束一致性 | ✅ | 中文 / ESM / execSync+stdio 三段 pipe / design 是 truth source（CONVENTIONS） |
| 真实性 | ✅ | applyWorktree 签名、worktree-apply.js:165-183、execute.js:623/644、task-review.js:182/461、run.js:3291/3297/3329、index.js:633-668 均已核实；BRANCH_PREFIX 标注待 plan 核实 |
| YAGNI | ✅ | §3 非目标明确，无冗余功能 |
| 验收标准 | ✅ | FR-1~5 具体可测试（§9） |
| 非目标清晰 | ✅ | §3 |
| 兼容策略（brownfield） | ✅ | §11 回退路径，三改动均向后兼容 |
| 风险识别 | ✅ | §10 |
| 生命周期契约 | ✅ | §13 显式声明不涉及 |
