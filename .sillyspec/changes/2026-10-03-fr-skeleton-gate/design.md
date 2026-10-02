---
author: flow-machine-draft
created_at: 2026-10-02T16:34:26.304Z
---
# 设计记录（Design Record）— 2026-10-03-fr-skeleton-gate

## 文件变更清单
| 修改 | src/fr-index.js | isThinSkeletonBodies 判据 + renderFrLines「骨架：thin」+ readActiveFrDigest skeleton 解析 + markSkeletonThin 回填 |
| 修改 | src/run/prompt.js | buildFrIndexDigestSection 滤骨架（TierA 例外）+ 指针行披露 + 遥测 skeletonHidden |
| 修改 | src/flow.js | flowKnowledgeDigest 同款过滤（TierA 例外）+ 指针行披露 |
| 新增 | test/fr-skeleton-gate.test.mjs | 判据单元/索引标记/回填幂等/注入排除+TierA 例外双面/digest flag |

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-skeleton-gate 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
单点判据双端消费：fr-index.js 新增 isThinSkeletonBodies（全部场景体的 Then 均为 flow-draft 占位句「行为符合本条标准描述」→ 纯骨架；任一实质 Then 或无场景体 → 非骨架，保守宁漏勿误杀）。写端：renderFrLines 在状态行后落「骨架：thin」（indexRequirements 归档自动标记，新条目起效）；存量端：markSkeletonThin(knowledgeRoot) 全域扫描回填（解析条目场景正文行的 Then 段，幂等键=标记行在场即跳过）。读端：readActiveFrDigest 解析 skeleton flag（纯增量）。消费端只动注入面：buildFrIndexDigestSection 与 flowKnowledgeDigest 在批次1 排序后滤掉非 TierA 的骨架条目，指针行披露「纯骨架 N 条不注入」，遥测加 skeletonHidden；查重门/rot/测试绑定/承接翻链零改动（骨架的回归与取代价值照旧）。选此方案因为它不删任何数据——只给注入面装信息量阀门，风险最小。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-skeleton-gate 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新增导出：fr-index.js isThinSkeletonBodies(bodies)→bool、SKELETON_THEN_PLACEHOLDER 常量、markSkeletonThin(knowledgeRoot)→{marked, files}。条目文件格式增量：新增可选行「骨架：thin」（状态行后；机械解析契约行族，与「摘要：」「依据决策：」同级）。readActiveFrDigest 条目对象新增 skeleton:boolean。注入行为变化：骨架条目默认不进注入清单（TierA 覆盖命中例外）；fr-inject 遥测新增 skeletonHidden 字段，既有字段（count/rendered/truncated/unmappedFiltered/tierA）零改动。命令/端点无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-skeleton-gate 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：标记是条目静态属性（由场景体内容决定），不依赖事件序；回填与索引标记对同一 entry 先后执行无冲突——joinKnowledgeFile 落盘前有「标记行在场即跳过」闸门，且 CLI 单一写入方（indexRequirements/markSkeletonThin 同仓串行）下不构成实际竞态。
2. 并发写：markSkeletonThin 是本变更唯一新写面（全域知识文件）；与 indexRequirements 同属 CLI 写入方，遵守既有「CLI 单一写入方」纪律，不与 agent 编辑并发（agent 只写变更目录工件）。写失败 fail-soft 返回已标记部分。
3. 切换/生命周期：回填中断 → 已写文件带标记、未写文件下次重跑补齐（幂等键保证无重复无遗漏）；注入过滤是渲染期纯读计算，无状态残留。
4. 作用域：markSkeletonThin 以传入 knowledgeRoot 为界，平台仓回填显式传平台 knowledge 路径，不跨仓；骨架判据是纯文本模式匹配，与 locale/平台无关（占位句是 CLI 固定字面量）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-skeleton-gate 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：误杀——agent 手写的真实需求恰巧以「行为符合本条标准描述」收尾会被判骨架而消失于注入面。对冲：该占位句是 flow-draft 专属字面量（design 槽指引要求 agent 写实质断言）；误杀后果有限（条目仍在索引/绑定/rot 面，TierA 命中时仍注入）；判据要求「全部」场景体命中才标。声明边界：①批次1 之前的切分错位条目（Then=箭头后半截，如平台 FR-components-shared-038 场景行）不满足占位句判据 → 不标不滤（漏放，不误杀——保守侧）；②骨架条目的「摘要：默认场景」行照旧（注入面排除以 skeleton flag 为准，非摘要文本）；③unmapped 停车场同样回填（一致性，反正在比对面之外）。试过放弃：在 flow-draft 起草端直接不生成骨架（消灭源头）——但骨架消灭的是空槽冷启动痛点（R20 实证 agent 手写 +12 轮 Edit），改起草端会回退那个决策；正确位置是消费端按信息量过滤。
