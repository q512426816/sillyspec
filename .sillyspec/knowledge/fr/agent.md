---
author: sillyspec-fr-index
created_at: 2026-10-21T04:40:00.306Z
---

# FR 索引 — agent

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/agent.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-unmapped-375 per-worker 独立 worktree 创建
变更：2026-07-12-2026-07-12-worker-worktree-isolation
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-006@v1
全文：.sillyspec/changes/archive/2026-07-12-2026-07-12-worker-worktree-isolation/requirements.md#FR-01
最近确认：af41fac1d

## FR-unmapped-376 worker 在副本内写+commit（root_path 改向副本）
变更：2026-07-12-2026-07-12-worker-worktree-isolation
状态：active
摘要：（无场景名）
依据决策：D-002@v1、D-003@v1
全文：.sillyspec/changes/archive/2026-07-12-2026-07-12-worker-worktree-isolation/requirements.md#FR-02
最近确认：af41fac1d

## FR-unmapped-377 converge 分支合并
变更：2026-07-12-2026-07-12-worker-worktree-isolation
状态：active
摘要：（无场景名）
依据决策：D-003@v1、D-006@v1
全文：.sillyspec/changes/archive/2026-07-12-2026-07-12-worker-worktree-isolation/requirements.md#FR-03
最近确认：af41fac1d

## FR-unmapped-378 冲突主 agent 自动解决（converge_mission 可重入）
变更：2026-07-12-2026-07-12-worker-worktree-isolation
状态：active
摘要：（无场景名）
依据决策：D-004@v1
全文：.sillyspec/changes/archive/2026-07-12-2026-07-12-worker-worktree-isolation/requirements.md#FR-04
最近确认：af41fac1d

## FR-unmapped-379 合并后清理 + patch 采集
变更：2026-07-12-2026-07-12-worker-worktree-isolation
状态：active
摘要：（无场景名）
依据决策：D-005@v1
全文：.sillyspec/changes/archive/2026-07-12-2026-07-12-worker-worktree-isolation/requirements.md#FR-05
最近确认：af41fac1d

## FR-unmapped-380 worker 副本 git identity（X-002）
变更：2026-07-12-2026-07-12-worker-worktree-isolation
状态：active
摘要：（无场景名）
依据决策：D-008@v1
全文：.sillyspec/changes/archive/2026-07-12-2026-07-12-worker-worktree-isolation/requirements.md#FR-06
最近确认：af41fac1d

## FR-agent-001 .agents/skills/deploy/SKILL.md 存在且含五步链+坑清单速查表，frontmatter name/description 合规
变更：2026-11-04-deploy-skill
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-11-04-deploy-skill/requirements.md#FR-01
最近确认：5dfc97d629982c4f0a9875c9be08e077959201e2

## FR-agent-002 不影响交付面（shipped-hygiene 扫描面不含 .agents）与既有测试
变更：2026-11-04-deploy-skill
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-11-04-deploy-skill/requirements.md#FR-02
最近确认：5dfc97d629982c4f0a9875c9be08e077959201e2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-04-deploy-skill:flow:测试绑定FR-02
  tests: test/prompt-golden.test.mjs「stage 提示词金档比对」 | test/shipped-hygiene.test.mjs「交付面无开发物料」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-04-deploy-skill
  status: active
