---
author: flow-machine-draft
created_at: 2026-09-28T16:48:52.215Z
---
# 设计记录（Design Record）— 2026-09-29-knowledge-vector-recall

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-knowledge-vector-recall 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：新建 src/knowledge-vector.js——platformVectorRecall（读 readPlatformConfig：env SILLYHUB_PLATFORM_URL/TOKEN → local.yaml platform 段；POST /api/spec/knowledge/vector-search，Bearer 鉴权，3s 超时，任何失败返回 null 静默降级）＋ buildResultFromPlatform（spec_path+anchor(+change) 映射本地条目，策略面全本地解析，同号条目 change 消歧/缺省全量带回）＋ matchKnowledgeHybrid（路由→平台→本地词片三层编排）。knowledge-match.js 拆出 matchByRouting/fallbackByQueryShingles 导出，同步 matchKnowledge 行为零变化。四消费方切 hybrid（flow 注入段/complete 门/prompt {DECISION_HITS}/knowledge search CLI）。同步保留面三处不动（审查 R4 点名）：prompt.js buildKnowledgeInjection（execute 知识注入）、execute.js、complete-handlers.js——execute 期注入非本变更设计时点面，v1 范围外。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-knowledge-vector-recall 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
接口契约：端点规格见变更目录 platform-endpoint-spec.md（SillyHub 实现用）；hybrid 结果 json.vector=true 可判别来源；decisionHits.score 语义=平台相似度（[0,1]，与路由 Jaccard/回退词片计数并列，消费方只判 >0）；开关 env SILLYSPEC_KNOWLEDGE_VECTOR（off/auto）> local.yaml knowledge.vector_search（缺省 auto）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-knowledge-vector-recall 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
边界并发四问：不适用：HTTP 只读 POST 查询、3s 超时上限、失败降级路径无状态；无写面无并发面；平台配置读取复用 sync.js 既有 resolve 链。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-knowledge-vector-recall 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险：① 平台未实现期每个零命中查询打一次真实平台 404（静默、debug 可开——流量无害但可观测）；② 向量结果随 embedding 模型升级漂移（非确定性）——advisory 面可接受，确定性底座是本地层；③ 同号锚点缺 change 时全量带回可能放大（unmapped 实测 65 同号）——三层有界：构建侧 score 序封顶 20、flow/complete 渲染 slice(0,5)、prompt 渲染 slice(0,5)（审查 P2 补齐）。退役判据=平台向量命中长期与主题无关（召回质量投诉）或平台放弃该端点（删本层即回两层）。
