---
author: qinyi
created_at: 2026-09-07T06:40:00+08:00
---

# 决策记录（Decisions）

## D-001@v1: P3d 缩范围=delta 聚合器 + advisory 联动，端点 before 基线明确不做
- type: boundary
- priority: P0
- status: accepted
- source: docs
- question: 种子稿 §5 被低估工作量（端点 before/after 失实）的 P3d 怎么落地？
- answer: 核心缩为两件：①delta 聚合器——sillyspec delta --change <名> CLI 从前三期已就位的机器产物（P3a reconcile-result.json 的 touched/matched 三类差集、module-map 归属、P3b verify-facts.json 探针摘要、decisions.md 提炼清单）聚合生成 delta.md 落变更目录（archify Delta 的 Before/Delta/After 对应物，md 非 yaml 与全系列一致）；②advisory 联动——delta.md 尾部生成「下次 scan facts 建议刷新模块」段（受影响模块清单）。端点 before/after 基线明确不做（contract-matrix 只有事后快照，before 机制独立立项）；增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）；knowledge 自动沉淀已有 decision-distill（不重复）。
- normalized_requirement: delta 聚合只读既有机器产物零新采集；不做端点基线/增量引擎/knowledge 重复机制
- impacts: [FR-01, FR-02]
- 模块域: core-engine, runtime, cli-entry
- evidence: 种子稿 §5 + 修正分析（提案审查轮实证 contract-matrix 无 before 数据）；P3a/P3b 落地产物（reconcile-result.json/verify-facts.json）

## D-002@v1: 方案A——独立 CLI + archive 步骤自动生成双入口
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: delta 生成入口形态？
- answer: 预授权抉择：sillyspec delta --change <名> 独立命令（幂等可复跑）+ archive「确认归档」步自动调用（产物随归档目录保存）。四源聚合：reconcile-result.json（最新 verify-runs 取）+ verify-facts.json + module-map 归属推导 + decisions.md 条目（distill 口径当前版本）。md 输出（Before=变更前模块状态摘要/Delta=文件×模块×差集/After=建议动作）。
- normalized_requirement: delta.md 含 Before/Delta/After 三段 + scan 刷新建议 advisory 段；四源缺失时对应段降级注记（fail-soft）
- impacts: [FR-01]
- 模块域: core-engine, cli-entry
- evidence: 方案选择轮（预授权）

## D-003@v1: Grill 修正——--json 对齐先例/apply-pathspec 兜底定义/源4形态
- type: consistency
- priority: P2
- status: accepted
- source: design-grill
- question: 快审 3 低 gap？
- answer: ①delta 命令补 --json（design-init 先例口径）；②deliverables 定义=reconcile 缺失时 Delta 段兜底清单（apply-pathspec-<change>.txt，存量变更也有 delta）；③源4 形态钉死 {id,domains}（无 title，parseDecisionDomains 返回即此）；④deriveActualModules 导出复用。
- normalized_requirement: 见 design 修订三处
- impacts: [FR-01]
- 模块域: core-engine, cli-entry
- evidence: .sillyspec/.runtime/stage-reviews/brainstorm-review-p3d/review.json
