---
author: flow-machine-draft
created_at: 2026-10-13T12:01:44.383Z
---
# 任务注册表（Tasks）— 2026-10-13-commit-guard-s3
- [x] task-01: 测试先行——test/commit-guard.test.mjs 增 S3 用例：analyzeIndexDivergence 四态纯函数 + 真实 git 钩子集成三场景（055080e4 形态必告警放行/干净 pathspec 零告/全量提交零告）；先跑红
- [x] task-02: 实现——S3 纯函数 + main 接线（GIT_INDEX_FILE 护栏两形态 + rev-parse --git-path index 解析 + 双 ls-files -s 快照比对 + 警告/留痕）；新用例全绿
- [x] task-03: 回归——既有 commit-guard S1/S2 断言零改动全绿 + lint + 全量 npm test
