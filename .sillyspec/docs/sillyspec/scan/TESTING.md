---
created_at: 2026-05-13T08:38:50+08:00
author: qinyi
source_commit: 850b485
updated_at: 2026-06-24T10:18:40+08:00
generator: sillyspec-scan
---

# TESTING

## 测试命令

| 命令 | 用途 | 实际执行 |
| --- | --- | --- |
| `npm test` | 跑全部测试 | `node test/run-tests.mjs` |
| `npm run lint` | 语法检查 | `node test/check-syntax.mjs` |

`npm test` 不依赖任何第三方测试框架，由 `test/run-tests.mjs` 自实现 runner：扫描 `test/` 下所有 `*.test.mjs`，对每个文件用 `execFileSync` 独立子进程执行，单文件超时 120 秒，逐个累加 passed/failed 计数并打印结果。

`npm run lint` 同样不依赖 ESLint/JSHint，`test/check-syntax.mjs` 递归遍历 `src/` 目录所有 `.js/.cjs/.mjs` 文件，对每个调用 `node --check` 做纯语法校验（不解析语义、不做风格规则）。

## 测试框架

- 原生 `node:test`（`describe` / `it`）— 仅 `test/contract-artifacts.test.mjs` 显式使用
- 原生 `node:assert/strict` — `test/stage-definitions.test.mjs`、`test/worktree-guard.test.mjs`、`test/contract-artifacts.test.mjs` 等少量文件直接引入
- 多数测试文件使用自定义 `assertEqual` / `assertThrows` 等内联断言函数，未统一抽象为共享 util

## 测试文件清单（`ls test/*.mjs` 共 30 个，其中 28 个为测试本体）

**入口与工具（2 个，非测试本体）**
- `test/run-tests.mjs` — 测试 runner 入口（`npm test` 调用）
- `test/check-syntax.mjs` — 语法检查入口（`npm run lint` 调用）

**阶段契约与定义（6 个）**
- `test/stage-definitions.test.mjs` — 阶段定义完整性
- `test/stage-contract.test.mjs` — 阶段契约基础校验
- `test/stage-contract-failed-post-check.test.mjs` — 失败 post-check 路径
- `test/brainstorm-plan-contract.test.mjs` — brainstorm → plan 契约
- `test/plan-execute-contract.test.mjs` — plan → execute 契约
- `test/contract-artifacts.test.mjs` — 产物契约（唯一使用 `node:test` describe/it）

**scan 阶段（9 个）**
- `test/scan-paths.test.mjs`
- `test/scan-knowledge.test.mjs`
- `test/scan-postcheck.test.mjs`
- `test/scan-postcheck-project-priority.test.mjs`
- `test/scan-workflow-anyfailed-block.test.mjs`
- `test/scan-docs-yaml-placeholders.test.mjs`
- `test/run-scan-project-parse.test.mjs`
- `test/run-scan-postcheck-fail.test.mjs`
- `test/run-sanitize-project-name.test.mjs`

**平台 / platform 同步（6 个）**
- `test/platform-artifacts.test.mjs`
- `test/platform-failure-samples.test.mjs`
- `test/platform-recovery.test.mjs`
- `test/platform-recovery-chain.test.mjs`
- `test/platform-scan-p0.test.mjs`
- `test/knowledge-match.test.mjs`

**worktree 与隔离（2 个）**
- `test/worktree-guard.test.mjs`
- `test/worktree-native-overlay.test.mjs`

**门禁与杂项（5 个）**
- `test/wait-gates.test.mjs` — 阶段门禁等待
- `test/workflow-spec-base.test.mjs` — workflow 基线
- `test/spec-dir.test.mjs` — spec 目录结构
- `test/cli-top-level-aliases.test.mjs` — CLI 顶层别名
- `test/revision-v1.test.mjs` — revision v1 兼容

## 覆盖范围

- **阶段流转**：brainstorm / plan / execute / verify / archive / scan / status / doctor / quick 各阶段的契约、产物校验、失败分支
- **scan 子系统**：postcheck 规则（project 优先级、AnyFailed 阻断、YAML 占位符、知识库匹配、项目名清洗）覆盖最密
- **平台同步**：sync 链路（artifacts / recovery / recovery-chain / scan-p0）有完整正向 + 失败样本用例
- **worktree 隔离**：worktree-guard 钩子与 native overlay 自覆盖
- **入口 CLI**：顶层命令别名解析

## 运行方式

```
npm test          # 跑全部 28 个测试文件，逐个打印结果汇总
npm run lint      # 仅对 src/ 做语法检查，不跑逻辑
```

CI 未配置（仓库内未见 `.github/workflows` 或其他 CI 配置），测试需开发者本地执行。
