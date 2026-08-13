---
author: qinyi
created_at: 2026-08-13 15:05:00
---

# 模块影响分析（Module Impact）— worktree execute 静默代码丢失防丢卫

## 变更：2026-08-13-worktree-execute-loss-guard

## 模块影响矩阵
| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| worktree | 逻辑变更 | src/worktree.js, src/worktree-apply.js | cleanup() 加 fail-closed 保护（未落主仓交付变更拒绝清理，--force 绕过）；新增 findMissingDeliverables 纯函数导出；apply 后自动 cleanup 显式 force | true |
| cli-entry | 逻辑变更 | src/run/command.js, src/index.js, src/run/complete-handlers.js | execute reset cleanup 显式 force；显式 worktree cleanup 命令 blocked 分支；execute 完成路径阶段级核验 warn | true |

## 未匹配文件
| 文件路径 | 说明 |
|----------|------|
| test/worktree-cleanup-guard.test.mjs | 新增测试，未匹配已有模块（测试文件） |
| test/execute-loss-guard.test.mjs | 新增测试，未匹配已有模块（测试文件） |

## 更新结果
| 目标 | 操作 | 状态 |
|------|------|------|
| .sillyspec/docs/sillyspec/modules/worktree.md | cleanup 行为变化补充（blocked 返回 + force 调用点契约） | ✅ 已同步（task-04，worktree 副本） |
| .sillyspec/docs/sillyspec/modules/cli-entry.md | execute 完成核验 + reset force 补充 | ✅ 已同步（task-04，worktree 副本） |
