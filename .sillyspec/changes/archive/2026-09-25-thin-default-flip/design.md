---
author: flow-machine-draft
created_at: 2026-09-24T16:51:56.064Z
---
# 设计记录（Design Record）— 2026-09-25-thin-default-flip

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-default-flip 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
quick 退役三件套：①readFlowConfig 缺省 legacy→thin（catch 兜底同步），legacy 拒跑文案反转、config-schema flow.mode 描述/示例更新、stage-burst ⑩ 登记钉按新缺省重钉、本仓 local.yaml 狗粮段移除实证缺省生效；②run quick 渲染入口（runStage quick 块）打存量过渡横幅指路 flow start——--done 收尾不经 runStage 不受打扰，quick 全功能不变（test:core 176/176 零破坏）；③flow start 清晰度门后接 classifyChange 预判：mode=full 打升厚建议（advisory，失败升厚兜底）；④agents-instruction 规则 6/9/17 同步（quick 存量过渡/倒推 B 薄道优先/quicklog 存量标注）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-default-flip 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow.js readFlowConfig 缺省与守卫文案、cmdFlowStart 预判块；config-schema.js flow.mode 条目；run/stage.js quick 块横幅；templates/agents-instruction.md 三条规则；测试面：stage-burst ⑩ 重钉、flow-protocol ⑭ 新增（缺省实效+预判正负例）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-default-flip 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用。2. 并发写：本仓 local.yaml 狗粮段移除是单方配置变更（gitignored），并行会话显式写 mode 的行为不变。3. 切换/中断：无状态引入（缺省翻转是纯读取行为变化）。4. 作用域：显式 mode: legacy 的仓零影响（拒跑守卫原样）；quick 横幅对存量会话只是渲染层一行 warn，收尾路径未动。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-default-flip 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=存量仓 AGENTS.md 仍指引 run quick 而命令打横幅——指引漂移窗口靠横幅自身弥合（横幅即指路），目标仓重跑 init 升级模板后消除；quick 未硬拆是有意保守（并行在途 quick 会话需 --done 收尾，硬拆会拦死收口路径——存量会话收完后的彻底移除留独立变更）。死路=硬拒 run quick——多会话共享仓里在途会话被拦死收尾，违背存量兼容原则。
