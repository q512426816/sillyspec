---
author: flow-machine-draft
created_at: 2026-10-09T00:07:21.418Z
---
# 需求规格（Requirements）— 2026-10-09-archive-integrity-thin-aware

## 功能需求

### FR-01: detectArchiveIntegrity 增 thin 协议归档判别（flow-state.yaml 在场 → plan.md 在场性要求豁免，注记归档形态）；任务未勾检查不豁免（thin 也要全勾）；厚道（无 flow-state.yaml）plan.md 要求不变

- detectArchiveIntegrity 对 flow-state.yaml 在场的归档（thin 协议）必须豁免 plan.md 在场性要求（plan.md 是厚道五阶段产物、非 thin 契约面）；任务未勾检查与厚道归档的 plan.md 要求必须零变化。

#### 场景：thin 豁免

- Given fixture：tasks 全勾 + flow-state.yaml + 无 plan.md；When 扫描；Then pass 且零 offender。

### FR-02: 测试新增：thin 归档无 plan.md → pass；thin 归档任务未勾 → 仍报（豁免不洗白）

- 测试必须覆盖：thin 无 plan.md → pass；thin 任务未勾 → 仍报且理由不含 plan.md；pre-epoch（<2026-10-07）thin 未勾占位稿 → pass；post-epoch thin 未勾 → 仍报。

#### 场景：豁免不洗白

- Given thin 归档 tasks 部分勾；When 扫描；Then offender 在场（理由仅未勾）。

### FR-03: 豁免账本补录剩余历史形态条目（双无远古/quick 形态/纯提案 spike/未勾三份）——本变更即裁决流程（账本纪律：入账须走变更流程）

- 实现必须含 THIN_TASKS_EPOCH=2026-10-07 时代规则（2026-10-07-thin-tasks-v3 前 thin 归档 tasks.md 为机器占位稿、完成证据=flow done 六子步——勾选检查豁免；v3 后不豁免）；豁免账本必须补录剩余历史形态条目（双无远古/quick 通道/纯提案 spike/远古未勾/09-10 手写分解/thin-FR 蒸馏接线前窗口五类理由），本变更为裁决流程。

#### 场景：清账终态

- Given 本变更落盘；When 真图 doctor 扫描；Then offenders=0、627 份归档 pass、58 份豁免在案。

### FR-04: 真图终验：doctor archive_integrity offenders 归零（或仅剩未来新账）；全量测试与 lint 零回归

- 全量测试必须绿（test:core）、lint 必须零告警。

#### 场景：回归面

- Given 全部落盘；When 全量测试与 lint；Then 零失败零新告警。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/doctor-archive-integrity.test.mjs「14a thin 归档无 plan.md → pass（flow-state.yaml 在场豁免）」
FR-02: test/doctor-archive-integrity.test.mjs「14b thin 任务未勾 → 仍报（豁免不洗白完成面）」「15a-c thin 勾选契约 epoch 三断言」
FR-03: 真图终验（doctor archive_integrity offenders=0 / 627 pass / 58 豁免）+ 账本 diff 自证（42 条五类理由批量入账）
FR-04: test:core 325 全绿 + npm run lint 零告警（verify-runs 留档）
