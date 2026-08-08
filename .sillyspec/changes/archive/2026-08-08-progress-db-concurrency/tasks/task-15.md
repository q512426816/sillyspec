---
id: task-15
title: 新增 db-concurrency.test.mjs——多进程并发写同一 db 断言无 lost update（AC-01/G1 验收）。完成标准：确定性压力测试通过。
title_zh: 新增多进程并发写不 lost update 回归测试（G1/AC-01 实证）
author: qinyi
created_at: 2026-08-09 00:32:15
priority: P0
depends_on: [task-05]
blocks: []
requirement_ids: [AC-01, NFR-01]
decision_ids: [D-01]
allowed_paths:
  - test/db-concurrency.test.mjs
goal: >
  新增多进程并发写同一 db 的确定性压力回归测试，证明 better-sqlite3 WAL 下无整库
  lost update，作为 G1 验收（AC-01）的实证。
implementation:
  - 在 test/ 下新建 db-concurrency.test.mjs，遵循 run-tests.mjs 自动收集风格（自建 tmp 夹具 + 断言计数 + process.exit(1)）
  - 用 node:child_process spawn 或 fork N 个子进程（如 8 个），各持独立 better-sqlite3 连接对同一 db 的同一计数器做多次原子自增（UPDATE 语句），互不读对方快照
  - 主进程 await 全部子进程退出后，断言最终计数等于期望总数（无 lost update），WAL + busy_timeout + task-05 的 SQLITE_BUSY 重试共同保证
  - 确定性构造：固定进程数与自增次数，每轮完成后清理 tmp 与 .db-wal/.db-shm 侧车，失败重试隔离 flaky（R-07）
acceptance:
  - N 进程并发自增后最终计数等于期望总数，无 lost update（G1/AC-01）
  - 子进程并发写期间不抛 SQLITE_BUSY 崩溃（task-05 有限重试兜底生效，R-08 覆盖）
  - npm test -- test/db-concurrency.test.mjs 退出码 0，可独立跑通
  - R-07 flaky 已隔离：连跑/重跑稳定，失败可归因非竞态偶发
  - 不改动 src/ 源码（纯新增测试，验证 task-01~05 已落地的 WAL 行为）
verify:
  - npm test -- test/db-concurrency.test.mjs
constraints:
  - 只新增 test/db-concurrency.test.mjs，不改 src/ 与既有测试（存量测试改写归 task-14）
  - 依赖 task-05 的 SQLITE_BUSY 重试逻辑就位后本测试才有意义（depends_on）
  - 确定性构造（固定进程数/次数 + 重试隔离）减少 flaky（R-07），避免竞态偶发误报
  - 断言用最终一致计数，不断言中间瞬时值（WAL 单写串行 + busy 重试语义）
  - 兼容 Windows/Linux/macOS：路径用 join/绝对路径，spawn 不依赖 shell 特定语法
related_tests: []
---
