---
author: flow-machine-draft
created_at: 2026-09-25T09:24:23.412Z
---
# 设计记录（Design Record）— 2026-09-25-agents-lightweight-sync

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-agents-lightweight-sync 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
本仓 AGENTS.md 是 init v3.28.3 生成的旧版选道口径，落后于 2026-09-25-thin-default-flip（flow.mode 缺省翻 thin，quick 退役第 1 步）与最新模板 templates/agents-instruction.md。做法：以最新模板口径为依据逐条同步本仓 AGENTS.md 第 3/4/6/7/15 条——轻量变更为默认快道（两调用协议）、quick 降级为存量过渡通道、倒推 B 模式改轻量收尾、quicklog 补存量定位。纯 doc 修正，不动 src/test/templates。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-agents-lightweight-sync 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
无代码接口变化。对外可见变化仅为 AGENTS.md 指引文案。文案中引用的接口均为现存实现，已逐一验证在场：flow start --input / flow done（src/flow.js）、--upgrade-thick（src/flow.js、src/run/command.js）、flow.mode 缺省 thin（src/flow.js readFlowConfig）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-agents-lightweight-sync 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：不适用——静态指引文档，无事件流。
2. 并发写：AGENTS.md 是共享主仓根文件，他侧会话可能并行修改；本次 Edit 前已重读最新态，改动限定五条独立段落，同段落撞车会以 git 冲突显式暴露而非静默覆盖。
3. 切换/生命周期：一次性 doc 修正无中间态风险——半改状态不影响 CLI 运行（仅指引文案短暂混合），提交即收敛；flow done 中断可重入断点续。
4. 作用域：仅本仓根 AGENTS.md；templates/agents-instruction.md（已是新口径）与其他仓 init 生成物不触。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-agents-lightweight-sync 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：同步时误伤其余条目，或写入与 CLI 实际行为不符的描述（指引比 CLI 更危险）。对冲：FR-04 约束其余逐字不动并以 git diff 核对；文案引用的每个 flag/默认值逐一 grep 源码验证在场。放弃的方案：用模板整体覆盖 AGENTS.md——放弃理由：本仓 AGENTS.md 含本仓专属积累（第 18 条 git 纪律详版实证、第 19 条会话身份纪律），模板无这些内容，覆盖会丢失。
