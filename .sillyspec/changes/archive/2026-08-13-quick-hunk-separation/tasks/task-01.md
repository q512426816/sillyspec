---
id: task-01
title: stage.js step1 录 allowedFilesHash
title_zh: step1 录 allowedFilesHash
allowed_paths:
  - src/run/stage.js
goal: step1 quick 启动录每个 allowedFile 的 sha256 到 guard.allowedFilesHash
implementation: |
  stage.js quick 启动 baseline 录入后（~line 270 baselineCommit 附近），算每个 allowedFile 的 sha256（readFileSync + crypto.createHash('sha256').update(content).digest('hex')），存 guard.allowedFilesHash = { "<file>": "<hash>" }。文件不存在/读失败 try/catch 跳过（不存该 file 的 hash）。
acceptance: guard.json 含 allowedFilesHash 字段（quick 启动后落盘）
verify: node test/quick-same-file-concurrent.test.mjs（task-04 含 guard allowedFilesHash 验证）+ npm run lint
constraints: 向后兼容（旧 guard 无字段）；hash 对原始字节；文件不存在/读失败跳过
depends_on: []
---

# task-01: stage.js step1 录 allowedFilesHash

stage.js quick 启动录 baseline 后，算每个 allowedFile 的 sha256 存 guard.allowedFilesHash。文件不存在/读失败 try/catch 跳过。
