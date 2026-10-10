---
author: flow-machine-draft
created_at: 2026-10-10T11:04:18.181Z
---
# 任务注册表（Tasks）— 2026-10-10-repo-inline-worktree-placement

- [x] task-01: parseRepoRegistry 双形态解析：字符串条目行为逐字节不变；对象条目（块式 key: 后缩进子键 / inline {path:.., worktree:..}）Map 值恒取 path（13 个消费文件零改动）；新增 parseRepoWorktreePlacements 导出读 worktree 子键
- [x] task-02: ensureCrossWorktrees 落位优先级：repos.<key>.worktree > worktree.crossPlacement.<key> > 默认公式；仓根内拒绝/注册表/WSL 警告语义对两配置源一致
- [x] task-03: hooks/worktree-guard analyzeCrossRepoCd 与 worktree-deps registeredRepoRoots 对对象形态不失效（cd 纠偏取 path；roots 集合不含 worktree 子键值）
- [x] task-04: config-schema 文档：repos.<key>.worktree 键条目 + crossPlacement 标注兼容保留（推荐 repos 内联）
- [x] task-05: 测试：双形态解析/优先级/旁路消费方不失效，全绿
