---
id: task-02
title: execute stage-level deliverable landing verification
title_zh: execute 阶段级核验（防代码从未落盘）
author: qinyi
created_at: 2026-08-13 15:02:10
priority: P0
allowed_paths:
  - src/worktree.js
  - src/run/complete-handlers.js
goal: >
  新增 findMissingDeliverables 纯函数（核验 review.changedFiles 存在于分支 tree 或 worktree 工作区），
  并在 execute 完成路径 handleExecuteWorktreeCleanup 之前聚合核验，缺失 warn 列清单（宽松非阻断）。
implementation:
  - worktree.js 导出 findMissingDeliverables 纯函数，逐文件用 git cat-file 检查分支 tree 或 existsSync 检查工作区，分支不存在时返回 checked 为 false
  - complete-handlers.js execute 完成路径新增聚合逻辑，用 resolveLatestExecuteRunIdWithTasks 与 readReview 聚合主仓 repo 的 changedFiles
  - 跨仓 repo 的 changedFiles 过滤不参与主仓核验，避免误报
  - 缺失文件 console.warn 列出清单并提示 apply 无源可复制，不 exit 不阻断
  - checked 为 false 时保守提示无法核验请人工确认
acceptance:
  - review 声称实现的文件存在于分支 tree 或工作区时核验通过不告警
  - 两处皆无的文件 warn 列清单且不阻断 execute 完成
  - 跨仓 repo 文件不参与主仓核验不误报
  - worktree 或分支不存在时返回 checked 为 false 并保守提示
verify:
  - node test/execute-loss-guard.test.mjs
  - npm test 全量确认 execute 完成路径零回归
constraints:
  - 宽松非阻断，不强制子代理 commit 到分支
  - 不引入新运行时文件类型或 DB schema
  - 与 Task Review Gate 既有校验互补不重复拦截
  - 不覆盖 progress 摘要绑定 commit sha（范围外，D-003）
---

# task-02: execute 阶段级核验

见 design.md 总体方案 Phase 2、decisions.md D-002。
