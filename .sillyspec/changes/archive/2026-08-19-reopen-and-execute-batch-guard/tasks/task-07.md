---
id: task-07
title: implement-merge-base-anchor-and-base-flag
title_zh: 实现 merge-base 锚点与 base 策略 flag
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-003@v1]
allowed_paths:
  - src/worktree-apply.js
  - src/index.js
provides: {}
expects_from: {}
goal: >
  worktree apply patch 生成锚点默认改用 merge-base，消除 baseline 占位文件导致的假冲突
implementation:
  - worktree-apply.js 371 行拆分 diffBase 为双层锚点
  - 新增 patchBase 变量，默认为 merge-base 计算结果
  - 交付集合锚点 diffBase 保持 baselineCommit || baseHash
  - patch 生成命令（583/595 行）改用 patchBase 锚点
  - merge-base 计算失败时回退到 baselineCommit || baseHash 并 warn
  - index.js worktree apply 分支解析 --base <merge-base|baseline> 参数
  - 线透传 base 参数给 applyWorktree 函数
  - 更新 printUsage 中 worktree apply 帮助文案
acceptance:
  - 默认行为用 merge-base 锚点，占位文件场景干净落盘
  - --base baseline 显式回退旧锚点行为
  - merge-base 计算失败时 fail-open 回退并警告
  - 交付集合判定仍按 baselineCommit||baseHash，不变
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - merge-base 计算须在 projectRoot 执行，传入 branchTip 与 baseBranch
  - 分支已删除或计算失败时回退现行锚点，不阻断
  - 交付集合与 patch 锚点分离，各司其职
related_tests:
  - path: test/worktree-apply-classification.test.mjs
    reason: applyWorktree 参数与 diffBase 语义变化需回归

---
