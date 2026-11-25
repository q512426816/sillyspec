---
author: flow-machine-draft
created_at: 2026-11-25T08:44:29.189Z
---
# 提案书（Proposal）— 2026-11-25-freeze-face-body-attribution-and-review-base-fallback

## 动机

任务原话转写：冻结面读提交正文并补 review 基线回退

动机：一、提交标题不含变更名、变更名/task token 只写在提交正文 footer 的提交，被 buildCommitAttribution 判为他侧（COMMIT_LOG_ARGS 只取 %s），其已提交交付文件被 filterCommittedFace 剔出冻结面，change.patch 缺文件、scopeAudit 把计划内文件误判 untouched（平台仓 2026-11-25-autocommit-stale-index-isolation 的 3 个 sillyhub-daemon 文件实证）。二、writeTaskReview 只从 worktree meta 取 base，worktree 清理后无法推断，强制要求 --base/--head/--changed-files 三参数。

成功标准：
- 提交正文中的变更名与 task token 参与归属解析：标题无名、正文含 (<变更名> task-NN) 的提交，其文件经 filterCommittedFace 保留进冻结面
- 新增先红后绿复现测试：同一提交旧实现判 foreign / 新实现判 own（parseCommitLog 带回 body）
- writeTaskReview 无 worktree meta 时回退 flow-state.yaml 的 baseline_commit 作 base、HEAD 作 head，并按 base..HEAD 自动算 changedFiles
- 仅给 --changed-files 时不再强制 base/head（两者缺省回退 HEAD 并给出警告）
- 变更测试面绿、lint 通过

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 提交正文中的变更名与 task token 参与归属解析：标题无名、正文含 (<变更名> task-NN) 的提交，其文件经 filterCommittedFace 保留进冻结面
2. 新增先红后绿复现测试：同一提交旧实现判 foreign / 新实现判 own（parseCommitLog 带回 body）
3. writeTaskReview 无 worktree meta 时回退 flow-state.yaml 的 baseline_commit 作 base、HEAD 作 head，并按 base..HEAD 自动算 changedFiles
4. 仅给 --changed-files 时不再强制 base/head（两者缺省回退 HEAD 并给出警告）
5. 变更测试面绿、lint 通过

## 成功标准（可验证）

1. 提交正文中的变更名与 task token 参与归属解析：标题无名、正文含 (<变更名> task-NN) 的提交，其文件经 filterCommittedFace 保留进冻结面
2. 新增先红后绿复现测试：同一提交旧实现判 foreign / 新实现判 own（parseCommitLog 带回 body）
3. writeTaskReview 无 worktree meta 时回退 flow-state.yaml 的 baseline_commit 作 base、HEAD 作 head，并按 base..HEAD 自动算 changedFiles
4. 仅给 --changed-files 时不再强制 base/head（两者缺省回退 HEAD 并给出警告）
5. 变更测试面绿、lint 通过
