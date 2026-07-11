---
author: qinyi
created_at: 2026-07-11T20:37:59
change: 2026-07-11-execute-worktree-platform-gaps
stage: brainstorm
status: draft
---

# 需求规范（Requirements）

## 功能需求

- **FR-1（坑 1a）**：构造 baseline 漂移场景，`applyWorktree(name, { merge: true })` 执行 `git merge sillyspec/<change>`，`result.merged === true`，不报 error。
- **FR-2（坑 1b）**：同场景 `applyWorktree(name, { merge: false })`（默认）仍 return error 报 BLOCKED，文案含「可用 --merge 降级」。
- **FR-3（坑 2）**：`src/stages/execute.js` grep `\.sillyspec/\.runtime/` 为空（全部占位符化）；prompt 含 `{SPEC_ROOT}/.runtime/execute-runs/` 与 `{SPEC_ROOT}/.runtime/contract-artifacts/`。
- **FR-4（建议 3）**：`task-review.js:182/461` + `run.js:3329-3333` 阻断文案断言含期望 review.json 路径 + runId。
- **FR-5（merge 冲突）**：构造 `git merge` 冲突，`applyWorktree(name, { merge: true })` return error 含冲突文件列表，且主仓库无半成品合并（`git merge --abort` 已回滚）。

## 非功能需求

- **回归**：`npm test` 全绿 + `npm run lint`（check-syntax）0 error。
- **向后兼容**：三改动均不破坏现有行为——占位符仓库内模式重写为 `.sillyspec` 与原硬编码等价；`--merge` 默认 false，不传则行为完全不变。
- **约定一致**：中文文案；ESM；git 子进程 `execSync` + `stdio:['pipe','pipe','pipe']`；design.md 为 truth source。

## 决策覆盖

全部 D-xxx@vN 已覆盖，无未覆盖决策：

| 决策 | 类型 | 覆盖于 |
|---|---|---|
| D-001@v1（坑 1 = `--merge` 降级） | architecture | FR-1/FR-2 |
| D-002@v1（`--merge` 与线性历史张力） | architecture | 文档标注（W2-4） |
| D-003@v1（坑 2 = 占位符修法） | architecture | FR-3 |
| D-004@v1（坑 2 范围 grep 全量） | boundary | FR-3 |
| D-005@v1（建议 3 文案内容） | boundary | FR-4 |

## 剩余风险（非决策遗漏，plan/execute 核实）

- `worktree.js` `BRANCH_PREFIX` 确切值 —— plan 阶段核实，决定 `git merge sillyspec/<change>` 的分支名拼接。
- `assessApplyRisk`（`worktree-apply.js:344`）BLOCKED 逻辑 —— plan 核实；assess 为只读风险评估（不执行 apply/merge），真正阻断在 apply，已降级为风险（design §10）。
