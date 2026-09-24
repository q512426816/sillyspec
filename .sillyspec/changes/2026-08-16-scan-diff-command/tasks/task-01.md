---
id: task-01
title: scan-diff.js computation module
title_zh: 实现 src/scan-diff.js 计算模块
author: qinyi
created_at: 2026-08-16 21:15:00
priority: high
depends_on: []
blocks: [task-02, task-03, task-04]
allowed_paths:
  - src/scan-diff.js
goal: computeScanDiff 纯函数四分类 + matchFilesToModules 归模块 + isAncestor 守卫 + runScanDiff IO
implementation: |
  新 src/scan-diff.js：
  computeScanDiff({projectRoot, specBase, projectName, base}) 纯函数——parseSourceCommit 读基线、
  safeGit diff --name-status --find-renames（timeout 降级处理）、matchFilesToModules 归模块、
  四分类（A缺文档/D多文档/M-R-C过时/unmapped标注）、默认范围=module-map paths 覆盖集；
  runScanDiff IO——终端聚合渲染（每模块≤5条+--full展开）、--report 落盘 scan-diff-report.md、
  isAncestor 守卫（仿 computeScanStaleness）、无漂移 0 退出。
  复用 src/scan-staleness.js 的 parseSourceCommit、src/docs-debt.js 的 matchFilesToModules、
  src/git-helper.js 的 safeGit、src/modules.js 的 parseModuleMapSimple，零新依赖。
acceptance:
  - computeScanDiff 四分类正确（含 W6 rename 场景 R 归变更）
  - 归模块与 matchFilesToModules 直接调用结果一致
  - isAncestor 守卫拦截无效/非祖先 base
  - --report 落盘到 specBase/docs/<project>/scan/scan-diff-report.md
verify: node --input-type=module 调 computeScanDiff 冒烟 + 单测（task-03）
constraints: 不触发网络 pull；纯只读不写进度
---

