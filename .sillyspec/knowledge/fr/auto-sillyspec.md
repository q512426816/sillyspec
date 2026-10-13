---
author: sillyspec-fr-index
created_at: 2026-10-11T14:22:52.965Z
---

# FR 索引 — auto-sillyspec

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-sillyspec-015 package.json version=3.32.5 且 test/quick-retired.test.mjs R5 版本锚断言绿（node --test test/quick-retired.test.mjs 零失败）
变更：2026-10-11-release-3-32-5
状态：active
摘要：发布前版本面复跑
全文：.sillyspec/changes/archive/2026-10-11-release-3-32-5/requirements.md#FR-01
最近确认：8836395f8d30e61c71d172f26a849a5cf1801fdc

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-11-release-3-32-5:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs「R5 文档与版本（FR-03）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-11-release-3-32-5
  status: active

## FR-auto-sillyspec-016 git push origin main 成功（含本变更工件、随版修复归档件与既有未推送提交；pre-push 拦截时修复而非跳过）
变更：2026-10-11-release-3-32-5
状态：active
摘要：推送
全文：.sillyspec/changes/archive/2026-10-11-release-3-32-5/requirements.md#FR-02
最近确认：8836395f8d30e61c71d172f26a849a5cf1801fdc

## FR-auto-sillyspec-017 npm publish 成功且钉扎通道双核验：npm view sillyspec version=3.32.5 且 dist-tags.latest=3.32.5（发布前预核验 latest=3.32.4 已确认通道可信）
变更：2026-10-11-release-3-32-5
状态：active
摘要：发布与核验
全文：.sillyspec/changes/archive/2026-10-11-release-3-32-5/requirements.md#FR-03
最近确认：8836395f8d30e61c71d172f26a849a5cf1801fdc

## FR-auto-sillyspec-018 package.json version=3.32.6 且 test/quick-retired.test.mjs R5 版本锚断言绿（node --test test/quick-retired.test.mjs 零失败）
变更：2026-10-12-release-3-32-6
状态：active
摘要：版本面自证
全文：.sillyspec/changes/archive/2026-10-12-release-3-32-6/requirements.md#FR-01
最近确认：f1cca12ad5ed7d08385ef4f9538a28c25fe191c6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-release-3-32-6:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs「R5 文档与版本」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-release-3-32-6
  status: active

## FR-auto-sillyspec-019 git push origin main 成功（含本变更工件、随版修复两提交与既有未推送提交；pre-push 拦截时修复而非跳过）
变更：2026-10-12-release-3-32-6
状态：active
摘要：推送闭环
全文：.sillyspec/changes/archive/2026-10-12-release-3-32-6/requirements.md#FR-02
最近确认：f1cca12ad5ed7d08385ef4f9538a28c25fe191c6

## FR-auto-sillyspec-020 npm publish 成功且钉扎通道双核验：npm view sillyspec version=3.32.6 且 dist-tags.latest=3.32.6（发布前预核验 latest=3.32.5 已确认通道可信）
变更：2026-10-12-release-3-32-6
状态：active
摘要：钉扎发布闭环
全文：.sillyspec/changes/archive/2026-10-12-release-3-32-6/requirements.md#FR-03
最近确认：f1cca12ad5ed7d08385ef4f9538a28c25fe191c6

## FR-auto-sillyspec-021 package.json version=3.32.8 且 test/quick-retired.test.mjs R5 版本锚断言绿
变更：2026-10-13-release-3-32-8
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 版本面提交；When node --test test/quick-retired.test.mjs；Then 零失败。
全文：.sillyspec/changes/archive/2026-10-13-release-3-32-8/requirements.md#FR-01
最近确认：a0027cf5a0b3c70c1b9728df1eaf2388f58b7711

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-release-3-32-8:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs「R5 版本锚 3.32.8」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-release-3-32-8
  status: active

## FR-auto-sillyspec-022 git push origin main 成功（pre-push 拦截时修复而非跳过）
变更：2026-10-13-release-3-32-8
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — When git push origin main；Then 成功回执（无 rejected）。
全文：.sillyspec/changes/archive/2026-10-13-release-3-32-8/requirements.md#FR-02
最近确认：a0027cf5a0b3c70c1b9728df1eaf2388f58b7711

## FR-auto-sillyspec-023 npm publish 钉扎通道：预核验 latest=3.32.7 → publish → 双核验 version=3.32.8 且 dist-tags.latest=3.32.8
变更：2026-10-13-release-3-32-8
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 预核验 3.32.7 通过；When npm publish（钉扎）；Then 发布回执含 shasum，双核验两值均 3.32.8。
全文：.sillyspec/changes/archive/2026-10-13-release-3-32-8/requirements.md#FR-03
最近确认：a0027cf5a0b3c70c1b9728df1eaf2388f58b7711
