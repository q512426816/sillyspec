---
author: flow-machine-draft
created_at: 2026-10-19T10:55:18.744Z
---
# 提案书（Proposal）— 2026-10-19-cross-repo-face-tool-filter

## 动机

任务原话转写：跨仓冻结面剔模板与脱敏

动机与背景：平台评审 P2——degradedReason 文案携带产出端本机绝对路径（cross-repo-reconcile.js 注册路径不可达分支），资产卡原样透出；且跨仓 repos[].patch/rows/totals 未过滤工具治理模板（.claude/.codex 等），与主仓面口径不一致。

成功标准：
- 注册路径不可达的 degradedReason 不再包含绝对路径（改为引用 local.yaml repos 键）
- reconcileCrossRepoPlan 的跨仓文件面（rows/totals/patch）过滤工具治理模板（isToolGovernancePath 同源）
- 新增用例覆盖：跨仓模板不入 repos[].patch、degradedReason 无路径
- 既有跨仓/空面/过滤测试全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 注册路径不可达的 degradedReason 不再包含绝对路径（改为引用 local.yaml repos 键）
2. reconcileCrossRepoPlan 的跨仓文件面（rows/totals/patch）过滤工具治理模板（isToolGovernancePath 同源）
3. 新增用例覆盖：跨仓模板不入 repos[].patch、degradedReason 无路径
4. 既有跨仓/空面/过滤测试全绿

## 成功标准（可验证）

1. 注册路径不可达的 degradedReason 不再包含绝对路径（改为引用 local.yaml repos 键）
2. reconcileCrossRepoPlan 的跨仓文件面（rows/totals/patch）过滤工具治理模板（isToolGovernancePath 同源）
3. 新增用例覆盖：跨仓模板不入 repos[].patch、degradedReason 无路径
4. 既有跨仓/空面/过滤测试全绿
