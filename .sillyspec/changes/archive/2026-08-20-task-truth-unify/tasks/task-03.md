---
author: qinyi
created_at: 2026-08-20T11:55:00+08:00
id: task-03
title: 其余九处机器消费点迁移
title_zh: 九处机器消费点迁移至 tasks.md 源
priority: P0
goal: 九处消费点全部以 tasks.md 为任务注册表唯一源（Wave 结构仍取 plan.md ID 引用）
implementation: 按 task-01 审计清单逐项迁移 task-review/progress/doctor-diagnostics/taskcard/contract-matrix/run-prompt/shared/plan-postcheck/plan.js 解析函数
acceptance: 九处迁移完成，各文件既有测试适配后全绿（无删断言）
verify: 逐文件跑对应既有测试（npm test 全量兜底在 task-06）
constraints: 禁止清单外顺手改；depends_on 解析归 tasks.md 行内（方式1 总表列保留兜底）
depends_on: [task-02]
blocks: [task-06]
allowed_paths:
  - src/task-review.js
  - src/progress.js
  - src/doctor-diagnostics.js
  - src/taskcard.js
  - src/contract-matrix.js
  - src/run/prompt.js
  - src/run/shared.js
  - src/stages/plan-postcheck.js
  - src/stages/plan.js
expects_from:
  task-02:
    - contract: validatePlanForExecute
      needs: [tasks, waves, dependsOn]
---

# task-03: 其余九处机器消费点迁移

## 修改文件（必填）
- `src/task-review.js`：parseTaskIdsFromPlan / countPlanCheckboxes 迁 tasks.md（archive 完成度源）
- `src/progress.js`：readPlanCheckboxStatus + alignExecuteToPlan 改 tasks.md 唯一源（doctor --align-execute-progress 语义保持；废除 plan.md 优先回退）
- `src/doctor-diagnostics.js`：D5 execute-progress 维度适配新源
- `src/taskcard.js`：任务名源从 plan.js parseTaskNames 迁 tasks.md
- `src/contract-matrix.js`：parseTaskDependencies 方式2 改读 tasks.md 行内 (depends_on: …)；方式1（plan.md 任务总表依赖列）保留兜底
- `src/run/prompt.js`：knowledge 匹配任务名源改 tasks.md
- `src/run/shared.js`：坑7 兼扫分支按新形态复核适配（plan.md 无 checkbox 行后的聚合路径）
- `src/stages/plan-postcheck.js`：三道校验器中 plan.md checkbox 解析分支适配新契约
- `src/stages/plan.js`：parseTaskCount / parseTaskNames 迁 tasks.md 源（模板改造归 task-05）

## 实现要求
1. 以 task-01 审计清单为准逐项迁移，禁止清单外顺手改
2. Wave 结构类读取（如 plan-postcheck 对账）保持取 plan.md ID 引用行
3. 每处迁移跑其对应既有测试，适配断言但不删断言

## 验收标准
- [ ] 九处全部以 tasks.md 为任务注册表唯一源
- [ ] 各文件既有测试适配后全绿
- [ ] task-01 清单中本任务范围项逐项勾对
