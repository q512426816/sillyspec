---
author: qinyi
created_at: 2026-07-11T22:00:00+08:00
change: 2026-07-11-execute-worktree-platform-gaps
stage: verify
result: PASS
risk_level: unit-sufficient
---

# 验证报告 — execute-worktree 平台模式三坑修复

## 验证结论：✅ PASS

## 验证范围

8 task（W1 task-01~04 + W2 task-05~08），覆盖 FR-1~5：

| FR | 验证点 | 结果 |
|---|---|---|
| FR-1（坑1a） | baseline 漂移 + `merge:true` → git merge sillyspec/<change>，result.merged=true | ✅ task-07 场景 A |
| FR-2（坑1b） | 默认 `merge:false` → BLOCKED + 文案含「--merge 降级」 | ✅ task-07 场景 B |
| FR-3（坑2） | execute.js grep `.sillyspec/.runtime/` = 0，全 `{SPEC_ROOT}/.runtime/` 占位符 | ✅ test-1 3/3 |
| FR-4（建议3） | 阻断文案含期望 review.json 路径 + runId | ✅ test-2 6/6 |
| FR-5（坑1冲突） | git merge 冲突 → 报冲突文件 + `git merge --abort` + HEAD 未变 | ✅ task-07 场景 C |

## 测试结果

- lint: 46 文件 0 error
- 全套测试: 48 通过 0 失败，含 3 新测试：
  - `execute-prompt-spec-root-placeholder` 3/3（FR-3）
  - `review-gate-block-message` 6/6（FR-4）
  - `worktree-apply-merge-fallback` 14/14（FR-1/2/5，场景 A/B/C）

## 设计一致性

- 架构决策 D-001~005 全遵循（D-002 默认 patch 不变，`--merge` opt-in 与线性历史张力可控）
- 文件清单 design §7（11 文件）= apply 9 + 模块文档恢复 2，一致
- 模块文档 `worktree.md`（接口表加 `merge` + 决策表 D-002 注）/ `stages.md`（execute prompt 占位符注）与代码一致
- 决策追踪矩阵 D-xxx→FR→task→evidence 全闭环
- 无 P0/P1 unresolved blocker；无 contract gap

## 变更风险等级：unit-sufficient

本次为 CLI 工具 bugfix（worktree apply `--merge` 降级 + prompt 路径占位符 + 阻断文案）。三改动均**向后兼容**：占位符仓库内模式重写为 `.sillyspec` 与原硬编码等价；`--merge` 默认 false 不传则行为完全不变；文案为纯追加。测试覆盖充分（行为矩阵 + grep 断言 + 文案断言），无 daemon/部署/集成依赖。**不需 Runtime Evidence**。

## 代码审查

无 P0/P1。CONVENTIONS 合规（ESM / execSync+stdio 三段 pipe / 中文文案 / result.errors 模式非 throw）。安全：changeName 经 validateChangeName 校验后拼分支名、merge 冲突先取冲突文件再 abort、printReviewResult context={} 默认向后兼容旧调用点。错误处理完整（applyByMerge try/catch + cleanup warning + abort 吞错）。无 TODO/FIXME（本次改动文件）。

## 过程备注

- execute 收尾踩 worktree cleanup 终态死锁（apply 后 worktree 自动 cleanup，deps 门控读不到 meta），用 `doctor --align-execute-progress --confirm`（plan 8/8 全勾）打通，符合 `worktree.md:62-68` 设计的合法通道。
- 模块文档 stages.md/worktree.md 因 `filterDeliverableFiles` 排除 `.sillyspec/` 未 auto-apply，从 dangling commit（`git show 0f98191:...` / `34f6e63:...`）恢复到主仓库。
- 知识库 +1 条：`_resolveMainRepoRoot` 相对路径坑（`uncategorized.md` ql-20260711-001-e5f3），待归类。

## 下一步

`sillyspec run archive` 归档。
