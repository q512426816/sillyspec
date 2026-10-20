---
author: flow-machine-draft
created_at: 2026-10-20T15:29:44.115Z
---
# 提案书（Proposal）— 2026-10-20-scoped-verify-policy

## 动机

任务原话转写：用户裁决（工具侧钉口径，不靠 agent 自觉）：每变更收口手跑全量测试是重复保险费（实测 3.5-5 分钟/次，一变更 2-3 次），且长输出被吞后失败定位需整体重跑。工具侧两处：①AGENTS 模板+本仓 AGENTS 规则4增自验口径句（自验=变更测试面+lint 即收口证据；全量归 pre-push 勿每变更重复手跑；共享仓全量红先归属判别；跑批输出落日志回看尾部勿吞）——随 init 传播所有用仓；②run-tests.mjs 失败面机制：失败清单落盘 .sillyspec/.runtime/test-last-failures.txt（env 可覆写路径防并行互踩）、--failed 只重跑失败面、全绿自清、缺失项 warn；过滤逻辑提纯函数模块。

成功标准：
- AGENTS.md 与 templates/agents-instruction.md 规则4同句追加自验口径（两文件一致）
- run-tests.mjs：--failed 读清单过滤（缺失项 warn、空交集 No test files found）、失败清单落盘/全绿自清、清单路径 SILLYSPEC_TEST_FAILURE_LIST 可覆写
- 过滤/落盘逻辑提为 test/runner-failure-face.mjs 纯函数模块，新增测试覆盖纯函数+flag E2E（env 指临时清单）
- 本变更按新口径自验（变更测试面+lint，不跑全量）；lint 绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. AGENTS.md 与 templates/agents-instruction.md 规则4同句追加自验口径（两文件一致）
2. run-tests.mjs：--failed 读清单过滤（缺失项 warn、空交集 No test files found）、失败清单落盘/全绿自清、清单路径 SILLYSPEC_TEST_FAILURE_LIST 可覆写
3. 过滤/落盘逻辑提为 test/runner-failure-face.mjs 纯函数模块，新增测试覆盖纯函数+flag E2E（env 指临时清单）
4. 本变更按新口径自验（变更测试面+lint，不跑全量）；lint 绿

## 成功标准（可验证）

1. AGENTS.md 与 templates/agents-instruction.md 规则4同句追加自验口径（两文件一致）
2. run-tests.mjs：--failed 读清单过滤（缺失项 warn、空交集 No test files found）、失败清单落盘/全绿自清、清单路径 SILLYSPEC_TEST_FAILURE_LIST 可覆写
3. 过滤/落盘逻辑提为 test/runner-failure-face.mjs 纯函数模块，新增测试覆盖纯函数+flag E2E（env 指临时清单）
4. 本变更按新口径自验（变更测试面+lint，不跑全量）；lint 绿
