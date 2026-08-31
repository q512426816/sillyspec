---
id: task-01
title: marker write atomic + tiered fail
title_zh: "#1 四处 marker 写入原子化+分层 fail"
author: qinyi
created_at: 2026-08-16 23:25:00
priority: high
depends_on: []
blocks: [task-04]
allowed_paths:
  - src/run/stage.js
  - src/run/gates.js
  - src/run/prompt.js
  - src/task-review.js
  - test/execute-run-dir-fail-loud.test.mjs
goal: marker 写入与 execute-runs/<runId>/tasks/ 目录创建原子化，失败分层留痕/阻断（D-001@v1）
implementation: |
  四处写入点（stage.js:96-112 主点 / gates.js:444 / prompt.js:518 / task-review.js:795）：
  mkdirSync(join(runtimeRoot,'execute-runs',runId,'tasks'),{recursive:true}) 先于 writeFileSync(marker)；
  失败分层——stage.js 直接 throw（execute 启动即失败）、gates.js gate 内 throw（外层 fail-closed）、
  prompt.js console.error + 保留降级（渲染路径）、task-review.js 去 catch 静默保 fail-open 契约（至少 console.error）。
  测试：tmp fixture 验证不变量（写 marker 后目录必在）+ 分层语义（mock 只读 fs 场景 stage throw / task-review 留痕不抛）。
  注意：task-review/gates/prompt 既有测试如断言静默行为需同步适配（改断言不改测试意图）。
acceptance:
  - 四处写入点均"目录先于 marker"（不变量：marker 在则目录在）
  - 分层 fail 语义有测试（stage throw / gates 阻断 / prompt 留痕 / task-review 去静默）
  - 既有 211 测试全绿（适配后）
verify: node --test test/execute-run-dir-fail-loud.test.mjs + npm test
constraints: 不改 generateTaskReviewDrafts 的 fail-open 契约（只去静默）
---

