---
author: flow-machine-draft
created_at: 2026-10-14T14:25:56.250Z
---
# 设计记录（Design Record）— 2026-10-14-decision-global-id-epoch

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

决策号 epoch 全局化，走迁移评估推荐的选项③（增量）：蒸馏写面为新条目发全局号 `D-<发号域>-NNN@vN` + 「原编号：」溯源字段（局部号），存量 700 条 legacy 段零触碰（FR_INDEX_EPOCH「不伪造历史」先例）。为什么增量而非全量重发：全量代价高（698 条中 37 条无变更字段不可回源、70 组多域扇出身份歧义、平台向量 anchor 全量失效），且 P1/P2 已把检索/展示/豁免的同号痛点清偿——全局号的收益（引用/锚/豁免键天然唯一、同号密度只减不增）从新知识开始累积即可。单一身份铁律沿用 FR 侧裁决（fr-index R1：per-domain 发 N 个号违背单一身份）——扇出条目同号落多域文件；发号域=resolveDomains 首域，迁域不换号（域在号内是历史痕迹）。读面四处双形态解析（局部/全局正则并集），graph supersedes 经原编号解析同变更目标。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/decision-distill.js：distillIntoKnowledge 增发号步——新条目标题 `## D-<域>-NNN@vN`、字段「原编号：<局部号>」（变更行后/锚点行前，不破「文件：紧跟锚点」红线）；段匹配谓词扩展（变更一致 且 号或原编号一致）；renderBlockLines 增原编号行渲染（仅带 originId 时）；跨文件清理同谓词。splitKnowledgeSections 读入 s.origin（原编号）。
- src/knowledge-match.js：DECISION_HEADER_RE 双形态（`D-(?:[A-Za-z0-9_-]+-)?\d+@v\d+`）；DECISION_ORIGINID_RE 读「原编号：」进 cur.originId。
- src/knowledge-graph.js：supersedes 同变更目标解析支持 `x.id===sid || x.originId===sid`（同变更限定不变）。
- src/docs-check.js：parseDecisionEntries 标题正则双形态。
- src/doctor-diagnostics.js：决策计数正则双形态。
- src/knowledge-vector.js：anchor 契约注释注记（等值匹配语义零变化；平台重建索引窗口降级边界）。
- CLI/命令：无变化；文件格式为加法（新形态标题+原编号行，legacy 形态继续合法）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 答：发号 max+1 是「扫描时点」快照——迟到条目走既有匹配谓词复用号（重放幂等）；两变更并发蒸馏同域可能撞号（扫描→写入无锁）——与 FR 侧发号同病（fr-index 先例：无锁，接受窗口），撞号形态=同域同 NNN 两条，读面双形态照常解析、不损数据，doctor 可见。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 答：写面仍是 decision-distill 单写者（归档链调用）；无新增并发面（发号扫描只读）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 答：发号后中断（未落盘）→ 号未占用，下次重发同号（max+1 重新计算）无孤儿；落盘后中断 → 重放经原编号匹配复用。legacy 段零触碰由「仅新条目发号、匹配谓词含 legacy 形态」保证。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 答：号域是本仓 knowledge/decisions 命名空间（域前缀来自本仓模块图）；跨仓各自独立发号互不相干（与 FR 号同构）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：发号影响面广——既有测试断言蒸馏产物标题为局部形态（约 10+ 测试文件）需同步更新；读面正则放宽（`D-(?:[A-Za-z0-9_-]+-)?\d+`）须确认不误吞正文（标题行锚定 `^## `，误吞面为零）。回补：真实库副本演练（③）锁存量零触碰。
- 死路（放弃）：全量重发号 698 条——37 条不可回源、70 组扇出身份歧义、平台 anchor 全量失效（迁移评估报告裁定）。
- 死路（放弃）：发号写回 change 目录 decisions.md（回灌局部文档）——变更件是冻结审计面，全局号只落知识库侧。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/decision-distill.js | 发号步 + 原编号渲染/读入 + 匹配谓词扩展 + 跨文件清理 |
| 修改 | src/knowledge-match.js | 标题双形态 + 原编号字段读入 |
| 修改 | src/knowledge-graph.js | supersedes 经原编号匹配同变更目标 |
| 修改 | src/docs-check.js | 标题双形态 |
| 修改 | src/doctor-diagnostics.js | 计数正则双形态 |
| 修改 | src/knowledge-vector.js | anchor 契约注记（零代码语义变化） |
| 新增 | test/decision-global-id-epoch.test.mjs | ①~⑤ 用例族 |
| 修改 | test/*（受发号影响的既有断言，以实测清单为准） | 蒸馏产物标题断言同步双形态 |
| 修改 | .sillyspec/docs/sillyspec/modules/{core-engine,docs-consistency,sync}.changelog.md | 模块卡索引增量（按归属实配） |
