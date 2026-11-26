---
author: flow-machine-draft
created_at: 2026-11-26T00:16:56.841Z
---
# 提案书（Proposal）— 2026-11-26-verify-skip-switch

## 动机

任务原话转写：验证阶段加跳过开关先止血

动机：verify 阶段历史归档 787 份报告、约 4.4MB 产物，结论几乎全为 PASS WITH NOTES 且零 FAIL，friction-ledger 无拦截账；轮均成本约为 brainstorm 段 3-4 倍。用户判定其无实际拦截价值，要求先关停。本变更只加配置开关与跳过留痕，不改阶段壳、不动 26 个消费面，删壳另案。

成功标准：
- local.yaml 配置 verify.mode: skip 时，run verify 不渲染 7 步提示词、不产出 verify-result.md 与 verify-facts.json，并打印跳过留痕
- 缺省未配置时，run verify 行为与现状逐字一致
- skip 模式下 archive 不因 verify-facts.json 缺失被 fail-closed 拦下
- 新增开关的单元测试覆盖 skip/full 两态

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. local.yaml 配置 verify.mode: skip 时，run verify 不渲染 7 步提示词、不产出 verify-result.md 与 verify-facts.json，并打印跳过留痕
2. 缺省未配置时，run verify 行为与现状逐字一致
3. skip 模式下 archive 不因 verify-facts.json 缺失被 fail-closed 拦下
4. 新增开关的单元测试覆盖 skip/full 两态

## 成功标准（可验证）

1. local.yaml 配置 verify.mode: skip 时，run verify 不渲染 7 步提示词、不产出 verify-result.md 与 verify-facts.json，并打印跳过留痕
2. 缺省未配置时，run verify 行为与现状逐字一致
3. skip 模式下 archive 不因 verify-facts.json 缺失被 fail-closed 拦下
4. 新增开关的单元测试覆盖 skip/full 两态
