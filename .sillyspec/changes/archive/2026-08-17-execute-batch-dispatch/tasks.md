---
author: qinyi
created_at: 2026-08-17 16:14:16
---

# Tasks — execute 阶段 task 执行 batch 调度

## 任务列表

- [ ] task-01: execute.js buildWavePrompt 调度指令改造——默认独立子代理 + batch 三条件合并（≤3，契约 task 禁止同批）+ 并行铁律与括号注改写 + batch 子代理 prompt 要点（逐 task 实现闭环+报告/不写 review 不勾选/越权即停/主 agent 审查流程）（覆盖：FR-01, FR-02, FR-03, FR-04, FR-05）
- [ ] task-02: execute-dispatch 集成测试新增 batch 调度断言 + 既有断言适配（覆盖：FR-06）
- [ ] task-03: 文档同步——重跑 _extract.mjs、docs/prompt/execute.md 镜像逐字替换、SKILL.md 调度段落核对、stages.md 变更索引追加（覆盖：NFR-01）

## 验收

- npm test 全绿、npm run lint 通过
- execute 派发 prompt 含完整 batch 指导（三条件/上限 3/串行协议/越权即停/并行语义）
- 既有测试断言（派发/worktree/task-review）零回归
