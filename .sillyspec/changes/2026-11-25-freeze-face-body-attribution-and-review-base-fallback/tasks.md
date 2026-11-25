---
author: flow-machine-draft
created_at: 2026-11-25T08:44:29.189Z
---
# 任务注册表（Tasks）— 2026-11-25-freeze-face-body-attribution-and-review-base-fallback

- [ ] task-01: 提交正文中的变更名与 task token 参与归属解析：标题无名、正文含 (<变更名> task-NN) 的提交，其文件经 filterCommittedFace 保留进冻结面
- [ ] task-02: 新增先红后绿复现测试：同一提交旧实现判 foreign / 新实现判 own（parseCommitLog 带回 body）
- [ ] task-03: writeTaskReview 无 worktree meta 时回退 flow-state.yaml 的 baseline_commit 作 base、HEAD 作 head，并按 base..HEAD 自动算 changedFiles
- [ ] task-04: 仅给 --changed-files 时不再强制 base/head（两者缺省回退 HEAD 并给出警告）
- [ ] task-05: 变更测试面绿、lint 通过
