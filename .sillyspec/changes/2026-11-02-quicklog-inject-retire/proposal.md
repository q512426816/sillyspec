---
author: flow-machine-draft
created_at: 2026-11-02T13:14:20.681Z
---
# 提案书（Proposal）— 2026-11-02-quicklog-inject-retire

## 动机

任务原话转写：quicklog 检索注入面下线

用户已确认 quicklog 失效不再使用。代码实证：检索面接在两处（stages/execute.js buildWaveKnowledgeSection 与 run/prompt.js buildKnowledgeInjection 各调 matchQuicklogContext + renderQuicklogSection 注入 quicklog 段）；parseFlowArchiveEntries 仅 knowledge-hotpath-cache.test.mjs 测试消费（src 无消费方）；quicklog/test-bindings.json 喂 knowledge-graph 的 test-binding 强边（scope/impact 面）；src/quicklog.js 是完整 CLI 子系统（11+ 测试文件）。范围收窄：只下线检索注入面（两处消费摘除 + matchQuicklogContext/renderQuicklogSection 删除），保留 QUICKLOG 记录子系统（quicklog.js CLI）、quicklog/ 目录、test-bindings.json（图谱强边依赖）、parseFlowArchiveEntries（缓存测试消费）——全删是独立大决策需用户另行确认。

成功标准：
- 注入面摘除：execute.js/prompt.js 两处 matchQuicklogContext + renderQuicklogSection 调用与 quicklogIds 遥测字段写入摘除；无 quicklog 时注入段输出与现状逐字节一致（quicklog 段消失是唯一预期差异）
- knowledge-quicklog.js：删除 matchQuicklogContext/renderQuicklogSection 导出（无消费后）；保留 parseFlowArchiveEntries 与其余导出（hotpath 测试消费）
- 图谱不变：test-bindings.json 保留（test-binding 强边照常）；quicklog/ 目录不删
- 测试：knowledge-quicklog.test.mjs 中 matchQuicklogContext 用例摘除、其余保留；execute/prompt 注入测试（knowledge-inject 等）回归绿；hotpath-cache 测试绿
- 验收：eval 六探针 GREEN 五面零回归 + lint 绿 + 显式 pathspec 提交

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 注入面摘除：execute.js/prompt.js 两处 matchQuicklogContext + renderQuicklogSection 调用与 quicklogIds 遥测字段写入摘除；无 quicklog 时注入段输出与现状逐字节一致（quicklog 段消失是唯一预期差异）
2. knowledge-quicklog.js：删除 matchQuicklogContext/renderQuicklogSection 导出（无消费后）；保留 parseFlowArchiveEntries 与其余导出（hotpath 测试消费）
3. 图谱不变：test-bindings.json 保留（test-binding 强边照常）；quicklog/ 目录不删
4. 测试：knowledge-quicklog.test.mjs 中 matchQuicklogContext 用例摘除、其余保留；execute/prompt 注入测试（knowledge-inject 等）回归绿；hotpath-cache 测试绿
5. 验收：eval 六探针 GREEN 五面零回归 + lint 绿 + 显式 pathspec 提交

## 成功标准（可验证）

1. 注入面摘除：execute.js/prompt.js 两处 matchQuicklogContext + renderQuicklogSection 调用与 quicklogIds 遥测字段写入摘除；无 quicklog 时注入段输出与现状逐字节一致（quicklog 段消失是唯一预期差异）
2. knowledge-quicklog.js：删除 matchQuicklogContext/renderQuicklogSection 导出（无消费后）；保留 parseFlowArchiveEntries 与其余导出（hotpath 测试消费）
3. 图谱不变：test-bindings.json 保留（test-binding 强边照常）；quicklog/ 目录不删
4. 测试：knowledge-quicklog.test.mjs 中 matchQuicklogContext 用例摘除、其余保留；execute/prompt 注入测试（knowledge-inject 等）回归绿；hotpath-cache 测试绿
5. 验收：eval 六探针 GREEN 五面零回归 + lint 绿 + 显式 pathspec 提交
