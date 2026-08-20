---
created_at: 2026-05-13T08:38:50+08:00
author: qinyi
source_commit: 4401b3d
updated_at: 2026-08-16T19:30:00+08:00
generator: sillyspec-scan
---

# TESTING

## 测试命令

| 命令 | 用途 | 实际执行 |
| --- | --- | --- |
| `npm test` | 跑全部测试 | `node test/run-tests.mjs` |
| `npm run lint` | 语法检查 | `node test/check-syntax.mjs` |

`npm test` 不依赖任何第三方测试框架，由 `test/run-tests.mjs` 自实现 runner：

- 递归收集 `test/` 下所有 `*.test.mjs`（含子目录如 `test/dispatch/`，210 个测试文件）；
- 每个文件用 `execFile` 独立子进程执行，单文件超时 120 秒；
- **并发池**执行：`CONCURRENCY = max(4, min(12, os.cpus().length))`，完成一个补一个，带进度输出锁防并行打印交错；
- 套件前后清理 HOME 指针污染（`~/.sillyspec-platform.json` / `~/.sillyspec-platform-managed`——测试可能把全局指针写到 HOME，不清理会污染用户真实环境）。

`npm run lint` 同样不依赖 ESLint/JSHint，`test/check-syntax.mjs` 递归遍历 `src/` 目录所有 `.js/.cjs/.mjs` 文件，对每个调用 `node --check` 做纯语法校验（不解析语义、不做风格规则）。

## pre-push 三道关

`.husky/pre-push` 依次跑：`npm run lint` → `npm test` → `node bin/sillyspec.js docs gate`（文档引用 ratchet 门：docs check 失效数 ≤ 基线 `.sillyspec/docs-check-baseline` 放行，超基线拦；基线缺失 fail-closed exit 2）。任何一道失败 abort push，**禁止跳过 hook 提交**。

## 测试框架

- 原生 `node:test`（`describe` / `it`）— 约 22 个文件显式使用（含 `test/contract-artifacts.test.mjs`、`test/dispatch/*.test.mjs` 等）
- 原生 `node:assert/strict` — 多个文件直接引入
- 其余测试文件使用自定义 `assertEqual` / `assertThrows` 等内联断言函数，未统一抽象为共享 util
- 两个共享测试 harness：`test/_cli-step-harness.mjs` / `test/_complete-step-harness.mjs`（run-complete-step 簇迁移模式：seed-real-steps 起 CLI 子进程验证）

## 测试文件清单（`find test -name "*.test.mjs"` 共 210 个，按前缀分布）

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

## 特色机制

- **doc-ref-check 接入 npm test**：`test/doc-ref-check.test.mjs` 被 runner 自动收集，对白名单文档（`docs/sillyspec/platform-interface-map.md` 等）跑 docs-check 行号引用校验——改源码导致行号漂移会直接红测试。
- **known_failures 预存豁免**（`src/verify-postcheck.js:248` `extractKnownFailures` + `test/verify-postcheck-known-failures.test.mjs`）：local.yaml 可声明 `known_failures: [...]` 豁免清单，verify 对账时预存失败不阻断，但豁免 0 命中会强制人工出口（防豁免清单烂尾）。
- **CLI 子进程验证模式**：run-complete-step 簇测试不 mock 内部函数，而是 seed 真实步骤数据后起 CLI 子进程验证等价性（两路等价测试用 `--spec-dir` 钉死隔离，避免 Windows 文件锁 flaky）。
- **HOME 指针清理**：runner 入口即清 HOME 指针污染（见上），兜底所有测试。

## 覆盖范围

- **阶段流转**：brainstorm / plan / execute / verify / archive / scan / status / doctor / quick 各阶段的契约、产物校验、失败分支
- **worktree 子系统**：创建 / apply / cleanup / native overlay / deps junction 供给 / 并发冲突恢复，覆盖最密（33 文件）
- **平台同步**：sync 链路（artifacts / recovery / recovery-chain / scan-p0 / pointer）完整正向 + 失败样本
- **dispatch 抽象**：策略两分支 mock probe、路径 A 探测、execute 集成
- **入口 CLI**：顶层命令别名解析、`--json`、机器接口

## 运行方式

```
npm test          # 跑全部 210 个测试文件（并发 4~12），逐个打印结果汇总
npm run lint      # 仅对 src/ 做语法检查，不跑逻辑
node test/<name>.test.mjs   # 单跑一个测试文件（调试用）
```

CI 未配置（仓库内无 `.github/workflows`），测试靠本地执行 + `.husky/pre-push` 三道关拦截。
