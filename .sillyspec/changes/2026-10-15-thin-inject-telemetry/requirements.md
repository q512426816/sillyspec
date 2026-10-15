---
author: flow-machine-draft
created_at: 2026-10-15T01:14:51.640Z
---
# 需求规格（Requirements）— 2026-10-15-thin-inject-telemetry

## 功能需求

### FR-01: 轻量道 flow start 知识命中时 .runtime/knowledge-hits.jsonl 落 type:inject 事件，change/query 字段与既有事件同形，快道/thick 路径行为零变化

- 轻量道 flowKnowledgeDigest 产生知识命中（INDEX entries 或 rejected 防复潮命中任一非空）时，必须向 specBase/.runtime/knowledge-hits.jsonl append 恰一条 type:inject 事件，其 change 字段必须等于变更名、query 字段必须等于「change\ninput」形态，与既有 execute/quick 注入点事件同形。

#### 场景：主路径

- Given 临时 spec 树含 INDEX 两锚点（限流/worktree），When 以命中语料调用 flowKnowledgeDigest，Then hits.jsonl 恰新增一条 inject 事件且 change/query 字段形态与既有事件一致。

### FR-02: 遥测事件带分级字段：injectedFiles（正文实际注入的文件）与 mentionedFiles（仅 Sources 行提及的文件）分离，knowledge stats 命中矩阵口径不回归

- thin 道遥测事件必须携带分级字段：injectedFiles 恒为空数组（thin 面只出按需 Read 行）、mentionedFiles 必须等于 📚 行展示的锚点集合（matchedFiles 前 3 条）；matchedFiles 必须保持既有「file#anchor 全量字符串数组」口径逐字不变（knowledge-stats 消费面零回归）。

#### 场景：主路径

- Given 两文件命中 fixture，When 落盘事件被读取，Then injectedFiles=[]、mentionedFiles 长度=2、matchedFiles 长度=2 且元素均为 file#anchor 字符串。

### FR-03: 未命中（matched:false 且零 quicklog）不落盘（与既有口径一致）；遥测写失败不阻断注入本体（fail-soft 既有契约）

- 知识命中面完全为空（无 entries 且无 rejected）时禁止落任何遥测事件；appendKnowledgeHit 抛出任何异常时必须被吞掉且注入本体（📚 命中行渲染与函数返回值）不受影响。

#### 场景：主路径（未命中零落盘）

- Given 空 INDEX，When 以不相关语料调用，Then hits.jsonl 不新增 inject 事件。

#### 场景：fail-soft

- Given .runtime 为普通文件（append 必然 ENOTDIR），When 命中语料调用，Then 函数不抛异常且输出仍含「📚 知识命中」行。

### FR-04: 新增测试覆盖 thin 命中落盘/未命中零落盘/fail-soft 三态，全量测试与 lint 绿

- test/thin-inject-telemetry.test.mjs 必须覆盖上述三态各至少一组断言且全绿；既有 knowledge-inject 测试面与 flow 相关测试面必须零失败（行为零回归）。

#### 场景：主路径

- When 运行 node --test test/thin-inject-telemetry.test.mjs 与既有 knowledge-inject/flow 测试文件，Then 全部通过。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/thin-inject-telemetry.test.mjs「① thin 命中落盘：事件同形 + 分级字段」
FR-02: test/thin-inject-telemetry.test.mjs「① thin 命中落盘：事件同形 + 分级字段」
FR-03: test/thin-inject-telemetry.test.mjs「② 未命中零落盘」「③ 遥测写失败 fail-soft：注入本体不受阻」
FR-04: test/thin-inject-telemetry.test.mjs（全文件三组）+ test/knowledge-inject.test.mjs（回归）
