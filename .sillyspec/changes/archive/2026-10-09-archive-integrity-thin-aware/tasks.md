---
author: flow-machine-draft
created_at: 2026-10-09T00:07:21.418Z
---
# 任务注册表（Tasks）— 2026-10-09-archive-integrity-thin-aware

- [x] task-01: detectArchiveIntegrity 增 thin 协议归档判别（flow-state.yaml 在场 → plan.md 在场性要求豁免，注记归档形态）；任务未勾检查不豁免（thin 也要全勾）；厚道（无 flow-state.yaml）plan.md 要求不变
- [x] task-02: 测试新增：thin 归档无 plan.md → pass；thin 归档任务未勾 → 仍报（豁免不洗白）
- [x] task-03: 豁免账本补录剩余历史形态条目（双无远古/quick 形态/纯提案 spike/未勾三份）——本变更即裁决流程（账本纪律：入账须走变更流程）
- [x] task-04: 真图终验：doctor archive_integrity offenders 归零（或仅剩未来新账）；全量测试与 lint 零回归
