---
author: sillyspec-fr-index
created_at: 2026-10-12T15:27:50.458Z
---

# FR 索引 — auto-idea

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 伪域（auto- 前缀）：由文件路径段投票派生，无模块卡——为该域补模块卡后，新变更将自动落回真域

## FR-auto-idea-001 package.json version=3.32.7 且 test/quick-retired.test.mjs R5 版本锚断言绿（node --test 零失败）
变更：2026-10-12-release-3-32-7
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 版本面提交；When node --test test/quick-retired.test.mjs；Then 零失败。
全文：.sillyspec/changes/archive/2026-10-12-release-3-32-7/requirements.md#FR-01
最近确认：7000ac1041b71a716792e38fd757cbaa886b9d3e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-release-3-32-7:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs「R5 版本锚 3.32.7」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-release-3-32-7
  status: active

## FR-auto-idea-002 git push origin main 成功（pre-push 拦截时修复而非跳过）
变更：2026-10-12-release-3-32-7
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — When git push origin main；Then 成功回执（无 rejected）。
全文：.sillyspec/changes/archive/2026-10-12-release-3-32-7/requirements.md#FR-02
最近确认：7000ac1041b71a716792e38fd757cbaa886b9d3e

## FR-auto-idea-003 npm publish 走钉扎通道（腾讯 DoH 解析 + NODE_OPTIONS --require 进程级钉扎，脚本 /tmp/dns-pin-registry.cjs）；发布前预核验钉扎 npm view 返回 latest=3.32.6（通道存活证明，失败即重解析 DoH 更新 PIN 或停）；发布后双核验 npm view sillyspec version=3.32.7 且 dist-tags.latest=3.32.7
变更：2026-10-12-release-3-32-7
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 预核验 3.32.6 通过；When npm publish（钉扎）；Then 发布回执含 shasum，双核验两值均 3.32.7。
全文：.sillyspec/changes/archive/2026-10-12-release-3-32-7/requirements.md#FR-03
最近确认：7000ac1041b71a716792e38fd757cbaa886b9d3e
