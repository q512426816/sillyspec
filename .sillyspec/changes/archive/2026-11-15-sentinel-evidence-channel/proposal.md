---
author: flow-machine-draft
created_at: 2026-11-15T00:05:28.922Z
---
# 提案书（Proposal）— 2026-11-15-sentinel-evidence-channel

## 动机

任务原话转写：修复哨兵 review 证据通道死代码并增轻量道第三通道

成功标准：
- listReviewEvidence 扫描路径修正（现扫 changes/.runtime 错位一级，真实 execute-runs 在 specBase/.runtime——通道从未生效）
- 增认变更目录 review.json 文本含 task id 作为第三证据通道（轻量道收口产物即证据）
- 既有 sentinel 测试 11 用例零回归+新增用例覆盖两通道

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. listReviewEvidence 扫描路径修正（现扫 changes/.runtime 错位一级，真实 execute-runs 在 specBase/.runtime——通道从未生效）
2. 增认变更目录 review.json 文本含 task id 作为第三证据通道（轻量道收口产物即证据）
3. 既有 sentinel 测试 11 用例零回归+新增用例覆盖两通道

## 成功标准（可验证）

1. listReviewEvidence 扫描路径修正（现扫 changes/.runtime 错位一级，真实 execute-runs 在 specBase/.runtime——通道从未生效）
2. 增认变更目录 review.json 文本含 task id 作为第三证据通道（轻量道收口产物即证据）
3. 既有 sentinel 测试 11 用例零回归+新增用例覆盖两通道
