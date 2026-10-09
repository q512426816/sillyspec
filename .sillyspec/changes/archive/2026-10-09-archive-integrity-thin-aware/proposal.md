---
author: flow-machine-draft
created_at: 2026-10-09T00:07:21.418Z
---
# 提案书（Proposal）— 2026-10-09-archive-integrity-thin-aware

## 动机

任务原话转写：D14 归档完整性重扫误报治理：thin 协议归档 plan.md 豁免 + 历史形态账本清账。

动机与背景：
推送时 pre-push advisory 点名 200+ 份归档欠账。普查实证其构成：172 份是 flow-state.yaml 在场的 thin 协议归档（无 plan.md 属契约正常——plan.md 是厚道五阶段 plan 阶段产物；2026-09-29 thin-default 后轻量道成默认路径，误报持续增长）；~24 份双无（pre-plan-约定远古/quick 通道退役形态/纯提案 spike）；3 份任务未勾（pre-2026-08-20 历史形态，完成证据无处回查）。D14 把厚道契约一刀切套全量归档——检查模型漂移，非真欠账。

成功标准：
- detectArchiveIntegrity 增 thin 协议归档判别（flow-state.yaml 在场 → plan.md 在场性要求豁免，注记归档形态）；任务未勾检查不豁免（thin 也要全勾）；厚道（无 flow-state.yaml）plan.md 要求不变
- 测试新增：thin 归档无 plan.md → pass；thin 归档任务未勾 → 仍报（豁免不洗白）
- 豁免账本补录剩余历史形态条目（双无远古/quick 形态/纯提案 spike/未勾三份）——本变更即裁决流程（账本纪律：入账须走变更流程）
- 真图终验：doctor archive_integrity offenders 归零（或仅剩未来新账）；全量测试与 lint 零回归

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. detectArchiveIntegrity 增 thin 协议归档判别（flow-state.yaml 在场 → plan.md 在场性要求豁免，注记归档形态）；任务未勾检查不豁免（thin 也要全勾）；厚道（无 flow-state.yaml）plan.md 要求不变
2. 测试新增：thin 归档无 plan.md → pass；thin 归档任务未勾 → 仍报（豁免不洗白）
3. 豁免账本补录剩余历史形态条目（双无远古/quick 形态/纯提案 spike/未勾三份）——本变更即裁决流程（账本纪律：入账须走变更流程）
4. 真图终验：doctor archive_integrity offenders 归零（或仅剩未来新账）；全量测试与 lint 零回归

## 成功标准（可验证）

1. detectArchiveIntegrity 增 thin 协议归档判别（flow-state.yaml 在场 → plan.md 在场性要求豁免，注记归档形态）；任务未勾检查不豁免（thin 也要全勾）；厚道（无 flow-state.yaml）plan.md 要求不变
2. 测试新增：thin 归档无 plan.md → pass；thin 归档任务未勾 → 仍报（豁免不洗白）
3. 豁免账本补录剩余历史形态条目（双无远古/quick 形态/纯提案 spike/未勾三份）——本变更即裁决流程（账本纪律：入账须走变更流程）
4. 真图终验：doctor archive_integrity offenders 归零（或仅剩未来新账）；全量测试与 lint 零回归
