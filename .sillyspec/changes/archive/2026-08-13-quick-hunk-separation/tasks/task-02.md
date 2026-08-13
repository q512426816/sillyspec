---
id: task-02
title: shared.js auditQuickCompletion 加同文件并发检测 + warn
title_zh: 同文件并发检测 + warn
allowed_paths:
  - src/run/shared.js
goal: auditQuickCompletion 末尾检测同文件并发（allowedFile 在 baseline 且 hash 变）+ warn 给分离指引
implementation: |
  shared.js auditQuickCompletion try 内末尾（confirm 块前），对每个 allowedFile：if (isBaselineFile(file) && guard.allowedFilesHash?.[file] !== undefined) 算当前 sha256，≠ guard.allowedFilesHash[file] → sameFileHits.push(file)。collect 后 warn "⚠️ 同文件并发（N 个 allowedFile 含他者+你的改动，commit 整文件会夹带他者 hunk）" + 逐文件 "分离：git add -p <file> 或 git diff <file> > mine.patch + git apply --cached mine.patch"。advisory（不改 result.status，只 push reasons）。
acceptance: auditQuickCompletion 检测同文件并发 + warn 含分离指引；不阻断 --done（status 不变）
verify: node test/quick-same-file-concurrent.test.mjs（检测 warn + advisory 不阻断）+ npm run lint
constraints: 用 isBaselineFile（含目录前缀，避 P2-1 目录折叠盲区）；插入 try 内末尾（异常外层 catch 兜）；advisory 不阻断
depends_on:
  - task-01
---

# task-02: shared.js auditQuickCompletion 加同文件并发检测 + warn

auditQuickCompletion try 内末尾，对 allowedFile 检测（isBaselineFile + hash 变）→ warn 分离指引。advisory 不阻断。
