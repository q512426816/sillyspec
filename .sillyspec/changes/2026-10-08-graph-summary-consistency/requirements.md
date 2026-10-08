---
author: flow-machine-draft
created_at: 2026-10-08T16:09:40.486Z
---
# 需求规格（Requirements）— 2026-10-08-graph-summary-consistency

## 功能需求

### FR-01: 判定逻辑抽共享 helper（graphModuleDocGaps/graphChangelogDanglings 落 knowledge-graph.js 单一源），doctor 六检查消费 helper（删内联副本），summary 四计数消费 helper——「一处定义两处消费」注释成真

- module_doc_gaps 与 changelog_danglings 的判定逻辑必须在 knowledge-graph.js 单一源（graphModuleDocGaps/graphChangelogDanglings 导出函数）定义；doctor-diagnostics.js 六检查与 graphSummary 必须消费同一函数，禁止保留手抄内联副本。

#### 场景：单一源对账

- Given fixture 图；When 分别运行 detectKnowledgeGraphIntegrity 与 graphSummary；Then 两面 module-doc-gap / changelog-dangling 计数逐值相等（交叉断言钉死）。

### FR-02: summary 增 dangling_refs_breakdown { strong_anchors, medium_doc_refs } 附加字段（不动 dangling_refs 既有语义——平台消费面兼容）

- graphSummary 返回必须新增 dangling_refs_breakdown { strong_anchors, medium_doc_refs }；dangling_refs 既有字段与语义（两类之和）禁止变化。

#### 场景：分桶守恒

- Given existsFn 全假；When graphSummary；Then dangling_refs = strong_anchors + medium_doc_refs，且 doctor 的 dangling-anchor / doc-dangling-ref 两计数与两桶逐值相等。

### FR-03: 测试补齐：module_doc_gaps 正值断言（mini-fixture 无卡模块）、changelog_danglings 双 existsFn 态断言、doctor↔summary 四计数交叉断言（脏 fixture 上解析 doctor finding 计数与 summary 字段逐值相等）

- 测试必须覆盖：module_doc_gaps 正值（mini-fixture 无卡模块=1）、changelog_danglings 双 existsFn 态（全真=0 / 全假=2 且与 helper 逐值相等）、doctor↔summary 脏 fixture 四计数交叉断言（含 finding 文本解析与 breakdown 双桶对账）。

#### 场景：脏面对账

- Given fixture 删除锚点目标与卡片引用目标制造两类悬空；When 双面运行；Then 四计数与 breakdown 全部逐值相等且两桶非零（断言有区分度）。

### FR-04: 既有图测试 9 组 + doctor 回归全绿，lint 零告警

- 既有图测试十组必须全绿、test:core 全量绿、lint 零告警（未引用导出 / module-map 覆盖门全过）。

#### 场景：回归面

- Given 修复落盘；When 全量测试与 lint；Then 零失败零新告警。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-graph.test.mjs「⑩doctor↔summary 同源交叉断言：脏 fixture 上四计数逐值相等（单一源契约钉，2026-10-08-graph-summary-consistency）」
FR-02: test/knowledge-graph.test.mjs「⑧summary 聚合：规模/分布/doctor 同源计数/clusters 域映射/代表与截断」（breakdown 守恒与双桶断言）
FR-03: test/knowledge-graph.test.mjs「⑧summary 聚合」（module_doc_gaps 正值 mini-fixture + changelog 双 existsFn 态）
FR-04: test/knowledge-graph.test.mjs「十组全绿面」+ test:core/lint 收口实测（verify-runs 留档）
