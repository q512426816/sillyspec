---
author: flow-machine-draft
created_at: 2026-11-26T14:21:28.116Z
---
# 任务注册表（Tasks）— 2026-11-26-unavailable-wording-fix

- [x] task-01: .sillyspec/local.yaml 的 commands 段注释改为如实描述（unavailable=不显式指定，执行层回退结构推断仍会跑）
- [x] task-02: src/stages/archive.js 首步注释与 docs/sillyspec/file-lifecycle.md 的「D-008 关闭亲跑」表述改为如实语义
- [x] task-03: 全仓 grep 不再出现「unavailable→skip」「关闭亲跑」类失真表述（历史归档件除外）
- [x] task-04: 不改任何实测/门禁逻辑，node test/check-syntax.mjs 绿
