---
author: qinyi
created_at: 2026-09-15 01:05:00
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
自维护税不可见：摩擦数据随 tally consume 即删无幸存历史；决策无故障面/退役判据字段——机制落地没人被迫写「它引入什么失败模式、什么信号该简化它」。

## 关键问题
1. 17 批摩擦修复史无结构化记录，「哪个机制群税重」靠回忆。
2. 「优先删机制而非修机制」判断律无落点（无退役判据锚）。
3. dogfood 实证：acceptance-matrix D-001 写入的两字段被 distill 静默丢弃。

## 变更范围
字段链（三处模板+distill 双触点+软警告）/ 台账（consume 侧 merge-by-change+prune 兜底）/ doctor 税面维度。

## 不在范围内（显式清单）
- 不做模块级摩擦归因、不做 QUICKLOG 文本挖掘、不做字段硬必填、不动 tally 埋点

## 成功标准（可验证）
- 新 architecture 决策字段端到端进 knowledge/decisions；缺字段软警告可见
- 归档后摩擦历史在台账可查、doctor 渲染聚合与阈值
- 存量零迁移、全量测试 0 fail
