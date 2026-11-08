---
author: flow-machine-draft
created_at: 2026-11-08T03:50:26.626Z
---
# 提案书（Proposal）— 2026-11-08-hindsight-tasks-ratio-retire

## 动机

任务原话转写：route-hindsight 任务改写率指标退役

实证：连续两个需求已含决策的正常轻量变更（2026-11-07-explore-logic-prototype 0.875、2026-11-08-flow-askuser-confirm 0.8）被 tasksRewriteRatio>0.6 标记并拦下次 start。根因是时代错位：指标 2026-09-28 引入时 tasks 种子是镜像锚，2026-10-07-thin-tasks-v3 改为成功标准逐条转写（验收句≠实现步骤，文体必然不同），且 flow start 横幅明文要求「机器种子按真实实现路径改写、增删改随意」——教导面自相矛盾：一手要求改写、一手惩罚改写。改写率在现行种子形态下无信号价值（正常改写与需求不清的改写不可区分）。退役该指标判定，同意门回归 design 改写比/盲维/实测失败三路。

成功标准：
- markHindsight 不再因 tasks 改写率产生标记与 reasons；HINDSIGHT_THRESHOLDS 移除 tasksRewriteRatio
- 旧标记文件（含 tasksRewriteRatio 字段）被 readHindsightHint/readHindsightMark 读取渲染不崩
- computeHindsightMetrics 返回面不再含 tasksRewriteRatio（或恒 0 留字段兼容，以最小面为准）
- test/route-hindsight.test.mjs、test/prestage-consent-gate.test.mjs、test/flow-clarity-probe.test.mjs 全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. markHindsight 不再因 tasks 改写率产生标记与 reasons；HINDSIGHT_THRESHOLDS 移除 tasksRewriteRatio
2. 旧标记文件（含 tasksRewriteRatio 字段）被 readHindsightHint/readHindsightMark 读取渲染不崩
3. computeHindsightMetrics 返回面不再含 tasksRewriteRatio（或恒 0 留字段兼容，以最小面为准）
4. test/route-hindsight.test.mjs、test/prestage-consent-gate.test.mjs、test/flow-clarity-probe.test.mjs 全绿

## 成功标准（可验证）

1. markHindsight 不再因 tasks 改写率产生标记与 reasons；HINDSIGHT_THRESHOLDS 移除 tasksRewriteRatio
2. 旧标记文件（含 tasksRewriteRatio 字段）被 readHindsightHint/readHindsightMark 读取渲染不崩
3. computeHindsightMetrics 返回面不再含 tasksRewriteRatio（或恒 0 留字段兼容，以最小面为准）
4. test/route-hindsight.test.mjs、test/prestage-consent-gate.test.mjs、test/flow-clarity-probe.test.mjs 全绿
