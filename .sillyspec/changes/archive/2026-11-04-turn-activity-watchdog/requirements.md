---
author: flow-machine-draft
created_at: 2026-11-03T16:20:57.848Z
---
# 需求规格（Requirements）— 2026-11-04-turn-activity-watchdog

## 功能需求

### FR-01: running 轮超过窗口（默认 30min，env SILLYHUB_TURN_ACTIVITY_WATCHDOG_MS 可调、0=关闭、非法回落默认）无任何轮事件/心跳时，看门狗触发：会话态复位 active、记录 staleRunResetAt、清 pendingInjectCount、经 deps 桥回报该 run 失败（notifyRunResult is_error=true）

- sillyhub-daemon 会话处于 running（引擎 turn 执行中）且超过活动看门狗窗口无任何轮事件（onMessage envelope）与轮内心跳（onHeartbeat）到达时，轮活动看门狗必须触发：先做 best-effort 引擎打断（interrupt，失败静默），随后会话态必须复位 active、必须记录 `staleRunResetAt`（对齐 inject stale-reset 的写通道宽限语义）、必须清 `_pendingInjectCount`、必须保留 `currentRunId` 作迟到 result 归属锚，并必须经 `deps.onTurnActivityTimeout(sessionId, runId)` 回报该 run 失败（daemon 桥 notifyRunResult is_error=true）。

#### 场景：主路径（引擎 turn 中途挂死）

- Given 会话 running、run-1 已产生过轮事件（区别于首轮启动看门狗的零事件形态）
- When 此后超过窗口（默认 30min）无任何轮事件与心跳到达
- Then interrupt 被尝试、status 复位 active、staleRunResetAt 记录、pendingInjectCount 清零、currentRunId 保留为 run-1、deps.onTurnActivityTimeout(sessionId, run-1) 被调用一次

### FR-02: 任意轮事件（_onMessage）或轮内心跳（onHeartbeat）到达即续防（重挂窗口），轮 result 到达/会话终态即撤防

- 任意轮事件（events.ts onMessage）与轮内心跳（session-manager onHeartbeatCb）到达时必须续防（清旧 timer 重挂窗口，keyed by currentRunId）；inject 布防/续防点必须覆盖首轮与排队路径；inject 的 60s stale-reset 把 status 翻回 active 时必须撤防；轮 result（events.ts onResult）与会话终态（lifecycle terminate）必须撤防；daemon stop() 必须清全部活动看门狗定时器；定时器必须 unref 不阻塞 daemon 退出。窗口解析：env `SILLYHUB_TURN_ACTIVITY_WATCHDOG_MS` 缺省/空/非法/负数必须回落默认 30min；`0` 必须显式关闭（布防 no-op）。轮启动看门狗（既有 90s）与本看门狗并存且禁止互相干扰。

#### 场景：事件续防

- Given 会话 running 且看门狗已布防
- When 距上次事件 29min 时一条 onMessage envelope 到达，随后再次静默
- Then 窗口从该事件起重新计满 30min 才触发（事件前 29min 不计入）

#### 场景：result 撤防

- Given 会话 running 且看门狗已布防
- When 轮 result 到达（status 复位 active）
- Then 看门狗撤除，到点不触发、不回调

#### 场景：env 配置

- Given `SILLYHUB_TURN_ACTIVITY_WATCHDOG_MS=0`
- When inject 布防路径执行
- Then 不挂任何活动看门狗定时器（关闭语义）；非法值（如 `abc`/`-5`）回落默认 30min

### FR-03: 假活保护：触发时会话非 running 或 currentRunId 已切则静默跳过；首轮启动看门狗先行触发后本看门狗不再动作

- 看门狗触发时必须前置守卫：会话 status 非 running、或 `currentRunId` 已切换为布防 runId 之外的 run、或会话已不存在时，必须静默跳过（不回调、不改状态）——误报形态下由后续 inject 的首轮启动看门狗/正常 result 路径兜底；首轮启动看门狗先行触发（status 已复位 active）后，本看门狗到点必须静默跳过、禁止重复回报。

#### 场景：假活保护（新 inject 已切换 currentRunId）

- Given 看门狗为 run-1 布防且窗口已到
- When 触发前会话已收到新 inject（currentRunId 已切 run-2）
- Then 旧看门狗静默跳过：不回调 onTurnActivityTimeout、不改状态（run-2 的看门狗已由布防点重新挂上）

#### 场景：与启动看门狗并存

- Given 首轮启动看门狗（90s）与活动看门狗同时布防于同一 run
- When 启动看门狗先行触发（status 复位 active、回报 run 失败）
- Then 活动看门狗到点因 status 非 running 静默跳过，不重复回报

### FR-04: 有单测覆盖触发/续防/撤防/假活保护/env 解析（0 关闭、非法回落）

- 必须有 vitest 单测覆盖：到点触发主路径（interrupt 尝试 + 状态复位 + staleRunResetAt + 清 pendingInjectCount + 保留 currentRunId + onTurnActivityTimeout 回调）、事件/心跳续防、result/终态撤防、假活保护（currentRunId 已切/非 running）、env 解析（0 关闭、非法回落默认、自定义生效）、daemon 桥回报（status='turn_activity_timeout'、is_error=true、state 缺失 no-op、上报失败不抛）；既有测试（含 turn-start-watchdog、daemon-interrupt-noop-report）必须保持全绿。

#### 场景：主路径

- Given sillyhub-daemon/tests/interactive/turn-activity-watchdog.test.ts 与 tests/daemon-turn-activity-timeout-report.test.ts 已编写
- When 运行 vitest 相关面
- Then 全部用例通过且既有 turn-start-watchdog.test.ts 等回归用例不回归

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/sillyhub-daemon/tests/interactive/turn-activity-watchdog.test.ts「到点触发：interrupt 尝试 + 复位 active + staleRunResetAt + 清 pendingInjectCount + 保留 currentRunId + onTurnActivityTimeout 回调」
FR-02: test/sillyhub-daemon/tests/interactive/turn-activity-watchdog.test.ts「轮事件/心跳续防窗口重挂不提前触发；result/终态撤防；env 0=关闭、非法回落默认」
FR-03: test/sillyhub-daemon/tests/interactive/turn-activity-watchdog.test.ts「假活保护：currentRunId 已切新轮/非 running 静默跳过不回调；与启动看门狗并存不重复回报」
FR-04: test/sillyhub-daemon/tests/daemon-turn-activity-timeout-report.test.ts「桥：state 在 → notifyRunResult(status=turn_activity_timeout, is_error=true) 一次；state 缺失 warn no-op；上报失败 warn 不抛」
FR-04: test/sillyhub-daemon/tests/interactive/turn-start-watchdog.test.ts「既有轮启动看门狗用例全量回归」
