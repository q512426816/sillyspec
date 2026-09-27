---
author: flow-machine-draft
created_at: 2026-09-26T06:24:50.288Z
---
# 设计记录（Design Record）— 2026-09-26-thin-check-cadence

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-check-cadence 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
src/sentinel-assertions.js 新增纯函数 `detectBatchCheckCadence(events)`：扫 watcher 事件流里 `kind==='task-done'` 且 detail 匹配 `checked N→M` 的事件，`M-N>=2` 即一拍多格（一把全勾）证据，返回跳格最大的记录（含 ts/detail），无多格跳返回 null。src/flow.js cmdFlowDone 的 ledger 子步、既有「任务勾选缺失」advisory 之后，独立 try/catch 调 `readWatcherEvents({runtimeRoot, change})` 读流，存在多格跳则 console.warn 两行（证据行+规范动作行），不阻断。选此方案：判据源（watcher jsonl）与读取 API（readWatcherEvents）均为在场既有件；与「任务勾选缺失」advisory 同位同模式——节奏是习惯问题不是造假主张（假勾选另有 L0 硬门 detectFakeCheckCompletion），warn 施压而非 gate 拒收。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-check-cadence 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新增导出 `detectBatchCheckCadence(events) -> {from,to,detail,ts}|null`（sentinel-assertions.js 具名+default export 对象同步加键）；flow.js 无新导出（cmdFlowDone 内部接线）。无 CLI flag、无文件格式变更、无 db 变更。detail 解析正则 `^checked (\d+)→(\d+)$`，与 watcher.js inferEvents 的生成格式成对（同仓两处格式若漂移，解析失配按无证据静默——fail-open）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-check-cadence 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：jsonl 由 watcher 单写者 append-only，时序天然单调；检测取全流最大跳格，不依赖事件间顺序；重启补发的 backfill 事件同格式同判，「是否存在多格跳」判定不受回填影响。
2. 并发写：读侧 readWatcherEvents 逐行解析、坏行跳过（既有 R-04 容差），并发 append 交错的半行按坏行丢弃——advisory 最多漏报一拍，无后果（best-effort 定位）。
3. 切换/生命周期：断点续跑走 ledger skip 分支不重复告警（advisory 只在 fresh 分支）；flow done 中途崩了重入，事件流不变、再告一次——幂等 warn 无害；watcher 在收口时仍可能活着写流（archived 前），读到当前完整行为止，语义可接受。
4. 作用域：事件流按变更名分文件（watcher-events-<change>.jsonl），readWatcherEvents 以 change 名锚定不串台；runtimeRoot 解析与 watcher 落盘同源（resolveRuntimeRoot）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-check-cadence 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=误报施压：两个任务真同时完成（一次提交带两个 task token）后一拍勾两格会被提示——接受（advisory 不阻断，且同拍双完成本就应分两次勾，提示方向正确）。放弃的方案：①收口硬门拒收一把全勾——节奏是习惯非造假主张，硬门会把合法快速变更拦死，与「任务勾选缺失」同为 advisory 的既有裁决一致；②加「贴近收口时刻」时间窗过滤——引入窗口参数且窗口内外行为不一致，简化为「任意单拍 ≥2 格」单一判据；③顺手改 watcher per-change 锁修观测盲区——超出本变更范围（本变更只解决「有观测时的行为矫正」，盲区另立变更）。
