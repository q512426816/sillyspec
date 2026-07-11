---
author: qinyi
created_at: 2026-07-11T20:37:59
change: 2026-07-11-execute-worktree-platform-gaps
stage: brainstorm
status: draft
---

# 任务清单（Tasks）

> 任务细节在 plan 阶段展开（Wave 分组 + 依赖关系 + 步骤）。本表仅列任务名占位。

## Wave 1 — review gate 平台模式修复（低风险纯 bugfix）

- task-W1-1：execute.js prompt 路径占位符化（坑 2，`:623`/`:644` + grep 全量 `.sillyspec/.runtime/`）
- task-W1-2：task-review.js + run.js 阻断文案加期望路径 + runId（建议 3）
- task-W1-3：Wave 1 测试（占位符 grep 断言 + 阻断文案断言）
- task-W1-4：模块文档同步（stages.md / file-lifecycle.md）

## Wave 2 — worktree apply --merge 降级（新功能独立审查）

- task-W2-1：核实 `worktree.js` `BRANCH_PREFIX` 确切值 + `assessApplyRisk` BLOCKED 逻辑
- task-W2-2：`applyWorktree` 签名加 `merge` 选项 + 步骤 4.5 漂移分支 merge 降级入口
- task-W2-3：merge 降级路径实现（`git merge` + 成功自动 cleanup / 冲突 `--abort` + 报错）
- task-W2-4：`index.js` `case 'apply'` 注册 `--merge` flag + assess 文案补降级指引
- task-W2-5：Wave 2 测试（行为矩阵 FR-1/2/5）
- task-W2-6：模块文档同步（worktree.md 架构决策表 `--merge` 注 + cli-entry.md）
