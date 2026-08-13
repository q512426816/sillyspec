---
author: qinyi
created_at: 2026-08-13T14:35:00
scale: large
risk_level: contract-required
---

# 设计文档（Design）— worktree execute 静默代码丢失防丢卫（cleanup fail-closed + 阶段级核验）

## 背景

多 agent 并行执行 worktree execute 时，子代理可在 worktree 工作区"实现"代码、甚至跑通测试写了 review.json，但**从未 commit 到 `sillyspec/<change>` 分支**。随后 worktree 目录被清（apply 后自动 cleanup / execute 完成 cleanup / 显式 cleanup / 并行 session），未 commit 的实现代码随目录蒸发，而 progress 仍全绿无告警。实证（change `2026-08-09-security-backend-guardrails`，见 multi-agent-platform/docs/sillyspec/worktree-execute-total-loss.md）：

- worktree 目录 `.sillyspec/.runtime/worktrees/<X>/` 被清（`git worktree list` 仍注册，磁盘无目录）；
- 分支 `sillyspec/<X>` 只有 1 个 baseline checkpoint commit，目标新文件 `git cat-file -e` 不存在；
- `git fsck --lost-found` 的 dangling commit 里找不到含目标代码的提交；
- progress 显示「⚡ 波次执行」全部 ✅（含"测试运行全绿""代码审查通过"等文案）。

即：sillyspec.db 记"done"，磁盘 + git 里没有任何代码，**静默数据丢失**。不主动核验三连（分支 commit / tree 含文件 / fsck）会以为已交付。

根因实证：
1. `worktree.js cleanup()`（:712-840）直接 `git worktree remove --force`，**不检查 worktree 是否有未 commit / 未落主仓的交付变更**——即使 `hasUnappliedChanges` 已有此检测能力，cleanup 也从未调用它（grep 证实 cleanup 各调用点无该保护）。
2. execute 完成路径无"分支确有实现代码"核验：子代理空跑谎报（review 声称实现但代码从未落盘）能一路推进到 execute 完成。

## 设计目标

1. **cleanup fail-closed**：任何 cleanup 调用，若 worktree 有未落主仓 HEAD 的交付变更（清理即蒸发）→ 拒绝清理，显式 `--force` 才绕过。堵"清理目录→代码蒸发"。
2. **execute 阶段级核验**：execute 完成时，聚合最新 run 的 `review.changedFiles`，核验每个交付文件存在于分支 tree **或** worktree 工作区；有声称实现的文件两处皆无 → 警告 + 列文件（防空跑谎报）。
3. **保留现有 execute 工作流**：不强制子代理每 task commit（工作区实现→apply 落盘模式不变）；宽松非阻断为主。
4. **零回归 + apply/reset 逃生**：无未落主仓变更时 cleanup 行为不变。**关键实证（Design Grill 修正）**：`hasUnappliedChanges` 判定主体是 **main HEAD**（`_changesAlreadyOnMain` 用 `git rev-parse HEAD`，docstring「HEAD-only，不查 main 工作区未提交副本」），而 `git apply --3way` 不 commit → apply 后 main HEAD 不变 → 新保护会误阻 apply 后自动 cleanup。故 apply 后（`worktree-apply.js:417/649/759`）与 execute reset（`command.js:960`）的 cleanup **显式传 `force:true` 绕过保护**——apply 已将交付文件复制到主仓工作区、reset 语义即显式销毁脏态，两者"清理即蒸发"前提均不成立，force 语义正当。

## 非目标

- **不含** progress/execute 摘要绑定真实 commit sha + 文件清单（issue 建议 3，防空跑谎报的最后一环）——已确认后续单独排。
- **不强制 task 级 commit**（方案 B 已否决：改变 execute 工作流、与 `verifyReviewGitEvidence` 的 working-tree 并入宽容逻辑冲突）。
- **不校验 commit 内容质量**（子代理 commit 了垃圾/空 commit 的内容审查由 Task Review Gate 已有校验兜底：零改动伪造 / 不相交伪造 / working-tree 并入）。
- **不做 worktree→main 反向同步**（exec-g defer：`.sillyspec/` 文档分叉，超本变更范围）。
- **不改 apply 的核心逻辑**（apply 已从 worktree 工作区取 diff 生成 patch，无需 commit）；仅 apply 后自动 cleanup（`worktree-apply.js:417/649/759`）显式传 `force:true` 绕过保护（代码已复制到主仓工作区，蒸发前提不成立）。

## 拆分判断

为什么这样组织变更：防丢失是**两条正交防线**——
- 防线 1（cleanup 保护）在**清理动作**上，防"有代码但被删"；
- 防线 2（阶段级核验）在**完成判定**上，防"声称有代码但从未存在"。

两防线独立、可单独测试，合并在一个 change 内因为共享根因（分支无实现 commit 的危险区）且同属 execute/worktree 生命周期，避免拆两个变更重复走流程。

不走批量模式：本变更是 sillyspec 自托管工具的确定性校验增强（CLI 能确定判定"文件是否落盘"），不是软判定批量抽查场景，无批量需求。

## 总体方案

### Phase 1：cleanup fail-closed 保护（`src/worktree.js`）

`cleanup(changeName, { force, maxRetries })` 在 junction 解链（:738）**之前**、`git worktree remove --force`（:770）**之前**插入保护：

```
if (!force) {
  const check = this.hasUnappliedChanges(name)
  if (check.hasChanges) {
    console.error('🚫 worktree cleanup 拒绝：N 个交付变更未落地主工作区 HEAD，清理会丢失代码。')
    console.error('   文件：<list>')
    console.error('   请先落地（sillyspec worktree apply <name>）或 commit 到分支，或显式 --force 强制清理。')
    return { result: 'blocked', mode, details: [...details, 'blocked: uncommitted deliverable changes'], residual: [] }
  }
}
```

语义（复用 `hasUnappliedChanges` 已证伪的判定）：
- `hasChanges:false`（全部变更已 byte-identical 出现在主仓 HEAD）→ 照常清理（子代理已 commit 且落 main / 干净分支）。
- `hasChanges:true`（未 commit 且未 apply / 已 commit 但未 apply 到主仓）→ 拒绝。**注意 apply 后也判 true**（`git apply --3way` 不 commit、main HEAD 不变，Grill B-1 实证），故 apply 后 cleanup 须显式 force 绕过（见下方调用点契约）。
- `--force` 显式跳过保护（逃生通道，`index.js:1007` 显式 cleanup 命令已支持 force）。
- in-place（无隔离目录）/ native-worktree（外部环境）由 `hasUnappliedChanges` 内部已处理返回 false → 保护自然跳过，零回归。

覆盖所有 cleanup 调用点（含各点对 `blocked` 返回的处理契约，Grill B-2/B-3 修正）：
- `worktree-apply.js:417/649/759`（apply 后自动 cleanup）：**显式传 `force:true`**——apply 已把交付文件复制到主仓工作区（未 commit、main HEAD 不变），不强传会误阻正常 apply 后清理。
- `command.js:960`（execute reset）：**显式传 `force:true`**——reset 语义即显式销毁脏态 worktree（用户已确认丢弃），被保护阻断会令 reset 失效。
- `complete-handlers.js:860`（execute 完成）：已有 `hasUnappliedChanges` 前置检查（hasChanges → 走 apply 分支不 cleanup），只有 false 才调 cleanup → 保护不会触发（幂等冗余，无害）。
- `complete-handlers.js:170`（archive）：worktree 应已 apply 完；若仍有未落主仓变更 → 触发 `blocked`（合理拦截，提示先 apply）。
- `index.js:1007`（显式 `worktree cleanup` 命令）：blocked → 打印「N 个交付变更未落地主工作区 HEAD，拒绝清理，请先 `sillyspec worktree apply <name>` 或 commit 到分支，或 `--force` 强制清理」（原 else 分支会误打印「worktree 未找到」，需补显式分支）。

### Phase 2：execute 阶段级核验（防空跑谎报）

新增纯函数 `findMissingDeliverables`（`src/worktree.js` 导出）：

```js
/**
 * execute 阶段级核验（防空跑谎报）：聚合 review.changedFiles 的交付文件，逐个核验
 * 存在于 worktree 分支 tree 或 worktree 工作区。两处皆无 = 声称实现但从未落盘。
 * @param {object} p
 * @param {string} p.worktreePath - worktree 根目录
 * @param {string} p.branch - sillyspec/<change> 分支名（核验 tree）
 * @param {string[]} p.changedFiles - review 声称的交付文件（非 .sillyspec）
 * @returns {{ missing: string[], verified: string[], checked: boolean }}
 *   checked=false 表示无法核验（worktree/分支不存在），调用方保守提示。
 */
```

核验逻辑：对每个文件，`git cat-file -e <branch>:<file>` 成功（在分支 tree）**或** `existsSync(worktreePath/<file>)`（在工作区）→ verified；两处皆无 → missing。

调用方：`complete-handlers.js` execute 完成路径（`handleExecuteWorktreeCleanup` **之前**），聚合最新 execute run 的 `review.changedFiles`：

```
const changedFiles = collectExecuteChangedFiles({ runtimeRoot, changeName })  // 聚合各 task review.json 的 changedFiles
const missing = findMissingDeliverables({ worktreePath, branch, changedFiles })
if (missing.length > 0) {
  console.warn('⚠️ execute 阶段级核验：以下声称实现的交付文件既不在分支也不在工作区，疑似空跑/从未落盘：')
  missing.forEach(f => console.warn(`   ${f}`))
  console.warn('   请检查子代理是否真实实现，或先 commit 到分支；apply 将无源可复制。')
}
```

**定位收敛（Grill B-4 修正）**：阶段级核验是 Task Review Gate 之上的**补充防线**，非独立检出命名场景。Task Review Gate 已 fail-closed 拦「代码从未存在」（零改动伪造 / 不相交伪造，task-review.js:590-623），本核验的真实增量窗口是「review 通过后文件被删且未 commit」+ 「无法核验时给人工确认提示」。坑1 实景（完成时点代码在工作区 / worktree 已丢）分别走 verified 与 `checked:false`，不报 missing——不承诺检出该场景，如实标注。

宽松非阻断（warn 不 exit）：保留"工作区实现→apply 落盘"模式——工作区存在文件的 task 不算 missing（apply 能复制）。`checked:false`（worktree 已丢/分支不存在）→ 保守提示"无法核验，请人工确认"，与 Phase 1 cleanup 保护独立兜底互补。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/worktree.js | `cleanup()` 加 fail-closed 保护（未落主仓交付变更拒绝清理，--force 绕过）；新增导出纯函数 `findMissingDeliverables`；`hasUnappliedChanges` 复用不改。无对外字段变更，纯内部校验逻辑，说明列无数据流 |
| 修改 | src/run/complete-handlers.js | execute 完成路径 `handleExecuteWorktreeCleanup` 前加阶段级核验：聚合 review.changedFiles → `findMissingDeliverables` → 缺失 warn（宽松非阻断）。无对外字段变更 |
| 修改 | src/worktree-apply.js | apply 后自动 cleanup（:417/649/759）显式传 `force:true` 绕过保护（apply 已复制到主仓工作区，Grill B-1 修正）。无对外字段变更 |
| 修改 | src/run/command.js | execute reset 的 cleanup（:960）显式传 `force:true`（reset 即显式销毁，Grill B-3 修正）。无对外字段变更 |
| 修改 | src/index.js | 显式 `worktree cleanup` 命令：blocked 返回补显式分支，打印拒绝提示（原 else 误打印「worktree 未找到」，Grill B-2 修正）。无对外字段变更 |
| 新增 | test/worktree-cleanup-guard.test.mjs | cleanup 保护单测：未落主仓拦截 / --force 绕过 / apply 后 force 放行 / 幂等 skipped / in-place 跳过 |
| 新增 | test/execute-loss-guard.test.mjs | `findMissingDeliverables` 纯函数（分支 tree / 工作区 / 两处皆无 / 无法核验）+ 完成路径聚合集成测 |
| 修改 | .sillyspec/docs/sillyspec/modules/worktree.md | cleanup blocked 返回值 + force 调用点契约 + findMissingDeliverables 接口同步（task-04） |
| 修改 | .sillyspec/docs/sillyspec/modules/cli-entry.md | execute 完成阶段级核验 + cleanup blocked 提示同步（task-04） |

## 接口定义

### `WorktreeManager.cleanup(changeName, { force, maxRetries })`（行为变化）

- 新增返回结果 `result: 'blocked'`：保护触发（`!force && hasUnappliedChanges.hasChanges`），拒绝清理。
- `force:true` 跳过保护（行为不变）。
- 其余返回（skipped / kept / cleaned / force-cleaned / partial）不变。

### 新增导出纯函数 `findMissingDeliverables({ worktreePath, branch, changedFiles })`

返回 `{ missing: string[], verified: string[], checked: boolean }`：
- `checked:false`：worktreePath 不存在或 branch 不存在（`git rev-parse --verify <branch>` 失败）→ 无法核验。
- 逐文件：`git cat-file -e <branch>:<file>` 或 `existsSync(worktreePath/<file>)` → verified；否则 missing。
- **跨仓过滤（Grill M11）**：调用方聚合 `review.changedFiles` 时按 `review.repo` 过滤——仅主仓（repo 缺省或 'main'）的 changedFiles 参与核验；跨仓 task 文件由跨仓仓独立落地，不在主仓 worktree/分支，混入会误报 missing（warn-only，可容忍但应排除）。

### 辅助函数 `collectExecuteChangedFiles({ runtimeRoot, changeName })`

聚合最新 execute run 各 task review.json 的 changedFiles（主仓 repo 过滤），返回 `string[]`。实现复用 `resolveLatestExecuteRunIdWithTasks`（task-review.js:684，规避 marker 漂移）+ `readReview`。

## 生命周期契约表

不涉及生命周期契约（本变更是 worktree/execute 的确定性校验增强，非 session/lease/agent_run/daemon 事件流；"execute 完成"是流程状态机推进，非跨进程生命周期事件）。

## 数据模型

无。不新增/修改任何 DB 表结构或运行时文件 schema。

## 兼容策略

- **默认行为不变**：无未落主仓交付变更时，cleanup 照常（hasChanges:false → 不触发保护）。
- **新保护仅在风险态拦截**：未 commit 且未 apply（清理即蒸发）或已 commit 未 apply（apply 需 worktree）时拒绝，两者都是原有"该先 apply/commit 再清理"的合法前置，非意外破坏。
- **逃生通道**：`--force` 保留，显式绕过保护（原 worktree cleanup --force 语义不变）。
- **旧 meta 兼容**：`hasUnappliedChanges` 对缺 meta / 缺 diffBase / 目录不存在均返回 `hasChanges:false`（保守放行清理），旧 worktree 无新字段依赖。
- **不改变的 API**：`cleanup` 签名不变（行为增强）；`applyWorktree` / `assessApplyRisk` / Task Review Gate 核心逻辑不动。唯一例外：apply 后自动 cleanup 与 execute reset 的 cleanup 显式传 `force:true`（Grill B-1/B-3，见调用点契约）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | cleanup 保护误拦 apply 后 cleanup：`hasUnappliedChanges` 判定主体是 main HEAD，而 `git apply --3way` 不 commit → apply 后仍判 true | P1 | **Grill 修正**：apply 后自动 cleanup 显式传 `force:true`（代码已复制到主仓工作区，蒸发前提不成立）；`worktree-cleanup-guard` 补"apply 后 force 放行 + 未 commit 无 force 拦截"用例锁定 |
| R-02 | 阶段级核验在 worktree 目录已丢时无法核验（读到目录不存在）→ `checked:false` 保守提示"无法核验" | P2 | 与 Phase 1 cleanup 保护独立互补：目录被清前 cleanup 已拦（防线 1），目录已丢后的核验仅提示人工确认，不阻断（代码已丢失是既成事实，核验无法补救） |
| R-03 | 并行 session 的 cleanup 触发保护（他者 worktree 有未落主仓变更）→ 本 session 无法 cleanup | P2 | fail-closed 正确行为：提示先落地或 --force 显式绕过；符合"代码可能随时在修改，破坏性操作前确认"铁律 |
| R-04 | 阶段级核验漏 review（cannot_verify 草稿 changedFiles 空 / low_risk task 豁免）→ 缺失漏报 | P3 | 核验是防空跑的补充防线，非唯一防线；Task Review Gate（零改动伪造 / 不相交伪造）仍兜底，本变更不重复拦截已覆盖场景 |

## 决策追踪

| 决策 ID | 决策 | 被覆盖 |
|---|---|---|
| D-001@v1 | cleanup fail-closed 保护：未落主仓交付变更拒绝清理，需 --force 绕过 | FR-01/02/03，总体方案 Phase 1 |
| D-002@v1 | execute 阶段级核验宽松非阻断（warn 不 exit），保留工作区实现→apply 落盘模式 | FR-04/05/06，总体方案 Phase 2 |
| D-003@v1 | 范围不含 progress 摘要绑定 commit sha（issue 建议 3），后续单独排 | 非目标 |
| D-004@v1 | 否决 task 级强制 commit（方案 B）：改变工作流、与 verifyReviewGitEvidence working-tree 宽容冲突 | 非目标 |
| D-005@v1 | 否决 auto-WIP commit（方案 C）：污染分支历史 | 非目标 |
| D-006@v1 | apply 后自动 cleanup 与 execute reset 的 cleanup 显式传 `force:true` 绕过保护（Grill B-1/B-3：hasUnappliedChanges 判定 main HEAD，apply 不 commit → 不强传会误阻正常清理；reset 语义即显式销毁） | 总体方案 Phase 1 调用点契约，FR-03 |

## 自审

- **章节齐全**：背景/设计目标/非目标/拆分判断/总体方案/文件变更清单/接口定义/风险登记/决策追踪均含。
- **生命周期契约表**：本变更不涉及 lifecycle 关键词描述的事件流（见豁免短语），无需生成表。
- **文件变更清单**：7 文件（5 改 2 增），无新增对外字段，无需数据流标注。
- **规模判定**：跨 worktree.js + complete-handlers.js + worktree-apply.js + command.js + index.js + 2 测试，架构级 → scale=large 正确。
- **设计一致性**：防线 1（cleanup 保护）与防线 2（阶段级核验）共享"分支无实现 commit"根因，互补不重叠（一防删、一防谎报）。
- **可行性与 YAGNI**：`hasUnappliedChanges` 已存在可直接复用；`findMissingDeliverables` 纯函数依赖 git 命令 + fs，无新运行时文件类型、无 schema 变更，落地面可控。未引入超出防丢失目标的机制。
- **Design Grill 修正记录（2026-08-13）**：独立子代理审查发现 1 P0 + 4 P1 gap，已全部修正——B-1（R-01 范畴错误：apply 后 hasUnappliedChanges 仍判 true，改 apply 后 force 绕过，D-006）、B-2（blocked 调用点契约补 5 处）、B-3（reset cleanup 传 force）、B-4（Phase 2 定位收敛为补充防线，不承诺检出坑1 实景）、M11（跨仓 review.repo 过滤）。修正后 specVerdict=pass。
