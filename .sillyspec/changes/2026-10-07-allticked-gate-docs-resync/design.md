---
author: flow-machine-draft
created_at: 2026-10-07T12:56:19.089Z
---
# 设计记录（Design Record）— 2026-10-07-allticked-gate-docs-resync

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三个触点：① flow.js 哨兵位的勾选缺失 advisory 块升级为拒收（判定条件从 checked===0 收宽到 checked<claimTotal——openspec all_done 语义：checkbox 是完成状态机，不全勾不能收口；token 代勾先行，拒的纯属零证据未完成面）；② task-tick.js 翻格成功后 best-effort triggerSync（CLI 写任务面的时点即重推时点）；③ watcher.js 新增 shouldResyncDocs 纯函数（四工件名匹配 file/file-update 事件）+ 主循环 10s 防抖消费——覆盖 Edit 勾格与中途重写。选此方案因 platform 陈旧的根因是「文档推送只在协议调用时点」，两条写入路径（CLI tick / 文件变更）各挂一个触发器即闭环，不动 spec-sync 本体。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

flow done 行为变更：未全勾拒收（原 advisory 放行）。task tick 新增 best-effort 副作用（triggerSync）。watcher 新增导出 shouldResyncDocs(events)→boolean 与内部防抖常量。无端点/文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用/已防：重推触发是幂等副作用（spec-sync 全量对账式同步，后到覆盖先到）；全勾门只读收口时点终态，无序不敏感。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

triggerSync 内部自带单飞锁与后台合并（bg-sync spawn 决策），watcher 与 task tick 同时触发也只会合并为一轮后台同步；失败方向全 best-effort。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

拒收是幂等断点（重入幂等跳过已完成子步）；防抖锚是 watcher 进程内存变量，重启冷却归零仅多触发一轮幂等同步。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用：triggerSync 按 cwd+change 定位；watcher 事件按 change 目录采样，无跨变更面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：全勾硬门对存量在途变更的收紧（未勾收口从放行变拒收）——出口明确（补 token 提交+tick 或改写任务面），且与证据门同哲学；次风险：tick 触发的后台同步在网络差时堆积——bg-sync 单飞锁+合并天然防堆积。试过放弃：时序门（tick 时 token 提交须已存在，先证后勾）——用户裁定参考 openspec：openspec 无任何时序/证据审计，完成状态机（全勾才收口）+自愿循环指令即是其全部机制，我们已有证据门加全勾门已强于它，时序门属过度强制，放弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow.js | 勾选缺失 advisory 升级为全勾硬门拒收 |
| 修改 | src/task-tick.js | 翻格后 best-effort triggerSync |
| 修改 | src/watcher.js | shouldResyncDocs 纯函数 + 主循环防抖重推 |
| 修改 | test/task-tick.test.mjs | ⑤ 反转为拒收断言 + ⑥ 重推纯函数与接线钉 |
| 修改 | test/sentinel-wiring.test.mjs | 形态 C 反转为拒收 |
| 修改 | test/flow-tick-prototype.test.mjs | ④ 反转为拒收 |
| 修改 | test/flow-parity.test.mjs | 夹具 token 补全 |
| 修改 | test/flow-done-carry-suspect-advisory.test.mjs | 夹具 token 补全 |
| 修改 | test/flow-draft.test.mjs | 夹具 token 补全（两处） |
| 修改 | test/flow-agent-log-report.test.mjs | 夹具 token 补全 |
| 修改 | test/flow-clarity-probe.test.mjs | 夹具 token 补全 |
| 修改 | test/flow-route.test.mjs | 夹具 token 补全（两处） |
| 修改 | test/flow-protocol.test.mjs | 夹具 token 补全（九处） |
