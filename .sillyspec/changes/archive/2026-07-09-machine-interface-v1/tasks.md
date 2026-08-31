---
author: qinyi
created_at: 2026-07-09 19:53:30
---

# 任务清单（Tasks）

> 细节在 plan 阶段展开，此处只列任务名。

- [ ] task-01: 新建 src/machine-interface.js — gate 命令实现（envelope、退出码映射、checks 聚合、只读约束、异常兜底）
- [ ] task-02: machine-interface.js — derive 四个 facet 实现
- [ ] task-03: src/index.js 路由 gate/derive 子命令 + usage 文本
- [ ] task-04: 新建 docs/sillyspec/interface-contract.md（v1 契约冻结，含慢命令与 TBD-hub-api 章节）
- [ ] task-05: src/sync.js 实现 platform approve/reject（HTTP + approvals 表更新）+ index.js 接线
- [ ] task-06: src/run.js 两处 saveWorkflowRun 透传 runtimeRoot/scanRunId
- [ ] task-07: 新增 test/machine-interface.test.mjs（覆盖 9 条验收标准，含只读性 hash 断言与 gate/completeStep 一致性样例）
- [ ] task-08: 同步 file-lifecycle 文档（file-lifecycle.md、known-implementation-gaps.md、platform-workflows-sync.md）
