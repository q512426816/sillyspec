---
author: flow-machine-draft
created_at: 2026-10-21T14:12:39.701Z
---
# 设计记录（Design Record）— 2026-10-21-cli-manifest-since-cache

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

平台 spec-manifest 已支持 `?since=<spec_version>` 增量返回（multi-agent-platform 2026-10-21-spec-manifest-incremental 已归档），CLI 消费侧补齐：`src/spec-sync.js` 的 `syncSpecTree` 第 1 步（GET 清单）前读本地缓存 `.runtime/state/spec-manifest-cache.json`，有缓存则带 since 拉增量行、逐行覆盖合并进缓存 files（含墓碑行——与全量清单等价形态）作为 diff 锚；合并结果原子落盘（复用 `writeAtomicSync`）。选「客户端整清单缓存+行级覆盖合并」而非「只存游标+服务器端会话」：服务器无状态、协议与现有全量同构（同一 files 形态），回退路径只是「不带 since」。

四条自愈护栏：无缓存/对账轮/`SILLYSPEC_SPEC_SYNC_FULL=1` 走全量并重置缓存；旧平台（响应无 `spec_version` 字段）作废缓存回退现状行为（未部署窗口零影响）；服务端 spec_version 倒退（重建）时一次性全量对账；对账请求失败按拉取失败处理（ok:false，fail-closed 防空锚全量 add 风暴）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `syncSpecTree(specRoot, platform, changeName, opts)`：签名不变；内部第 1 步 GET 清单改为「缓存感知」——URL 可能带 `?since=<int>`，锚可能来自合并。返回契约不变（ok/synced 语义原样）。
- 新增内部 helper（不导出）：`readManifestCache` / `writeManifestCache` / `clearManifestCache` / `resolveReconcileEvery`（默认 50，env `SILLYSPEC_SPEC_SYNC_RECONCILE_EVERY` 1~10000 整数，非法回退默认）。
- 新文件形态：`<specRoot>/.runtime/state/spec-manifest-cache.json` = `{spec_version:int, files:{path:{hash,version,exists}}, inc_count:int}`（`.runtime` 本就在上传排除面，不进同步树）。
- 新 env：`SILLYSPEC_SPEC_SYNC_FULL=1`（强制全量，逃生门）、`SILLYSPEC_SPEC_SYNC_RECONCILE_EVERY`（对账阈值）。
- 平台端点/协议：无改动（消费 multi-agent-platform 已归档变更的服务端能力）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。合并是「行级最后写者胜」，增量行只可能携带 ≥ 请求时游标的印章（服务端 spec_version 单调），旧游标重放（如本命令推送后下一轮 since=旧值）得到的是超集行——幂等覆盖，无丢失。网络层迟到响应无影响：每轮命令独立拉取，游标只在拿到响应后前进。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   多 CLI 进程共享缓存文件：写走 `writeAtomicSync`（临时文件+rename，读者只见完整态）。两进程基于同一基线各自合并同一批增量 → 结果收敛；交错时后写者覆盖先写者，覆盖只会让游标回退到更旧值 → 下轮 since=旧值返回超集行，幂等自愈，不会丢行。最坏代价是一次冗余传输，无正确性影响。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。缓存写入是单文件原子替换，中断只可能留下旧版完整缓存或无缓存（→ 下轮全量，自愈）；合并发生在内存，锚错误不会落盘。对账失败 fail-closed 返回 ok:false（与现状拉取失败同路径），不留半态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。缓存路径锚定 `specRoot`（各仓 `.sillyspec/.runtime/state/`），游标与 files 均为该 workspace 私有；不同仓/工作空间各自独立缓存，与平台侧 per-workspace 清单一一对应。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：**缓存与服务器清单脱钩后的幻影行**（缓存含服务器已不存在的行 → 每轮生成 no-op delete op）。诱因仅限缓存文件被外部破坏或服务器纪元更换；防线三层——spec_version 倒退检测全量对账、inc_count 定期全量对账（默认 50 轮）、`SILLYSPEC_SPEC_SYNC_FULL=1` 逃生门；幻影 delete 在服务端本就是无行 no-op（R-07），changes/ 整删另有 computeSpecOps 空树守卫兜底。次风险：缓存文件体积与全量清单同量级（2MB 级）——本地磁盘无压力，读取 <50ms（实测量级），可接受。

放弃的方案：① 只存游标不存 files（每次让服务器返回「游标后全量」）——服务器需新语义（返回基线+增量两段）且无合并锚，协议复杂化；② ETag/If-None-Match 整体未变短路——无变化场景才有效，任何单行变化仍全量 2.2MB；③ 服务器端存客户端会话——有状态、多机 CLI 各自游标互踩，与无状态端点原则冲突。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/spec-sync.js | 清单拉取段缓存感知（since 增量合并/全量落缓存/旧平台回退/倒退对账）+ 4 个缓存 helper |
| 增 | test/spec-sync-manifest-cache.test.mjs | 本地 mock server e2e：增量合并/全量回退/倒退对账/稳态 <1s |
