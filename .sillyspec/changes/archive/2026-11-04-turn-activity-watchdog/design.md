---
author: flow-machine-draft
created_at: 2026-11-03T16:20:57.848Z
---
# 设计记录（Design Record）— 2026-11-04-turn-activity-watchdog

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

daemon 侧新增「轮活动看门狗」（turn-control.ts 看门狗簇旁，与既有 90s 轮启动看门狗同构）：会话 running 期间任何轮事件/心跳续防，超窗静默即触发——best-effort interrupt + 复位会话态（对齐 inject stale-reset 的写通道宽限语义：记 staleRunResetAt）+ 经新桥 `onTurnActivityTimeout` 回报 run 失败。backend 收到 notifyRunResult 后走既有 close_interactive_run 链：run 终态化 → 广播 turn_completed（前端解锁输入框）→ 自动派发排队消息，会话恢复可发。选 daemon 侧而非 backend sweep 的原因：① backend DB 无轮内存活信号（turn-heartbeat 只转发 SSE 不落库），backend 判静默必须新增列+写路径，改动面大；② daemon 在线但 WS 断的形态已有 600s offline sweep 兜底，唯一真空档就是「daemon 健康、引擎 turn 挂死」——daemon 侧信号最丰富（事件+心跳直读）；③ 与既有启动看门狗同一收敛桥姿势，架构一致。误杀防护（针对 2026-06-24 否决「不加 turn 超时兜底」的复潮缓解，见 decisions D-001）：测「无活动时长」而非「轮总时长」——推理模型生成期间恒有 input_json_delta/token_usage 心跳续防，静默期只剩工具执行；默认窗 30min 显著大于常规工具静默期；env 可调且 0 可关；触发走 interrupt 软收敛而非 kill。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新导出（sillyhub-daemon/src/interactive/session-manager/turn-control.ts）：`DEFAULT_TURN_ACTIVITY_WATCHDOG_MS = 30 * 60_000`、`turnActivityWatchdogMs()`（env `SILLYHUB_TURN_ACTIVITY_WATCHDOG_MS`：缺省/空/非法/负 → 默认；`0` → 关闭）、`refreshTurnActivityWatchdog(mgr, sessionId, runId)`、`disarmTurnActivityWatchdog(mgr, sessionId)`（fire 函数模块私有）。SessionManagerCore（session-manager/types.ts）新成员：`_turnActivityWatchdogs: Map<string, {timer, runId}>` + `_refreshTurnActivityWatchdog`/`_disarmTurnActivityWatchdog` 两方法；facade（session-manager.ts）同构委托。SessionManagerDeps（interactive/types.ts）新增可选回调 `onTurnActivityTimeout?: (sessionId, runId) => void | Promise<void>`；daemon.ts 实现并接线（notifyRunResult status='turn_activity_timeout'，is_error=true，中文 result_summary 含重发指引）。布防/续防/撤防接线：inject（首轮+排队+steering 同 run 刷新）、onMessage（events.ts）、onHeartbeatCb（session-manager.ts）、onResult（events.ts 撤防）、lifecycle terminate（撤防）、inject stale-reset 翻 active（撤防）、stop() 清全部。对外端点/协议/文件格式：无变化（notifyRunResult 为既有端点，status 字符串新增取值 'turn_activity_timeout'，backend 按 is_error 映射终态、字符串透传，无消费方强校验）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。看门狗只依赖「最近一次活动时刻」这一单调信号（事件/心跳到达即重挂窗口），乱序到达的旧事件同样证明引擎活着，续防语义不受序影响；迟到 result 落在已复位 active 的会话上走既有 close_interactive_run 幂等路径（currentRunId 保留作归属锚，与启动看门狗 P2 缓解同款）。触发守卫（status!==running 或 currentRunId 已切）保证布防后状态已被正常流转的场合不误动作。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

单线程事件循环内 Map 操作无竞态；同会话重复布防 = 换防（clearTimeout 旧 timer 再挂新，keyed by runId，与启动看门狗同构）。多会话各自独立 Map 条目互不串台。fire 是 async：触发与几乎同时到达的 inject/result 的交错由守卫收敛——fire 前置检查 status/currentRunId，best-effort interrupt 的 await 窗口内到达的事件/result（引擎存活证据）经 interrupt 后的二次复核挡下（评审 P2 修复：复核仍 running 且 runId 未变才复位，否则静默跳过），后到的 result 走幂等路径。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。会话终态（terminate/end/fail）与 daemon stop() 均撤防/清全部 timer（unref 不阻塞退出）；reload 换 provider 时旧 consume 的迟到心跳被 isAuthoritative 谓词挡掉（onHeartbeatCb 既有守卫），不会给已废轮续防。daemon 重启走既有 recover 对账（interrupted run → failed），与本看门狗正交。上报失败（notifyRunResult 网络/HTTP 失败）warn 不重试——与启动看门狗桥同款边界；该残余形态（daemon 活着但 REST 持久失败且 WS 存活）概率极低，WS 断时 600s offline sweep 兜底。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。看门狗 Map 键为 sessionId，per-daemon 进程内存态，不持久化、不上报平台；多 daemon 实例各自看各自会话，无共享状态。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：误杀「活着但安静」的超长静默 turn（单工具执行超 30min 零事件零心跳，如超大测试套件/训练脚本）。缓解：窗口默认 30min（显著大于本平台常规工具静默期）、env 可调可关（0）、触发走 interrupt 软收敛（引擎若活着可经 abort 收尾正常产出 result 落幂等路径）、假活保护守卫。误报残余接受面：该轮 result 丢弃、用户重发即可（与启动看门狗同款容忍）。
试过放弃的方案：① backend sweep 对 running run 加超时档——DB 无轮内存活信号（turn-heartbeat 只转发 SSE 不落库），需加列+多条写路径+迁移，改动面大且 backend 只能终态化 run、无法复位 daemon 侧会话态（daemon 仍 running，后续 inject 全撞 60s stale-reset 启发式），治标；② 复用扩展启动看门狗到全路径（把 90s 窗拉长）——启动看门狗语义是「零事件强信号」，拉长窗会模糊其快速反馈价值且两语义混在一个 timer 里难以独立调参；③ 触发即 terminateSession 硬杀——引擎假死与引擎慢无法区分时硬杀过重，interrupt 软收敛 + 后续 inject 由启动看门狗 90s 快速反馈的渐进姿势更稳。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | sillyhub-daemon/src/interactive/session-manager/turn-control.ts | 新增活动看门狗簇（env 解析/refresh/disarm/fire）+ inject 布防点 + stale-reset 撤防点 |
| 修改 | sillyhub-daemon/src/interactive/session-manager/types.ts | Core 新成员 `_turnActivityWatchdogs` + 两方法签名 |
| 修改 | sillyhub-daemon/src/interactive/session-manager.ts | facade Map + 委托方法 + onHeartbeatCb 续防 |
| 修改 | sillyhub-daemon/src/interactive/session-manager/events.ts | onMessage 续防 / onResult 撤防 |
| 修改 | sillyhub-daemon/src/interactive/session-manager/lifecycle.ts | terminate 撤防 |
| 修改 | sillyhub-daemon/src/interactive/types.ts | deps 新可选回调 onTurnActivityTimeout |
| 修改 | sillyhub-daemon/src/daemon.ts | 桥实现 + deps 接线 + stop 清理（如有独立清理点） |
| 新增 | sillyhub-daemon/tests/interactive/turn-activity-watchdog.test.ts | 看门狗单测（触发/续防/撤防/假活/env） |
| 新增 | sillyhub-daemon/tests/daemon-turn-activity-timeout-report.test.ts | daemon 桥单测 |
| 修改 | sillyhub-daemon/src/cli.ts | SessionManager deps 接线 onTurnActivityTimeout（收口对账补归因：首版清单漏写，提交事实属本变更） |
| 修改 | sillyhub-daemon/tests/interactive/session-manager-lifecycle-turn-anchor-eviction.test.ts | 最小伪造 core 补 _disarmTurnActivityWatchdog 新成员（收口对账补归因） |
| 修改 | sillyhub-daemon/tests/turn-phase-report.test.ts | duck-type mgr 补活动看门狗新成员（收口对账补归因） |
