---
author: flow-machine-draft
created_at: 2026-10-10T11:38:11.730Z
---
# 任务注册表（Tasks）— 2026-10-10-cross-wt-repo-local-placement

- [x] task-01: 新默认落位=仓内 .sillyspec/.runtime/worktrees，创建前幂等保障 .git/info/exclude 含 .sillyspec/（仓内落位时），创建后跨仓 git status 干净
- [x] task-02: 显式 placement（repos.worktree / worktree.crossPlacement）优先级仍高于新默认；显式配置指向仓根内维持拒绝（手配仓内=误配）；新默认仓内合法（exclude 由系统保障）
- [x] task-03: 寻址链 resolveCrossWorktreePath：注册表 > 新公式（仓内，传 repoRoot 时）> 旧公式（主仓 specBase，legacy 兜底）；listCrossWorktreeMetas 扫描注册表∪仓内新默认目录∪旧默认目录，已有老位置 worktree 全链仍可达可清理
- [x] task-04: meta.placementMode 记录落位形态（repo-local/explicit/legacy-main-specbase）
- [x] task-05: WSL 分裂警告保留（显式配置配错盘仍警告；自动同盘天然不触发）
- [x] task-06: 测试：placement 测试默认断言更新（含 exclude/status 断言、旧位置兼容读取）+ 既有 isolation 系列全绿
