---
id: task-01
title: concurrent-detect core + unit test
title_zh: 新增并发检测纯函数核心 + 单元测试
author: qinyi
created_at: 2026-08-08 13:16:00
priority: P0
depends_on: []
blocks: [task-02, task-03, task-04]
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-004@v1, D-005@v1, D-008@v1]
allowed_paths:
  - src/run/concurrent-detect.js
  - test/concurrent-detect.test.mjs
---

## goal
> 新增 src/run/concurrent-detect.js，导出 detectConcurrentChanges 与 formatConcurrentWarning 纯函数，单次 git status 扫描复用 isQuickMetadata 分类，产出 foreignFiles 与 otherActiveChanges 两类信号；配套单元测试。

## implementation
- 新建 src/run/concurrent-detect.js，从 shared.js import isQuickMetadata 与 safeGit
- detectConcurrentChanges 入参含 cwd 与选项 changeName/linkedChanges/ownFiles/specDir，调 safeGit 跑 status porcelain 必传选项 trim 为 false（D-004，shared.js:448 坑），失败填 gitError 返回 hasForeign 为 false（FR-04 fail-open）
- 逐条分类脏文件：rule1 落 changes 目录且非本变更非关联 → otherActiveChanges 去重（用内联 extractChangeDir，注释标与 isQuickMetadata 同源 regex，D-008 deferred 不碰 shared.js）；rule2 isQuickMetadata 为 true → 跳过；rule3 非 ownFiles → foreignFiles
- formatConcurrentWarning 把检测结果格式化多行警告串或 null，文案用「脏变更目录」替代「活跃」防与 DB active 混淆（D-005）
- 新建 test/concurrent-detect.test.mjs，造 git fixture 覆盖 foreignFiles/otherActiveChanges/ownFiles 排除 baseline/gitError/首行未跟踪文件/null 边界

## acceptance
- foreignFiles 为脏文件里非 metadata 且不在 ownFiles 的真实业务文件
- otherActiveChanges 为去重的他者脏变更目录（排除 changeName 与 linkedChanges）
- ownFiles 含 baseline 文件时不被归入 foreignFiles（多 agent 脏工作树场景）
- git status 读失败时返回 hasForeign 为 false 与 gitError，不抛异常
- safeGit 调用带 trim 为 false，首行未跟踪文件路径不丢首字符
- formatConcurrentWarning 在 hasForeign 为 false 时返回 null

## verify
- node test/concurrent-detect.test.mjs（绿）
- node -e 验证 import 不抛

## constraints
- 不改 isQuickMetadata 返回值（FR-07），仅 import 复用其分类
- 内联 extractChangeDir 不抽 shared.js（D-008 deferred，保 design §6 准确），注释锚定同源 regex
- 跨平台：路径反斜杠归一化，复用 parsePorcelainPath 或同形逻辑
- 纯函数无副作用，不写盘不 console（console 留给调用点 task-02/03）
