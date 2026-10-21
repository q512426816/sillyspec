---
author: flow-machine-draft
created_at: 2026-10-21T17:23:39.880Z
---
# 提案书（Proposal）— 2026-10-21-docref-checkapproval-reanchor

## 动机

任务原话转写：平台接口图 checkApproval 锚重锚

动机：docs/sillyspec/platform-interface-map.md:L84 的 shared.js:1274 锚自 protocol-tax 重构 shared.js 后越界（checkApproval 定义现于 src/run/shared.js:1316）；该变更已归档但此一处漏修（其 1ba462e5 重锚了其余 19 处），doc-ref-check 全仓唯一残留红。

成功标准：
- L84 锚更新为 shared.js:1316（checkApproval 定义行），doc-ref-check 全绿（本机临时 known_failures 豁免已同步摘除）

## 变更范围

按成功标准机械推导，共 1 条验收面：
1. L84 锚更新为 shared.js:1316（checkApproval 定义行），doc-ref-check 全绿（本机临时 known_failures 豁免已同步摘除）

## 成功标准（可验证）

1. L84 锚更新为 shared.js:1316（checkApproval 定义行），doc-ref-check 全绿（本机临时 known_failures 豁免已同步摘除）
