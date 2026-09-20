## FR-redlines-001 红线断言评估
变更：2026-09-20-redline-machine-check
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 消费者仓 .sillyspec/redlines.yaml 条目（id/statement/scope/forbid/require/severity/orig；When evaluateRedlines 以 worktree 根求值；Then forbid 命中产出 {id, severity, file, line, snippet} 证据、require 在 scope 全集无命中产出缺失、无效条
最近确认：a17fcab

## FR-redlines-002 机制与内容分离
变更：2026-09-20-redline-machine-check
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given 消费者仓无 redlines.yaml；When verify 探针 11 运行；Then 输出「不适用」一行，verify 其余行为与现状零差异（缺清单零打扰）
最近确认：a17fcab

## FR-redlines-003 探针挂载与健壮性
变更：2026-09-20-redline-machine-check
状态：active
摘要：（无场景名）
场景正文：
- 场景：默认场景 — Given verify-probes 运行；When 探针 11 执行（清单在场/缺失/损坏任意态）；Then fail-open 全链——坏 yaml 不适用+注记、单条求值异常跳过+warn、探针整体异常降级 not-applicable，绝不炸 verify 主链；
最近确认：a17fcab
