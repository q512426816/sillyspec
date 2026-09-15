---
author: qinyi
created_at: 2026-09-15 21:18:02
---
# 提案书（Proposal）

## 动机

execute 期主仓与 worktree 的「双真相」状态让多个门禁的判定基准漂移：改动在 apply 前只存在于 worktree，而 overlay/assess/勾选/evidence 等核验仍锚在主仓或 worktree 单一形态上。2026-09-15 用户在 multi-agent-platform 仓全流程实证五个坑（坑文档 `docs/sillyspec/execute-baseline-overlay-carries-broken-parallel-wip.md`），每个坑都造成误报 BLOCKED 或整轮绕行。

## 关键问题

1. **overlay 带入并行半成品**：`_overlayBaseline` 只排除 `.sillyspec/` 前缀，并行会话语法坏的在途文件被固化进 worktree 基线，worktree 测试全崩，只能人工自救又连锁触发坑②（多绕一整轮）。
2. **assess 把 no-op 文件判超范围**：changedFiles 锚 baseline checkpoint，主仓 HEAD 前进后「内容=主仓 HEAD」的自救文件 diff 非空，apply 实为 no-op 却被 BLOCKED。
3. **生成物不随 worktree 供给**：gitignored 生成物（build-id.ts）供给链缺失，worktree 构建炸 `Failed to load url`。
4. **勾选守卫口径与归因口径不一致**：diffFileSet 只算已提交，草稿归属并入未提交——子代理默认不 commit 时守卫恒空，task 自动勾选漏计（用户实证 task-05 被吞、verify 期手动补勾）。
5. **evidence 消费侧单根**：逐文件存在性/mtime 只查主仓，apply 前新文件只在 worktree，全部误报「文件不存在/无归属 diff」。

## 变更范围

- `_overlayBaseline` 消费 own/foreign 归属 oracle 隔离并行会话声明文件（src/worktree.js）
- `applyWorktree` changedFiles choke point 剔除「内容=主仓 HEAD」no-op 文件（src/worktree-apply.js）
- 新增 `worktree.supplyFiles` 配置键 + create 供给步（src/config-schema.js / src/worktree.js）
- 抽 `collectWorktreeChangedFiles` 公共 helper 统一勾选守卫与草稿归因口径 + `attributeSuspectTasks` 多归属（src/task-review.js / src/run/complete.js / src/verify-postcheck.js）
- `runRequiredEvidenceCheckV2` 逐文件核验双根化（src/verify-postcheck.js）
- 回归测试 + troubleshooting 章节

## 不在范围内（显式清单）

- 不做语法校验/esbuild 探测（语言特定；未声明文件维持现行为+既有 advisory）
- 不改 apply 时序（verify 仍是 apply 前验收）
- 不做 gitignore 生成物自动探测
- 不做证据语义判定（satisfied/missing 仍由 agent 自报告）
- 不改 DB schema、不加状态机状态
- 不动 `resolveVerifyChangedFiles` 补齐段（已知残留，记 troubleshooting）

## 成功标准（可验证）

- 五坑各有回归测试（test/worktree-dual-truth-gates.test.mjs）且全量 `npm test` 通过、`npm run lint` 0 告警
- 未配置 `worktree.supplyFiles` 时 create/apply/assess 行为与现状一致（零回归断言）
- 并行 quick 会话声明的在途文件不再进 baseline checkpoint（meta.baselineFiles 与 checkpoint message 不含）
- 「内容=主仓 HEAD」文件不进 assess BLOCKED 面（warnings 列 no-op 清单）
- 子代理不 commit 场景：草稿 changedFiles 非空的 task 能被自动勾选（diffFileSet 并入未提交后命中）
- worktree 独有新文件的 evidence 核验不再误报「文件不存在」
