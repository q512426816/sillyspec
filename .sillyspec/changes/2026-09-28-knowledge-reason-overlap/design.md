---
author: flow-machine-draft
created_at: 2026-09-28T13:26:52.951Z
---
# 设计记录（Design Record）— 2026-09-28-knowledge-reason-overlap

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-reason-overlap 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：relScore 维持 id＋标题口径不变，guard 组（rejected∪死路）排序比较器加二级裁决——分数并列时死路注记条目优先。刻意不把理由并进评分文本：Jaccard 比率偏爱短文本（短理由无关条目共享一个 bigram 即得高比率，压过长理由被稀释的相关条目——实测「穷举」查询下 D-009 与需求直接冲突 排到 D-001 前），宁用零分平局先验兜底近义场景。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-reason-overlap 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
接口契约：byOverlapDesc 比较器语义=(重叠率降序,死路优先)；matchKnowledge 对外键与 decisionHits 字段零变化。向后兼容：非 guard 组 deathPath 恒假，二级裁决无效果，行为与上版一致。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-reason-overlap 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
边界并发四问：不适用：纯排序比较器改动，无状态无 IO 无并发面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-reason-overlap 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：①平局先验只兜「标题零命中」的近义查询，查询词命中了无关条目标题时先验不介入（主题信号优先于先验，属正确取舍）；②死路条目在文件序靠后时靠先验置顶而非相关度——先验普适于死路类（本变更全链路的立论即死路类是最强防复潮信号）。退役判据=死路先验导致高频无关置顶投诉。
