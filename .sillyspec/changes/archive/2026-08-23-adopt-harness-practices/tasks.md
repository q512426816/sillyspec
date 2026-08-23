---
author: qinyi
created_at: 2026-08-23T21:10:00+08:00
---

# 任务（Tasks）— 2026-08-23-adopt-harness-practices

> 任务注册表唯一真相；Wave 分组与依赖见 plan.md。实现细节在 execute 期写入 tasks/task-NN.md。

## Wave 1 — W1 基础

- [x] task-01: decisions.md 契约扩展（brainstorm Step6 模板四可选字段：锚点/模块域/否决理由/复潮条件） (depends_on: —)
- [x] task-02: 新增 src/decision-distill.js 纯函数（入选规则/幂等/supersedes/needsWait/域三级兜底 + knowledge INDEX.md 路由行幂等写入） (depends_on: task-01)

## Wave 2 — W1 接线 + 测试

- [x] task-03: archive.js 插入 decision-distill 步骤（conditionalWait）+ 末步 git add knowledge/decisions/ (depends_on: task-02)
- [x] task-04: knowledge-match 扩展 + decisionHits + run/prompt.js brainstorm Step2 注入（消费侧；INDEX 路由行由 task-02 写入） (depends_on: task-02)
- [x] task-05: docs-debt 导出 computeModuleBehind + docs-check 决策规则族（advisory）+ doctor 决策待复核检查项 (depends_on: task-02)
- [x] task-06: test/decisions-lifecycle.test.mjs（含归档中途兼容与旧格式容错） (depends_on: task-01,02,03,04,05)

## Wave 3 — W2 轻量 postmortem

- [x] task-07: quicklog.js 根因块嵌套四子字段解析（顶层边界不动） (depends_on: —)
- [x] task-08: quick.js :103 警告文案修正 + step3 模板四子字段提示 (depends_on: task-07)
- [x] task-09: verify/doctor 触发提示段 + 证据引用指引 + 护栏回流链路确认 (depends_on: task-05, task-08)
- [x] task-10: test/quicklog-postmortem-fields.test.mjs (depends_on: task-07,08,09)

## Wave 4 — W3 检查选择 + 收尾

- [x] task-11: config-schema 枚举扩 + 新键 decisions.behind_threshold + verify-postcheck skip 真跳过接线 + evidence-auto 推荐逻辑 + config-schema.test 防漂断言 (depends_on: —)
- [x] task-12: run/prompt.js verify 分支 evidence-auto 占位符注入 (depends_on: task-11)
- [x] task-13: verify.js 检查选择指引 + _globalGuardrails 修订 + skip/evidence-auto 语义回归测试（含占位符注入与降级路径） (depends_on: task-11,12)
- [x] task-14: docs/prompt 镜像同步（brainstorm/verify/archive/quick 四处 + README.md 占位符表；_extract.mjs sanity 断言） (depends_on: task-01,03,08,13)
- [x] task-15: dogfood 验证（本变更归档走 decision-distill，按入选规则预期落库 5 条）+ 历史决策种子回填 (depends_on: task-03,06)
