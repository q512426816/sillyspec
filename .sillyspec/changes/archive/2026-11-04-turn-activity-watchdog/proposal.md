---
author: flow-machine-draft
created_at: 2026-11-03T16:20:57.848Z
---
# 提案书（Proposal）— 2026-11-04-turn-activity-watchdog

## 动机

任务原话转写：daemon 轮活动看门狗：running 轮静默挂死自动收敛

动机：腾讯云生产会话实证——引擎 turn 中途挂死（宿主冻结/SDK 吞输入/引擎僵死）后 run 永停 running：backend sweep 档4 明确跳过 running（sweep.py:817-825），daemon 侧 90s 启动看门狗只布防首轮启动路径、排队路径不布防（turn-control.ts:594-596 注释自认遗留缺口），心跳仅在模型生成期有信号、静默工具执行期无信号（driver.ts:370-376）。结果：会话后续消息全部排队，积满 5 条后 409，永久无法继续发消息。根因修复：daemon 侧新增轮活动看门狗（turn-control.ts 看门狗簇旁），任何轮事件/心跳续防，超窗静默即 best-effort 打断引擎 + 复位会话态（对齐 stale-reset 写通道宽限语义）+ 经桥回报该 run 失败（对齐 onTurnStartTimeout 收敛姿势），backend 收到 notifyRunResult 即终态化 run、广播 turn_completed、自动派发排队消息，会话恢复可发。

成功标准：
- running 轮超过窗口（默认 30min，env SILLYHUB_TURN_ACTIVITY_WATCHDOG_MS 可调、0=关闭、非法回落默认）无任何轮事件/心跳时，看门狗触发：会话态复位 active、记录 staleRunResetAt、清 pendingInjectCount、经 deps 桥回报该 run 失败（notifyRunResult is_error=true）
- 任意轮事件（_onMessage）或轮内心跳（onHeartbeat）到达即续防（重挂窗口），轮 result 到达/会话终态即撤防
- 假活保护：触发时会话非 running 或 currentRunId 已切则静默跳过；首轮启动看门狗先行触发后本看门狗不再动作
- 有单测覆盖触发/续防/撤防/假活保护/env 解析（0 关闭、非法回落）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. running 轮超过窗口（默认 30min，env SILLYHUB_TURN_ACTIVITY_WATCHDOG_MS 可调、0=关闭、非法回落默认）无任何轮事件/心跳时，看门狗触发：会话态复位 active、记录 staleRunResetAt、清 pendingInjectCount、经 deps 桥回报该 run 失败（notifyRunResult is_error=true）
2. 任意轮事件（_onMessage）或轮内心跳（onHeartbeat）到达即续防（重挂窗口），轮 result 到达/会话终态即撤防
3. 假活保护：触发时会话非 running 或 currentRunId 已切则静默跳过；首轮启动看门狗先行触发后本看门狗不再动作
4. 有单测覆盖触发/续防/撤防/假活保护/env 解析（0 关闭、非法回落）

## 成功标准（可验证）

1. running 轮超过窗口（默认 30min，env SILLYHUB_TURN_ACTIVITY_WATCHDOG_MS 可调、0=关闭、非法回落默认）无任何轮事件/心跳时，看门狗触发：会话态复位 active、记录 staleRunResetAt、清 pendingInjectCount、经 deps 桥回报该 run 失败（notifyRunResult is_error=true）
2. 任意轮事件（_onMessage）或轮内心跳（onHeartbeat）到达即续防（重挂窗口），轮 result 到达/会话终态即撤防
3. 假活保护：触发时会话非 running 或 currentRunId 已切则静默跳过；首轮启动看门狗先行触发后本看门狗不再动作
4. 有单测覆盖触发/续防/撤防/假活保护/env 解析（0 关闭、非法回落）
