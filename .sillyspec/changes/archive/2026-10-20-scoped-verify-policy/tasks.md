---
author: flow-machine-draft
created_at: 2026-10-20T15:29:44.115Z
---
# 任务注册表（Tasks）— 2026-10-20-scoped-verify-policy

- [x] task-01: AGENTS.md 与 templates/agents-instruction.md 规则4同句追加自验口径（两文件一致）
- [x] task-02: run-tests.mjs：--failed 读清单过滤（缺失项 warn、空交集 No test files found）、失败清单落盘/全绿自清、清单路径 SILLYSPEC_TEST_FAILURE_LIST 可覆写
- [x] task-03: 过滤/落盘逻辑提为 test/runner-failure-face.mjs 纯函数模块，新增测试覆盖纯函数+flag E2E（env 指临时清单）
- [x] task-04: 本变更按新口径自验（变更测试面+lint，不跑全量）；lint 绿
