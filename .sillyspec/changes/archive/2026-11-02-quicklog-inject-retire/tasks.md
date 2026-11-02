---
author: flow-machine-draft
created_at: 2026-11-02T13:30:00.000Z
---
# 任务注册表（Tasks）— 2026-11-02-quicklog-inject-retire

- [x] task-01: 摘除两处注入面（execute.js/prompt.js 的 matchQuicklogContext + renderQuicklogSection + quicklogIds）+ 删除 knowledge-quicklog.js 对应导出；knowledge-inject 回归绿
- [x] task-02: 测试适配（knowledge-quicklog.test.mjs 摘除已删功能用例；hotpath-cache 绿）+ 验收（eval 六探针五面零回归 + lint 绿）+ 提交
