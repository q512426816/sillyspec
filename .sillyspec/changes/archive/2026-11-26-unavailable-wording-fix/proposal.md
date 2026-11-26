---
author: flow-machine-draft
created_at: 2026-11-26T14:21:28.115Z
---
# 提案书（Proposal）— 2026-11-26-unavailable-wording-fix

## 动机

任务原话转写：订正收口实测门配置文案与语义

动机：2026-11-26-verify-stage-retire 的 D-008 落点写的是「local.yaml 标 commands.test: unavailable 可关闭本仓收口亲跑」——实测源码语义相反：unavailable 只让 extractTestCommand 返回 null，执行层随即 inferFullTestCommand 结构推断并照跑（verify-postcheck.js:3056-3068），本变更自己的归档门实测跑了 149 测试即为证。配置说假话还撞本仓 cli-copy-selfsufficient 文案一致性探针。本变更只订正文案，不改实测行为（保持测试照跑）。

成功标准：
- .sillyspec/local.yaml 的 commands 段注释改为如实描述（unavailable=不显式指定，执行层回退结构推断仍会跑）
- src/stages/archive.js 首步注释与 docs/sillyspec/file-lifecycle.md 的「D-008 关闭亲跑」表述改为如实语义
- 全仓 grep 不再出现「unavailable→skip」「关闭亲跑」类失真表述（历史归档件除外）
- 不改任何实测/门禁逻辑，node test/check-syntax.mjs 绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. .sillyspec/local.yaml 的 commands 段注释改为如实描述（unavailable=不显式指定，执行层回退结构推断仍会跑）
2. src/stages/archive.js 首步注释与 docs/sillyspec/file-lifecycle.md 的「D-008 关闭亲跑」表述改为如实语义
3. 全仓 grep 不再出现「unavailable→skip」「关闭亲跑」类失真表述（历史归档件除外）
4. 不改任何实测/门禁逻辑，node test/check-syntax.mjs 绿

## 成功标准（可验证）

1. .sillyspec/local.yaml 的 commands 段注释改为如实描述（unavailable=不显式指定，执行层回退结构推断仍会跑）
2. src/stages/archive.js 首步注释与 docs/sillyspec/file-lifecycle.md 的「D-008 关闭亲跑」表述改为如实语义
3. 全仓 grep 不再出现「unavailable→skip」「关闭亲跑」类失真表述（历史归档件除外）
4. 不改任何实测/门禁逻辑，node test/check-syntax.mjs 绿
