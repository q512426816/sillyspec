---
author: flow-machine-draft
created_at: 2026-09-24T22:52:37.391Z
---
# 设计记录（Design Record）— 2026-09-25-thin-precheck-removal

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-precheck-removal 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
删除 flow start 的复杂度预判块（classifyChange 关键词→升厚建议整段移除，留注释存证）。选道信号收敛为纯形态面：清晰度门管需求不明（预段收编），升厚只留用户决策（--upgrade-thick 同意门）与运行时证据（实测失败升档/edit_ratio 路由/评审定档——承诺词/diff 原语/盲维作答在收口时点按证据判风险面）。测试 ⑭ 反转为负例（迁移关键词零升厚建议），agents-instruction 规则 5 同步（选道不看技术关键词）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-precheck-removal 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/flow.js 删预判块；test/flow-protocol.test.mjs ⑭ 三断言反转；templates/agents-instruction.md 规则 5 措辞。classifyChange 本体不动（run auto 模式仍消费）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-precheck-removal 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯删减，无新增状态与路径。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-precheck-removal 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=失去事前大任务提醒——但两次实测证明关键词既误报（R16 迁移误触发）又诱发误执行（臂 A 129M），事前猜测的期望价值为负；大任务真信号（需求不明/实测失败/决策密度）全在运行时面保留。死路=收窄关键词表再试一轮——仍是在错误轴上猜，证据不支持第三次尝试。
