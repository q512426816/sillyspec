---
author: qinyi
created_at: 2026-09-09T05:30:00+08:00
change: 2026-09-09-doctor-noai
---

# 决策记录（Decisions）

## D-001@v1: doctor 阶段折叠 = 复用 doctor-diagnostics，不另造探测
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: doctor 阶段 noAI 化——重写 prompt 里那套 bash 探测为 JS，还是折叠进既有 `sillyspec doctor` 诊断？
- answer: 折叠：新增 `_cliAction: doctorRunDiagnostics`（跑 runDoctorDiagnostics + 渲染人类可读摘要）替换 doctor 阶段前三大步（SillySpec 内部/构建环境/外部依赖的 bash 教学步）；agent 只保留「读报告→修复决策→执行修复」步。反对 A（prompt 内重写探测 = 两套探测漂移）；反对 B（只加 CLI 不动阶段 = 轮次不省）。
- normalized_requirement: doctor 阶段含 ≥1 个 noAI 步（_cliAction doctorRunDiagnostics）；bash 探测教学步删除。
- impacts: [FR-01, task-01, task-02]
- evidence: 轮次经济学 §3.1（doctor 折叠——_cliAction 样板）+ 评审定稿；doctor-diagnostics 现状（本会话盘点）。
- 模块域：stages,core-engine

## D-002@v1: 净增三类探测器只读 fail-soft
- type: boundary
- priority: P1
- status: accepted
- source: user
- question: 补哪三类 + 什么语义？
- answer: worktree 健康（git worktree list × .runtime/worktrees 目录对账 + 残留分支）、构建环境（node 版本 vs engines、包管理器存在性）、MCP 端点配置（Context7/grep.app 配置文件在场性——不发网络请求）。全部只读、fail-soft（探测异常 = skipped 不阻断）、进 doctor --json。
- normalized_requirement: 三 detector 均只读零写盘；诊断信封含其 findings。
- impacts: [FR-02, task-01]
- evidence: 轮次经济学 §3.1 净增三类清单（评审修正版：孤儿已覆盖）。
- 模块域：core-engine

## D-003@v1: 修复执行步与写操作不动
- type: boundary
- priority: P2
- status: accepted
- source: user
- question: doctor 的 --confirm 写操作（cleanup/gc）是否并入？
- answer: 不并入。写操作维持独立 flag + dry-run 默认（既有设计）；agent 修复步照旧可调用。
- normalized_requirement: 本变更新增代码零写盘（除 doctor-diagnosis.json 既有落盘）。
- impacts: []
- evidence: doctor-diagnostics 头注（safe_actions 只描述）。
- 模块域：core-engine
