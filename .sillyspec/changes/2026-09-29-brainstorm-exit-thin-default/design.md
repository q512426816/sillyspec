---
author: flow-machine-draft
created_at: 2026-09-28T23:27:08.940Z
---
# 设计记录（Design Record）— 2026-09-29-brainstorm-exit-thin-default

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-exit-thin-default 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：三处摘厚默认——① design-facts.js generateDesignSkeleton 不再预填 scale: large，留 TODO 位（含落值指引注释）；② brainstorm.js Step 8 精判与 Step 2 粗判判据从文件数轴（≤2 文件）换复杂度/上下文轴（small=单上下文可吞吐：无 Wave 编排/上下文分片/多阶段治理需求；large=有；拿不准→small[Step8]/继续探索[Step2]，与选道表第 3 行复杂度措辞对齐）；③ complete.js 收口提示翻转——large→run plan，small/未标→flow start 收编（readDesignScale 对空串注释返回 null 落默认分支）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-exit-thin-default 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
接口契约：readDesignScale 解析不变（/^scale:["']?(\w+)/——空串注释无 word 捕获→null）；design 骨架 frontmatter scale 为 ""；AGENTS.md 模板零改动（选道表本就是复杂度措辞，无版本 bump 需要）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-exit-thin-default 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
边界并发四问：不适用：纯文案/默认值改动，无状态无 IO 新面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-exit-thin-default 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：① 拿不准默认 small 可能低估真复杂变更——兜底三层：实测失败自动升厚（既有）、--upgrade-thick 用户决策（既有）、收编后 thin 道自身门禁（实测/评审/patch）；② 模板标题下 agent 忘写 scale→null→默认收编，行为与 small 一致（符合设计）；③ premise-fail 型需求（前提不成立）仍要走满 8 步——行为演习发现的真实摩擦，属早期短路道新课题（记残留在变更报告）。行为级闭环验收：小白鼠带模糊中等规模需求（测试慢优化）走全链——入口选道进头脑风暴（负面信号命中）、Step 8 按新判据落 scale=small、CLI 指路 flow start 收编、下一步命令即收编命令——原始问题「头脑风暴后直奔五阶段」的反例实测成立。
