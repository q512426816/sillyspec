---
author: flow-machine-draft
created_at: 2026-09-24T16:40:05.518Z
---
# 设计记录（Design Record）— 2026-09-25-thin-brainstorm-prestage

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-brainstorm-prestage 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
头脑风暴降级为薄流程预段：①flow start 需求清晰度门——--input 缺失或成功标准提取 0 条时 exit 2 给两选一（头脑风暴预段/补输入重跑），不建变更，CLI 只产信号选择归用户；②adopt 收编——变更目录有 brainstorm 产物（proposal/design 在场）且无 flow-state 时收编进薄道：写 flow-state（adopted_from=brainstorm）、redraftMissingArtifacts 补缺件（criteria 回提兜底手写成功标准节）、ensureBindingSlots 按实际 FR 编号追加绑定槽；③flow done 对 adopted 变更豁免 design 四节槽门（brainstorm 设计更丰富，绑定门不豁免）；④指令面更新——agents-instruction.md 规则 3-8 改为薄流程主推+预段+完整流程保留+quick 过渡标注，SKILL.md 快速开始/工作流/description 同步。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-brainstorm-prestage 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow.js cmdFlowStart 新增清晰度门与 adopt 分支、cmdFlowDone design 门豁免；flow-draft.js 新增 ensureBindingSlots 导出、redraftMissingArtifacts criteria 回提加手写成功标准节兜底；templates/agents-instruction.md 与 SKILL.md 指令面更新。无命令签名变化（新增 exit 2 形态）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-brainstorm-prestage 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用。2. 并发写：adopt 是一次性收编（写 flow-state 后重入走恢复简报分支，幂等）；brainstorm 产物 agent 已停笔。3. 切换/中断：adopt 后中断走既有断点续；清晰度门在建变更前拦截，无半态。4. 作用域：adopt 只读本变更目录产物；清晰度门对所有新变更生效（重入/adopt 在门之前早退不受影响——实测 5 处旧夹具需补输入，契约涟漪已按新契约更新）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-brainstorm-prestage 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=清晰度门误伤（需求实际清晰但没写成功标准节）——出口即两选一的选项②补一行标准即可重跑，成本一轮；夹具实测误伤面=5 处。死路=考虑过启发式猜测需求清晰度（关键词/长度）——猜错方向比问一句贵，两选一是确定性最低成本方案。
