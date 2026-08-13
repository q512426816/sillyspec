---
plan_level: full
author: qinyi
created_at: 2026-08-13 15:06:00
---

# 实现计划（Plan）

## Wave 1
- [x] task-01: cleanup fail-closed 保护 + 调用点契约（覆盖：FR-01/02/03, D-001@v1, D-006@v1）

## Wave 2（依赖 Wave 1：与 task-01 同改 worktree.js，串行避免同文件冲突）
- [x] task-02: execute 阶段级核验 findMissingDeliverables + 完成路径聚合（覆盖：FR-04/05/06, D-002@v1）

## Wave 3（依赖 Wave 2）
- [x] task-03: 新增 cleanup 保护 + 阶段级核验测试（覆盖：FR-01..06）

## Wave 4（依赖 Wave 3）
- [x] task-04: 全量回归 + lint + 文档同步评估

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | cleanup fail-closed 保护 + 调用点契约 | W1 | P0 | — | FR-01/02/03, D-001, D-006 | worktree.js cleanup 加保护；worktree-apply/command reset 传 force；index.js blocked 分支 |
| task-02 | execute 阶段级核验 | W2 | P0 | task-01 | FR-04/05/06, D-002 | worktree.js 导出 findMissingDeliverables；complete-handlers 完成路径聚合核验 warn |
| task-03 | 新增测试 | W3 | P0 | task-01,02 | FR-01..06 | worktree-cleanup-guard + execute-loss-guard 两个测试文件 |
| task-04 | 全量回归 + 文档同步评估 | W4 | P1 | task-03 | — | npm test + lint；评估 file-lifecycle/worktree 文档是否需同步 |

## 关键路径
task-01 → task-02 → task-03 → task-04（线性依赖，最长路径决定交付周期）

## 全局验收标准
- [ ] AC-00 所有单元测试通过（npm test 全量 0 失败）
- [ ] AC-00b lint 通过（npm run lint 0 错误）
- [ ] AC-07 （brownfield）无未落主仓交付变更时 cleanup 行为不变（零回归）
- [ ] AC-01 cleanup fail-closed：未落主仓变更拒绝清理（blocked）
- [ ] AC-02 --force 显式绕过保护，清理成功
- [ ] AC-03 apply 后自动 cleanup 与 execute reset 正常（force 绕过，不误阻）
- [ ] AC-04 execute 完成时 review 声称实现的文件在分支 tree 或工作区（核验落盘）
- [ ] AC-05 execute 完成时缺失文件 warn 列清单（非阻断）
- [ ] AC-06 无法核验（worktree/分支不存在）时保守提示
- [ ] 涉及 worktree 基础设施，任务完成须实证（落盘文件 + 测试结果为准）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| FR-01 | task-01 | AC-01（cleanup blocked） |
| FR-02 | task-01 | AC-02（--force 绕过） |
| FR-03 | task-01 | AC-03（apply 后 force 放行） |
| FR-04 | task-02 | AC-04（核验落盘） |
| FR-05 | task-02 | AC-05（missing warn） |
| FR-06 | task-02 | AC-06（checked:false 保守提示） |
| D-001@v1 | task-01 | FR-01/02 |
| D-002@v1 | task-02 | FR-04/05/06 |
| D-003@v1 | — | 范围裁剪（不含摘要绑定） |
| D-004@v1 | — | 否决记录 |
| D-005@v1 | — | 否决记录 |
| D-006@v1 | task-01 | FR-03（apply 后 force 放行） |
