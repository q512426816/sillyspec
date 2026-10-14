---
author: flow-machine-draft
created_at: 2026-10-14T14:25:56.250Z
---
# 提案书（Proposal）— 2026-10-14-decision-global-id-epoch

## 动机

任务原话转写：动机与背景：
决策 ID 体系 P3（用户「继续」确认）。四路审计的迁移成本报告结论：全量重发号代价高（698 条中 37 条无法回源、70 组多域扇出、平台向量 anchor 全量失效），推荐 epoch 增量（FR_INDEX_EPOCH 先例 fr-index.js「存量不回填——不伪造历史」）——新蒸馏条目发全局号，老条目零触碰。收益：跨变更引用/豁免键/平台锚天然唯一（D-001@v1 ×296 的同号密度从此只减不增），与 FR 全局号体系对齐。

成功标准：
- 蒸馏写面发号：新蒸馏条目 MUST 落全局号标题 ## D-<发号域>-NNN@vN（发号域=resolveDomains 首域、sanitizeDomain 同口径；NNN=该域前缀全域扫描 max+1，只增不复用）+ 字段行「原编号：<局部号>」（位置在「变更：」后、「锚点：」前——不破「文件：紧跟锚点」既有测试红线）+ 既有「变更：」行
- 幂等与单一身份：同变更同号（含版本演进 v1→v2）重蒸馏 MUST 复用已发号（匹配谓词=变更一致 且 号或原编号一致；在位更新标题版本、原编号随版本更新）；多域扇出 MUST 单一身份（同一全局号落多个域文件）；跨文件清理按同一扩展谓词
- 存量零触碰：既有 legacy 形态条目（无原编号字段）MUST 不被无关蒸馏改写（真实库副本演练：蒸馏样例新条目后 legacy 节段逐字节不变）
- 读面双形态：splitKnowledgeSections/knowledge-match（含 graph 消费）/docs-check parseDecisionEntries/doctor 计数正则 MUST 同时解析局部形态（D-011@v1）与全局形态（D-<域>-042@v1）；graph supersedes 同变更解析 MUST 支持经原编号匹配全局形态目标
- 平台向量 anchor：新条目 anchor 即全局号（knowledge-vector 等值匹配语义不变；平台重建索引窗口内向量召回对新条目降级属可接受边界，代码注释如实注记）
- 新增/更新测试跑绿；全量测试 + lint 绿

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. 蒸馏写面发号：新蒸馏条目 MUST 落全局号标题 ## D-<发号域>-NNN@vN（发号域=resolveDomains 首域、sanitizeDomain 同口径；NNN=该域前缀全域扫描 max+1，只增不复用）+ 字段行「原编号：<局部号>」（位置在「变更：」后、「锚点：」前——不破「文件：紧跟锚点」既有测试红线）+ 既有「变更：」行
2. 幂等与单一身份：同变更同号（含版本演进 v1→v2）重蒸馏 MUST 复用已发号（匹配谓词=变更一致 且 号或原编号一致；在位更新标题版本、原编号随版本更新）；多域扇出 MUST 单一身份（同一全局号落多个域文件）；跨文件清理按同一扩展谓词
3. 存量零触碰：既有 legacy 形态条目（无原编号字段）MUST 不被无关蒸馏改写（真实库副本演练：蒸馏样例新条目后 legacy 节段逐字节不变）
4. 读面双形态：splitKnowledgeSections/knowledge-match（含 graph 消费）/docs-check parseDecisionEntries/doctor 计数正则 MUST 同时解析局部形态（D-011@v1）与全局形态（D-<域>-042@v1）；graph supersedes 同变更解析 MUST 支持经原编号匹配全局形态目标
5. 平台向量 anchor：新条目 anchor 即全局号（knowledge-vector 等值匹配语义不变；平台重建索引窗口内向量召回对新条目降级属可接受边界，代码注释如实注记）
6. 新增/更新测试跑绿；全量测试 + lint 绿

## 成功标准（可验证）

1. 蒸馏写面发号：新蒸馏条目 MUST 落全局号标题 ## D-<发号域>-NNN@vN（发号域=resolveDomains 首域、sanitizeDomain 同口径；NNN=该域前缀全域扫描 max+1，只增不复用）+ 字段行「原编号：<局部号>」（位置在「变更：」后、「锚点：」前——不破「文件：紧跟锚点」既有测试红线）+ 既有「变更：」行
2. 幂等与单一身份：同变更同号（含版本演进 v1→v2）重蒸馏 MUST 复用已发号（匹配谓词=变更一致 且 号或原编号一致；在位更新标题版本、原编号随版本更新）；多域扇出 MUST 单一身份（同一全局号落多个域文件）；跨文件清理按同一扩展谓词
3. 存量零触碰：既有 legacy 形态条目（无原编号字段）MUST 不被无关蒸馏改写（真实库副本演练：蒸馏样例新条目后 legacy 节段逐字节不变）
4. 读面双形态：splitKnowledgeSections/knowledge-match（含 graph 消费）/docs-check parseDecisionEntries/doctor 计数正则 MUST 同时解析局部形态（D-011@v1）与全局形态（D-<域>-042@v1）；graph supersedes 同变更解析 MUST 支持经原编号匹配全局形态目标
5. 平台向量 anchor：新条目 anchor 即全局号（knowledge-vector 等值匹配语义不变；平台重建索引窗口内向量召回对新条目降级属可接受边界，代码注释如实注记）
6. 新增/更新测试跑绿；全量测试 + lint 绿
