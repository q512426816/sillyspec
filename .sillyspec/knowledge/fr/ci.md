---
author: sillyspec-fr-index
created_at: 2026-10-16T03:40:37.720Z
---

# FR 索引 — ci

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/ci.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-ci-001 package.json 与 package-lock.json version=3.33.0 且 test/quick-retired.test.mjs R5 锚断言同步并跑绿
变更：2026-10-16-release-3-33-0
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — 
全文：.sillyspec/changes/archive/2026-10-16-release-3-33-0/requirements.md#FR-01
最近确认：5848cf3c432ff63fb38da7cd21d5881c654da14d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-release-3-33-0:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs「R5 版本锚 3.33.0」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-release-3-33-0
  status: active

## FR-ci-002 git push origin main 成功（pre-push 三门放行），origin/main 与本地一致
变更：2026-10-16-release-3-33-0
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 版本面提交与积压提交在本地 main；When `git push origin main`；Then pre-push 本地门全绿放行，推送回执含远端哈希区间
全文：.sillyspec/changes/archive/2026-10-16-release-3-33-0/requirements.md#FR-02
最近确认：5848cf3c432ff63fb38da7cd21d5881c654da14d

## FR-ci-003 npm publish 回执含 sillyspec@3.33.0 与 shasum，传播后双核验 version=3.33.0 且 dist-tags.latest=3.33.0
变更：2026-10-16-release-3-33-0
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given npm 线上 latest=3.32.10 且 push 已完成；When `npm publish` 成功回执含 shasum；Then CDN 传播后 `n
全文：.sillyspec/changes/archive/2026-10-16-release-3-33-0/requirements.md#FR-03
最近确认：5848cf3c432ff63fb38da7cd21d5881c654da14d

## FR-ci-004 test/lint-ownership-failfast.test.mjs 3e 断言随 lint-triage-path-unify 实态改钉且该件跑绿
变更：2026-10-16-release-3-33-0
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given HEAD gates.js 已无 `verdict === 'pre-existing'` 字面量而测试 3e 仍钉旧锚（HEAD 全量红欠账）；When 3e
全文：.sillyspec/changes/archive/2026-10-16-release-3-33-0/requirements.md#FR-04
最近确认：5848cf3c432ff63fb38da7cd21d5881c654da14d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-release-3-33-0:flow:测试绑定FR-04
  tests: test/lint-ownership-failfast.test.mjs「3e verify lint 硬拦分支走共享归属鉴定降档」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-release-3-33-0
  status: active

## FR-ci-005 .github/workflows/ci.yml test/docs-gate 两 job 补 npm ci install 步且推送后 CI 三 job 全绿
变更：2026-10-16-release-3-33-0
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given CI 首跑（121a33ee）test 与 docs-gate 两 job 因缺依赖 3m25s 全灭；When 两 job 补 `npm ci --no-au
全文：.sillyspec/changes/archive/2026-10-16-release-3-33-0/requirements.md#FR-05
最近确认：5848cf3c432ff63fb38da7cd21d5881c654da14d

## FR-ci-006 test/review-material-pack.test.mjs 组四源码钉随 fbf0ada4 substituteRaw 收编实态改钉且该件跑绿
变更：2026-10-16-release-3-33-0
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given HEAD prompt.js 两处裸 split/join 已迁 substituteRaw（fbf0ada4 漏收测试锚）而组四仍钉旧字面量；When 两条断
全文：.sillyspec/changes/archive/2026-10-16-release-3-33-0/requirements.md#FR-06
最近确认：5848cf3c432ff63fb38da7cd21d5881c654da14d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-release-3-33-0:flow:测试绑定FR-06
  tests: test/review-material-pack.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-release-3-33-0
  status: active
