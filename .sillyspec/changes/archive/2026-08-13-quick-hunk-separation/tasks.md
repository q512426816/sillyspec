---
author: qinyi
created_at: 2026-08-13 13:26:51
---
# 任务清单（Tasks）— quick --done 同文件并发检测

- [ ] task-01: stage.js step1 录 allowedFilesHash（算 sha256 存 guard，容错读，~line 270 baselineCommit 附近）
- [ ] task-02: shared.js auditQuickCompletion 末尾加同文件并发检测 + warn（用 isBaselineFile 避目录折叠盲区，插入 try 内末尾）
- [ ] task-03: 同步 docs/sillyspec/file-lifecycle.md（guard allowedFilesHash schema）+ .claude/skills/sillyspec-quick/SKILL.md（同文件并发提示）
- [ ] task-04: 补 test/quick-same-file-concurrent.test.mjs（检测测试：allowedFile 在 baseline + hash 变 → warn；旧 guard 跳过；advisory 不阻断）
- [ ] task-05: 验证 npm test + lint
