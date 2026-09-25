---
author: flow-machine-draft
created_at: 2026-09-24T23:43:30.368Z
---
# 设计记录（Design Record）— 2026-09-25-sentinel-wiring

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-wiring 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
sentinel-assertions.detectFakeCheckCompletion 接入两道收口：①flow done ledger 子步入口——tasks.md 全勾但零完成证据（baseline..HEAD 提交 subject 无 task-NN token 且无对应 review.json）→ 拒收 exit 1 点名缺失任务（遥测记 sentinel:fake），全勾有证据打绿行，非全勾/无勾选行放行不变，fail-open；②quick 门（runQuickTestLintGate）failed 数组同判——guard.tasksPath 或 change 目录 tasks.md 全勾零证据 → failed.push(sentinel)。两道同源 import 同判据（watcher R1 口径的硬门版），提交区间各按自家基线。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-wiring 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/flow.js ledger 子步哨兵块；src/run/quick-audit.js（dirname 导入+哨兵块+safeGit 单次调用）；test/sentinel-wiring.test.mjs 三态 e2e（全勾零证据拒/全勾 token 放/非全勾放）+接线钉。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-wiring 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（每轮重算）。2. 并发写：只读 tasks.md+git log。3. 切换：fail-open 断言失败放行不产生假拦。4. 作用域：commit 区间 flow=baseline..HEAD、quick=guard.baselineCommit..HEAD（缺省 HEAD~10..HEAD 兜底）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-sentinel-wiring 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=quick 侧 guard.tasksPath 字段不在（guard 形状按 change 目录兜底拼路径）——缺省走 changes/<名>/tasks.md，quick 的变更目录即此形状；死路=只在 flow 侧接——quick 是存量主道，单侧接线等于半根管线。
