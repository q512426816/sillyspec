---
author: flow-machine-draft
created_at: 2026-11-12T00:16:33.152Z
---
# 任务注册表（Tasks）— 2026-11-12-baseline-own-declared-skip

- [x] task-01: _overlayBaseline 返回 ownDeclaredFiles（本变更声明集 ∩ overlay 文件），文件仍复制进 worktree
- [x] task-02: _createBaselineCheckpoint 以 pathspec 排除 ownDeclaredFiles，checkpoint 后这些文件保持未提交态
- [x] task-03: 归档前置检查（applyWorktree checkOnly）新增 deliverableFaceCommittedOnly：只算 baselineCommit..HEAD + untracked
- [x] task-04: 未声明命中时行为与现状完全一致；apply 主流程不受影响
