---
author: flow-machine-draft
created_at: 2026-11-11T23:46:10.339Z
---
# 任务注册表（Tasks）— 2026-11-12-verify-probes-md-facts-refresh

- [x] task-01: writeVerifyFacts 落盘前，若变更目录 verify-result.md 存在，则从 md 重解析并刷新 handover / dbScriptDeclarations / matrixPartialRows 三段（md 为真相源）
- [x] task-02: verify-result.md 不存在时行为与现状完全一致（不产新段）
- [x] task-03: conclusion 段维持现状（解析器在 stage-contract，分层单向不引入反向 import）
- [x] task-04: 新增测试覆盖：md 含移交项表格时重跑命令后 facts.handover 反映 md 内容
