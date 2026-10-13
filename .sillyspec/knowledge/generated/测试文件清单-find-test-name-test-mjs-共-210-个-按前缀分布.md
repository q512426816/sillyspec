---
source: scan/TESTING.md
section: 测试文件清单（`find test -name "*.test.mjs"` 共 210 个，按前缀分布）
generated_at: 2026-10-13T00:36:46.844Z
---

# TESTING — 测试文件清单（`find test -name "*.test.mjs"` 共 210 个，按前缀分布）

**入口与工具（非测试本体）**
- `test/run-tests.mjs` — 测试 runner 入口（`npm test` 调用）
- `test/check-syntax.mjs` — 语法检查入口（`npm run lint` 调用）
- `test/_cli-step-harness.mjs` / `test/_complete-step-harness.mjs` — 共享 harness

**按主题前缀分布（grep 实测 top）**

| 前缀 | 文件数 | 覆盖 |
| --- | --- | --- |
| `worktree-*` | 33 | worktree 创建/apply/cleanup/守卫/native overlay/deps 供给 |
| `platform-*` | 18 | 平台同步（artifacts / recovery / pointer / P0） |
| `run-*` | 16 | runCommand 生命周期 / stage 流转 / dispatch 集成 |
| `quick-*` | 16 | quick 审计 / quicklog / 关联推荐 |
| `stage-*` | 10 | 阶段定义与契约（contract-spec / review） |
| `plan-*` | 9 | plan 动态步骤 / TaskCard / postcheck |
| `scan-*` | 8 | scan postcheck / 路径 / 知识 / 断点续扫 |
| `execute-*` | 7 | execute 步骤 / dispatch 注入 / task review |
| `verify-*` | 6 | verify 对账 / known_failures 豁免 |
| `archive-*` | 5 | 归档流程 |
| 其他（init / docs / cross / change / wait / task / prompt / db / review / dispatch/ …） | 80+ | 入口别名、文档校验、跨阶段、等待门、DB 并发、评审回填、SillyHub dispatch（`test/dispatch/` 3 个：strategy / path-a-probe / execute-dispatch-integration） |