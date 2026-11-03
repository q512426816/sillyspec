---
author: flow-machine-draft
created_at: 2026-11-03T16:20:57.848Z
---
# 任务注册表（Tasks）— 2026-11-04-turn-activity-watchdog

- [x] task-01: 看门狗核心落码——turn-control.ts 活动看门狗簇（DEFAULT_TURN_ACTIVITY_WATCHDOG_MS/turnActivityWatchdogMs env 解析 0=关闭非法回落、refresh/disarm/fire 含 interrupt 软收敛与假活保护守卫）+ types.ts/session-manager.ts Core 接线（Map+委托）+ inject 布防点与 stale-reset 撤防点；vitest 布防/env/触发用例绿验证
- [x] task-02: 活动信号接线——events.ts onMessage 续防/onResult 撤防、session-manager.ts onHeartbeatCb 续防、lifecycle.ts terminate 撤防、stop 清全部 timer；vitest 续防/撤防/假活保护/与启动看门狗并用例绿验证
- [x] task-03: daemon 桥——interactive/types.ts deps 新增 onTurnActivityTimeout + daemon.ts 实现（notifyRunResult status=turn_activity_timeout、is_error=true、中文 summary；state 缺失 warn no-op；失败 warn 不抛）与接线；daemon-turn-activity-timeout-report.test.ts 绿验证
- [x] task-04: 全量回归——sillyhub-daemon vitest（新增两文件 + turn-start-watchdog + daemon-interrupt-noop-report 等 interactive 面）全绿 + tsc 0 错
