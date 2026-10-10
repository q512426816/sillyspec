---
author: flow-machine-draft
created_at: 2026-10-10T11:38:11.730Z
---
# 需求规格（Requirements）— 2026-10-10-cross-wt-repo-local-placement

## 功能需求

### FR-01: 新默认落位=仓内 .sillyspec/.runtime/worktrees，创建前幂等保障 .git/info/exclude 含 .sillyspec/（仓内落位时），创建后跨仓 git status 干净

- 必须：跨仓仓未配置显式落位时，ensureCrossWorktrees 创建的 worktree 必须落在 `<跨仓仓根>/.sillyspec/.runtime/worktrees/<change>--<repoKey>`；创建前必须幂等写 `.git/info/exclude` 追加 `.sillyspec/` 条目；创建后跨仓 `git status --porcelain` 必须为空（worktree 不成 untracked 噪音）。
- 禁止：exclude 保障触碰用户 `.gitignore` 文件（只写 `.git/info/exclude`——本仓生效、不进版本库）。

#### 场景：主路径
- Given 跨仓仓未配置任何落位
- When ensureCrossWorktrees
- Then worktree 建于仓内 .sillyspec/.runtime/worktrees、info/exclude 含 .sillyspec/、跨仓 status 干净

### FR-02: 显式 placement（repos.worktree / worktree.crossPlacement）优先级仍高于新默认；显式配置指向仓根内维持拒绝（手配仓内=误配）；新默认仓内合法（exclude 由系统保障）

- 必须：显式落位配置在场时落位取显式值（优先于仓内新默认）；显式值解析后落在跨仓仓根内必须拒绝创建（fail-closed）。
- 必须：meta 必须记录 placementMode（repo-local / explicit-inline / explicit-legacy）。

#### 场景：主路径
- Given repos.front 同时配 worktree=A
- When ensureCrossWorktrees
- Then worktree 落 A 而非仓内默认；meta.placementMode=explicit-inline

### FR-03: 寻址链 resolveCrossWorktreePath：注册表 > 新公式（仓内，传 repoRoot 时）> 旧公式（主仓 specBase，legacy 兜底）；listCrossWorktreeMetas 扫描注册表∪仓内新默认目录∪旧默认目录，已有老位置 worktree 全链仍可达可清理

- 必须：resolveCrossWorktreePathCandidates 必须按「注册表条目 → 仓内新公式 → 主仓 specBase 旧公式」有序去重返回；getCrossWorktreeMeta 与 reconcile B' 档必须逐候选探测 meta 在场。
- 必须：仅存在于旧默认位置（无注册表条目）的存量 worktree 必须仍可被 getCrossWorktreeMeta 读取、listCrossWorktreeMetas 枚举、cleanupCrossWorktrees 清理。

#### 场景：主路径
- Given 上一版本创建的 worktree 在主仓 specBase 旧位置且无注册表条目
- When meta 读取/list/cleanup
- Then 全链可达，行为与新位置一致

### FR-04: WSL 分裂警告保留（显式配置配错盘仍警告；自动同盘天然不触发）

- 必须：isWslSplit 判定与警告逻辑保留；显式落位配到异文件系统（repoRoot 在 /mnt/<盘>/ 而 worktree 不在）时必须警告；仓内新默认与 repoRoot 同盘，天然不触发。

#### 场景：主路径
- Given 未配置显式落位（仓内默认）
- When ensureCrossWorktrees
- Then 零分裂警告（worktree 与 repoRoot 同盘）

### FR-05: 测试：placement 测试默认断言更新（含 exclude/status 断言、旧位置兼容读取）+ 既有 isolation 系列全绿

- 必须：本变更触达面测试（placement/isolation/reconcile/apply/verify/task-review/multi-repo-context 系列）收口时全部通过。

#### 场景：主路径
- When 跑相关面测试
- Then 0 fail

## 测试绑定（每条 FR 至少一行）

FR-01: test/cross-worktree-placement.test.mjs「缺省落位=仓内 .sillyspec/.runtime/worktrees（repo-local，FR-01/02）」
FR-02: test/cross-worktree-placement.test.mjs「repos 条目内联 worktree 落位 + 优先级高于 crossPlacement」+「placement 落位根在跨仓仓根内 → 配置错拒绝创建」
FR-03: test/cross-worktree-placement.test.mjs「旧默认位置（主仓 specBase）存量 worktree 仍可寻址可清理（legacy 兜底）」+ test/cross-repo-reconcile-baseline-anchor.test.mjs「B' 档」
FR-04: test/cross-worktree-placement.test.mjs「isWslSplit：linux /mnt 命中、非 /mnt 不命中、win32 恒 false」（同盘不触发由仓内默认断言隐含覆盖）
FR-05: 不适用：组合验证——收口 CLI 实测门跑本变更测试面（isolation/placement/reconcile 等 60+ 用例）全绿即证
