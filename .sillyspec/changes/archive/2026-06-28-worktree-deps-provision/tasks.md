---
author: qinyi
created_at: 2026-06-28 16:43:58
---

# Tasks: 2026-06-28-worktree-deps-provision

> 任务列表（名称 + 文件 + 覆盖 FR/D）。细节、Wave 分组、依赖关系在 plan 阶段展开。

| task | 名称 | 主要文件 | 覆盖 FR | 覆盖 D |
|---|---|---|---|---|
| task-01 | 依赖供给引擎 provisionDeps + lockfileHash | 新增 `src/worktree-deps.js` | FR-01, FR-02, FR-03 | D-005@v1, D-007@v1 |
| task-02 | create() 集成 provisionDeps + meta 字段合并 | `src/worktree.js`（create ~318、meta ~329） | FR-01 | D-005@v1 |
| task-03 | completeStep execute 验证硬门 + isCurrentWaveAllNoDepsVerify | `src/run.js`（completeStep）、`src/stages/execute.js`（frontmatter 读取复用） | FR-04, FR-06 | D-001@v1, D-003@v1, D-006@v2 |
| task-04 | execute 入口自检（missing/stale/缺字段重供给） | `src/run.js`（runStage execute 分支） | FR-07 | D-002@v1 |
| task-05 | worktree doctor deps 三类检查 + --fix 重供给 | `src/worktree.js`（doctor ~642）、`src/index.js`（输出渲染） | FR-08 | D-001@v1（blocked 复用） |
| task-06 | local.yaml commands.install/typecheck + scan-postcheck 适配 | `src/scan-postcheck.js`（~116，仅 test/lint/build 校验，install/typecheck 跳过 npm-script 校验） | FR-02 | D-004@v1（X-3） |
| task-07 | 文档同步（CLAUDE.md 要求） | `modules/worktree.md`（修路径/分支脱节+补接口）、`modules/_module-map.yaml`（注册 worktree 模块）、`docs/sillyspec/file-lifecycle/worktree-and-guard.md`（补 deps 阶段+meta 字段） | — | D-002@v1（meta 字段文档化） |
| task-08 | 测试：worktree-deps-provision | 新增 `test/worktree-deps-provision.test.mjs` | FR-01~FR-08 | D-001@v1, D-002@v1, D-003@v1, D-004@v1, D-005@v1, D-006@v2, D-007@v1 |

## 备注

- **交付顺序提示**（留给 plan 的 Wave 排序）：硬门（task-03）建议先发/可与 task-01 并行——它是止血点，独立成立；供给引擎（task-01/02）是体验优化。task-04 依赖 task-01/02；task-05 依赖 task-01；task-07 文档可与代码同步；task-08 贯穿。
- **依赖现有代码**：task-03 复用 `progress.js:41` blocked status + `run.js` requiresWait/scan-postcheck 范式；task-04 复用 `worktree.js:208` short-circuit 上下文。
