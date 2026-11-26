---
author: flow-machine-draft
created_at: 2026-11-14T16:09:30.193Z
---
# 提案书（Proposal）— 2026-11-15-scan-audit-domain

## 动机

任务原话转写：修复增量 scan 对账的多项目跨域污染

成功标准：
- 子项目对账只统计本项目责任域内的未归属文件（backend 项目不再把 frontend 等其他项目文件算进 uncovered）
- 单项目仓对账行为不变（multi-agent-platform 根项目仍报 1 未归属）
- 既有 scan-incremental 单测零回归+新增域过滤用例

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 子项目对账只统计本项目责任域内的未归属文件（backend 项目不再把 frontend 等其他项目文件算进 uncovered）
2. 单项目仓对账行为不变（multi-agent-platform 根项目仍报 1 未归属）
3. 既有 scan-incremental 单测零回归+新增域过滤用例

## 成功标准（可验证）

1. 子项目对账只统计本项目责任域内的未归属文件（backend 项目不再把 frontend 等其他项目文件算进 uncovered）
2. 单项目仓对账行为不变（multi-agent-platform 根项目仍报 1 未归属）
3. 既有 scan-incremental 单测零回归+新增域过滤用例
