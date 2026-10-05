---
author: flow-machine-draft
created_at: 2026-10-05T12:03:05.695Z
---
# 提案书（Proposal）— 2026-10-05-review-declared-unstamped-gate

## 动机

任务原话转写：worktree apply 的 review 声明收集（collectReviewDeclaredFiles，src/worktree-apply.js）经 resolveLatestExecuteRunIdWithTasks 定位 run：变更名无戳命中时 resolver 回退拿 mtime 最新的无戳旧 run——从未跑过 execute 的变更会误挂无关历史 run 的 review.json changedFiles（本会话实证：apply 预检误报「14 个 review 声明文件不在 allow 面」且嫌疑标注误导——review 失实/并行混入均非实情，实为 8 月无戳旧 run）。review 声明是 reviewer 对该 run 实际改动的经验证陈述，信任不跨 run 迁移；无戳即无法证明归属。D-003 相交过滤虽 fail-closed 兜住放行面，但误报噪音与误导性嫌疑标注治标不治本。
成功标准：
- collectReviewDeclaredFiles 对 resolver 回退拿到的无戳 run 返回空声明面（不再挂无关 run 的 changedFiles）
- 戳等值命中（run 归属本变更）时声明收集行为不变
- resolver 其他消费方（task-done/cross-repo-reconcile）语义零变化（门控只在 collectReviewDeclaredFiles 内）
- 单测覆盖：无戳 run 空声明/带戳等值收集正常/带戳他变更+无戳并存仍空三形态

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. collectReviewDeclaredFiles 对 resolver 回退拿到的无戳 run 返回空声明面（不再挂无关 run 的 changedFiles）
2. 戳等值命中（run 归属本变更）时声明收集行为不变
3. resolver 其他消费方（task-done/cross-repo-reconcile）语义零变化（门控只在 collectReviewDeclaredFiles 内）
4. 单测覆盖：无戳 run 空声明/带戳等值收集正常/带戳他变更+无戳并存仍空三形态

## 成功标准（可验证）

1. collectReviewDeclaredFiles 对 resolver 回退拿到的无戳 run 返回空声明面（不再挂无关 run 的 changedFiles）
2. 戳等值命中（run 归属本变更）时声明收集行为不变
3. resolver 其他消费方（task-done/cross-repo-reconcile）语义零变化（门控只在 collectReviewDeclaredFiles 内）
4. 单测覆盖：无戳 run 空声明/带戳等值收集正常/带戳他变更+无戳并存仍空三形态
