---
author: flow-machine-draft
created_at: 2026-11-04T13:48:08.880Z
---
# 设计记录（Design Record）— 2026-11-04-sync-push-chunking

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

只改客户端推送腿：`src/spec-sync.js` 的单次 `POST /api/changes/-/spec-sync`（整批 ops 一个请求、30s 单请求预算写死）改为**双约束切块顺序推送**——新增纯函数 `chunkOpsForPush` 按「块内 op 数（默认 128）+ base64 字节粗估和（默认 2MB）」切块，逐块独立 POST，全部块落地后把各块响应合并成单批等价形状交给既有冲突/墓碑/成功处理路径（下游零改动）。推送单请求预算经 `SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS` 可调（默认 30s 不变），块尺寸经 `SILLYSPEC_SPEC_SYNC_CHUNK_OPS` / `SILLYSPEC_SPEC_SYNC_CHUNK_BYTES` 可调（conventions：机制先落缺省，env 只作调优，缺省小批量一块直发零回归）。

为什么是这个方案：生产实证（multi-agent-platform 工作区）spec 文件树同步 15 天零落地——单批 2436 ops/45.7MB（base64 后 ~60MB）在「客户端单请求 30s 掐线 + 服务端 apply 16-34s」双超下 best-effort 重试永不收敛。分批后每块上传+服务端处理都在预算内；已落地块推进服务器清单（spec_version bump），失败即停，下一轮 diff 以刷新后的清单为锚、已落地路径自动出 diff——**断点续传免费获得，无需客户端记账**。服务器端 apply_ops 单事务语义按块天然保持（块=事务单元），不动服务端。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `chunkOpsForPush(ops, opts?) → FileOp[][]`（新增导出，`src/spec-sync.js`；同入 default export）：`opts.maxOps`/`opts.maxBytes` 显式传入（测试用），缺省读 env；顺序保序；单 op 超任一上限独占一块（4.7MB 级 change.patch 单文件不切不丢弃）；空数组返回 `[]`。
- env 新增（均缺省零行为变化）：`SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS`（≥1000 生效，缺省 30000）、`SILLYSPEC_SPEC_SYNC_CHUNK_OPS`（整数 ≥1，缺省 128）、`SILLYSPEC_SPEC_SYNC_CHUNK_BYTES`（≥1024，缺省 2MiB）。
- `syncSpecTree` 返回契约不变（`{synced, ok, conflict?, …}`）；多块时失败返回仍 `{synced:0, ok:false}` 但警告行标注「前 N/M 块已落地，下轮自动续传」。
- 超时错误文案更新（`describeSyncError`）：列全三档预算与可调 env——此前「清单 10s / 推送 30s 口径」把增量/全量清单与推送三档混在一句，排障时无法分辨是哪条腿超时（2026-11-04 生产排障实证）。
- 服务端端点/协议零改动（块=独立 POST，服务器无需感知分批）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

**作答**：

1. **乱序/迟到到达**：块间严格顺序提交（for 循环 await），不并发；`computeSpecOps` 每 path 至多产一 op，块间路径互斥——合并 `server_versions`/`platform_deleted` 无同 path 覆盖歧义。他端在块间插入变更：下一块 op 的 base_version 乐观锁照常判冲突（服务器逐块校验），语义与单批一致（冲突 op 跳过、其余照常 apply）。
2. **并发写**（两个执行体同时操作同一数据/文件会发生什么？）：两个 CLI 会话同时推送同工作区——服务器侧既有 per-path 乐观锁语义不变；块切分是客户端本地纯函数无共享状态。env 读取每轮同步时至多三次、无缓存，测试内 save/restore 即可（无进程级残留）。
3. **切换/生命周期**（会话/请求/变更中途切换或中断时状态是否安全？）：中途块失败已落地块不回滚（服务器单块=单事务已 commit）；客户端无新记账面（无「块进度」文件）——续传完全靠下一轮 diff 以服务器新清单为锚自然收敛。熔断 signal（`opts.signal`/AbortSignal.any）逐块生效：任一块在飞被外部 abort → 当块取消、已落地块保留、整轮按既有 AbortError 路径返回。
4. **作用域**（跨工作区/跨仓/多实例时数据会不会串台？）：分批只作用于单次 `syncSpecTree` 调用内的 ops 列表，specRoot 派生的 streak/缓存等既有作用域隔离不变；跨工作区各自独立清单锚，无串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：块尺寸默认值对「慢上行 × 服务端慢 apply」组合仍偏大（2MB 块在 1Mbps 上行 ≈ 16s，加服务端处理贴近 30s 预算）——缓解：三键全 env 可调，且分批本身已把失败面从「整批 60MB 永不落地」缩到「单块重试」；生产落地验证时按实测调优。次风险：块响应合并后冲突横幅只触发一次（合并形状）——与单批一致非回归。

放弃的方案：①服务端 apply_ops 提速（批量 FS/异步 reparse）——reparse 已后台化（ql-20260909-021），剩余为逐文件 bind-mount 写，提速有限且不解决客户端上传超时这一半；不动服务端即免部署。②客户端记「块进度」文件支持块级重试——下一轮 diff 天然只含未落地路径，记账纯属多余真相源。③按固定 op 数单约束切块——4.7MB change.patch 单 op 就能撑爆字节预算，必须双约束。
