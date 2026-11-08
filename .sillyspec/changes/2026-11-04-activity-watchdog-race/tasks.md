---
author: flow-machine-draft
created_at: 2026-11-03T23:20:30.331Z
---
# 任务注册表（Tasks）— 2026-11-04-activity-watchdog-race

- [ ] task-01: fireTurnActivityWatchdog 在 await interrupt() 之后复查守卫（status=running 且 currentRunId 仍为布防轮），失配静默跳过：不覆写新轮 running 态、不清新轮排队计数、不回调 onTurnActivityTimeout
- [ ] task-02: 新增回归测试：interrupt 慢 resolve（受控 deferred）期间 result 收尾 + 新 inject 切轮交错，断言新轮 running 态保持、pendingInjectCount 保留、回调未触发；修复前该用例必红（状态被覆写）
- [ ] task-03: 既有 turn-activity-watchdog 测试组全部保持绿
