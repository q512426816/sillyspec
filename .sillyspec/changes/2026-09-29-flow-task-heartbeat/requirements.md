---
author: flow-machine-draft
created_at: 2026-09-29T06:26:56.177Z
---
# 需求规格（Requirements）— 2026-09-29-flow-task-heartbeat

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: ②执行阶段 status 心跳——下一任务指针 + 进度 + 循环协议指引
- 场景：部分勾选 — Given thin 变更处于②执行阶段且 tasks.md 存在未勾行；When 运行 flow status --change <名>；Then 输出含「⏭️ 下一任务：<第一个 - [ ] 行的 task-NN+标题截断>」与「✅ 进度：N/M」及「做一件 → 勾一格 → 重跑本命令取下一个」协议指引
### FR-02: 全勾态心跳改指 flow done
- 场景：全部勾选 — Given tasks.md 全部 - [x]；When flow status；Then 输出「任务全勾（N/N）」并指向 flow done 收口（含逐 task 证据口径提示），不再出现下一任务指针
### FR-03: ①spec 阶段不刷心跳
- 场景：槽未填 — Given design/requirements 槽未填满（阶段=①）；When flow status；Then 无心跳行（心跳限定②执行阶段）
### FR-04: 协议文案三处同步
- 场景：文案钉 — Given flow start 简报（fresh/adopt 两路）、tasks.md 头部纪律行、AGENTS.md 恢复与查看段；When 本变更交付后；Then 三处均含心跳循环协议口径（做一件→勾一格→重跑 status 取下一个）
### FR-05: 逐 task 证据哨兵行为零变化
- 场景：既有硬门不动 — Given detectFakeCheckCompletion 的 missing 逐个点名与镜像豁免为既有行为；When 本变更交付后；Then 哨兵判据与拒收文案零改动（既有测试全绿佐证）
### FR-06: 测试全绿
- 场景：新增+适配 — Given 新增 flow-status-heartbeat 行为测试四面、适配 tick-loop-nudge 两钉；When 跑 flow 系与 npm run test:core；Then 全绿

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 test/flow-status-heartbeat.test.mjs「① ②执行阶段：下一任务指针 + 进度 + 循环协议指引」 -->
test/flow-status-heartbeat.test.mjs「① ②执行阶段：下一任务指针 + 进度 + 循环协议指引」

<!--AGENT:测试绑定FR-02 test/flow-status-heartbeat.test.mjs「② 全勾：心跳改指 flow done」 -->
test/flow-status-heartbeat.test.mjs「② 全勾：心跳改指 flow done」

<!--AGENT:测试绑定FR-03 test/flow-status-heartbeat.test.mjs「③ ①阶段（spec 槽未填）：不刷心跳」 -->
test/flow-status-heartbeat.test.mjs「③ ①阶段（spec 槽未填）：不刷心跳」

<!--AGENT:测试绑定FR-04 test/flow-status-heartbeat.test.mjs「④ 协议文案三处同步钉」+ test/tick-loop-nudge.test.mjs「③ 简报交付纪律」 -->
test/flow-status-heartbeat.test.mjs「④ 协议文案三处同步钉」+ test/tick-loop-nudge.test.mjs「③ 简报交付纪律」

<!--AGENT:测试绑定FR-05 test/tick-loop-nudge.test.mjs「④ 哨兵时点判定钉」+ 既有 sentinel 系用例零适配全绿佐证 -->
test/tick-loop-nudge.test.mjs「④ 哨兵时点判定钉」+ 既有 sentinel 系用例零适配全绿佐证

<!--AGENT:测试绑定FR-06 npm test 全量（run-tests.mjs）+ npm run test:core -->
npm test 全量（run-tests.mjs）+ npm run test:core

