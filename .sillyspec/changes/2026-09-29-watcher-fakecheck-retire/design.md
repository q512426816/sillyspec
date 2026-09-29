---
author: flow-machine-draft
created_at: 2026-09-29T08:47:31.957Z
---
# 设计记录（Design Record）— 2026-09-29-watcher-fakecheck-retire

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-watcher-fakecheck-retire 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
移除 watcher R1 fake-check 实时嫌疑警告：逐格勾选发生在提交前是现行协议的正常时序（提交=交付期、review.json=评审期），勾选时刻零证据不构成嫌疑；真裁决在收口哨兵（逐 task 证据）与单拍勾选硬门（2026-09-29-batch-tick-gate）。该警告在新协议下对每次合法逐格勾选都误报（用户裁决移除），pending 消解机制（fake-check-cleared）随之失去存在意义一并退役。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-watcher-fakecheck-retire 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
watcher.js 删除 ruleFakeCheck 函数与调用点、state.fakeCheckPending（初始化/水位持久化两处）、仅此处使用的 readBaselineTasks/mirroredTaskIds import；水位写回 writeSnapshotWatermark 去掉 extra 参。读侧（alerts/timeline 命令）规则名无关，历史事件流中的存量 fake-check 行仍可渲染（无破坏）。watcher.test.mjs 生成器用例改写为退役钉（勾选零证据不产警告、pending 面不存在）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-watcher-fakecheck-retire 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯删除只读观测规则——1) 乱序：事件流只追加，历史行渲染不受影响；2) 并发：无新共享态（反而删了一块）；3) 切换：水位旧键残留被忽略（读侧已无消费方）；4) 作用域：仅本仓观测面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-watcher-fakecheck-retire 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：失去实时人判信号——收口哨兵+单拍门已覆盖同判据的终态裁决，实时层只剩噪音（合法勾选全部闪嫌疑）；历史事件流中的存量 fake-check 事件仍会被 alerts/timeline 渲染（读侧规则名无关）——属历史数据如实展示非新增噪音。弃案：降为 info 级保留——半 retire 徒增状态面。
