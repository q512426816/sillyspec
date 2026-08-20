---
author: qinyi
created_at: 2026-08-20T11:55:00+08:00
id: task-01
title: 契约点全量审计清单化
title_zh: 契约点全量审计清单化
priority: P1
goal: 复核设计点名的 10+ 机器消费/写入点并清单化，作为 task-02/03 实施范围与 task-06 验收基准
implementation: 以 design.md Wave 1.1 为基准在 src/ 全量 grep（- \[ \] task- / task-\d+ / checkbox / 勾选 / parseTaskNames / readPlanCheckbox），行号以函数名+行号双锚定核漂移，补查新增点，结果写入本卡「审计结果」节
acceptance: 清单覆盖全部点名点+grep 新增点，每点含文件/函数/行号/读写方向/迁移判定
verify: node -e 抽查清单行号与当前源码一致（函数名锚定）；清单交 task-02/03/06 消费
constraints: 分析型任务不改 src/；唯一产出为本卡审计结果节
depends_on: []
blocks: [task-02]
allowed_paths:
  - .sillyspec/changes/2026-08-20-task-truth-unify/tasks/task-01.md
---

# task-01: 契约点全量审计清单化

## 修改文件（必填）
- 本卡片「审计结果」节（分析型任务，唯一产出是清单本身）

## 实现要求
1. 以 design.md「Wave 1.1 契约点清单」为基准（独立审查两轮核实），在 src/ 全量 grep 复核：`- \[ \] task-`、`task-\d+`、checkbox、勾选、parseTaskNames、readPlanCheckbox 等模式
2. 逐点核实行号漂移（审查自报行号与当前源码的偏移，以函数名+行号双锚定）
3. 补查清单外新发现的消费/写入点（如有）
4. 审计结果写入本卡片「审计结果」节，作为 task-02/03 的实施范围与 task-06 的验收基准

## 验收标准
- [ ] 清单覆盖 design Wave 1.1 全部点名点 + grep 复核新增点
- [ ] 每点含：文件、函数名、当前行号、读/写方向、迁移判定（改 tasks.md 源 / 保持 plan.md Wave 结构 / 不动）

## 审计结果（2026-08-20 12:35 实测锚定，主仓=worktree 起点）

### A. 机器读/写点（task-02/03 实施清单）

| # | 文件:行 | 函数/模式 | 方向 | 迁移判定 | 归属 |
|---|---|---|---|---|---|
| 1 | src/stages/execute.js:16 | validatePlanForExecute(planContent) | 读 plan.md | 双文件签名重构 | task-02 |
| 2 | src/stages/execute.js:395 | diagnoseNoTaskRootCause（:399 hasCheckboxTask 正则） | 读 plan.md | 三类根因诊断迁移 | task-02 |
| 3 | src/stages/execute.js:424 | parseWavesFromPlan（:456 checkbox 收容正则） | 读 plan.md | Wave 段改 ID 引用行解析 | task-02 |
| 4 | src/stages/execute.js:617-627 | buildWavePrompt 读 plan.md | 读 plan.md | 保持（Wave 结构源=plan.md ID 引用） | task-02 复核 |
| 5 | src/stages/execute.js:975 | buildExecuteSteps 调 parseWavesFromPlan | 间接 | 随 #3 | task-02 |
| 6 | src/run/gates.js:36 | extractTaskIdsFromPlan | 读 plan.md | 任务符号源改 tasks.md | task-02 |
| 7 | src/run/gates.js:97 | isCurrentWaveAllNoDepsVerify | 读 Wave checkbox | 勾选态源改 tasks.md（Wave 结构留 plan） | task-02 |
| 8 | src/run/gates.js:177 | enforceReviewJsonGate | 读已勾 [x] | 勾选态源改 tasks.md | task-02 |
| 9 | src/run/gates.js:352-355 | validatePlanForExecute 唯一运行时调用（动态 import） | 调用 | 改双参数 | task-02 |
| 10 | src/run/complete.js:635 | autoCheckPlanFromReviews（:664 .plan.md.lock、[ ]→[x] 正则） | **写** plan.md | 写入目标迁 tasks.md（.tasks.md.lock） | task-02 |
| 11 | src/run/complete.js:706 | detectExecuteBatchFinish | 读 plan.md 已勾 | 读 tasks.md | task-02 |
| 12 | src/task-review.js:56/:70/:101 | parseTaskIdsFromPlan / countPlanCheckboxes / summarizeTaskCompletion | 读 plan.md | 完成度源迁 tasks.md | task-03 |
| 13 | src/progress.js:1020/:1059/:1077 | readPlanCheckboxStatus / alignExecuteToPlan（plan 优先回退） | 读 | 改 tasks.md 唯一源 | task-03 |
| 14 | src/doctor-diagnostics.js:491 | readPlanCheckboxStatus（独立审查漏列的第二个同名函数，D5 用） | 读 | 同上（grep 新发现 ✓） | task-03 |
| 15 | src/taskcard.js:106-107 | 读 plan.md + parseTaskNames | 读 | 任务名源迁 tasks.md | task-03 |
| 16 | src/contract-matrix.js:107 | parseTaskDependencies（方式2 行内 depends_on） | 读 plan.md | 改读 tasks.md 行内标注；方式1 总表列兜底 | task-03 |
| 17 | src/run/prompt.js:423-428 | knowledge 匹配 taskLines 正则 | 读 plan.md | 任务名源迁 tasks.md | task-03 |
| 18 | src/run/shared.js:1169-1248 | 坑7 兼扫 tasks/task-NN.md 兜底聚合 | 读 | 复核：plan.md 无 checkbox 后本兜底从「边缘」变「主路径」之一，正则不依赖 checkbox 形态、无需改，加回归测试 | task-03 |
| 19 | src/stages/plan-postcheck.js:347/:458-484/:1038/:1265-1272 | task checkbox 对账正则（declaredIds/Wave 段归集） | 读 plan.md | 对账对象改「tasks.md 注册表 × plan.md ID 引用」 | task-03 |
| 20 | src/stages/plan.js:566/:576 | parseTaskCount / parseTaskNames | 读 plan.md | 源迁 tasks.md | task-03 |

### B. 提示词侧（task-05）：brainstorm.js:540、brainstorm-auto.js:214/:220、plan.js 模板区（:131-263）、execute.js:137/:858/:877/:892-893/:922、verify.js:101、archive.js:10-18/:130

### C. 不动项（正交/读侧自动正确）：status.js:29（X/Y 展示）、complete-handlers.js:983 isChangeTasksComplete（quick 全勾判定）、quicklog.js ql-xxx append/check

### 审计结论
- grep 复核新增发现 1 处：doctor-diagnostics.js:491 第二个 readPlanCheckboxStatus（独立审查只点了 progress.js 的同名函数）。
- 行号修正：审查自报 gates.js:38/:109/:169-172 → 实测 :36/:97/:177；task-review.js:58/:68 → :56/:70。
- 设计 Wave 1.1 清单全部命中，无第三类暗角（src/ 全量 grep task-\d+/checkbox/parse* 无清单外机器点；status/quicklog/complete-handlers 属 C 类不动项）。

