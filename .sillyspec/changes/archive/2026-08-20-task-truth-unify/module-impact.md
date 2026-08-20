---
author: qinyi
created_at: 2026-08-20T12:25:00+08:00
---

# 模块影响分析

## 变更：2026-08-20-task-truth-unify

## 模块影响矩阵
| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| stages | 行为变更 | .sillyspec/docs/sillyspec/modules/stages.md | execute.js 校验器双文件重构+诊断迁移；plan.js 模板 ID 引用+写回动作+解析函数迁移；plan-postcheck.js 三校验器适配；brainstorm(-auto) 骨架注释；verify.js/archive.js 提示词指向 | true |
| runtime | 行为变更 | .sillyspec/docs/sillyspec/modules/runtime.md | gates.js 调用方双参数+三道门源迁移；complete.js 机器勾选器写 tasks.md+批量检测；run/prompt.js 任务名源；run/shared.js 坑7 兼扫适配 | true |
| progress | 行为变更 | .sillyspec/docs/sillyspec/modules/progress.md | progress.js readPlanCheckboxStatus+alignExecuteToPlan 改 tasks.md 唯一源（doctor --align 语义保持） | true |
| core-engine | 行为变更 | .sillyspec/docs/sillyspec/modules/core-engine.md | task-review.js 完成度源迁移；contract-matrix.js parseTaskDependencies 方式2 改 tasks.md 行内 depends_on；doctor-diagnostics.js D5 维度适配 | true |

## 未匹配文件
| 文件路径 | 说明 |
|----------|------|
| src/taskcard.js | 未入模块映射——任务卡导出任务名源从 plan.js parseTaskNames 迁 tasks.md |
| test/task-truth-contract.test.mjs | 新增契约测试 |
| docs/sillyspec/file-lifecycle.md | 文件生命周期契约描述更新 |
| docs/prompt/*.md（六镜像）+ _extracted.json | 提示词镜像再生 |
| .claude/skills/sillyspec-{brainstorm,plan,execute,verify,archive}/SKILL.md | 技能同步 |

## 更新结果
| 目标 | 操作 | 状态 |
|------|------|------|
| stages.md | 变更索引补录 + 契约描述更新 | done（worktree a1d02db + 模块文档索引已补录） |
| runtime.md | 变更索引补录 + 契约描述更新 | done（worktree a1d02db + 模块文档索引已补录） |
| progress.md | 契约描述更新 | done（worktree a1d02db + 模块文档索引已补录） |
| core-engine.md | 契约描述更新 | done（worktree a1d02db + 模块文档索引已补录） |
