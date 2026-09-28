---
author: flow-machine-draft
created_at: 2026-09-28T09:15:41.329Z
---
# 设计记录（Design Record）— 2026-09-28-tap-judge

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-tap-judge 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三件：① deps(auto-js) 批命令升级双报告器（--test-reporter=spec→stderr 供人读、--test-reporter=tap→stdout 供机读），批对象带 tap 标记；runOneModule 对 tap 批优先走 judgeTapOutput——按 ^not ok 行用例粒度判账，fixture 正文/控制台噪声自由文本对 TAP 路径物理消失；输出非 TAP（旧 node/异构）自动回退 legacy。② 豁免匹配编译与单行匹配抽为 buildExemptPats/matchExemptLine 共用单点，partitionFailures 与 TAP 判账语义完全一致。③ P1 根因修复：集成测试发现父级 node:test 进程的 NODE_TEST_CONTEXT env 经 execSync 全量继承，内层 node --test 误入 child 模式 stdout 全空——脏 env 复现 0 输出、剥离后 flow-protocol 22/22（含 ⑮）全过；runOneModule execSync 统一剥离该键（普通进程零变化）。豁免 D 组三条按删除条件移除。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-tap-judge 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
verify-postcheck.js：judgeTapOutput 导出、buildDepsBatches js 批命令与 tap 标记、runOneModule opts.tap 与 env 清洗、匹配器抽取；test/tap-judge.test.mjs 六用例（含真实双报告器集成——集成用例自身需剥 NODE_TEST_CONTEXT，坑已注释）。无 CLI 签名变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-tap-judge 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（TAP 输出为运行器终态快照）。2. 并发写：纯判账层。3. 切换：非 TAP 回退路径保证旧形态零断裂；env 剥离只删一个键（普通进程本无此键零变化）。4. 作用域：TAP 判账仅 deps(auto-js) 批；module 命令与跨仓命令仍 legacy；豁免单点保证两路口径一致不漂移。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-tap-judge 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：TAP 报告器为 node 18.17+ 特性——旧 node 消费仓的 auto-js 批（本就要求现代 node 跑 node --test）实际不构成风险，非 TAP 回退兜底。放弃方案：全量换 JSON 报告器（变化面更大，TAP 文本行与既有豁免模式语义更接近）。
