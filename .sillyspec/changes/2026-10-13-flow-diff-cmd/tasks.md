---
author: flow-machine-draft
created_at: 2026-10-13T07:49:56.024Z
---
# 任务注册表（Tasks）— 2026-10-13-flow-diff-cmd

- [x] task-01: 测试先行——test/flow-diff-cmd.test.mjs：归档态（scopeAudit 渲染/--json 同构）、活跃态（提交面+dirty+untracked）、错误面（不存在 exit 1/无基线 exit 0/非法名）、零副作用断言；先跑红
- [x] task-02: 实现 cmdFlowDiff（双态渲染+--json）+ dispatcher 分支 + usage 行补 diff；跑新测试全绿
- [x] task-03: 回归——flow 族既有测试零改动全绿 + lint 绿 + 全量 npm test
