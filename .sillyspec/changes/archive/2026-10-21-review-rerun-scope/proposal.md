---
author: flow-machine-draft
created_at: 2026-10-20T23:35:25.992Z
---
# 提案书（Proposal）— 2026-10-21-review-rerun-scope

## 动机

任务原话转写：评审子代会话画像实证（用户裁决：改）：评审思考面合理、复跑面不合理——ui-proto 评审内部两轮全量 8.4min（主会话已跑过）、provenance 评审起后台任务等 187s、scoped-verify 复跑 86+59s；对照 roundtrip 评审因派发词点名复跑面仅 9.6min 零全量抓 4 条真 P3。根因：任务书检查单只说「测试真存在且断言该行为？」无复跑口径，材料包不含 ledger 测试回执——scoped 口径只进了 AGENTS 没同步评审面。修法：①renderReviewerTaskbook 增「复跑口径」节（变更测试面复跑/多文件合并一次 node --test 省启动税/全量禁止——ledger 已亲测 pre-push 会全量/含回执时抽验复核/长输出落日志）；②assembleReviewPack 增 testReceipt 子源（flow.js 扫 verify-runs 最新本变更 test-result.json 传入，纯机械渲染回执行）。

成功标准：
- 任务书含复跑口径五要素：变更测试面/合并一次跑/全量禁止（ledger+pre-push 双重已覆）/回执抽验/日志落盘
- 材料包 testReceipt 子源：findLatestTestReceipt(verifyRunsDir, change) 纯扫描 fail-soft 取最新匹配；assembleReviewPack 渲染回执行（ran_at/status/exit/耗时/命令面截断）；缺席零注入
- 新增测试锁口径锚与回执装配（在场/缺席/多轮取最新）；变更测试面+lint 绿（scoped 口径自验）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 任务书含复跑口径五要素：变更测试面/合并一次跑/全量禁止（ledger+pre-push 双重已覆）/回执抽验/日志落盘
2. 材料包 testReceipt 子源：findLatestTestReceipt(verifyRunsDir, change) 纯扫描 fail-soft 取最新匹配；assembleReviewPack 渲染回执行（ran_at/status/exit/耗时/命令面截断）；缺席零注入
3. 新增测试锁口径锚与回执装配（在场/缺席/多轮取最新）；变更测试面+lint 绿（scoped 口径自验）

## 成功标准（可验证）

1. 任务书含复跑口径五要素：变更测试面/合并一次跑/全量禁止（ledger+pre-push 双重已覆）/回执抽验/日志落盘
2. 材料包 testReceipt 子源：findLatestTestReceipt(verifyRunsDir, change) 纯扫描 fail-soft 取最新匹配；assembleReviewPack 渲染回执行（ran_at/status/exit/耗时/命令面截断）；缺席零注入
3. 新增测试锁口径锚与回执装配（在场/缺席/多轮取最新）；变更测试面+lint 绿（scoped 口径自验）
