---
author: flow-machine-draft
created_at: 2026-10-16T00:25:50.314Z
---
# 提案书（Proposal）— 2026-10-16-spec-sync-fail-alarm

## 动机

任务原话转写：spec-sync 失败告警升级——响应体落日志+连续失败计数升级（生产索引损坏事故后的可观测性加固）

动机与背景：2026-10-16 生产 postgres 索引静默损坏事故中，spec-sync 对平台 422 业务错误只打状态码不打响应体（真因 HTTP_422_SPEC_BUNDLE_INVALID+具体路径是手动重放请求才拿到），且失败走『下次自动重试』无限静默循环——归档半态（本地已归档、平台显示进行中）挂数小时无人知晓。本变更给 syncSpecTree 加两道可观测性护栏：①非 2xx 响应体解析进告警行（code+message+details.path）；②按 label 的连续失败计数持久化（specRoot/.runtime/spec-sync-fail-streak.json），连续 ≥3 次升级为 🚨 显式告警并提示平台文件树可能持续落后，成功即清零。新增 .runtime 运行时文件类型，按 CLAUDE.md 规则 19 同步 file-lifecycle.md。

成功标准：
- spec-sync POST/GET 清单失败时告警行含平台响应体的 code/message（有则带 details.path），不再只有状态码
- 同一 label 连续失败 ≥3 次后告警行升级为显式 🚨 提示；任一次成功后计数清零
- npm test + npm run lint 实测通过（flow done 门禁）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. spec-sync POST/GET 清单失败时告警行含平台响应体的 code/message（有则带 details.path），不再只有状态码
2. 同一 label 连续失败 ≥3 次后告警行升级为显式 🚨 提示；任一次成功后计数清零
3. npm test + npm run lint 实测通过（flow done 门禁）

## 成功标准（可验证）

1. spec-sync POST/GET 清单失败时告警行含平台响应体的 code/message（有则带 details.path），不再只有状态码
2. 同一 label 连续失败 ≥3 次后告警行升级为显式 🚨 提示；任一次成功后计数清零
3. npm test + npm run lint 实测通过（flow done 门禁）
