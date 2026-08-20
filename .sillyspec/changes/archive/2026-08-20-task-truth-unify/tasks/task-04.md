---
author: qinyi
created_at: 2026-08-20T11:55:00+08:00
id: task-04
title: 契约测试 task-truth-contract.test.mjs
title_zh: 新契约九类测试用例
priority: P0
goal: 新契约双端锁定（校验器拦截语义+机器勾选器+写回保留规则+跨仓聚合）
implementation: 新增 test/task-truth-contract.test.mjs 九类用例（合法/悬空/覆盖缺失/覆盖重复/断档/旧格式指路/勾选驱动续跑/机器勾选器/ql-xxx 保留+坑7 回归）；适配 test/ 下受契约变更影响的既有测试
acceptance: 九类用例全绿；既有受影响测试适配后全绿且无删断言
verify: node test/task-truth-contract.test.mjs && npm test
constraints: 禁止删断言凑绿；测试自研 assert 风格（参照 _cli-step-harness 模式）
depends_on: [task-02]
blocks: [task-06]
allowed_paths:
  - test/task-truth-contract.test.mjs
  - test/
expects_from:
  task-02:
    - contract: validatePlanForExecute
      needs: [ok, errors, tasks, waves]
---

# task-04: 契约测试

## 修改文件（必填）
- 新增 `test/task-truth-contract.test.mjs`
- 适配 test/ 下因契约变更受影响的既有测试（gates/complete/task-review/progress/doctor/taskcard/contract-matrix/plan-postcheck/execute 相关）

## 实现要求
九类用例：
1. 合法新格式通过（tasks.md 注册表 + plan.md Wave ID 引用对账齐）
2. plan.md 引用悬空（ID 不在 tasks.md）→ 拦 + 根因文案
3. Wave 覆盖缺失（tasks.md 任务未被任何 Wave 引用）→ 拦
4. 覆盖重复（一任务多 Wave）→ 拦
5. 编号断档 → 拦
6. 旧格式（plan.md 含 `- [ ] task-XX: 名` checkbox 行）→ 拦 + 指路文案
7. tasks.md 勾选态驱动续跑判定（detectExecuteBatchFinish / Wave 恢复语义）
8. 机器勾选器 autoCheckPlanFromReviews 写 tasks.md（含 .tasks.md.lock 并发锁存在性）
9. ql-xxx 行保留回归（写回规则：plan 展开重写 task-XX 行集合后 quick 挂载行原样）+ 跨仓聚合（shared 坑7）回归

## 验收标准
- [ ] 九类用例全部落地且绿
- [ ] 既有受影响测试适配后全绿（无删断言）
