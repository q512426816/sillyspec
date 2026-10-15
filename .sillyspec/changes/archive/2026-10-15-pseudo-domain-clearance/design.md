---
author: flow-machine-draft
created_at: 2026-10-15T01:30:43.942Z
---
# 设计记录（Design Record）— 2026-10-15-pseudo-domain-clearance

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

knowledge digest 治理信号卡超阈实证：伪域在库 36 条（auto-analysis 4、auto-assets 4、auto-claude 12、auto-idea 3、auto-round5 4、auto-sillyspec 9）——auto-* 伪域由交付文件路径段投票派生、无模块卡，触达路由与 FR 注入的按域聚合全部失真。修法走伪域机制文件头自述的正 remedy：为高频复发的发布类条目补真模块卡（release：paths=package.json + test/quick-retired.test.mjs，一周 7 个 release-* 变更实证复发强度），其余按条目内容语义分组用既有 `tests --redomain --write` 迁真域（迁域不换号，绑定/supersede 链身份保持）。机械建议器（suggestDomainFromFiles）对纯文档/chore 变更无能为力（实测 8 组中 5 组无法判定、2 组误建议）——分组裁决人工做出并留痕于本设计。

分组裁决（36 条 = 13 批）：release chores 18 条（3.32.0/1/4/5/6/7/8 七变更：auto-claude 6 + auto-idea 3 + auto-sillyspec 9）→ 新建 release 真域；教学/SKILL 类 6 条（auto-assets 4 + auto-claude brainstorm-skill-title 2）→ skills-docs（模块卡已在，paths=.claude/skills/）；报告/收件箱治理/知识入库类 10 条（auto-analysis 4 + auto-claude inbox-triage 4 + auto-round5 r17-intake 2）→ docs-consistency（文档面治理域，裁决注记：复盘报告属一次性文档工作，不值单独建卡，归文档治理域最近似）；fr-index 引擎修复 2 条（auto-round5 fr-unmapped-repair）→ core-engine（src/fr-index.js 在其 map paths 内，实证）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 无代码/端点/命令变更。数据面：knowledge/fr/ 六个 auto-*.md 删空壳；fr/release.md 新建（redomain 自建+INDEX 路由行自补）；fr/skills-docs.md、fr/docs-consistency.md、fr/core-engine.md 增量条目。配置面：_module-map.yaml 增 release 模块注册；modules/release.md 新建卡。
- 对外行为变化：digest 伪域计数 36→0；未来触达 package.json/test/quick-retired.test.mjs 的变更经 resolveTouchedDomains 路由出 release 真域（此前落 unmapped/伪域）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用——一次性数据迁移，redomain 按段解析落盘，无事件时序面；13 批顺序执行，批间无依赖（同源域多批按 by-change 互斥切分）。
2. 并发写：迁移期间他会话若同写 fr/*.md 会基于旧内容互相覆盖——既有风险面，本变更窗口内快速完成且收口对账以落盘文件为准；redomain 单命令原子写单文件，无半态。
3. 切换/生命周期：redomain --write 幂等（同批重跑 0 条幂等跳过）；中断重跑安全（已迁条目不在源域、计划集自然缩小）。
4. 作用域：知识库属本 spec 树，平台侧镜像经 spec-sync 同步——迁移后 sync 全树差异随归档提交上行，无跨仓串台；域词典=fr/*.md 文件名，新域 release 对全消费端即时可见。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：release 模块卡的 doc-debt 机器把任何 package.json 触达（含依赖升级）计为卡欠账 behind——接受：这正是发布面应有的可见性，欠账是 advisory 不阻断。次风险：docs-consistency 承接 10 条语义混杂（报告/收件箱/入库）——接受并留痕：一次性文档工作不值逐条建卡，未来同类工作若复发再立专域。放弃方案：①全部迁 unmapped（伪域计数归零但把 holding pen 灌爆，unmapped 基线消音机制会被打穿）；②为每个 auto-* 补卡转正（伪域即「无模块卡」的病本身，转正等于把噪音域固化进路由词典）；③按 suggestDomainFromFiles 机械迁移（实测对纯文档变更 5/8 组无法判定、2/8 组误建议——正是伪域成因机制本身，不可作为裁决依据）。
