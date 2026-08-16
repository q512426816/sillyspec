---
author: qinyi
created_at: 2026-08-16T21:22:00+08:00
updated_at: 2026-08-16T21:22:00+08:00
---

# 符号影响面报告（Symbol Impact）— scan diff 增量刷新命令

> execute「加载上下文」步落盘。逐 task 结论。

- task-01（src/scan-diff.js 新增）：新增导出符号 `computeScanDiff`（纯函数）、`runScanDiff`（IO）。无既有符号签名变更（纯新增模块）。
- task-02（src/index.js + src/run/command.js）：index.js case 'scan' 增 diff 子命令拦截分支（新增 `filteredArgs[1]==='diff'` 判断，不改既有 case 分支）；command.js scan 参数表新增 `--diff` flag 布尔（既有 flag 不动）。无既有导出符号签名变更。
- task-03（test/scan-diff.test.mjs 新增）：新增测试文件，import computeScanDiff/runScanDiff。无源码符号变更。
- task-04（文档同步 + 提交）：无签名级变更。

影响面结论：全新增符号，零既有签名破坏；复用 parseSourceCommit/matchFilesToModules/parseModuleMapSimple/safeGit 只读调用。npm test 既有 210 应零回归（无共享符号改动）。
