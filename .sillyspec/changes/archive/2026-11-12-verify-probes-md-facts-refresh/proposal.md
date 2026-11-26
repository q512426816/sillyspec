---
author: flow-machine-draft
created_at: 2026-11-11T23:46:10.339Z
---
# 提案书（Proposal）— 2026-11-12-verify-probes-md-facts-refresh

## 动机

任务原话转写：verify-probes 落盘时刷新 md 派生段
动机：gate verify 对 facts.handover 等 md 派生字段的拦截提示写「重跑 verify-probes 幂等刷新 facts 即可消解」，但实际该命令只保留旧段不产出新段（产出唯一入口是 gates verify 收尾的 backfill）——提示与行为不符，2026-11-11-workspace-ia-redesign 实证重跑无效只能靠 --done 回填。
成功标准：
- writeVerifyFacts 落盘前，若变更目录 verify-result.md 存在，则从 md 重解析并刷新 handover / dbScriptDeclarations / matrixPartialRows 三段（md 为真相源）
- verify-result.md 不存在时行为与现状完全一致（不产新段）
- conclusion 段维持现状（解析器在 stage-contract，分层单向不引入反向 import）
- 新增测试覆盖：md 含移交项表格时重跑命令后 facts.handover 反映 md 内容

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. writeVerifyFacts 落盘前，若变更目录 verify-result.md 存在，则从 md 重解析并刷新 handover / dbScriptDeclarations / matrixPartialRows 三段（md 为真相源）
2. verify-result.md 不存在时行为与现状完全一致（不产新段）
3. conclusion 段维持现状（解析器在 stage-contract，分层单向不引入反向 import）
4. 新增测试覆盖：md 含移交项表格时重跑命令后 facts.handover 反映 md 内容

## 成功标准（可验证）

1. writeVerifyFacts 落盘前，若变更目录 verify-result.md 存在，则从 md 重解析并刷新 handover / dbScriptDeclarations / matrixPartialRows 三段（md 为真相源）
2. verify-result.md 不存在时行为与现状完全一致（不产新段）
3. conclusion 段维持现状（解析器在 stage-contract，分层单向不引入反向 import）
4. 新增测试覆盖：md 含移交项表格时重跑命令后 facts.handover 反映 md 内容
