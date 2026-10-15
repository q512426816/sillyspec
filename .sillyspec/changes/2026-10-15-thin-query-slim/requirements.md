---
author: flow-machine-draft
created_at: 2026-10-15T02:00:32.068Z
---
# 需求规格（Requirements）— 2026-10-15-thin-query-slim

## 功能需求

### FR-01: thinKnowledgeQuery 四态单测绿（有标记留动机/中文冒号同判/无标记全文/动机空白退全 input）

- thin 道 flow start 知识匹配查询必须只取 --input 中「成功标准：」或「成功标准：」标记前的动机段；无标记时必须用全文；动机段空白时必须退全 input（禁止空查询）。

#### 场景：主路径

- When test/thin-query-slim.test.mjs 运行，Then 四态断言全绿（含测试路径噪音不进查询的负断言）。

### FR-02: flow start 遥测 query 字段=瘦身串；既有注入面测试零回归

- 轻量道遥测事件的 query 字段必须等于实际用于匹配的瘦身串（change\n动机）；既有注入面测试（thin-inject-telemetry/knowledge-inject）必须零失败。

#### 场景：主路径

- When 跑 test/thin-inject-telemetry.test.mjs 与 test/knowledge-inject.test.mjs，Then 零失败。

### FR-03: INDEX 词表补齐后 knowledge validate ok:true，检索 score 提升留档回执

- INDEX.md unmapped 路由行必须补 知识图谱|图谱|影响面|impact 关键词；补齐后 knowledge validate 必须 ok:true，同查询 score 必须高于补齐前（3→9 留档）。

#### 场景：主路径

- Given 词表行落盘，When knowledge validate 与 knowledge search 同查询，Then ok:true 且 score=9。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-query-slim.test.mjs（四态全组）
FR-02: test/thin-inject-telemetry.test.mjs「① thin 命中落盘」+ test/knowledge-inject.test.mjs（回归）
FR-03: 不适用：INDEX 为知识数据面——验收靠 knowledge validate ok:true CLI 回执与 score 3→9 检索实测留档
