---
author: zcode-redline-framework
created_at: 2026-09-19 16:16:50
generated_by: sillyspec-fourpiece-init
change: 2026-09-20-redline-machine-check
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 消费者仓维护者 | 在自己仓的 .sillyspec/redlines.yaml 维护红线断言 |
| 执行 agent | verify 期读探针 11 结论，在 verify-result 裁定 |

## 功能需求

### FR-01: 红线断言评估
Given 消费者仓 .sillyspec/redlines.yaml 条目（id/statement/scope/forbid/require/severity/origin）
When evaluateRedlines 以 worktree 根求值
Then forbid 命中产出 {id, severity, file, line, snippet} 证据、require 在 scope 全集无命中产出缺失、无效条目（缺id/缺scope/forbid与require全空/坏正则）跳过并 warnings 留痕

### FR-02: 机制与内容分离
Given 消费者仓无 redlines.yaml
When verify 探针 11 运行
Then 输出「不适用」一行，verify 其余行为与现状零差异（缺清单零打扰）

### FR-03: 探针挂载与健壮性
Given verify-probes 运行
When 探针 11 执行（清单在场/缺失/损坏任意态）
Then fail-open 全链——坏 yaml 不适用+注记、单条求值异常跳过+warn、探针整体异常降级 not-applicable，绝不炸 verify 主链；severity 驱动渲染标记（error→❌ / warning→⚠️ / require 缺失恒 ⚠️）

## 非功能需求
- 兼容性：探针 1-10 渲染序不变；verify-facts schema 零改动
- 可测性：评估器纯函数（root 注入），夹具零 mock

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 正则断言四件套 |
| D-002@v1 | FR-02 | 清单自持缺省不适用 |
| D-003@v1 | FR-03 | advisory 挂载 |
| D-004@v1 | FR-03 | fail-open |
