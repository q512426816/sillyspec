---
author: sillyspec-fr-index
created_at: 2026-10-15T01:33:02.911Z
---

# FR 索引 — release

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/release.md（域=模块 id 同构；行为条目↔模块契约互跳）

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

## FR-auto-claude-010 版本面核验——package.json version=3.32.4 且 quick-retired R5 版本锚断言绿
变更：2026-10-10-release-3-32-4
状态：active
摘要：发布前版本面复跑
全文：.sillyspec/changes/archive/2026-10-10-release-3-32-4/requirements.md#FR-01
最近确认：060a6f70e810071b6e752609a6257721fb2a0fe6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-release-3-32-4:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-release-3-32-4
  status: active

## FR-auto-claude-011 git push origin main 成功（含本变更工件与既有未推送提交）
变更：2026-10-10-release-3-32-4
状态：active
摘要：推送
全文：.sillyspec/changes/archive/2026-10-10-release-3-32-4/requirements.md#FR-02
最近确认：060a6f70e810071b6e752609a6257721fb2a0fe6

## FR-auto-claude-012 npm publish 成功且钉扎通道双核验 latest=3.32.4
变更：2026-10-10-release-3-32-4
状态：active
摘要：发布与核验
全文：.sillyspec/changes/archive/2026-10-10-release-3-32-4/requirements.md#FR-03
最近确认：060a6f70e810071b6e752609a6257721fb2a0fe6

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

## FR-release-001 package.json 与 package-lock.json version=3.32.10 且 test/quick-retired.test.mjs R5 版本锚断言同步并跑绿
变更：2026-10-15-release-3-32-10
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本地 3.32.9、npm 线上 latest=3.32.9；When `npm version 3.32.10 --no-git-tag-version` 连
全文：.sillyspec/changes/archive/2026-10-15-release-3-32-10/requirements.md#FR-01
最近确认：e95c309f71e68238ce5865a64200469ec0ae551e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-release-3-32-10:flow:测试绑定FR-01
  tests: test/quick-retired.test.mjs「R5 版本锚 3.32.10」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-release-3-32-10
  status: active

## FR-release-002 git push origin main 成功（pre-push 三门放行），origin/main 与本地一致
变更：2026-10-15-release-3-32-10
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 版本面三文件与积压提交在本地 main；When `git push origin main`；Then pre-push 三门全绿放行，推送回执含远端哈希区间
全文：.sillyspec/changes/archive/2026-10-15-release-3-32-10/requirements.md#FR-02
最近确认：e95c309f71e68238ce5865a64200469ec0ae551e

## FR-release-003 npm publish 回执含 sillyspec@3.32.10 与 shasum，传播后双核验 version=3.32.10 且 dist-tags.latest=3.32.10
变更：2026-10-15-release-3-32-10
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 预核验 latest=3.32.9 通过证通道存活；When npm publish；Then 发布回执含 sillyspec@3.32.10 与 shasum
全文：.sillyspec/changes/archive/2026-10-15-release-3-32-10/requirements.md#FR-03
最近确认：e95c309f71e68238ce5865a64200469ec0ae551e
