---
author: qinyi
created_at: 2026-09-06T23:48:52+08:00
---

# 决策记录（Decisions）

## D-001@v1: 本变更范围 = IR 提案 P3a，不含 P3b/c/d
- type: boundary
- priority: P1
- status: accepted
- source: docs
- question: 本次变更覆盖 IR 五阶段提案的哪些分期？
- answer: 仅 P3a（种子稿第 6 节）：plan 侧 task 卡 target_files 声明 + execute 侧机器对账（scope creep 检出）。P3b（verify 结论表）、P3c（design facts）、P3d（archive delta 回灌）各自独立变更立项。
- normalized_requirement: 本变更不改 verify-probes/contract-matrix/design 产物模板/archive 流程；plan/execute 侧字段声明与对账门禁是唯一交付面
- impacts: [FR-01, FR-02, FR-03]
- evidence: docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md §6 分期建议

## D-002@v1: 方案A 双gate分治——plan 声明核验 + verify 对账，change 级 worktree diff 权威
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 对账的数据来源与门禁挂载点选哪种？
- answer: 用户选方案A（2026-09-06 对话轮）：plan 侧 task 卡 target_files 声明 + plan-postcheck 新增声明核验检查；verify 侧新增对账检查，Σ(target_files) vs resolveVerifyChangedFiles（change 级 worktree diff，机器权威）算三类差集。拒绝方案B（per-task 对账押在 agent 手写 changedFiles 上，违背「CLI 算事实不信任 agent 自报告」约定，其归因价值降级为对账报告附注）与方案C（advisory 无门禁力，违背种子稿「对账 gate」意图）。
- normalized_requirement: 对账事实来源必须是机器 diff（resolveVerifyChangedFiles），不得依赖 agent 抄写；②类（声明没做）= ERROR，③类（做了没声明）= WARNING（过滤口径沿用 filterDeliverableFiles）；存量 task 卡无 target_files 字段 = WARNING 跳过对账，不产生存量红门禁
- impacts: [FR-01, FR-02, FR-03]
- 模块域: stages, core-engine, runtime
- evidence: 用户方案选择轮（brainstorm Step 4，2026-09-06）；docs/sillyspec/archify-ir-stage-proposal-2026-09-05.md §3/§6

## D-003@v1: 变更完成后必须向用户提醒 P3b/c/d 后续分期
- type: risk
- priority: P2
- status: accepted
- source: user
- question: 用户要求本变更完成后提醒后续分期（防遗忘），如何持久化？
- answer: 用户原话「做完这个你记得跟我说后续的哦，不然我可能会忘」。落两处：design.md 非目标章节列 P3b/c/d 为待立项后续变更（含各自前置条件）；本变更归档收尾与交付消息中明确列出。
- normalized_requirement: 本变更 archive 阶段收尾输出必须包含 P3b/c/d 分期提醒；design.md 非目标章节必须含后续分期清单
- impacts: [task-收尾]
- evidence: 用户对话轮（brainstorm Step 4 方案选择，2026-09-06）

## D-004@v1: Design Grill 修正四项——gates 接线 / 三源 actual 口径 / ctx=null / prompt 锚点
- type: consistency
- priority: P0
- status: accepted
- source: design-grill
- question: 独立审查（brainstorm-review-2026-09-07-000027）发现 2 P0 + 2 P1 结构性问题，如何修正？
- answer: ①B-1：reconcileTargetFiles 必须接线进 src/run/gates.js verify 块（verify 侧唯一接线点，原「零改动」措辞自相矛盾——不接线则 ②类 ERROR 永不触发）；改为「不改既有五项检查，仅新增一条调用」。②B-2：actual 侧三源并集（worktree 存活=resolveVerifyChangedFiles+includeWorkingTree；post-apply=主仓 tracked diff ∪ status --porcelain --untracked-files=all ∪ apply-pathspec 兜底）——apply 不暂存新文件且 cleanup 删 meta，单源口径下 NEW: 声明全数假红。③B-3：reconcileTargetFiles 显式 ctx=null（跨仓 diff 不并入，对齐 runVerifyTestCheck 先例）。④B-4：prompt 锚点从 src/run/prompt.js 修正为 src/stages/plan.js + templates/prompts/taskcard-rules.md。原 R-05「不存在中间态」论据被证伪，删并重立 R-05/R-06。
- normalized_requirement: design.md 文件清单必须含 src/run/gates.js 与 src/stages/plan.js；对账 actual 口径必须覆盖 worktree 存活与 post-apply 两形态且有测试矩阵锁定；跨仓不进对账
- impacts: [FR-02, FR-03]
- 模块域: stages, core-engine, runtime
- evidence: .sillyspec/.runtime/stage-reviews/brainstorm-review-2026-09-07-000027/review.json（16 项 checklist）；src/run/gates.js:595-668；src/worktree-apply.js:1105/:1145；src/verify-postcheck.js:907-966

