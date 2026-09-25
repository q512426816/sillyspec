---
author: flow-machine-draft
created_at: 2026-09-25T15:44:59.554Z
---
# 设计记录（Design Record）— 2026-09-25-platform-feedback-batch2

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-platform-feedback-batch2 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
平台狗粮第二轮四件：B 他侧声明时效判据——collectForeignDeclaredFiles 增加变更目录 mtime >7 天跳过（陈旧变更的声明不抢活人文件）；C test:skipped 标因——实测面 fmt 函数 skipped 时透传 reason 首句（环境缺件/无测试面/策略跳过各有 reason 字段已存在，只是没显示）；D PROMISE_RE 收敛——移除幂等（实现手段由 diff 原语面覆盖，保留七个交付语义词）；E design 声明面自证——patch 子步后 parseFileChangeListDetailed 比对声明文件是否都在冻结面，不在则警告（承诺改了但没交付）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-platform-feedback-batch2 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/foreign-declared.js（statSync 导入+时效判断）；src/flow-review.js（PROMISE_RE 去幂等）；src/flow.js（fmt 函数 skipped 加 reason、patch 子步加声明面自证）；测试面（flow-review/protocol 承诺词测试改用不丢失替代幂等）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-platform-feedback-batch2 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：B 是过滤条件增强（旧变更跳过=更少误排除）；C 是输出信息增补；D 是触发面收窄；E 是 advisory 自证。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-platform-feedback-batch2 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=B 的 mtime 判断——真活跃但目录 mtime 未更新？任何文件写入（design/tasks/槽位）都会 touch 目录 mtime，7 天不 touch 的变更事实上已死。A（声明解析剥反引号）经查 normalizePath 已有该逻辑——可能是平台用户遇到的是其他格式，需确认后再修。
