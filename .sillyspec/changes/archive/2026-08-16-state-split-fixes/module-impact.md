---
author: qinyi
created_at: 2026-08-16T23:22:00+08:00
updated_at: 2026-08-16T23:22:00+08:00
---

# 模块影响分析（Module Impact）— 并发状态分裂三坑修复

> plan 首版。execute/verify 按实际变更更新，archive 终审。

## 影响矩阵

| 模块 | 影响类型 | 涉及文件 | 说明 |
|---|---|---|---|
| runtime（execute 启动链） | 修改 | src/run/stage.js、src/run/gates.js、src/run/prompt.js | #1 marker 写入原子化+分层 fail |
| core-engine（task review） | 修改 | src/task-review.js | #1 去静默保 fail-open |
| worktree | 修改 | src/worktree-apply.js | #2 applyByMerge 预对齐 |
| runtime（quick 审计链） | 修改 | src/run/shared.js、src/run/quick-audit.js | #3 livingDocDrift 提示 |
| 测试体系 | 新增 | test/ 三个新测试文件 | fail-loud/预对齐/交集提示 |
| 文档体系 | 修改 | file-lifecycle（marker 机制描述）、troubleshooting（三坑登记） | task-04 |

## unmapped

无（7 src 全在模块覆盖内：run/stage|gates|prompt|shared|quick-audit 归 runtime，task-review 归 core-engine，worktree-apply 归 worktree）。

## 连带验证

- npm test：既有 211 全绿（task-review/gates/prompt 的既有测试可能需适配分层 fail 语义——task-01 注意）
- docs check：file-lifecycle 改动注意引用有效
- #2 的 worktree 既有测试（worktree-apply 系列）回归
