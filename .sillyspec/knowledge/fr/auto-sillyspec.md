---
author: sillyspec-fr-index
created_at: 2026-10-20T01:19:37.412Z
---

# FR 索引 — auto-sillyspec

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-sillyspec-028 known-failures.yaml 删除 node:test banner/结果行组与 fixture token 组及待审计组
变更：2026-10-20-known-failures-c-recycle
状态：active
摘要：删后全绿套件照常通过
场景正文：
- 场景：删后全绿套件照常通过 — Given 套件 exitCode===0（全绿）；When 门禁判定；Then 直接 passed（不扫行，豁免清单不参与）——删除零影响
全文：.sillyspec/changes/archive/2026-10-20-known-failures-c-recycle/requirements.md#FR-01
最近确认：5f38ad905c44fb86a4d82dff3897c57093014793

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-known-failures-c-recycle:flow:测试绑定FR-01
  tests: test/verify-postcheck-known-failures.test.mjs「合并装载: 入库文件解析 3 条」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-known-failures-c-recycle
  status: active

## FR-auto-sillyspec-029 保留非 node:test 家族：D 组门内嵌套与 task-done 用例 CLI 预期错误文案同族
变更：2026-10-20-known-failures-c-recycle
状态：active
摘要：保留面逐字节不变
场景正文：
- 场景：保留面逐字节不变 — Given 上述保留条目；When 本变更落盘；Then 三条条目与注释原样保留
全文：.sillyspec/changes/archive/2026-10-20-known-failures-c-recycle/requirements.md#FR-02
最近确认：5f38ad905c44fb86a4d82dff3897c57093014793

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-known-failures-c-recycle:flow:测试绑定FR-02
  tests: test/verify-postcheck-known-failures.test.mjs「合并装载: 入库文件解析 3 条」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-known-failures-c-recycle
  status: active

## FR-auto-sillyspec-030 既有判定相关测试套件零回归
变更：2026-10-20-known-failures-c-recycle
状态：active
摘要：回归面
场景正文：
- 场景：回归面 — Given known-failures.yaml 变更后；When 复跑判定相关套件；Then 全绿（纯配置变更，源码零改动）
全文：.sillyspec/changes/archive/2026-10-20-known-failures-c-recycle/requirements.md#FR-03
最近确认：5f38ad905c44fb86a4d82dff3897c57093014793

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-known-failures-c-recycle:flow:测试绑定FR-03
  tests: test/cross-repo-tap-summary.test.mjs | test/verify-failure-ledger-noise.test.mjs「判定面回归全绿」 | test/verify-postcheck-known-failures.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-known-failures-c-recycle
  status: active

## FR-auto-sillyspec-031 本变更 design.md 必须引用交付提交 8227bd0a 完整 sha 与交付内容描述（stage-templates.js decisions 模板清单插值正典）
变更：2026-10-20-stage-templates-retrofit
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更归档件；When 审计者读 design.md；Then 能取到完整 sha 并用 git show 8227bd0a 复核交付 diff
全文：.sillyspec/changes/archive/2026-10-20-stage-templates-retrofit/requirements.md#FR-01
最近确认：f5b89b761f7b562048b80f057db96b4d59275c71

## FR-auto-sillyspec-032 test/decision-caliber-unify.test.mjs 用例④的 stage-templates 插值断言在场且全绿（已验证达标的行为）
变更：2026-10-20-stage-templates-retrofit
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 交付已在库（8227bd0a）；When 收口实测跑该套件；Then 6/6 pass 零 fail
全文：.sillyspec/changes/archive/2026-10-20-stage-templates-retrofit/requirements.md#FR-02
最近确认：f5b89b761f7b562048b80f057db96b4d59275c71

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-stage-templates-retrofit:flow:测试绑定FR-02
  tests: test/decision-caliber-unify.test.mjs「④ brainstorm 提示清单同步」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-stage-templates-retrofit
  status: active

## FR-auto-sillyspec-033 归档完成后审计链可从本变更档案追溯到交付提交 8227bd0a
变更：2026-10-20-stage-templates-retrofit
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given flow done 完成；When 查归档目录；Then design.md 含 sha 引用、归档提交消息含 (2026-10-20-stage-templates-retrofit) 尾缀
全文：.sillyspec/changes/archive/2026-10-20-stage-templates-retrofit/requirements.md#FR-03
最近确认：f5b89b761f7b562048b80f057db96b4d59275c71

## FR-auto-sillyspec-034 provenance ledger：两仓 decisions/unmapped 与 fr/unmapped 逐条记录（id、来源仓、所在文件、内容 hash、是否在另一仓存在、同仓重复数），落变更目录 JSON
变更：2026-11-02-knowledge-provenance
状态：active
摘要：条目守恒
场景正文：
- 场景：条目守恒 — Given 本仓 decisions/unmapped 74 条、fr/unmapped 210 条、平台 decisions/unmapped 308 条（按 `## D；When 生成 ledger；Then JSON 条目数与头计数一致（守恒断言随脚本执行）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-provenance/requirements.md#FR-01
最近确认：3f2421bd96c16584248c661b27e790c3ee948f5b

## FR-auto-sillyspec-035 分类：decisions 分 template-draft / real / duplicate-of-platform / unique；fr 分 duplicate-of-platform / unique，模板判定基于标题/理由的底稿模板特征
变更：2026-11-02-knowledge-provenance
状态：active
摘要：模板分层
场景正文：
- 场景：模板分层 — Given 本仓 74 条中 46 条为模板底稿；When 分类；Then template-draft 计数与实测对齐（差异如实记录在报告）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-provenance/requirements.md#FR-02
最近确认：3f2421bd96c16584248c661b27e790c3ee948f5b

## FR-auto-sillyspec-036 处置表：每条给出建议动作（draft 标记、归档裁剪、人工域映射候选）+ 理由，覆盖全部条目无遗漏
变更：2026-11-02-knowledge-provenance
状态：active
摘要：无遗漏
场景正文：
- 场景：无遗漏 — Given ledger 共 N 条；When 读报告处置表；Then 处置表条目数 = N（脚本断言）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-provenance/requirements.md#FR-03
最近确认：3f2421bd96c16584248c661b27e790c3ee948f5b

## FR-auto-sillyspec-037 零写入：不改任何知识文件；平台仓只读分析
变更：2026-11-02-knowledge-provenance
状态：active
摘要：执行前后 hash 一致
场景正文：
- 场景：执行前后 hash 一致 — Given 脚本执行；When 比较两仓 knowledge 目录前后 hash；Then 必须一致（零写入断言）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-provenance/requirements.md#FR-04
最近确认：3f2421bd96c16584248c661b27e790c3ee948f5b

## FR-auto-sillyspec-038 报告可审计：统计数字与审查实测对齐（或如实记录差异），落 4A-REPORT.md 随变更归档
变更：2026-11-02-knowledge-provenance
状态：active
摘要：数字对照
场景正文：
- 场景：数字对照 — Given 报告生成；When 人工对照审查实测；Then 关键计数一致或差异有解释（如实记录）
全文：.sillyspec/changes/archive/2026-11-02-knowledge-provenance/requirements.md#FR-05
最近确认：3f2421bd96c16584248c661b27e790c3ee948f5b
