---
author: flow-machine-draft
created_at: 2026-11-03T23:20:30.331Z
---
# 提案书（Proposal）— 2026-11-04-activity-watchdog-race

## 动机

任务原话转写：活动看门狗触发竞态修复

动机与背景：2026-11-04 轮活动看门狗（f46448d31）触发路径 fireTurnActivityWatchdog 在守卫检查与状态复位之间 await interrupt()，await 后不复查守卫即无条件覆写会话态。引擎存活（假阳性软着陆路径）时 interrupt 触发 abort 收尾 → result 到达翻 active → backend 亚秒级自动派发排队消息 → 新 inject 置新轮 running；interrupt 才 resolve 后旧轮触发体把活轮 status 覆写回 active、清新轮排队计数、使新轮失去看门狗续防（续防要求 status=running），写通道仅剩 60min stale 宽限兜底。对照同族 fireTurnStartWatchdog（守卫后同步改状态无窗口）；现有测试 interrupt mock 为立即 resolve，交错未覆盖。

成功标准：
- fireTurnActivityWatchdog 在 await interrupt() 之后复查守卫（status=running 且 currentRunId 仍为布防轮），失配静默跳过：不覆写新轮 running 态、不清新轮排队计数、不回调 onTurnActivityTimeout
- 新增回归测试：interrupt 慢 resolve（受控 deferred）期间 result 收尾 + 新 inject 切轮交错，断言新轮 running 态保持、pendingInjectCount 保留、回调未触发；修复前该用例必红（状态被覆写）
- 既有 turn-activity-watchdog 测试组全部保持绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. fireTurnActivityWatchdog 在 await interrupt() 之后复查守卫（status=running 且 currentRunId 仍为布防轮），失配静默跳过：不覆写新轮 running 态、不清新轮排队计数、不回调 onTurnActivityTimeout
2. 新增回归测试：interrupt 慢 resolve（受控 deferred）期间 result 收尾 + 新 inject 切轮交错，断言新轮 running 态保持、pendingInjectCount 保留、回调未触发；修复前该用例必红（状态被覆写）
3. 既有 turn-activity-watchdog 测试组全部保持绿

## 成功标准（可验证）

1. fireTurnActivityWatchdog 在 await interrupt() 之后复查守卫（status=running 且 currentRunId 仍为布防轮），失配静默跳过：不覆写新轮 running 态、不清新轮排队计数、不回调 onTurnActivityTimeout
2. 新增回归测试：interrupt 慢 resolve（受控 deferred）期间 result 收尾 + 新 inject 切轮交错，断言新轮 running 态保持、pendingInjectCount 保留、回调未触发；修复前该用例必红（状态被覆写）
3. 既有 turn-activity-watchdog 测试组全部保持绿
