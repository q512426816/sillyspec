---
author: qinyi
created_at: 2026-09-07T06:40:00+08:00
---

# 提案书（Proposal）

## 动机
种子稿 §5 收官：归档时聚合变更 delta（Before/Delta/After）回灌——agent 零参与的纯机器聚合，把前三期散落的对账/探针/决策事实变成随归档保存的一页审计底稿。

## 关键问题
1. 变更做完后「做成了什么」散在 verify-runs/变更目录/知识库多处，归档无一页机器事实汇总
2. scan facts 刷新无模块级关注面提示

## 变更范围
src/archive-delta.js 聚合器（四源 fail-soft + 三段式）+ delta CLI（--json）+ archive 确认步自动生成 + advisory 段 + 测试

## 不在范围内（显式清单）
- 端点 before/after 基线（独立立项）；增量 scan 引擎；knowledge 自动沉淀（decision-distill 已有）

## 成功标准（可验证）
- delta --change 生成三段式 delta.md（四源聚合、缺源降级注记）
- 归档后 delta.md 在 archive/<变更>/ 内（自动生成不阻断归档）
- 存量变更（无 reconcile）apply-pathspec 兜底清单可用
