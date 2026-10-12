---
author: flow-machine-draft
created_at: 2026-10-12T06:27:23.284Z
---
# 需求规格（Requirements）— 2026-10-12-cross-wt-ghost-cleanup

## 功能需求

### FR-01: cleanupCrossWorktrees 清理后以 git worktree list --porcelain 断言注册已消失（对齐 gate-snapshot 双清契约）；prune 失败/断言不过 → result=partial + 落位注册表键保留可重试，不再静默

- 清理路径（目录在走 remove / remove 失败兜底删目录、目录不在走 prune）在收尾时**必须**以 `git worktree list --porcelain` 对照该 worktree 路径复核注册已消失；`git worktree list` 查询异常按未清处理（gate-snapshot D-004@v2 同语义）。复核不过或 prune 抛错时**必须**把该 repo 条目置 `result: 'partial'` 并写入 `residual`，且**禁止**在该状态下回收落位注册表键（键保留供重试/doctor 扫描寻址）。

#### 场景：目录已删 + 注册悬空（事故形态）

Given 跨仓 worktree 目录已被外部删除、跨仓仓 `.git/worktrees/` 注册残留（未 locked）
When 调用 `cleanupCrossWorktrees`（该变更 meta 可寻址到该 repo）
Then 对跨仓仓执行 `git worktree prune` 后复核注册消失 → result=skipped/cleaned、注册表键回收；prune 失败或复核仍在 → result=partial + residual 指明幽灵注册、注册表键保留

#### 场景：正常清理路径复核

Given 跨仓 worktree 目录与 meta 健在且无未 apply 交付
When 调用 `cleanupCrossWorktrees`
Then remove 成功后仍执行 list 复核；注册已消失才判 cleaned 并回收注册表键

### FR-02: locked 幽灵（prune 对 locked 条目静默跳过形态）在 partial 细节中提示 git worktree unlock

- 当注册复核发现残留条目处于 locked 状态（或 `git worktree remove` 因 locked 被拒）时，结果 details **必须**包含可执行的 `git worktree unlock` 提示（带仓根与路径）；清理动作**禁止**自动 unlock（locked 是用户显式保护意图，解除属用户决策）。

#### 场景：locked 幽灵

Given 跨仓 worktree 已 `git worktree lock` 且目录被外部删除
When 调用 `cleanupCrossWorktrees`
Then result=partial，details 含 unlock 命令提示；跨仓仓注册仍残留（prune 跳过 locked），注册表键保留

### FR-03: archiveWorktreeCleanup 主仓清理完成后调用 cleanupCrossWorktrees 兜底跨仓（幂等；跨仓有未 apply 交付时保留并警告，语义与主仓一致；不阻断归档）

- `archiveWorktreeCleanup` **必须**在主仓清理各分支（含 meta 缺失孤儿路径、有未 apply 交付保留路径）之后追加跨仓兜底调用（force=false，幂等，重复调用零副作用）；跨仓清理 partial/有未 apply 交付时**必须**警告并给出修复指引但**禁止**阻断归档流程；跨仓兜底调用抛错时**必须**降级为警告继续归档（fail-open，与既有归档清理语义一致）。

#### 场景：归档兜底清理

Given 变更归档时跨仓 worktree 仍残留（apply 侧清理未走到或 partial）
When 归档流程调用 `archiveWorktreeCleanup`
Then 跨仓 worktree 被清理（无未 apply 交付时）或保留+警告（有交付时）；归档流程继续不被阻断

### FR-04: doctor 新增跨仓注册扫描（local.yaml repos 各仓 git worktree list --porcelain 对照实体目录，失效注册列 finding）+ 新增清理动作 flag（dry-run 默认 + --confirm 执行 prune，对齐 --cleanup-ghosts 范式；locked 条目只提示不自动 unlock）

- doctor 结构化诊断**必须**新增跨仓 worktree 注册健康维度：对 local.yaml repos 注册表各仓跑 `git worktree list --porcelain`，注册路径不存在实体的列 finding（含 locked 标注与 unlock 提示）；无 local.yaml/无 repos 段时 skipped 注记不判红。`sillyspec doctor --prune-cross-worktrees` **必须**默认 dry-run（只列将清理项），加 `--confirm` 才对非 locked 幽灵执行 `git worktree prune` 并以复扫断言清理结果；locked 条目**必须**跳过并列出 unlock 指引，**禁止**自动 unlock。

#### 场景：扫描发现幽灵

Given 跨仓仓存在指向不存在路径的 worktree 注册（目录已删、注册残留）
When 运行 doctor 诊断（或 --prune-cross-worktrees 不带 --confirm）
Then finding 列出该幽灵注册（locked 与否分别标注）；--confirm 后非 locked 幽灵被 prune 清除、复扫为零，locked 幽灵保留并列 unlock 指引

### FR-05: 新增测试覆盖：locked 幽灵夹具（lock+清目录）、归档兜底调用、doctor 扫描/清理 dry-run 与 confirm；全量相关测试绿

- 上述 FR-01~04 的行为路径**必须**有真实 git 夹具测试覆盖（主仓+跨仓仓各一，真实 `git worktree lock`/删目录构造幽灵形态），全部测试**必须**通过；**禁止**为过测试改弱断言。

#### 场景：主路径

Given 测试夹具构造出各缺口对应形态
When 运行 `node --test test/cross-worktree-ghost-registration.test.mjs`
Then 全部用例绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/cross-worktree-ghost-registration.test.mjs「cleanupCrossWorktrees：目录缺失+meta 可寻址——prune 后复核消失→skipped；locked 复核仍在→partial（评审 P2 直测）」+「正常路径 remove 后 list 复核→cleaned+注册表键回收」
FR-02: test/cross-worktree-ghost-registration.test.mjs「cleanupCrossWorktrees：locked 幽灵 partial 细节含 git worktree unlock 提示」
FR-03: test/cross-worktree-ghost-registration.test.mjs「archiveWorktreeCleanup：归档兜底清理跨仓 worktree（无交付→清理；有交付→保留+不阻断）」
FR-04: test/cross-worktree-ghost-registration.test.mjs「doctor 跨仓注册扫描 + --prune-cross-worktrees dry-run/confirm（locked 跳过列指引）」
FR-05: test/cross-worktree-ghost-registration.test.mjs「全文件用例（locked 幽灵/归档兜底/doctor 扫描清理）node --test 全绿」
