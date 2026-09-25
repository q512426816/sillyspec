---
author: sillyspec-fr-index
created_at: 2026-09-25T12:52:29.011Z
---

# FR 索引 — auto-round5

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-round5-001 幽灵条目补节头修复
变更：2026-09-25-fr-unmapped-repair
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given unmapped.md 有 7 条缺 FR 节头的孤立字段块（外部合回切割损伤）；When 按全文锚点从在场归档恢复标题并补 FR-unmapped-714~720 节头 修复后 readActiveFrDigest 读到全部 7 条（标题非佚失）
全文：.sillyspec/changes/archive/2026-09-25-fr-unmapped-repair/requirements.md#FR-01
最近确认：546685bb9cca3e4b0397f93d9e2bd67da002b5a7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-unmapped-repair:flow:FR-01
  tests: test/fr-unmapped-repair.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-unmapped-repair
  status: active

## FR-auto-round5-002 写入路径健壮性钉
变更：2026-09-25-fr-unmapped-repair
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 幽灵损伤不可能来自本仓写入路径的论断；When indexRequirements 产出经 splitKnowledgeSections 解析；Then preamble 零孤立字段行（变更：/状态：开头）且条目全数成 section
全文：.sillyspec/changes/archive/2026-09-25-fr-unmapped-repair/requirements.md#FR-02
最近确认：546685bb9cca3e4b0397f93d9e2bd67da002b5a7

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-fr-unmapped-repair:flow:FR-02
  tests: test/fr-unmapped-repair.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-fr-unmapped-repair
  status: active

## FR-auto-round5-003 R17 报告入库
变更：2026-09-25-r17-assets-intake
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given R17 三臂实验报告在临时目录；When 按 R16 先例格式（引言含目的/口径/判据）入 docs/analysis/；Then docs/analysis/R17-对撞-三臂轻量完整与openspec-2026-09-25.md 在场且含总表/四结论/成本细分/资产对比
全文：.sillyspec/changes/archive/2026-09-25-r17-assets-intake/requirements.md#FR-01
最近确认：d3342a85bb06e43dab876a12b30c62ad7c6905dd

## FR-auto-round5-004 实验知识入 known-issues
变更：2026-09-25-r17-assets-intake
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 4 条实验知识有跨会话复利价值（flag 死路类/摘录碎片化/verify 互锁/绿地伪域断流）；When 追加为 known-issues.md 条目；Then 每条含现象/证据锚点/修复状态；INDEX.md 补可区分关键词路由行（知识命中面可及）
全文：.sillyspec/changes/archive/2026-09-25-r17-assets-intake/requirements.md#FR-02
最近确认：d3342a85bb06e43dab876a12b30c62ad7c6905dd
