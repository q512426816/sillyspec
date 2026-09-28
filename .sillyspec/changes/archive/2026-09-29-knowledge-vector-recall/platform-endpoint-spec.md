# 平台向量召回端点规格（SillyHub 仓实现用，2026-09-29-knowledge-vector-recall）

CLI 侧已上线（本变更），端点未实现期间自动 404 降级本地层——平台侧可独立排期。

## 端点
POST /api/spec/knowledge/vector-search
Headers: Authorization: Bearer <token>（现行四轨 token 体系）；Content-Type: application/json

## 请求
{ "query": "<检索文本，≤4000 字符>", "limit": 10 }

## 响应 200
{ "ok": true, "results": [
  { "spec_path": "knowledge/decisions/unmapped.md",   // spec 相对路径（CLI 剥 knowledge/ 前缀定位域文件）
    "anchor": "D-001@v1",                              // 决策条目 id（## D-xxx@vN）
    "change": "2026-09-26-thin-agent-tasks",           // 条目「变更：」字段——同号条目跨变更常见，消歧用（可选）
    "score": 0.83 } ] }                                // 相似度（CLI 直接作 decisionHits.score）

## 平台侧三件
1. pgvector：知识条目向量（建议独立表 spec_knowledge_embeddings：project_id、spec_path、anchor、change、embedding vector(N)，锚=（project_id, spec_path, anchor, change）幂等 upsert）；
2. ingest：spec-sync 知识文件上传时解析 `## D-xxx@vN` 条目（标题＋理由文本）→ embedding（中文模型选型是平台决策点）→ upsert；删除条目联动清理；
3. 检索：query embedding → cosine top-K（按 project 隔离）。

## 语义边界（CLI 侧已按此实现）
- 平台只做召回（哪个文件哪个条目）；status/deathPath/回显资格等策略面 CLI 本地解析（本地文件是真相源）；
- 超时 3s、任何失败静默降级（检索是 advisory 面高频调用，失败刷屏=狼来了）；
- 开关：local.yaml knowledge.vector_search: off 或 env SILLYSPEC_KNOWLEDGE_VECTOR=off。

## 参照实现
mock 平台（契约演示件）：.sillyspec/.runtime/mock-platform.mjs；CLI 测试夹具：test/knowledge-vector-recall.test.mjs
