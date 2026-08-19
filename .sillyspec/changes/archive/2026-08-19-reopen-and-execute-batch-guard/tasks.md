---
author: qinyi
created_at: 2026-08-19T11:07:44+08:00
---

# 任务清单（Tasks）

- [ ] task-01: W1 reopen stale 回填 --confirm 门控（complete.js 改动点 1 + audit log）
- [ ] task-02: W1 progress complete-stage stale 拒绝（stage-machine.js 改动点 2）
- [ ] task-03: W1 回归测试 test/reopen-stale-confirm.test.mjs
- [ ] task-04: W2 勾选层零 diff 守卫（shouldAutoCheckTask ctx + autoCheckPlanFromReviews 构造，改动点 3）
- [ ] task-05: W2 批量层逐 task 复核 + blockedTasks（detectExecuteBatchFinish，改动点 4）
- [ ] task-06: W2 回归测试 test/execute-batch-zero-diff.test.mjs（含生成层锁定）
- [ ] task-07: W3 apply merge-base 锚点 + --base flag（worktree-apply.js 改动点 5/6/7 + index.js 解析）
- [ ] task-08: W3 冲突列表 stderr 解析不静默（改动点 8）
- [ ] task-09: W3 回归测试 test/worktree-apply-merge-base.test.mjs
- [ ] task-10: 文档同步（file-lifecycle.md + modules/progress.md + modules/worktree.md）
