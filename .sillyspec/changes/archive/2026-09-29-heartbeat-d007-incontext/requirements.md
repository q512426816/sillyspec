---
author: flow-machine-draft
created_at: 2026-09-29T06:55:43.119Z
---
# 需求规格（Requirements）— 2026-09-29-heartbeat-d007-incontext

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: flow start 简报两路、tasks.md 头部、AGENTS.md、status 心跳指引行
Given 系统就绪
When flow start 简报两路、tasks.md 头部、AGENTS.md、status 心跳指引行五处文案改为「以 tasks.md 为进度源：做一件
Then 勾一格

### FR-02: flow status 自愿查看（非协议必需，D-007）」口径，不再出现「每勾一格重跑 flow 
Given 系统就绪
When flow status 自愿查看（非协议必需，D-007）」口径，不再出现「每勾一格重跑 flow status」类指引
Then 行为符合本条标准描述

### FR-03: status 心跳渲染本体保留（下一任务指针/进度/全勾指 done——恢复场景价值不变），仅指引文
Given 系统就绪
When status 心跳渲染本体保留（下一任务指针/进度/全勾指 done——恢复场景价值不变），仅指引文案改口径
Then 行为符合本条标准描述

### FR-04: 相关测试钉同步（flow-status-heartbeat/tick-loop-nudge），flo
Given 测试 相关模块就绪
When 相关测试钉同步（flow-status-heartbeat/tick-loop-nudge），flow 系与 test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 test/flow-status-heartbeat.test.mjs「① …自愿语义钉（D-007 纠偏）」「④ …旧口径负向钉」 -->
test/flow-status-heartbeat.test.mjs「① …自愿语义钉（D-007 纠偏）」「④ …旧口径负向钉」

<!--AGENT:测试绑定FR-02 test/flow-status-heartbeat.test.mjs「④ …AGENTS.md 不得携带勾选纪律细节（瘦身钉）」 -->
test/flow-status-heartbeat.test.mjs「④ …AGENTS.md 不得携带勾选纪律细节（瘦身钉）」

<!--AGENT:测试绑定FR-03 test/flow-status-heartbeat.test.mjs 全四面 + test/tick-loop-nudge.test.mjs「③」+ test:core 全绿 -->
test/flow-status-heartbeat.test.mjs 全四面 + test/tick-loop-nudge.test.mjs「③」+ test:core 全绿

<!--AGENT:测试绑定FR-04 x -->
