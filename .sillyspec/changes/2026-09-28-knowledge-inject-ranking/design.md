---
author: flow-machine-draft
created_at: 2026-09-28T13:11:00.997Z
---
# 设计记录（Design Record）— 2026-09-28-knowledge-inject-ranking

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-inject-ranking 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：knowledge-match.js 三处——parseDecisionFile flush 时按「理由含『死路：』字面标记」置 deathPath；matchKnowledge decisionHits 改防复潮优先组（rejected ∪ deathPath）＋组内按 查询×(id+标题) bigram 重叠率降序（复用 fr-index frTitleOverlap，封闭面字符重叠非语义判定）；新增导出 deathPathNote 提取死路短句。消费方两处：flow.js flowKnowledgeDigest 过滤条件加 deathPath、渲染分「否决理由/⚰️死路」两态；complete.js knowledge-gate 回显同构。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-inject-ranking 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
接口契约：decisionHits 条目新增布尔字段 deathPath（默认无=undefined 假值，消费方可选消费）；matchKnowledge 其余四键（matched/entries/report/json）语义不变；deathPathNote(reason: string) → string（死路句到首个句读，无标记截 60 字）。向后兼容：既有消费方只读 status/reason 不受影响。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-inject-ranking 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
边界并发四问：不适用：纯函数级排序与解析改动，无状态、无并发面、无时序依赖（解析为读文件同步单趟）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-knowledge-inject-ranking 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：① 长查询稀释重叠率（frTitleOverlap 并集含查询全长）——同查询内相对排序仍成立，跨查询不可比（仅用于排序非阈值判定）；② 「死路：」字面标记依赖蒸馏书写惯例——未按此惯例写的教训条目仍不进防复潮面（覆盖率问题，宁缺毋滥）；③ id 数字 bigram 微量串扰（如 2026-09-28 与 D-009@v1 共享 "09"）——分数远低于标题实词重叠，排序不受扰（测试②钉住）。死路=为 implemented 条目引入 rejected 语义提升——若知识库大量误标死路会造成防复潮面噪音，退役判据=回显噪音投诉或命中条目与主题长期无关。
