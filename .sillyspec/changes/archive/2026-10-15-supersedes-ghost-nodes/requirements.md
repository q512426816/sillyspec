---
author: flow-machine-draft
created_at: 2026-10-15T02:08:32.208Z
---
# 需求规格（Requirements）— 2026-10-15-supersedes-ghost-nodes

## 功能需求

### FR-01: 同号自链缺失目标合成幽灵节点（ghost/status=superseded/supersededBy 回指），supersedes 边在场

- supersedes 引用的目标在同 file+change 查找失败时，若引用 id 基号等于引用者 id 基号或其 originId 基号（自身版本链），图构建必须合成幽灵节点（attrs.ghost=true、status='superseded'、supersededBy 回指现行版本、label 带取代注记）并建现行版本→幽灵的 supersedes 边；非自身版本链的缺失引用禁止合成。

#### 场景：主路径

- Given 同号自链 v2 引 v1 且 v1 被就地替换不在场，When buildKnowledgeGraph，Then 幽灵节点与边在场（测试①②）。

#### 场景：跨号防护

- Given 跨号缺失引用（D-004 引不存在的 D-009），When 构图，Then 零幽灵零边（测试⑤）。

### FR-02: 在场目标走真实边零变化；跨号缺失引用零铸造（误连防护既有断言零回归）

- 目标在场（同 file+change，id 或 originId 匹配）时必须走既有真实边路径（不合成幽灵）；test/knowledge-graph.test.mjs 既有 supersedes 全形态断言（同变更/双 legacy 建边、跨变更同号不建边）必须零失败。

#### 场景：主路径

- When 跑 test/knowledge-graph.test.mjs 全文件，Then 既有 13 组零失败（含 2026-10-14 误连防护组）。

### FR-03: 幽灵有入边非孤儿；真图 supersedes 1→37 且知识文件零 diff

- 幽灵节点必须带 supersedes 入边（不进孤儿清单）；真图实测 supersedes 边 1→37（36 幽灵全为自身版本链），.sillyspec/knowledge/** 零变更。

#### 场景：主路径

- When 真图 summary 求值，Then byEdge.supersedes=37 且 knowledge 文件零 diff（git 实证）。

### FR-04: 全图测试零回归 + 新增 ghost 测试全绿

- test/supersedes-ghost-nodes.test.mjs 必须覆盖合成/真实边/跨号防护/孤儿面至少三组断言且全绿；knowledge-graph 全文件零回归。

#### 场景：主路径

- When 两文件全跑，Then 零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/supersedes-ghost-nodes.test.mjs「①② 幽灵节点+supersedes 边：同号自链缺失合成、在场真边、跨号缺失不合成」
FR-02: test/knowledge-graph.test.mjs「①解析：supersedes 只认同变更——同变更（含双 legacy）建边、跨变更同号不建边」
FR-03: test/supersedes-ghost-nodes.test.mjs「③ summary 计数与孤儿面」+ 真图 summary 实测回执（supersedes=37）
FR-04: test/supersedes-ghost-nodes.test.mjs（全文件）+ test/knowledge-graph.test.mjs（全文件零回归）
