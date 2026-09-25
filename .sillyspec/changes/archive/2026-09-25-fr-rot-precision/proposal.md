---
author: flow-machine-draft
created_at: 2026-09-25T11:32:34.897Z
---
# 提案书（Proposal）— 2026-09-25-fr-rot-precision

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:ad5cb51066a611f5fed24e28ddb2f236f73aa585c0d3f37cb8139e87beac2f67:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-rot-precision 留痕重锚 -->
任务原话转写：动机：flow done 的 fr-rot-suspect 检测为域级全标（一次收口把触达域全部 active FR 打待复核，本仓实测 88 条，⚠️ 信号通胀且 keep-latest 每次收口全量刷新）；两轮独立评审+OpenSpec 对照后修正方案已收敛：按 FR 覆盖文件集（三源并集）与本次交付文件面交集判相关度。实测基线（评审模拟）：最近一次收口 131 条 active FR→strong 83/unknown 8/skip 40；存量 200 条标记清理→keep 72/删 128。
成功标准：
- frCoverageFiles 三源并集（归档 design.md 交付表剥反引号∪change-patch.json files 剔 .sillyspec 前缀∪条目测试绑定 tests）；readActiveFrDigest 新增 bindings 字段（纯增量不动既有消费方）；resolveTouchedDomains 内部表格正则抽为导出 deliverableFilesFromDesignText（行为不变）
- rotSuspectFlow 三分判据：交集非空 strong 打标/coverage 空 unknown 不打标遥测单列（count 语义=strong 防污染 knowledge-stats 消费方）/非空无交集 skip；匹配口径=单向（changed 恒文件级，相等或目录前缀含）
- frDupGateFlow 改取最高重叠对（对齐 brainstorm 软门）+命中行附 active 场景名（过滤（无场景名）占位）
- FR_TITLE_OVERLAP_THRESHOLD=0.6 公共化：flow.js 与 stage-contract.js 改 import，文本钉限两文件断言无裸 >=0.6 且常量 import 在场
- resume 域路由改用 changedFilesSinceBaseline（含 untracked 剔 .sillyspec）
- cleanupStaleReviewMarks：幂等可重跑+原子写+写前重读；判据泛化 X 无归档或 coverage 空→删（覆盖 quick 侧 112 条 recent-quick）；执行于代码合入后
- 测试：改写 thin-fr-inject-parity 测试②（fixture 补归档件+绑定保 strong 正例，区分 unknown/skip 不动旧标记）+新套件（三源/清理/最高重叠/钉）+flow 族 43 用例全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:92b33dd23e6aa25e48e9e13873bb3d719887581e29554dc221029a2d286e70c3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-rot-precision 留痕重锚 -->
按成功标准机械推导，共 12 条验收面：
1. frCoverageFiles 三源并集（归档 design.md 交付表剥反引号∪change-patch.json files 剔 .sillyspec 前缀∪条目测试绑定 tests）
2. readActiveFrDigest 新增 bindings 字段（纯增量不动既有消费方）
3. resolveTouchedDomains 内部表格正则抽为导出 deliverableFilesFromDesignText（行为不变）
4. rotSuspectFlow 三分判据：交集非空 strong 打标/coverage 空 unknown 不打标遥测单列（count 语义=strong 防污染 knowledge-stats 消费方）/非空无交集 skip
5. 匹配口径=单向（changed 恒文件级，相等或目录前缀含）
6. frDupGateFlow 改取最高重叠对（对齐 brainstorm 软门）+命中行附 active 场景名（过滤（无场景名）占位）
7. FR_TITLE_OVERLAP_THRESHOLD=0.6 公共化：flow.js 与 stage-contract.js 改 import，文本钉限两文件断言无裸 >=0.6 且常量 import 在场
8. resume 域路由改用 changedFilesSinceBaseline（含 untracked 剔 .sillyspec）
9. cleanupStaleReviewMarks：幂等可重跑+原子写+写前重读
10. 判据泛化 X 无归档或 coverage 空→删（覆盖 quick 侧 112 条 recent-quick）
11. 执行于代码合入后
12. 测试：改写 thin-fr-inject-parity 测试②（fixture 补归档件+绑定保 strong 正例，区分 unknown/skip 不动旧标记）+新套件（三源/清理/最高重叠/钉）+flow 族 43 用例全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:a0d0fac8fc3f63aac2b31b3662db15b2338a62d230b5cd08e5e94d19195b8f01:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-rot-precision 留痕重锚 -->
1. frCoverageFiles 三源并集（归档 design.md 交付表剥反引号∪change-patch.json files 剔 .sillyspec 前缀∪条目测试绑定 tests）
2. readActiveFrDigest 新增 bindings 字段（纯增量不动既有消费方）
3. resolveTouchedDomains 内部表格正则抽为导出 deliverableFilesFromDesignText（行为不变）
4. rotSuspectFlow 三分判据：交集非空 strong 打标/coverage 空 unknown 不打标遥测单列（count 语义=strong 防污染 knowledge-stats 消费方）/非空无交集 skip
5. 匹配口径=单向（changed 恒文件级，相等或目录前缀含）
6. frDupGateFlow 改取最高重叠对（对齐 brainstorm 软门）+命中行附 active 场景名（过滤（无场景名）占位）
7. FR_TITLE_OVERLAP_THRESHOLD=0.6 公共化：flow.js 与 stage-contract.js 改 import，文本钉限两文件断言无裸 >=0.6 且常量 import 在场
8. resume 域路由改用 changedFilesSinceBaseline（含 untracked 剔 .sillyspec）
9. cleanupStaleReviewMarks：幂等可重跑+原子写+写前重读
10. 判据泛化 X 无归档或 coverage 空→删（覆盖 quick 侧 112 条 recent-quick）
11. 执行于代码合入后
12. 测试：改写 thin-fr-inject-parity 测试②（fixture 补归档件+绑定保 strong 正例，区分 unknown/skip 不动旧标记）+新套件（三源/清理/最高重叠/钉）+flow 族 43 用例全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
