---
author: flow-machine-draft
created_at: 2026-10-10T11:38:11.730Z
---
# 提案书（Proposal）— 2026-10-10-cross-wt-repo-local-placement

## 动机

任务原话转写：跨仓 worktree 默认落位改为跨仓仓内 <path>/.sillyspec/.runtime/worktrees/<change>--<repoKey>（用户提议）：天然同盘同文件系统，WSL 主仓+Windows 盘跨仓的工具链分裂形态自动消解，零配置。两前提已验证/就位：git worktree 检出目录位于仓内合法且 .git/info/exclude 追加 .sillyspec/ 后 status 干净（不动用户 .gitignore、不进版本库）；落位注册表（上一变更）保寻回。

成功标准：
- 新默认落位=仓内 .sillyspec/.runtime/worktrees，创建前幂等保障 .git/info/exclude 含 .sillyspec/（仓内落位时），创建后跨仓 git status 干净
- 显式 placement（repos.worktree / worktree.crossPlacement）优先级仍高于新默认；显式配置指向仓根内维持拒绝（手配仓内=误配）；新默认仓内合法（exclude 由系统保障）
- 寻址链 resolveCrossWorktreePath：注册表 > 新公式（仓内，传 repoRoot 时）> 旧公式（主仓 specBase，legacy 兜底）；listCrossWorktreeMetas 扫描注册表∪仓内新默认目录∪旧默认目录，已有老位置 worktree 全链仍可达可清理
- meta.placementMode 记录落位形态（repo-local/explicit/legacy-main-specbase）
- WSL 分裂警告保留（显式配置配错盘仍警告；自动同盘天然不触发）
- 测试：placement 测试默认断言更新（含 exclude/status 断言、旧位置兼容读取）+ 既有 isolation 系列全绿

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. 新默认落位=仓内 .sillyspec/.runtime/worktrees，创建前幂等保障 .git/info/exclude 含 .sillyspec/（仓内落位时），创建后跨仓 git status 干净
2. 显式 placement（repos.worktree / worktree.crossPlacement）优先级仍高于新默认；显式配置指向仓根内维持拒绝（手配仓内=误配）；新默认仓内合法（exclude 由系统保障）
3. 寻址链 resolveCrossWorktreePath：注册表 > 新公式（仓内，传 repoRoot 时）> 旧公式（主仓 specBase，legacy 兜底）；listCrossWorktreeMetas 扫描注册表∪仓内新默认目录∪旧默认目录，已有老位置 worktree 全链仍可达可清理
4. meta.placementMode 记录落位形态（repo-local/explicit/legacy-main-specbase）
5. WSL 分裂警告保留（显式配置配错盘仍警告；自动同盘天然不触发）
6. 测试：placement 测试默认断言更新（含 exclude/status 断言、旧位置兼容读取）+ 既有 isolation 系列全绿

## 成功标准（可验证）

1. 新默认落位=仓内 .sillyspec/.runtime/worktrees，创建前幂等保障 .git/info/exclude 含 .sillyspec/（仓内落位时），创建后跨仓 git status 干净
2. 显式 placement（repos.worktree / worktree.crossPlacement）优先级仍高于新默认；显式配置指向仓根内维持拒绝（手配仓内=误配）；新默认仓内合法（exclude 由系统保障）
3. 寻址链 resolveCrossWorktreePath：注册表 > 新公式（仓内，传 repoRoot 时）> 旧公式（主仓 specBase，legacy 兜底）；listCrossWorktreeMetas 扫描注册表∪仓内新默认目录∪旧默认目录，已有老位置 worktree 全链仍可达可清理
4. meta.placementMode 记录落位形态（repo-local/explicit/legacy-main-specbase）
5. WSL 分裂警告保留（显式配置配错盘仍警告；自动同盘天然不触发）
6. 测试：placement 测试默认断言更新（含 exclude/status 断言、旧位置兼容读取）+ 既有 isolation 系列全绿
