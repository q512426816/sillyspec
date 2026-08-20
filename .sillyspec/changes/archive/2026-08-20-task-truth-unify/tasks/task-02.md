---
author: qinyi
created_at: 2026-08-20T11:55:00+08:00
id: task-02
title: 核心契约重构——校验器双文件 + gates 三门 + complete 勾选器
title_zh: 核心契约重构（校验器+三门+机器勾选器）
priority: P0
goal: validatePlanForExecute 双文件契约生效于校验器、gates 三道门、complete 机器勾选器与批量完成检测
implementation: execute.js 重构签名+交叉校验+诊断迁移；gates.js :355 调用方改双参数+三道门源迁移；complete.js autoCheckPlanFromReviews 写 tasks.md（锁 .tasks.md.lock）+detectExecuteBatchFinish 读 tasks.md
acceptance: 四类拦截（悬空/覆盖缺失/覆盖重复/断档）+旧格式指路生效；gates plan 门禁既有测试适配全绿；勾选器写 tasks.md 持锁
verify: node test/ 跑 plan 门禁与 complete 相关既有测试；task-04 落地后九类契约用例
constraints: 原子改造（提示词与解析器同批）；不破坏 light/none 级路径
depends_on: [task-01]
blocks: [task-03, task-04, task-05]
allowed_paths:
  - src/stages/execute.js
  - src/run/gates.js
  - src/run/complete.js
provides:
  - contract: validatePlanForExecute
    fields: [tasksContent, planContent, ok, errors, warnings, tasks, waves, model, dependsOn]
---

# task-02: 核心契约重构

## 修改文件（必填）
- 修改 `src/stages/execute.js`：validatePlanForExecute 双文件签名（tasksContent, planContent）→ { ok, errors, warnings, tasks[{id,name,done,model,dependsOn}], waves[{name,taskIds}] }；交叉校验（ID 存在性/Wave 覆盖恰一次/编号连续）；诊断函数（:389-416）迁移为三类根因（tasks.md 无 checkbox / Wave 段无 ID 引用 / ID 悬空）+ 可照抄新格式示例；旧格式（plan.md 含任务名 checkbox）报错指路
- 修改 `src/run/gates.js`：:355 唯一运行时调用方改双参数（读两文件传入）；extractTaskIdsFromPlan / isCurrentWaveAllNoDepsVerify / enforceReviewJsonGate 三道门的任务符号与勾选态来源改 tasks.md（Wave 结构仍取 plan.md ID 引用行）
- 修改 `src/run/complete.js`：autoCheckPlanFromReviews（:635-690）勾选写入目标 plan.md→tasks.md（正则适配新行格式，锁文件 .plan.md.lock→.tasks.md.lock）；detectExecuteBatchFinish（:695-723）读 tasks.md 已勾行

## 实现要求
1. 新契约格式：tasks.md 行 `- [ ] task-XX: 名称 [model:xxx] (depends_on: task-01,02)`；plan.md Wave 行 `- task-XX`（纯 ID，无 checkbox 无名）
2. [model:xxx] 解析随注册表迁入（原 execute.js:208 提示词语义保持）
3. depends_on 行内标注解析归 tasks.md 侧（contract-matrix 方式2 由 task-03 迁移，本任务只定解析函数）

## 验收标准
- [ ] 双文件校验四类拦截（悬空/覆盖缺失/覆盖重复/断档）+ 旧格式指路均生效
- [ ] gates.js plan 完成门禁走新签名无回归（既有 plan 门禁测试适配后全绿）
- [ ] complete.js 机器勾选器写 tasks.md 且持锁（.tasks.md.lock）
- [ ] detectExecuteBatchFinish 按 tasks.md 勾选态判定
