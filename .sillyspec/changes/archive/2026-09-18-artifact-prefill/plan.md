---
author: qinyi
created_at: 2026-09-19 00:08:00
generated_by: agent
change: 2026-09-18-artifact-prefill
plan_level: light
---

# 实现计划（Plan）

> 任务真相源：tasks.md。全局硬约束：白名单外槽零触碰（D-001）；预填≠结论（注协议 D-003）；已确认不覆盖（D-005）；旧路径零新硬门。

## Wave 1：引擎

- task-01

**执行指引**：NEW:src/prefill.js 三纯函数+注检测+refresh（已确认跳过=注已删）；来源注协议。

## Wave 2：接线与门禁（并行无共享文件：index.js vs gates/probes）

- task-02
- task-03

**执行指引**：task-02 index.js 三接线（design-init 决策表/taskcard ids/prefill-refresh 路由+help）；task-03 gates advisory+verify-probes 归档前注清零 error（探针面）。

## Wave 3：测试与对表附录

- task-04

**执行指引**：NEW:test/prefill.test.mjs 七组断言+定向回归+全量绿；baseline 附录对表数据（D-004）。
