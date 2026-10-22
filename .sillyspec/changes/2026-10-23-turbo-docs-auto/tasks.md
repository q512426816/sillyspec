---
author: flow-machine-draft
created_at: 2026-10-22T23:49:53.216Z
---
# 任务注册表（Tasks）— 2026-10-23-turbo-docs-auto

- [x] task-01: readFlowConfig 增 turboDocsAuto 键（三态 fail-soft）＋quick-audit 两个分类器常量加 export——验证：unit 三态
- [x] task-02: cmdFlowDone turbo 双源解析（turboSource/turboLabel/授权源留痕行/fail-closed 判面）＋实测门 reason 换 turboLabel——验证：temp 仓手工跑降档与全量两态
- [x] task-03: 新增 test/turbo-docs-auto.test.mjs（①配置+纯文档面完成无任务书+授权源行 ②同面未配置任务书照常 ③配置+src 面不降档 ④旗标档 reason 原样＋键三态 unit）全绿＋turbo-mode-done-skip 既有面回归——验证：node --test 批跑
