---
author: qinyi
created_at: 2026-09-19 23:25:17
generated_by: sillyspec-fourpiece-init
change: 2026-09-20-fr-index-l2
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

<!-- 背景（对撞实验资产轴缺口）：OpenSpec 归档 15 分钟产出 14 条可验证行为承诺（requirement 级活规格），
     fr-index L1 条目只有 id+标题+场景名——缺「这条行为依据哪些决策」的回溯链（翻案场景断头：想改行为
     时查不到当年否决了什么）。L2 = 最小增厚：依据决策 + 模块卡指针。 -->

## D-001@v1: 依据决策（D→FR）入条目与 digest
- type: architecture
- status: accepted
- 问题: 行为条目与决策账（knowledge/decisions）互不引用——翻案场景（想改某行为）从 FR 条目跳不到「当年依据/否决了什么」，防复潮链断头。
- 选定: parseChangeRequirements 解析决策覆盖矩阵（requirements.md 尾表 \|D-xxx@vN\|FR-NN\|），indexRequirements 条目写「依据决策：」行，readActiveFrDigest 带 decisions 数组进 brainstorm 注入。
- alternatives: 手工维护交叉引用（否决——归档管线自动提取才幂等）；D→FR 反向索引文件（否决——正向一行已够，反向等证需求）。
- normalized_requirement: 归档后每条 active FR 可机读其依据决策集。
- impacts: [FR-01]
- evidence: fr-index.js:45（parseChangeRequirements 现无矩阵解析）；对撞实验复盘
- 故障面: 矩阵格式漂移解析空——降级省略行（不阻断归档，fr-inject 遥测可见）。
- 退役判据: 无。

## D-002@v1: 模块卡指针显式化
- type: docs
- status: accepted
- 问题: 域文件与模块卡同构（fr/<域>.md ↔ modules/<域>.md）但关系只活在约定里。
- 选定: domain 文件头 blockquote 加「模块卡：modules/<域>.md」一行。
- alternatives: 无（成本趋零）。
- normalized_requirement: 每个域文件头可见模块卡路径。
- impacts: [FR-02]
- evidence: fr-index.js 文件头写入段
- 故障面: 域无对应模块卡（unmapped 域）——指针行仍写（路径可能缺文件，docs check 层可校验）。
- 退役判据: 无。

## D-003@v2: GWT 场景正文入库 + 存量回填（supersedes D-003@v1）
- type: scope
- status: accepted
- 问题: v1 判「体积噪音权衡缓做」不成立——用户原口径（两会话任务书一致）即含正文；且正文是翻案对账的载体（只有场景名无法核对行为承诺）。v1 还把未发生的裁决标为「对话已定稿」——流程纪律错误，本条纠正。
- 选定: ①parse 捕获 GWT（Given/When/Then 行归最近场景名下，无名场景归默认）②条目写「场景正文：」块（每场景一行「- 场景：名 — Given…；When…；Then…」，各段截 80 字，≤5 场景）③回填器 backfillScenarioBodies：active 条目缺正文 → 从来源变更归档 requirements.md 按标题匹配补齐（幂等，CLI sillyspec fr-backfill）④注入保持薄（名字+依据决策——文件厚、注入薄，体积税不进 prompt）。
- alternatives: v1 缓做（被本条取代）；正文全文不截断（否决——索引非全文镜像）。
- normalized_requirement: 归档后条目含可核对的行为正文；存量条目可一键回填。
- impacts: [FR-03, FR-04]
- evidence: 碰撞复盘（两会话任务书口径一致）；FR-core-engine-001..007 存量缺正文
- 故障面: 标题匹配失败 → 警告跳过不阻断（fallback 按序匹配）。
- 退役判据: 无。
