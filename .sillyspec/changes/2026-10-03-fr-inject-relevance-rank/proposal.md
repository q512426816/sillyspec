---
author: flow-machine-draft
created_at: 2026-10-02T16:04:16.300Z
---
# 提案书（Proposal）— 2026-10-03-fr-inject-relevance-rank

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:917bc26355a14f96e600e666b18b2427e452b662d3f24d07ccbb23d53bed63c6:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-inject-relevance-rank 留痕重锚 -->
任务原话转写：注入相关度排序止血。动机：flowKnowledgeDigest 注入面 frs.slice(0,8) 按文件序=永远取每域最老 8 条（平台 backend 域 480 条，9 月新立的 455 条在注入里永不可见——全局审计实证）；且 flow-draft 机器预填两缺陷已留永久痕迹：标题 50 字符硬截断（平台仓 FR-components-shared-038 残句实证）、→ 符号切分 When/Then 误伤括号内箭头（changes→变更中心 实证）。依据：src/fr-index.js activeFrCoverageHits 覆盖命中口径已存在且与测试门同源，注入仅作第三消费方复用，零新推断。
成功标准：
- 注入 digest 两档排序：TierA=覆盖命中（与本次触碰文件有覆盖交集的 active FR，🎯 标注，判定与 activeFrCoverageHits 同口径），TierB=其余按来源变更日期新→旧，tie-break 全局 id 升序，每域 cap 8 与「+N 条见」行保留
- 域内 active >8 条且触碰文件命中其中某条时，注入清单含该条且带 🎯（新增测试用例实证）
- flow-draft 标题不再 50 字符硬截断；括号内的 → 不再被当 When/Then 分隔符切分（新增测试用例实证）
- 既有用例不回归：域 ≤8 条时注入内容不减；fr-inject-cap.test.mjs / flow-draft.test.mjs 既有断言全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:243ecca0783c1eb7131531199a6f1cfd913dbe9381d953e6f35a54b63d1993bf:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-inject-relevance-rank 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. 注入 digest 两档排序：TierA=覆盖命中（与本次触碰文件有覆盖交集的 active FR，🎯 标注，判定与 activeFrCoverageHits 同口径），TierB=其余按来源变更日期新→旧，tie-break 全局 id 升序，每域 cap 8 与「+N 条见」行保留
2. 域内 active >8 条且触碰文件命中其中某条时，注入清单含该条且带 🎯（新增测试用例实证）
3. flow-draft 标题不再 50 字符硬截断
4. 括号内的 → 不再被当 When/Then 分隔符切分（新增测试用例实证）
5. 既有用例不回归：域 ≤8 条时注入内容不减
6. fr-inject-cap.test.mjs / flow-draft.test.mjs 既有断言全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:e25ccdb2b97b672bc2462c9abc5d8e2937917de6821e1485ef7cbf47e68788c3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-10-03-fr-inject-relevance-rank 留痕重锚 -->
1. 注入 digest 两档排序：TierA=覆盖命中（与本次触碰文件有覆盖交集的 active FR，🎯 标注，判定与 activeFrCoverageHits 同口径），TierB=其余按来源变更日期新→旧，tie-break 全局 id 升序，每域 cap 8 与「+N 条见」行保留
2. 域内 active >8 条且触碰文件命中其中某条时，注入清单含该条且带 🎯（新增测试用例实证）
3. flow-draft 标题不再 50 字符硬截断
4. 括号内的 → 不再被当 When/Then 分隔符切分（新增测试用例实证）
5. 既有用例不回归：域 ≤8 条时注入内容不减
6. fr-inject-cap.test.mjs / flow-draft.test.mjs 既有断言全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
