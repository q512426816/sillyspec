---
author: flow-machine-draft
created_at: 2026-11-09T06:41:23.072Z
---
# 设计记录（Design Record）— 2026-11-09-terminal-sync-background

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

复用既有 detached 后台通道（bg-sync）承载终态推送，前台只落 marker 不等待。三件套：

1. **新模块 `src/final-sync.js`**：终态 marker 的读写与两段消费逻辑。marker 落 `runtimeTempPath(runtimeRoot, 'final-sync/<change>.json')`（temp 分层，可随时删），内容 `{change, status:'pending'|'ok'|'failed', ts, detail}`。导出 `writeFinalSyncMarker` / `readFinalSyncMarkers` / `finalizePendingFinalSyncMarkers`（bg 子进程侧：对 pending 逐个调 `sync()` 按 `treeOk` 写 ok/failed）/ `consumeFinalSyncMarkers`（命令侧：ok 静默删；failed 打 🚨+自救命令后删；pending 超 `FINAL_SYNC_PENDING_TTL_MS=10min` 做一次验证性 sync，成功删、失败报后删——解析失败/IO 异常一律跳过不阻断主命令）。
2. **`src/run/shared.js` 终态强校验分支改造**：`triggerSyncTerminalStrictImpl` 终态路径先判 `SILLYSPEC_SYNC_BG==='0'` 或后台不可用 → 走原内联路径（原代码原样保留，含 raceWithAbort/🚨/exitCode=1）；否则写 pending marker → 显式调 `bg.spawnBackgroundSync`（经 `opts.bgImpl` 注入缝，对齐 syncImpl 惯例）→ `spawned`/`coalesced` 返回 `{confirmed:false, delegated:'background'}`（不设 exitCode），其余结果/抛异常 → 降级内联旧路径。
3. **`src/run/bg-sync.js` 子进程收敛**：`runBgSyncFromEnv` 主轮结束后（终态补推段旁）调 `finalizePendingFinalSyncMarkers`——主轮 triggerSync 已把树推完，此处对 pending marker 的补推通常为增量 no-op、仅取 `treeOk` 结果收敛 marker。

不卡前台的关键：内联等待（45s 预算 race）只保留在逃生阀与降级路径；主路径前台只做本地文件写 + spawn，毫秒级。大 patch（MB 级，多会话并行仓常规态）传输在后台子进程完成（总预算 150s，2026-11-09 实证 5.8MB@1Mbps≈45-80s 可容纳）；超预算残留由 pending marker 的下条命令验证/重试闭环兜住。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增 `src/final-sync.js`：`writeFinalSyncMarker(runtimeRoot, change, status, detail?)`、`readFinalSyncMarkers(runtimeRoot)`、`finalizePendingFinalSyncMarkers(cwd, platformOpts, opts)`、`consumeFinalSyncMarkers(cwd, platformOpts, opts)`；常量 `FINAL_SYNC_PENDING_TTL_MS`。
- `triggerSyncTerminalStrict` 返回契约扩展：后台成功时 `{confirmed:false, delegated:'background'}`（原 `delegated:true` 仅非终态委托/quick 路径保留）；`opts.bgImpl` 新注入缝；`opts.syncImpl` 原缝保留（内联路径）。
- **行为变化（对外可见）**：flow done/complete/change-delete 终态同步默认不再前台等待平台确认——exit code 不再反映终态推送结果；平台半态暴露从「当场 🚨」变为「下一条命令补报横幅」；`SILLYSPEC_SYNC_BG=0` 逃生阀行为不变（内联强校验原样）。REST/平台端点零改动。
- marker 文件格式：`final-sync/<change>.json`，`{change, status, ts, detail?}`——runtime temp 产物，非契约存储，可随时整目录删除。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——marker 状态机单向 pending→ok/failed，bg 子进程收敛以 `sync()` 实际返回为准而非时序假设；同 change 重复归档/删除会覆盖写同名 marker（最后一次终态为准）；「下一条命令」补报是事件驱动兜底，迟到只延迟暴露不丢终态（sync 本身幂等增量）。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   marker 为单文件整写（writeFileSync 原子替换语义），并发写最坏互覆——pending（前台）与 ok/failed（bg 子进程）竞态时以任一方为准均可收敛：ok/failed 覆 pending 是正常收敛序；pending 覆 ok/failed 的窗口内靠 TTL 验证路径再收敛（验证性 sync 幂等），无死锁无悬挂放大。多命令并发扫描消费：消费=读→报→删，两命令同时读到同一 failed 最坏重复一条横幅（先例注释同款取舍：宁可重复不静默）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——marker 在 runtime temp 目录，进程崩溃/断电后残留 pending 由 TTL 验证路径自愈；bg 子进程崩溃不影响父命令（detached 早已 unref）；变更被再次归档/删除会重写 marker 覆盖旧态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——marker 按 runtimeRoot 隔离（跟随 platformOpts.specRoot/runtimeRoot 解析，同仓同区），文件名=变更名（受控字符集），跨仓/跨工作区各自独立目录；bg 子进程经 env 继承同一 runtimeRoot（既有机制），收敛扫描不会越界。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：用户归档后不再跑任何 sillyspec 命令 → failed/pending marker 无补报时机，平台半态暴露依赖用户手动 `platform sync` 或下次使用。缓解：bg 子进程 150s 总预算对实测 5.8MB@1Mbps（45-80s）有裕量，失败是小概率；marker 在 temp 目录可被 `doctor`/`platform sync` 旁路发现；横幅补报是尽力而为非保证送达（与既有「下一条命令」事件驱动语义一致，坑档案 archive-half-state 的根因是无人再碰，本变更把暴露时机提前到下一次任意命令）。
- 次风险：超时 pending 的验证性同步在慢链路上自身超时（默认 8s）→ 误报 failed。取舍：宁可误报不静默（用户跑 platform sync 即真相大白），且 8s 默认可 env 放宽，误报成本低。
- 试过但放弃：①请求体 gzip 压缩传输——需平台 backend 加请求解压配合，跨仓两阶段且改协议面，与本变更「平台零改动」约束冲突（留独立变更）；②patch 冻结面按声明文件收窄——改审计件语义（窗口完整现场→仅本变更面），影响 sha256 锚定审计真相的定义，须单独评审拍板；③终态等待可调短（SILLYSPEC_FINAL_SYNC_TIMEOUT_MS）——治标不治本，前台等待上限再短仍是卡前台，与本需求「不能卡前台」直接冲突。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | src/final-sync.js | 终态 marker 读写 + finalize/consume 两段消费逻辑 |
| 修改 | src/run/shared.js | triggerSyncTerminalStrictImpl 终态分支后台化（逃生阀/降级保留内联旧路径） |
| 修改 | src/run/bg-sync.js | runBgSyncFromEnv 主轮后挂 finalizePendingFinalSyncMarkers 收敛 |
| 修改 | test/terminal-sync-strict.test.mjs | 既有内联用例钉到 env=0 前提；新增后台化/降级用例 |
| 新增 | test/final-sync-marker.test.mjs | marker 生命周期/收敛/补报消费用例 |
| 修改 | .sillyspec/docs/sillyspec/modules/sync.md + sync.changelog.md | 终态同步语义变化留档（评审更正：原清单路径漏 .sillyspec/ 前缀） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | sync 模块 paths 登记 src/final-sync.js（收口 patch 门登记要求） |
