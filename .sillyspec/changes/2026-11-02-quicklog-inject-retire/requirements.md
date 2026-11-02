---
author: flow-machine-draft
created_at: 2026-11-02T13:30:00.000Z
---
# 需求规格（Requirements）— 2026-11-02-quicklog-inject-retire

## 功能需求

### FR-01: 注入面摘除：execute.js/prompt.js 两处 matchQuicklogContext + renderQuicklogSection 调用与 quicklogIds 遥测字段写入摘除；无 quicklog 时注入段输出与现状逐字节一致（quicklog 段消失是唯一预期差异）

两个消费面（stages/execute.js 的 buildWaveKnowledgeSection、run/prompt.js 的 buildKnowledgeInjection）必须摘除 matchQuicklogContext 调用、renderQuicklogSection 渲染与 quicklogIds 遥测字段；无 quicklog 命中时（当前常态）注入段输出必须与摘除前逐字节一致——quicklog 段消失是唯一预期差异。

#### 场景：无 quicklog 零变化

Given 仓内无 quicklog 命中（当前常态——最后一次 2026-10-09）
When 摘除后跑注入
Then 输出与摘除前逐字节一致（quick 段本来就不渲染）

### FR-02: knowledge-quicklog.js：删除 matchQuicklogContext/renderQuicklogSection 导出（无消费后）；保留 parseFlowArchiveEntries 与其余导出（hotpath 测试消费）

knowledge-quicklog.js 必须删除已无消费方的 matchQuicklogContext 与 renderQuicklogSection 导出；必须保留 parseFlowArchiveEntries 及其余被测试消费的导出。

#### 场景：导出面收缩

Given matchQuicklogContext 无 src 消费方
When 删除导出
Then lint 未引用导出检查通过；hotpath-cache 测试仍绿

### FR-03: 图谱不变：test-bindings.json 保留（test-binding 强边照常）；quicklog/ 目录不删

quicklog/test-bindings.json 与 quicklog/ 目录必须保留（knowledge-graph 的 test-binding 强边与历史日志文件非本变更范围）。

#### 场景：图谱零变化

Given 本变更完成
When buildKnowledgeGraph
Then test-binding 边数与变更前一致

### FR-04: 测试：knowledge-quicklog.test.mjs 中 matchQuicklogContext 用例摘除、其余保留；execute/prompt 注入测试（knowledge-inject 等）回归绿；hotpath-cache 测试绿

必须摘除 knowledge-quicklog.test.mjs 中 matchQuicklogContext/renderQuicklogSection 相关用例（功能已删）；其余用例与 execute/prompt 注入测试（knowledge-inject.test.mjs 等）、hotpath-cache 测试全绿。

#### 场景：测试面收缩与回归

Given 功能删除
When 测试适配
Then 已删功能的用例摘除、其余全绿

### FR-05: 验收：eval 六探针 GREEN 五面零回归 + lint 绿 + 显式 pathspec 提交

验收必须全绿：eval 六探针 GREEN、五面零回归、lint 通过、knowledge 改动显式 pathspec 提交。

#### 场景：检索零影响

Given quicklog 检索面下线
When 跑 eval
Then 五面指标逐位一致（quicklog 面本就不在 eval 面）

## 测试绑定（每条 FR 至少一行——「FR-NN: test/路径「用例名」」；空行/待填在 flow done 拒收）

FR-01: test/knowledge-inject.test.mjs「注入面回归（quicklog 段摘除后零差异）」
FR-02: test/knowledge-hotpath-cache.test.mjs「parseFlowArchiveEntries 保留回归」
FR-03: 不适用：图谱零变化（无行为面——test-bindings 保留即零变化）
FR-04: test/knowledge-quicklog.test.mjs「用例面收缩后其余绿」
FR-05: test/knowledge-inject.test.mjs + test/knowledge-hotpath-cache.test.mjs 回归
