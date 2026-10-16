---
author: flow-machine-draft
created_at: 2026-10-16T00:25:50.314Z
---
# 任务注册表（Tasks）— 2026-10-16-spec-sync-fail-alarm

- [x] task-01: spec-sync POST/GET 清单失败时告警行含平台响应体的 code/message（有则带 details.path），不再只有状态码
- [x] task-02: 同一 label 连续失败 ≥3 次后告警行升级为显式 🚨 提示；任一次成功后计数清零
- [x] task-03: npm test + npm run lint 实测通过（flow done 门禁）
