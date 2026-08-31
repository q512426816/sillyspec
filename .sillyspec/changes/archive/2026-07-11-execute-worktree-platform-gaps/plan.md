---
author: qinyi
created_at: 2026-07-11T20:45:30
change: 2026-07-11-execute-worktree-platform-gaps
stage: plan
status: draft
plan_level: full
---

# 实现计划（Plan）

> truth source = design.md。本计划无实现细节（接口/代码示例见 design.md §8）。

## 调用点搜索记录（full 自检）

| 符号 | 位置 | 处理 |
|---|---|---|
| `applyWorktree` | `src/index.js:640`（`case 'apply'` 主入口） | **改**：注册 `--merge` flag 并传入（task-06） |
| `applyWorktree` | `src/index.js:703`（`case 'assess'` 的 SAFE/WARNING auto-apply） | **不改**：仅在无漂移（SAFE/WARNING）时触发，baseline 漂移时 assess 走 BLOCKED（:709）到不了此分支 |
| `applyWorktree` | `src/worktree-apply.js:350`（`assessApplyRisk` 内部 checkOnly 调用） | **不改**：checkOnly=true，merge 不生效 |
| `assessApplyRisk` | `src/index.js:676`（`case 'assess'`） | 文案补降级指引（task-06） |
| `execute.js` 硬编码 `.sillyspec/.runtime/` | `src/stages/execute.js:623`（review.json）、`:644`（endpoints.json） | **改**：占位符化（task-01）；grep 确认仅此两处 |
| `BRANCH_PREFIX` | `src/worktree.js:18` = `'sillyspec/'` | 已核实，merge 分支名 = `sillyspec/<change>` |

> `{SPEC_ROOT}` 占位符消费点 = `src/run.js:731-797`（平台路径重写，已存在，无需改）。

## Wave 分组与任务

### Wave 1 — review gate 平台模式修复（低风险纯 bugfix）

- [x] task-01: execute.js prompt 路径占位符化（坑 2）
- [x] task-02: review gate 阻断文案加期望路径 + runId（建议 3）
- [x] task-03: Wave 1 测试
- [x] task-04: Wave 1 模块文档同步

### Wave 2 — worktree apply --merge 降级（新功能，独立审查）

- [x] task-05: applyWorktree --merge 降级实现（签名 + 步骤 4.5 漂移分支 + merge 路径）
- [x] task-06: index.js 注册 --merge flag + assess 文案补降级指引
- [x] task-07: Wave 2 测试
- [x] task-08: Wave 2 模块文档同步（含架构决策注 D-002）

## 任务总表

| 任务 | 标题 | Wave | 优先级 | 依赖 | 主要文件 |
|---|---|---|---|---|---|
| task-01 | execute.js prompt 路径占位符化 | W1 | P0 | — | src/stages/execute.js |
| task-02 | review gate 阻断文案加期望路径+runId | W1 | P0 | — | src/task-review.js, src/run.js |
| task-03 | Wave 1 测试 | W1 | P0 | task-01, task-02 | test/execute-prompt-spec-root-placeholder.test.mjs, test/review-gate-block-message.test.mjs |
| task-04 | Wave 1 模块文档同步 | W1 | P1 | task-01 | .sillyspec/docs/sillyspec/modules/stages.md |
| task-05 | applyWorktree --merge 降级实现 | W2 | P0 | — | src/worktree-apply.js |
| task-06 | index.js 注册 --merge flag + assess 文案 | W2 | P0 | task-05 | src/index.js |
| task-07 | Wave 2 测试 | W2 | P0 | task-05, task-06 | test/worktree-apply-merge-fallback.test.mjs |
| task-08 | Wave 2 模块文档同步（D-002 架构注） | W2 | P1 | task-05 | .sillyspec/docs/sillyspec/modules/worktree.md, cli-entry.md, docs/sillyspec/file-lifecycle.md |

- **关键路径**：W1 = task-01/02 → task-03；W2 = task-05 → task-06 → task-07。
- **Wave 依赖**：W1 与 W2 改不同文件、无冲突；策略上 W1 先行（低风险先交付），W2 建议 W1 验证通过后开始（非硬阻塞）。
- 每个源码文件唯一 task 覆盖（无 allowed_paths 冲突）。
- 无估时列（plan_level=full 规范）。

## 全局验收标准

- **FR-1**（坑 1a）：baseline 漂移场景 `applyWorktree(name, { merge: true })` → `git merge sillyspec/<name>`、`result.merged === true`、不报 error。
- **FR-2**（坑 1b）：同场景默认（`merge: false`）仍 return error 报 BLOCKED，文案含「可用 --merge 降级」。
- **FR-3**（坑 2）：`src/stages/execute.js` grep `\.sillyspec/\.runtime/` 为空；prompt 含 `{SPEC_ROOT}/.runtime/execute-runs/` 与 `{SPEC_ROOT}/.runtime/contract-artifacts/`。
- **FR-4**（建议 3）：`task-review.js:182/461` + `run.js:3329-3333` 阻断文案含期望 review.json 路径 + runId。
- **FR-5**（merge 冲突）：`git merge` 冲突时 return error 含冲突文件列表，主仓库无半成品（`git merge --abort` 已回滚）。
- **回归**：`npm test` 全绿 + `npm run lint` 0 error。
- **兼容性（brownfield）**：三改动均向后兼容——占位符仓库内模式重写为 `.sillyspec` 与原硬编码等价；`--merge` 默认 false 不传则行为完全不变；文案为纯追加。可独立 revert，无数据迁移。

## 决策覆盖矩阵

| 决策 | 类型 | 覆盖任务 |
|---|---|---|
| D-001@v1（坑 1 = `--merge` 降级） | architecture | task-05, task-06 |
| D-002@v1（`--merge` 与线性历史张力） | architecture | task-08（架构决策表注） |
| D-003@v1（坑 2 = 占位符修法） | architecture | task-01 |
| D-004@v1（坑 2 范围 grep 全量） | boundary | task-01（调用点搜索已确认仅 623/644） |
| D-005@v1（建议 3 文案内容） | boundary | task-02 |

> D-001~005 全部 current/accepted，无 unresolved。

## 文件覆盖自检

design.md §7 文件清单 → task 覆盖（无遗漏，每源码文件唯一 task）：

| 文件 | 覆盖 task |
|---|---|
| src/stages/execute.js | task-01 |
| src/task-review.js | task-02 |
| src/run.js | task-02 |
| src/worktree-apply.js | task-05 |
| src/index.js | task-06 |
| test/execute-prompt-spec-root-placeholder.test.mjs | task-03 |
| test/review-gate-block-message.test.mjs | task-03 |
| test/worktree-apply-merge-fallback.test.mjs | task-07 |
| .sillyspec/docs/sillyspec/modules/worktree.md | task-08 |
| .sillyspec/docs/sillyspec/modules/stages.md | task-04 |
| .sillyspec/docs/sillyspec/modules/cli-entry.md | task-08 |
| docs/sillyspec/file-lifecycle.md | task-08 |

## 无 P0/P1 unresolved blocker

design.md §10 风险均已对策；§13 已声明不涉及生命周期契约；调用点搜索已确认 applyWorktree 三调用点的处理分工。
