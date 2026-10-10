---
author: sillyspec-fr-index
created_at: 2026-10-07T14:27:54.389Z
---

# FR 索引 — auto-claude

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-claude-001 版本号 3.32.0 发布
变更：2026-10-07-release-3-32-0
状态：active
摘要：锚同步
场景正文：
- 场景：锚同步 — Given 版本升至 3.32.0；When quick-retired 测试运行；Then R5 断言 pkg.version === '3.32.0' 通过
全文：.sillyspec/changes/archive/2026-10-07-release-3-32-0/requirements.md#FR-01
最近确认：48b4e0a4f52dd3ec05cc03e3929a037f61e4d4c8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-release-3-32-0:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs「R5 版本锚」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-release-3-32-0
  status: active

## FR-auto-claude-002 版本号 3.32.1 发布（载四个已归档修复）
变更：2026-10-08-release-3-32-1
状态：active
摘要：锚同步
场景正文：
- 场景：锚同步 — Given 版本升至 3.32.1；When quick-retired 测试运行；Then R5 断言 pkg.version === '3.32.1' 通过
全文：.sillyspec/changes/archive/2026-10-08-release-3-32-1/requirements.md#FR-01
最近确认：7df3a2298f02c43be047969c862edbcd30166d29

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-08-release-3-32-1:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs「R5 版本锚」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-08-release-3-32-1
  status: active

## FR-auto-claude-003 npm 发布与核验
变更：2026-10-08-release-3-32-1
状态：active
摘要：发布核验
场景正文：
- 场景：发布核验 — Given 工作区版本面与测试绿；When npm publish && npm view sillyspec version；Then 输出 3.32.1；推送后 origin/main 与本地一致
全文：.sillyspec/changes/archive/2026-10-08-release-3-32-1/requirements.md#FR-02
最近确认：7df3a2298f02c43be047969c862edbcd30166d29

## FR-auto-claude-004 uncategorized.md 收件箱必须清空且仅留头部与清账留痕
变更：2026-10-08-knowledge-inbox-triage
状态：active
摘要：清账后收件箱为空
全文：.sillyspec/changes/archive/2026-10-08-knowledge-inbox-triage/requirements.md#FR-01
最近确认：bda98076636049009a2f2e032aade374999ea969

## FR-auto-claude-005 全部内容块必须按语义无损迁入五个分类文件
变更：2026-10-08-knowledge-inbox-triage
状态：active
摘要：逐块对号入座
全文：.sillyspec/changes/archive/2026-10-08-knowledge-inbox-triage/requirements.md#FR-02
最近确认：bda98076636049009a2f2e032aade374999ea969

## FR-auto-claude-006 已修复条目必须按 known-issues 惯例标注且不得虚标
变更：2026-10-08-knowledge-inbox-triage
状态：active
摘要：修复凭据分级标注
全文：.sillyspec/changes/archive/2026-10-08-knowledge-inbox-triage/requirements.md#FR-03
最近确认：bda98076636049009a2f2e032aade374999ea969

## FR-auto-claude-007 INDEX.md 必须补齐迁入条目索引且不动他会话未提交 hunks
变更：2026-10-08-knowledge-inbox-triage
状态：active
摘要：关键词命中新落点
全文：.sillyspec/changes/archive/2026-10-08-knowledge-inbox-triage/requirements.md#FR-04
最近确认：bda98076636049009a2f2e032aade374999ea969

## FR-auto-claude-008 .claude/skills/sillyspec-brainstorm/SKILL.md 含变更标题指引：一句中文概括、≤50 字、建议 ~20 字，并说明标题提取自 proposal/design 首行 H1
变更：2026-10-10-brainstorm-skill-title
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given brainstorm skill 存在于 `.claude/skills/sillyspec-brainstorm/SKILL.md` / When agent
全文：.sillyspec/changes/archive/2026-10-10-brainstorm-skill-title/requirements.md#FR-01
最近确认：730426594a32383ad7ab53f6d4f8e7e7c542f3ca

## FR-auto-claude-009 纯文档改动，不触 src/test
变更：2026-10-10-brainstorm-skill-title
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更提交面 / When `git show --name-only` 核对 / Then 仅含 skill 文档与变更目录路径，无 src/test 路径。
全文：.sillyspec/changes/archive/2026-10-10-brainstorm-skill-title/requirements.md#FR-02
最近确认：730426594a32383ad7ab53f6d4f8e7e7c542f3ca
