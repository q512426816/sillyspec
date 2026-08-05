---
author: qinyi
created_at: 2026-08-05T22:01:04
plan_level: full
---

# 实现计划（Plan）— 工具驾驭反馈修复

## 来源
- design.md（5 问题 + 2 共享 helper 方案 + D-01~D-06 决策）
- requirements.md（FR-01~08）
- tasks.md（3 Phase 粗览）

## 范围
修复一次工具驾驭复盘发现的 5 个 SillySpec 痛点 + 抽 2 个共享 helper 消除双写漂移。跨 worktree / runtime / stages / cli-entry 4 模块，10 个 task。

## Spike
无。技术方案确定——H1 复用现有 `lockfileHash` + `linkOneDir` 判据，H2 照搬 `scan-postcheck:118-158` 模板扩展，cwd 自动锁定复用已暴露的 `mainSpecBase`。无新技术栈/隔离/性能不确定性。

## Wave 1 — 共享 helper（后续修复依赖，先行）

- [x] task-01: H1 `checkDepsFreshness`（src/worktree-deps.js）+ 单测
- [x] task-02: H2 `validateScriptCommands`（src/stages/cmd-existence.js 新建）+ 单测

## Wave 2 — 5 问题修复（依赖 Wave 1，各含配套测试）

- [x] task-03: 问题1 doctor——`deps-main-drift` + `--fix` force 重装 + `--change` flag + in-place 守卫放宽（depends: task-01）
- [x] task-04: 问题1续——`ensureDepsFreshness` 改调 H1 + `gates.js` 提示文案对齐（depends: task-01）
- [x] task-05: 问题2 cwd worktree 副本漂移自动锁定主仓 spec（独立）
- [x] task-06: 问题3 plan-postcheck `validateTaskCommands` 硬阻断 + scan-postcheck 改调 H2（depends: task-02）
- [x] task-07: 问题4 acceptance 审查清单 + best-effort 字段 grep 兜底（独立）
- [x] task-08: 问题5 complete.js outputStep 后底部 advanced 行（独立）
- [x] task-09: 问题6 execute/verify 铁律「长测试前台跑」prompt 文案（独立，prompt only）

## Wave 3 — 文档同步 + 全量验证

- [x] task-10: 文档同步（file-lifecycle / docs/prompt 重跑 `_extract.mjs` / .claude/skills/ / 模块文档）+ npm test + lint 全绿（depends: task-01~09）

## 任务总表

| Task | 标题 | 优先级 | 模块 | depends_on | allowed_paths |
|---|---|---|---|---|---|
| task-01 | H1 checkDepsFreshness + 单测 | P0 | worktree | — | src/worktree-deps.js, test/worktree-deps.test.mjs |
| task-02 | H2 validateScriptCommands + 单测 | P0 | stages | — | src/stages/cmd-existence.js, test/cmd-existence.test.mjs |
| task-03 | doctor deps-main-drift + force + --change | P0 | worktree, cli-entry | task-01 | src/worktree.js, src/worktree-deps.js, src/index.js |
| task-04 | ensureDepsFreshness 改调 H1 + gates 文案 | P0 | runtime | task-01 | src/run/stage.js, src/run/gates.js |
| task-05 | cwd 副本漂移自动锁定主仓 spec | P0 | runtime | — | src/run/command.js |
| task-06 | plan-postcheck validateTaskCommands + scan 改调 | P0 | stages | task-02 | src/stages/plan-postcheck.js, src/scan-postcheck.js |
| task-07 | acceptance 审查清单 + best-effort grep | P1 | stages | — | src/stages/plan.js, src/stages/plan-postcheck.js |
| task-08 | complete.js outputStep 后 advanced 行 | P0 | runtime | — | src/run/complete.js |
| task-09 | execute/verify 前台跑铁律 prompt | P2 | stages | — | src/stages/execute.js, src/stages/verify.js |
| task-10 | 文档同步 + 全量验证 | P0 | docs | task-01..09 | docs/sillyspec/file-lifecycle.md, docs/prompt/, .claude/skills/, .sillyspec/docs/sillyspec/modules/ |

## 关键路径

`task-01 → task-03 → task-10` 与 `task-02 → task-06 → task-10` 为两条最长依赖链。Wave 2 内 task-05 / task-07 / task-08 / task-09 互不依赖，可并行。task-04 紧随 task-01（同源 H1）。

## 全局验收标准

1. 主仓 lockfile 变更、worktree 自身 lockfile 未变时，doctor 报 `deps-main-drift`；`--fix` 后 worktree 依赖与主仓一致（FR-01）。
2. `doctor --change <name>` 多 worktree 共存时仅扫该 change（FR-02）。
3. cd 进 worktree 副本跑 `execute`，进度写主仓 spec，输出含「已自动锚定主仓」warn，不 exit(2)；其他漂移仍拒（FR-03）。
4. TaskCard `verify:`/`implementation:` 写「根目录 pnpm gen:types」但根 package.json 无、子包才有 → plan-postcheck 报 error 阻断（FR-04）。
5. plan 审查清单含 acceptance/schema 核验条；postcheck 对 acceptance 提到、源文件找不到的标识符给 warning（FR-05）。
6. `execute --done` 推进后输出末尾含 `🚀 advanced to step N/M`（FR-06）。
7. doctor 与 ensureDepsFreshness 共用 `checkDepsFreshness`；scan/plan-postcheck 共用 `validateScriptCommands`；helper 各有独立单测（FR-07）。
8. execute/verify 铁律含「长测试前台同步跑」文案（FR-08）。
9. `npm test` + `npm run lint` 全绿，既有测试无回归。

## 覆盖矩阵（FR × Task）

| FR | 覆盖 Task |
|---|---|
| FR-01（doctor 主仓 drift） | task-03 |
| FR-02（doctor --change） | task-03 |
| FR-03（cwd 自动锁定） | task-05 |
| FR-04（plan 命令校验） | task-06 |
| FR-05（acceptance 软约束） | task-07 |
| FR-06（advanced 行） | task-08 |
| FR-07（helper 去重） | task-01, task-02, task-03, task-04, task-06 |
| FR-08（后台软缓解） | task-09 |
| 全量绿（回归守护） | task-10（汇总）+ 各 task 配套测试 |
