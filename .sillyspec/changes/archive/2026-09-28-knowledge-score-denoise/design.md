---
author: flow-machine-draft
created_at: 2026-09-28T13:39:36.124Z
---
# 设计记录（Design Record）— 2026-09-28-knowledge-score-denoise

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-score-denoise 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：matchKnowledge relScore 评分前以 contentChars 剥除数字、标点（\p{P}）与空白——只计内容字符（字母含 CJK）的 bigram 重叠。数字噪音源（变更名日期 2026-09-28 与条目 id D-009@v1 共享 -0/09）在 {DECISION_HITS} 场景（taskContext=纯 ASCII 变更名、无内容词）归零 → 全体零分平局 → 死路先验接管置顶。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-score-denoise 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
接口契约：contentChars 为 matchKnowledge 内局部函数（不导出）；frTitleOverlap 语义不动（FR 去重消费方零影响）；decisionHits 键与排序语义（重叠降序、零分平局死路优先）不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-score-denoise 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
边界并发四问：不适用：纯函数文本归一＋评分改动，无状态无 IO 无并发面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-score-denoise 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：① 剥数字后「含版本号/年份的语义查询」（如 查 FR-016 相关决策）丢失数字区分力——决策标题本无数字语义，可接受；② \p{P} 剥除连中英标点（含全角），标题实词不受影响。死路=正则 Unicode 类别写错会静默破坏主场景（首版 \W 误剥 CJK 被测试②当场拦截）——测试钉主场景/近义/ASCII 三面。退役判据=出现依赖数字 bigram 才能区分的相关性场景投诉。
