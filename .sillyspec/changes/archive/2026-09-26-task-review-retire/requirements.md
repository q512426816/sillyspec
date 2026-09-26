---
author: flow-machine-draft
created_at: 2026-09-26T02:31:44.113Z
---
# 需求规格（Requirements）— 2026-09-26-task-review-retire

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: gates.js 三处消费门退役
Given execute 阶段完成（或 doctor --align-execute-progress --confirm）；When 阶段完成门级联/align 前置门执行；Then 不再校验任何 per-task review.json——Execute Task Review Gate 整块（含豁免分支）与 enforceReviewJsonGate 导出删除，enforceAlignExecuteReviewGate 只剩 Stage Review 段+豁免头（Stage Review 保留面不变）。

### FR-02: 生成侧停写（勾选自动化迁移）
Given execute 任一步 --done 或 execute 阶段完成；When CLI 走 completeStep；Then 不再调 autoCheckPlanFromReviews 自动勾选 tasks.md、不再跑 generateTaskReviewDrafts per-task 草稿兜底；勾选唯一写入者回归 agent 手动（完成=实现+测试绿+wt-commit 即勾），假勾防线由 detectExecuteBatchFinish 内 checkExecuteCodeEvidence + verify 测试对账承担。

### FR-03: execute 指引手动勾选语义
Given buildWavePrompt 渲染（main/dispatch 两模式）；When 注入执行方式/调度要求段；Then 指引为「手动勾选 tasks.md 对应 checkbox（完成=实现+测试绿+wt-commit 即勾，同 thin 工作单元语义）」，Task Review Gate 指引段/「CLI 自动勾选」/「写 review.json 即可」句退役；QA 子代理（阶段级）保留但分层前提改写（无 task review 层）；跨仓回收段 head 锡点自动落盘承诺（随 enforceReviewJsonGate 删除）改为可选手写；brainstorm/plan/execute 旧「降级自审」句删除（review-unsupervised.md 豁免句在场）。

### FR-04: verify-required-evidence.json 兼容读
Given verify 阶段加载证据账；When 检查 verify-required-evidence.json；Then 该文件随 Task Review 退役停写——在场则消费（历史变更兼容读），缺席=无 cannot_verify 任务、不阻断；verify「逐项检查任务」步勾选口径句改手动语义。

### FR-05: 模块保留面
Given 历史归档变更的 doctor/回放兼容读侧；When 引用 task-review.js / stage-review.js；Then 模块与既有导出保留不删（validateTaskReviews/validateCheckedTaskReviews/generateTaskReviewDrafts 等），仅 writeVerifyRequiredEvidence 与 printReviewResult 两个零引用导出按 22e-b 死码裁决删除；review write / backfill-reviews / task-done 兼容路径不动。

### FR-06: 测试面（门拦截测试重写/删 + 退役钉）
Given 本变更交付的测试；When 跑受影响清单；Then align-execute-review-gate 场景①③语义翻转+⑤源码退役钉、review-unsupervised-exit 消费点钉收窄为两处+退役钉、execute-run-dir-fail-loud 写入点收窄三处+退役行为钉、stage-completion-atomicity (f)(g) 零消费钉、execution-mode-render/dispatch-contract/task-truth-unify 契约翻转；新增 test/task-review-retire.test.mjs（三消费点退役钉+勾选新文案钉+模块保留钉）。

### FR-07: 全量测试绿
Given .sillyspec/local.yaml commands.test（npm run test:core）与 commands.lint；When 收口实测；Then test:core 180/180 通过、lint 通过、受影响测试清单（22 文件）全绿。

### FR-08: 知识面收尾
Given R18 实证知识沉淀；When 收尾 knowledge 维护；Then known-issues.md 新增「Task Review 层已退役」条目（状态🟢 已退役、指向本变更号 2026-09-26-task-review-retire，含 R18 实证依据与假勾防线交接说明）。
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: src/run/gates.js 三处消费门退役：Execute Task Review Gate 整块删除（含 review-unsupervised 豁免分支）、enforceReviewJsonGate 函数体退役、enforceAlignExecuteReviewGate 的 Task Review 段删除（doctor 门只留 Stage Review 段+豁免头）
FR-02: 生成侧停写：complete.js 不再调用 autoCheckPlanFromReviews 与 generateTaskReviewDrafts 兜底
FR-03: execute.js 指引三处改为手动勾选语义（完成=实现+测试绿+wt-commit 即手动勾 checkbox）
FR-04: src/stages/verify.js 对 verify-required-evidence.json 改兼容读（随 Task Review 退役停写，在场则消费，缺席不阻断）
FR-05: src/task-review.js 与 src/stage-review.js 模块保留不删（历史归档兼容读侧）
FR-06: 门拦截测试重写/删除（align-execute-review-gate / review-json-field-gate），新增三消费点退役钉用例（源码文本钉+勾选新文案在场）
FR-07: 全量测试绿
FR-08: .sillyspec/knowledge/known-issues.md 中 R18 系列 task-review 形式拦截条目状态更新为已退役并指向本变更号
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/task-review-retire.test.mjs「① gates.js 三处消费门退役」；test/align-execute-review-gate.test.mjs 场景①③+⑤；test/review-unsupervised-exit.test.mjs「② 消费点接线钉」退役断言；test/stage-completion-atomicity.test.mjs (f)(g)（validateTaskReviews 零消费）。

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/task-review-retire.test.mjs「② complete.js 生成侧停写（批量完成与代码证据核验保留）」；test/execute-run-dir-fail-loud.test.mjs 场景⑤（execute-runs 损坏不再阻断完成）；test/execute-batch-endtoend-checkbox.test.mjs / test/run-complete-step-execute-batch.test.mjs（批量完成不回归）。

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/task-review-retire.test.mjs「③ 勾选迁移文案钉」；test/execution-mode-render.test.mjs T3（两模式手动勾选在位、Task Review Gate 退役）；test/dispatch-contract.test.mjs 退役钉；test/task-truth-unify.test.mjs「prompt 契约：勾选回归 agent 手动」。

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/task-review-retire.test.mjs「③ 勾选迁移文案钉」verify 口径句断言；test/task-truth-unify.test.mjs verify 逐项检查步断言。（verify-required-evidence.json 缺席不阻断的既有行为由 gates.js verify 收口路径既有测试面覆盖，本变更未改其消费逻辑。）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/task-review-retire.test.mjs「④ 保留面钉：task-review.js / stage-review.js 模块兼容读侧在场」；test/review-json-field-gate.test.mjs + test/execute-run-marker-drift.test.mjs（模块纯函数兼容读侧语义不变）；test/backfill-reviews.test.mjs / test/task-done.test.mjs（兼容路径不回归）。

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/task-review-retire.test.mjs 全部四节（本变更新增退役钉用例）；各重写测试文件见 FR-01/02/03 绑定行。

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
npm run test:core（180/180，local.yaml commands.test 实测面）+ npm run lint（未引用导出 0 项）+ 受影响清单 22 个测试文件全绿（本次会话实测，exit 全 0）。

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：知识文档更新（known-issues.md 新增已退役条目），无行为面；其可追溯性由条目内变更号引用与归档目录锚定。
