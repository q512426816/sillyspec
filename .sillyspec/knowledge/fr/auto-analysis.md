---
author: sillyspec-fr-index
created_at: 2026-10-12T14:19:09.039Z
---

# FR 索引 — auto-analysis

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-analysis-001 报告落盘 docs/analysis/fire-equipment-dogfood-复盘-2026-10-12.md，含五节：样本概况 / 调用量化（子命令分布、重试密度、读源码猜格式次数）/ 门禁有效性正面清单（评审真拦截的缺陷实录）/ 问题-处置对照表（P1~P11 与本批四变更 commit 锚）/ 校准基线与遗留项
变更：2026-10-12-fire-dogfood-retrospective
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 四子代理分析回执在场；When 报告落盘；Then 五节标题齐全且每节有实数据（表/时间戳/commit 锚），无空节。
全文：.sillyspec/changes/archive/2026-10-12-fire-dogfood-retrospective/requirements.md#FR-01
最近确认：b863fc2c1f986889e87f0228ea38c0f1041f7db4

## FR-auto-analysis-002 报告内数据全部来自四子代理取证（时间戳/计数可回溯 full.json），不做无据推断
变更：2026-10-12-fire-dogfood-retrospective
状态：active
摘要：可回溯
场景正文：
- 场景：可回溯 — When 抽查报告内任一数字；Then 能在子代理回执或 full.json 取证命令中找到同值出处。
全文：.sillyspec/changes/archive/2026-10-12-fire-dogfood-retrospective/requirements.md#FR-02
最近确认：b863fc2c1f986889e87f0228ea38c0f1041f7db4

## FR-auto-analysis-003 docs-check skip 登记（R16 同级：带日期快照行号冻结），doc-ref-check 与 lint 复绿
变更：2026-10-12-fire-dogfood-retrospective
状态：active
摘要：校验绿
场景正文：
- 场景：校验绿 — When `node test/doc-ref-check.test.mjs` 与 `npm run lint`；Then 分别输出全部通过。
全文：.sillyspec/changes/archive/2026-10-12-fire-dogfood-retrospective/requirements.md#FR-03
最近确认：b863fc2c1f986889e87f0228ea38c0f1041f7db4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-fire-dogfood-retrospective:flow:测试绑定FR-03
  tests: test/doc-ref-check.test.mjs「93 处引用全通过（含新增 skip 登记与重锚）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-fire-dogfood-retrospective
  status: active

## FR-auto-analysis-004 纯文档变更：实测面按仓规自动跳过（docs gate 判定）
变更：2026-10-12-fire-dogfood-retrospective
状态：active
摘要：收口
场景正文：
- 场景：收口 — When flow done；Then docs gate 判定纯文档跳过实测，归档完成。
全文：.sillyspec/changes/archive/2026-10-12-fire-dogfood-retrospective/requirements.md#FR-04
最近确认：b863fc2c1f986889e87f0228ea38c0f1041f7db4
