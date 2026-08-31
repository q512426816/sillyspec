---
id: task-04
title: 新建 docs/sillyspec/interface-contract.md — v1 契约冻结
author: qinyi
created_at: 2026-07-09 19:58:30
priority: P0
depends_on: [task-03]
blocks: [task-08]
allowed_paths:
  - docs/sillyspec/interface-contract.md
expects_from:
  task-01:
    - contract: gate-envelope-json
      needs: [schema_version, command, stage, change, ok, errors, warnings, checks, generated_at]
goal: |
  冻结机器接口 v1 契约文档，作为 SillySpec ↔ SillyHub 两仓库的对账基准（decisions.md D-005@v1）。
implementation: |
  新建 docs/sillyspec/interface-contract.md（头部 author/created_at/updated_at），章节：
  1. 命令面：gate <stage> / derive <facet> 完整用法、参数、facet 枚举
  2. envelope schema v1：顶层固定字段表 + checks 元素结构 + informational 语义 + 各命令 JSON 示例
     （示例以 task-03 完成后的真实 CLI 输出为准，不手编）
  3. 退出码语义表：0/1/2 + daemon 处置建议（design.md §3.5 表）
  4. 副作用声明：只读边界（db 不变）+ verify-test 落盘取证 .runtime/verify-runs/
  5. 慢命令与重复执行：verify-test 时间上界（TEST_TIMEOUT_MS=10min）、gate verify 与
     run --done 各跑一次的行为（D-009@v1），结果复用留 P3
  6. 演进规则：加字段随时；改语义/删字段 bump schema_version 且旧版保留一个 minor 周期
  7. TBD-hub-api 待对账清单：approve/reject 端点路径与 body（sync.js 单点封装位置）
acceptance: |
  - 文档字段/退出码/示例与 task-01~03 实现一致（对照真实 CLI 输出核对）
  - 七个章节齐全，TBD-hub-api 清单明确列出待 SillyHub 对齐项
verify: |
  执行 node bin/sillyspec.js gate/derive --json 取真实输出粘贴为示例；
  task-07 完成后如实现有调整需回校此文档。
constraints: |
  - 只新建此文档；不改代码
  - 示例必须来自真实命令输出，禁止手编 JSON
---

# task-04: interface-contract.md 契约冻结

## 目标

见 frontmatter goal。

## 实现蓝图

见 frontmatter implementation（7 章节）。

## 验收标准

见 frontmatter acceptance（2 条）。

## TDD/验证

见 frontmatter verify。
