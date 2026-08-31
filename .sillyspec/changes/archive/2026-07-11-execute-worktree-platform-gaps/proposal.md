---
author: qinyi
created_at: 2026-07-11T20:37:59
change: 2026-07-11-execute-worktree-platform-gaps
stage: brainstorm
status: draft
---

# 变更提案（Proposal）

## 动机

来源 `multi-agent-platform/docs/sillyspec/execute-worktree-platform-gaps.md`（2026-07-10 实测，sillyspec 3.23.0 核验全部未解决）。平台模式（specDir 指向 `~/.sillyhub` 等外部目录）+ worktree 隔离下跑 execute，代码完成后被三个工具层问题阻断收尾：

1. **坑 1**：worktree apply baseline 漂移时无降级路径，patch 无法应用（`worktree-apply.js:165-183` 直接 return error，BLOCKED）。
2. **坑 2**：execute prompt 硬编码 `.sillyspec/.runtime/` 路径（`execute.js:623/644`），平台模式下 agent 写到 cwd、gate 去 specDir 找，review.json 永远"缺少"，`execute --done` 死锁。
3. **建议 3**：阻断文案（`task-review.js:182/461`、`run.js:3329-3333`）只给 task id，agent 不知道 review.json 该写哪。

## 边界

**改**：execute.js prompt 路径占位符化（坑 2）；task-review.js + run.js 阻断文案加期望路径 + runId（建议 3）；worktree-apply.js + index.js 加 `--merge` 降级（坑 1）；模块文档同步。

**不改**：默认 patch apply 行为（`--merge` 仅作漂移时显式 opt-in）；review gate 放行标准；sillyspec.db schema；baseline 检测算法（排除规则不变）；gate 读侧（已对齐 specDir）。

## 不在范围内（Non-Goals）

- 不改默认 patch apply 行为 —— `--merge` 仅作 baseline 漂移时显式 opt-in 降级。
- 不自动解决 `--merge` 自身的 git merge 冲突 —— 冲突时报错让用户手动处理（FR-5）。
- 不改 review gate 放行标准（仍要求 review.json 落盘，不降级为仅看 plan.md checkbox）。
- 不改 sillyspec.db schema、baseline 检测算法、gate 读侧（已对齐 specDir）。
- 不预创建 review.json 模板（修法选占位符，非 CLI 预创建，D-003）。

详见 design.md §3 非目标。

## 方案概要

详见 design.md。Wave 1（坑 2 + 建议 3，低风险纯 bugfix 先行）+ Wave 2（坑 1 `--merge`，新功能独立审查）。三改动均向后兼容，可独立 revert，无数据迁移。

## 验收要点

- FR-1/2：baseline 漂移 + `--merge` 走 git merge；默认仍 BLOCKED。
- FR-3：execute.js 无裸 `.sillyspec/.runtime/`，全用 `{SPEC_ROOT}` 占位符。
- FR-4：阻断文案含期望路径 + runId。
- FR-5：merge 冲突 abort + 报错，无半成品。
- 回归：`npm test` 全绿 + `npm run lint` 0 error。
