---
id: task-08
title: 'wave-task-complete-gate'
title_zh: 'Wave 步骤完成度门——assertWaveTasksComplete 在 Wave N --done 前校验本 Wave checkbox 全勾（fail-closed）+ 直测'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-17 18:28:03
priority: P0
depends_on: ['task-05']
blocks: []
requirement_ids: [FR-12]
decision_ids: [D-013@v1]
allowed_paths:
  - src/run/complete-handlers.js
  - src/run/complete.js
  - NEW:test/wave-task-complete-gate.test.mjs
  - test/run-complete-step-execute-batch.test.mjs
target_files:
  - src/run/complete-handlers.js
  - src/run/complete.js
  - NEW:test/wave-task-complete-gate.test.mjs
  - test/run-complete-step-execute-batch.test.mjs
goal: >
  execute 完成名为「Wave N 执行」的步骤时 fail-closed 校验本 Wave 任务完成度（先幂等
  autoCheckPlanFromReviews，再核对 plan.md Wave N 段全部 task 的 tasks.md checkbox），
  任一未勾即 exit 1——堵「未完成 Wave 被 --done 静默标完成」的执行期缺口（本变更执行中
  Wave 2 越位实证：review write 退出码被 shell 管道吞掉后 --done 落在下一 Wave，既有防护
  --step 断言可选、并发横幅仅 warn 均非阻断）。
implementation:
  - '新增导出 assertWaveTasksComplete({ steps, currentIdx, changeName, cwd, specBase, platformOpts })（src/run/complete-handlers.js）：仅当 steps[currentIdx].name 匹配 /^Wave (\d+) 执行$/ 时生效，其他步骤名直接 return（零行为变化）'
  - '生效路径：①动态 import ../task-review.js autoCheckPlanFromReviews 幂等先行（review pass 自动勾选，D-013）；②解析 plan.md——动态 import stages/execute.js 的 Wave 段解析（parseWavesFromPlan 同源逻辑或直接正则 /^## Wave N/ 段内 task-\d+ 引用行），取本 Wave 任务 ID 列表；③读 tasks.md checkbox 行，逐 ID 核对已勾；④任一未勾 → console.error 列未勾清单 + 两条出路（补任务实现与 review write 后重跑 --done / 确属误推进则 sillyspec run execute --reopen --from-step <N>）+ process.exit(1)'
  - 'plan.md 无该 Wave 段（隐式 Wave/light 计划无显式段头）→ console.warn 说明放行依据后 return（fail-open，不破坏 D-003@v1 隐式串行语义）；plan.md/tasks.md 读取失败 → warn 放行（fail-open，不因文档瞬态锁死流程）'
  - '接线：src/run/complete.js 在 steps[currentIdx].status = "completed" 赋值之前、并发 --done 防护段之后调用 assertWaveTasksComplete（await，异常 fail-open warn 不阻断——门自身的异常不锁死完成路径，但正常判定路径必须硬拦）'
  - 'NEW:test/wave-task-complete-gate.test.mjs：①全勾放行（不抛/不 exit）②任一未勾 → exit 1 且错误文案含未勾 task ID 与 --reopen 指引③无 Wave 段 warn 放行④autoCheck 先行幂等（已有 pass review + 未勾 checkbox 的夹具跑后 checkbox 被勾、门放行）⑤步骤名非 Wave N 执行 → 零行为'
acceptance:
  - Wave N 步骤 --done 时本 Wave 任一 task checkbox 未勾 → exit 1，错误含未勾清单与两条出路（FR-12 GWT1）
  - 全勾（含经 autoCheck 自动勾选）→ 放行，步骤正常推进（GWT2）
  - plan.md 无该 Wave 段 / 文档读取失败 → warn 放行不误伤隐式 Wave 计划（GWT3）
  - 非 Wave 步骤名 → 零行为变化；门自身异常 → fail-open warn 不阻断完成路径
verify:
  - npm test
  - node --test test/wave-task-complete-gate.test.mjs
  - npm run lint
constraints:
  - 不改 autoCheckPlanFromReviews / detectExecuteBatchFinish 既有语义（门只在其前消费）
  - fail-closed 仅限「正常判定路径」，门自身异常 fail-open（不因门 bug 锁死全部 execute 完成）
  - 不引入新依赖；Wave 段解析与 stages/execute.js 同源口径（不造第二套解析）
related_tests: []
---

<!-- 骨架由 sillyspec taskcard 生成（LF 行尾 + frontmatter 已闭合 + 硬校验 9 字段齐全）。
     用 Edit tool 填充上方占位符（allowed_paths/goal/implementation/acceptance/verify/constraints 等），
     勿用 Write 整文件重写——会引入 CRLF 行尾/漏闭合 ---/漏字段回归。 -->
