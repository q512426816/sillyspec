---
author: flow-machine-draft
created_at: 2026-10-02T17:01:53.471Z
---
# 设计记录（Design Record）— 2026-10-03-fr-governance-telemetry

## 文件变更清单
| 修改 | src/fr-index.js | unreferenced 探针产出 ids（帽 20） |
| 修改 | src/flow.js | rotSuspectFlow 事件带 frIds（帽 20） |
| 修改 | src/run/archive-distill.js | fr-unreferenced 事件透传 ids |
| 修改 | src/knowledge-stats.js | 裁决候选聚合 + Top-N 渲染（无 id 数据零渲染） |
| 新增 | test/fr-governance-telemetry.test.mjs | 四用例（事件负载/兼容/视图聚合） |

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-governance-telemetry 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三件小事一件治理：①发射端补 id——fr-index unreferenced 探针把「未被本次承接引用的 active 条目 id」随域计数一起产出（帽 20），archive-distill 透传落盘；flow.js rotSuspectFlow 事件补 frIds（strong 命中 id，帽 20）。②消费端建视图——knowledge-stats 按 id 聚合 suspect 触达次数与 unreferenced 次数，cmdKnowledgeStats 渲染 Top-N 候选（附来源变更名 + 处置指引行：确认无人承接→承接翻链或人工裁决退休），把「证据发生器」接上「裁决动作」。③unmapped 停车场治理——既有 redomain 机器通道干跑评估、机械可迁者 --write 迁移（ID 不换号），残余头注「检索面-only」显式降级。选此方案因为全部复用既有管道（knowledge-hits 落盘/读取、scanFrIndex、redomainFrEntries），只加字段与视图，无新机制。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-governance-telemetry 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
indexRequirements 返回的 unreferenced 数组元素增加 ids:string[]（帽 20）；fr-rot-suspect 事件负载新增 frIds:string[]（帽 20）、fr-unreferenced 事件负载新增 ids:string[]（帽 20）——均为纯增量字段，存量事件（无字段）解析零破坏。buildFrIndexStats 返回新增 adjudicationCandidates: Array<{id, suspect, unreferenced, change}>（按 suspect+unreferenced 降序）；cmdKnowledgeStats 输出新增裁决候选段（无 id 数据时整段不渲染）。命令面/文件格式无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-governance-telemetry 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：遥测是 append-only 事件流，id 聚合是幂等求和——事件先后/迟到不影响最终计数；帽 20 只影响单事件信息量不影响正确性（Top-N 视图本就是抽样指引非精确账）。
2. 并发写：本变更新增零写面（事件仍走既有 appendKnowledgeHit 单写方；stats 是纯读聚合）。unmapped 治理的 --write 走既有 redomainFrEntries（受其原子写与幂等保护，由既有测试守护）。
3. 切换/生命周期：stats 视图是即时计算无状态；unmapped 迁移中断 → 已迁条目在新域（ID 不换号，绑定链按 ID 寻址不受影响）、未迁条目留在池中，重跑续迁。
4. 作用域：事件与索引都以仓内 .sillyspec 为界；聚合按 id 字符串精确匹配（FR-<域>-NNN 全局唯一），无跨仓串读。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-governance-telemetry 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：候选视图被当门禁用——高 suspect 次数不等于该退休（热文件天然高频被触达）。对冲：渲染文案显式「候选非裁决」，处置指引给出人裁出口（承接翻链/needs_review），视图零阻断。声明边界：①帽 20 截断——超大触达面事件只带前 20 个 id，聚合计数是下界（视图本就是 Top-N 指引）；②存量 64+ 次事件无 id——视图只对新事件生效，历史需积累（不回填伪造）；③unmapped 迁移只做机械可迁面（来源变更可判域者），语义归属不猜。试过放弃：给 unreferenced 探针做全量 id（不帽）——单事件可达数百 id 撑爆 jsonl 行，帽 20 抽样足够指引裁决。

### unmapped 治理留档（FR-05 证据锚）
- 干跑评估：unmapped 池 723 条 / 104 个来源变更批；机械可迁（覆盖文件可判真域）98 条 / 16 批，全部落 **daemon** 域；不可迁 625 条 / 88 批（多为 2026-05~07 存量薄道产物，归档件无交付面记录）。
- 执行：redomainFrEntries 按 `--by-change` 16 批迁移，98 条 ID 不换号（FR-unmapped-NNN 前缀保持——绑定/承接链按 ID 寻址不受影响，评审盘面核实 daemon.md 98 个 FR-unmapped- 节头、625+98=723 守恒）。
- 残余处置：unmapped.md 头注显式降级「检索面-only」（不进注入/查重/测试门比对面——既有行为不变，仅供检索翻阅）。
- git 证据：迁移与头注提交 **28ca0ed3**（含 unmapped.md/daemon.md 变更；change.patch 冻结件按声明面聚焦 src/test，知识文件面以该提交为审计锚——评审 P2 口径补齐）。
