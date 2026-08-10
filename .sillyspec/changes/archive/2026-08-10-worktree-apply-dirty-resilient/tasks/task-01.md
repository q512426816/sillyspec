---
id: task-01
title: generateRescueCommands pure function (4-class rescue)
title_zh: rescue 指令生成纯函数（逐文件四分类）
author: qinyi
created_at: 2026-08-10 11:50:00
priority: P0
depends_on: []
blocks: [task-03]
requirement_ids: [FR-02]
decision_ids: [D-002@v1, D-003@v1]
allowed_paths:
  - src/worktree-apply.js
provides:
  - contract: generateRescueCommands
    fields: [commands, warnings, cpFileCount, excludedCount]
goal: 交付 rescue 核心纯函数 generateRescueCommands，逐文件四分类（SAFE-CP/EXCLUDE-DIRTY/EXCLUDE-MISMATCH/DELETE）生成 cp/rm 指令与被排除文件风险标注，无副作用无 git/fs 调用，供 step4.5/5a/assess 三处调用加独立单测
implementation: |
  - 在 src/worktree-apply.js 新增 export function generateRescueCommands({changedFiles, dirtyFiles, hashMismatchFiles, deletedFiles=[], worktreePath, projectRoot})
  - dirtyFiles/hashMismatchFiles/deletedFiles 内部 new Set() 归一（接受 Set 或数组）
  - 逐文件按优先级判定——deletedFiles 命中给 rm 指令；dirtySet 命中进 EXCLUDE-DIRTY warnings；mismatchSet 命中进 EXCLUDE-MISMATCH warnings；其余给 SAFE-CP cp 指令
  - 路径用 path.join 拼接后 replace 反斜杠为正斜杠（Git Bash 兼容）
  - 返回 commands/warnings/cpFileCount（SAFE-CP 数）/excludedCount（EXCLUDE-DIRTY+EXCLUDE-MISMATCH 数）
  - 风格对齐现有导出纯函数 filterDeliverableFiles/classifyAllowListViolations（JSDoc 加无副作用）
acceptance:
  - generateRescueCommands 从 src/worktree-apply.js 命名导出可 import
  - 四分类各分支输出正确（DELETE 给 rm、EXCLUDE-DIRTY/MISMATCH 进 warnings 不给 cp、SAFE-CP 给 cp）
  - commands 路径含正斜杠无反斜杠
  - cpFileCount 与 excludedCount 计数正确（DELETE 不计入两者）
  - dirtyFiles 传 Set 或数组结果一致
verify:
  - node -e "import('./src/worktree-apply.js').then(m=>console.log('generateRescueCommands' in m))" 确认导出
  - task-05 纯函数单测覆盖四分类加路径加计数
constraints:
  - 纯函数无 git 调用无 fs 写无 console（除 JSDoc）不读 meta/worktree 状态
  - 本 task 只新增导出函数不改 applyWorktree 任何现有行为不改 step 顺序不碰 index.js
  - dirtyFiles/hashMismatchFiles/deletedFiles 均由调用方（task-03 的 step4.5/5a）算好传入本函数不自己查 git
  - 兼容 dirtyFiles 传 Set 或数组（归一处理）
related_tests: []
---

# task-01：generateRescueCommands 纯函数

## 背景
rescue 机制核心。dirty 拦截触发时按逐文件四分类算可执行 cp/rm 指令加风险标注。纯函数无副作用，供三处调用加独立单测。

## 改动点
1. 新增 export function generateRescueCommands（四分类 + 路径正斜杠 + 计数）
2. 紧跟现有导出纯函数风格（JSDoc）
