---
author: t
created_at: 2026-10-08T13:58:00
---
# 决策记录（Decisions）— 2026-10-08-knowledge-graph

## D-001@v1: 收口范围=方案B（读面闭环+遍历召回接线）
- type: boundary
- priority: P0
- status: accepted
- supersedes:
- source: user
- question: 本变更收口范围（方案A 读面最小闭环 / 方案B 加召回接线 / 方案C 全量三阶段含平台侧）
- answer: 用户选方案B：读面闭环（本体表 + knowledge-graph.js 派生图 + knowledge graph 子命令 + doctor 图完整性检查）+ matchKnowledgeHybrid 新增 scope 遍历召回层与防复潮保底；平台侧 graph-search 端点与 stats 图维度指标不在本变更范围
- normalized_requirement: 交付面=图引擎+查询 CLI+doctor 六检查项+召回接线；不含平台端点/前端页面/图数据库
- impacts: [FR-01, FR-02, FR-03, FR-04]
- evidence: 用户方案选择轮（AskUserQuestion 2026-10-08 会话）
- 模块域: core-engine, cli-entry

## D-002@v1: 本体三档强度与逐边传递规则，遍历召回只走强边
- type: architecture
- priority: P0
- status: accepted
- supersedes:
- source: user
- question: 16 类边如何决定谁能进遍历传播（impact 闭包与召回）
- answer: 三档分强/中/弱：强边（anchors/supersedes/from-change/belongs-module/module-dep/module-files/deliverables/change-modules/test-binding/describes/changelog-of/changelog-entry）可进 impact 闭包与召回传播；中边（doc-refs/scan-refs，随代码漂移的正文引用）仅查询展示；弱边（route/entry-link 预留）仅展示与自检。可传递边仅 supersedes（版本链）与 module-dep（依赖闭包）
- normalized_requirement: 遍历类查询只在强边子集上扩展；中弱边仅 neighbors 展示与 doctor 自检
- impacts: [FR-01, FR-03]
- evidence: 三轮设计修订用户逐轮确认（扫描文档关联轮/模块文档关联轮/连线审计轮）
- 故障面: 强弱分档错误导致召回漏（错标弱）或洪水（错标强）；分档表为 design.md 本体节定稿契约
- 退役判据: 实测遍历召回命中率持续低于本地词片回退层时重审分档
- 模块域: core-engine

## D-003@v1: 与 project-map 墓碑切割——无导航文档/无刷新机制/内存派生
- type: boundary
- priority: P0
- status: accepted
- supersedes:
- source: user
- question: 如何不复潮已被多轮评审砍掉的"项目地图"方向（PROJECT-MAP.md + map-refresh 机制）
- answer: 不新增任何人读导航文档；不新增任何刷新/缓存机制；图=buildKnowledgeGraph() 解析时内存派生随建随用；md/yaml 真相源一字不动。产出只有机器查询面与自检面
- normalized_requirement: 本变更不得引入任何落盘图缓存文件或刷新命令；扫描新鲜度维持 docs-debt/scan-staleness 既有机制
- impacts: [FR-01]
- evidence: 2026-10-06-cli-flows-and-module-duty design.md 墓碑记录 + 用户边界确认轮
- 复潮条件: 出现 module-map+模块卡覆盖不了的导航需求（本轮已确认不存在）
- 模块域: core-engine

## D-004@v1: 查询入口键=机器算，agent 不以自由文本为图查询键
- type: architecture
- priority: P0
- status: accepted
- supersedes:
- source: user
- question: 图的查询入口是什么——agent 怎么知道它查的是什么（需求如何关联知识）
- answer: 入口三键全部机器算：①变更执行期 scope 文件集（resolveVerifyChangedFiles 既有函数，CLI 算事实）；②需求期承接引用（brainstorm Step8 注入清单）∪ 声明模块域反查（belongs-module）∪ 词面三层兜底（既有）；③手动 CLI 锚点（文件/模块/变更名）。词面是弱入口（既有三层在管），结构键（diff/承接/模块域）是强入口（本变更新增）
- normalized_requirement: 召回接线消费调用方传入的 scope 参数，不解析 agent 自由文本作为图查询键
- impacts: [FR-04]
- evidence: 用户入口追问轮澄清定稿（2026-10-08 会话）
- 故障面: scope 集计算失败/为空时整层静默跳过（降级即现状），不抛错阻断调用方
- 退役判据: 若实测 scope 遍历召回命中与词面三层高度重合（增量趋零），重审第四层存续
- 模块域: core-engine

## D-005@v1: deliverables 双源=design.md 交付表 ∪ change-patch.json files
- type: feasibility
- priority: P1
- status: accepted
- supersedes:
- source: code
- question: 变更→文件边（deliverables）的采集源
- answer: 双源并集（fr-index frCoverageFiles 同款）：厚道主源 design.md 交付清单表（剥反引号/NEW: 前缀），thin 主源 change-patch.json 的 files；统一剔 .sillyspec/ 前缀、POSIX 归一。change-modules 边由 deliverables ∩ 模块 paths 前缀匹配派生（最长前缀优先）
- normalized_requirement: 双源并集后建 deliverables 边；模块派生用最长前缀匹配
- impacts: [FR-01]
- evidence: 原型实测 2026-09-28-knowledge-inject-ranking（轻量道归档）design.md 无交付表、仅 change-patch.json 有 files——单源抽到 0 出边
- 锚点: src/fr-index.js:frCoverageFiles
- 模块域: core-engine

## D-006@v1: 防洪水三闸（scope 缺省/为空即整层跳过 / 只走强边 / 20 条封顶）
- type: risk
- priority: P0
- status: accepted
- supersedes:
- source: code
- question: 遍历召回如何防注入洪水（把不相关 rejected 决策灌进 prompt）
- answer: 三闸：scope 为空整层跳过（无 scope 调用方行为与现状逐字节等价，回归测试钉死）；只走强边；decisionHits ≤20、entries ≤3（沿 knowledge-vector.js buildResultFromPlatform 封顶先例）
- normalized_requirement: 无 scope 路径与现状等价由回归测试钉死；遍历结果封顶 20
- impacts: [FR-04]
- evidence: src/knowledge-vector.js:130 封顶先例 + 防复潮 148/188 沉底事故（2026-09-28-knowledge-inject-ranking 根因）
- 锚点: src/knowledge-vector.js:130
- 模块域: core-engine
