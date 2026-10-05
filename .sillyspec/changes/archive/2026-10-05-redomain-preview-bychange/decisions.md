---
author: flow-machine-draft
created_at: 2026-10-05T13:09:13.648Z
---
# 决策记录（Decisions）— 2026-10-05-redomain-preview-bychange

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：byChangeD 为空字符串时 `byChangeD || null` 归 null——与既有落盘分支同款归一（非新行为），无新增面。倒推收尾特有风险：接手代码语义理解偏差——diff 仅一行透传 + 一行文案，已逐行核对并实跑其自带 CLI 单测。放弃的方案：无（更深的重构——如把预览/落盘共用一条参数组装路径——超出坑修复面，不动）。
