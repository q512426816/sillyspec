---
id: task-07
title: 修 skipStep platformOpts 未定义 bug
author: qinyi
created_at: 2026-07-07T07:43:24
priority: P2
depends_on: []
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - src/run.js
goal: >
  修复 skipStep 引用未定义 platformOpts 导致 --skip 命令崩溃的 ReferenceError。
implementation:
  - 改 skipStep 签名（run.js:3307）从 `(pm, progress, stageName, cwd, changeName)` 追加 `platformOpts = {}` 参数，与同级 waitStep/continueStep/completeStep 的取参方式对齐（它们经 options.platformOpts 拿到，skipStep 直接多带一个位置参数即可，调用点单一无需 options 包裹）。
  - 改唯一调用点 run.js:1588，从 `skipStep(pm, progress, stageName, cwd, effectiveChange)` 透传为 `skipStep(pm, progress, stageName, cwd, effectiveChange, platformOpts)`（platformOpts 在 runCommand 作用域内已于 run.js:1217 构造、随处可见，调用点直接引用即可）。
  - 函数体内 line 3328 `platformOpts?.specRoot` 与 line 3339 `triggerSync(cwd, changeName, platformOpts)` 以及 line 3346 `outputStep(..., platformOpts)` 此时引用的是新签名参数，不再炸 ReferenceError。
acceptance:
  - 跑 `sillyspec run <stage> --skip` 不再抛 `ReferenceError: platformOpts is not defined`，能正常把当前 step 标 skipped 并触发 sync。
  - 非平台模式（platformOpts 为默认 `{}`）行为与修复前一致：getStageSteps 第三参为 null、triggerSync 静默、outputStep 走非平台分支。
verify:
  - `npm test` 全量通过（现有用例不回归）。
  - 手动在一个活跃变更上跑一次 `sillyspec run <stage> --skip`，确认无 ReferenceError 且 step 状态正确推进。
constraints:
  - 仅改 skipStep 签名 + 其唯一调用点透传，不动 skipStep 内部其他逻辑（optional 判定、waiting 拦截、next step 输出等保持原样）。
  - 附带候选，非本变更核心（execute deps 门控死锁修复）；成本极低所以纳入本变更顺手修，若 review 认为越界可降级单开变更。
  - 不引入 options 包裹对象（skipStep 调用点唯一，位置参数即可，避免无谓改造）。
---
