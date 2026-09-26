---
author: flow-machine-draft
created_at: 2026-09-26T03:08:02.574Z
---
# 决策记录（Decisions）— 2026-09-26-task-review-retire

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：手动勾选引入假勾面（agent 未做即勾/顺手全勾）。缓解：detectExecuteBatchFinish 内 checkExecuteCodeEvidence 代码证据核验仍在 execute 收口跑（勾了但无 base..HEAD diff 证据→批量完成不成立、阻塞暴露）+ verify 阶段测试对账门禁不变（实测失败阻断收口）+ verify 逐项检查任务步仍只读对照勾选态。放弃的方案：①只加豁免不退役——前置变更已做，R18 实证豁免后仍留 5/15 形式拦截摩擦且「可豁免的门」诱导表演；②连 task-review.js 模块一起删——放弃，历史归档 doctor/回放兼容读侧依赖其导出（validateTaskReviews 等），review write/backfill-reviews 命令仍引用；③保留 Task Review 门但只对 independent tier 生效——放弃，tier 分级在 Stage Review 层已有，任务粒度无独立评审者供给时该门只剩形式校验（R18 实证）。
