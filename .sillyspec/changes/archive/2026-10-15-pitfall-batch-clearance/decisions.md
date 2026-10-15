---
author: zcode-pitfall-clearance-1015
created_at: 2026-10-15 08:20:00
---

# 决策记录（Decisions）

## D-001@v1: stage-review 错位目录读侧容错（不搬文件不改 marker 形态）
- type: architecture
- priority: P1
- status: accepted
- source: docs
- question: 目录命名三方不一致（skill 文档/marker 值/CLI 期望）如何归一
- answer: 读侧三级探测容错（规范 → 双前缀 → 裸 runId），写入侧恒规范路径，SKILL.md 口径统一为「目录名 = <stage>- + marker 值原样」
- normalized_requirement: resolveStageReviewDir 是 stage-review 读侧目录定位唯一入口；validateStageReview/autoRefresh/refresh-hash 三读点统一走它
- impacts: [FR-06, task-06]
- evidence: 消费仓 docs/sillyspec/stage-review-dir-naming-mismatch.md 三阶段连环实证；src/stage-review.js resolveStageReviewDir
- 故障面: 容错探测每读点三次 existsSync（可忽略）；错位文件永不迁移可能在 stage-reviews/ 长期共存（审计面可见 docHash 刷新留痕）
- 退役判据: 存量错位目录自然消亡且 skill 文档新口径运行一个季度无新错位报告时可收敛为单形态探测

## D-002@v1: 错位目录归一否决「marker 值改为完整目录名」
- type: compatibility
- priority: P2
- status: rejected
- source: docs
- question: 是否把 marker 值从裸 runId 改为完整目录名实现一个真相源
- answer: 否决，选读侧容错
- normalized_requirement: marker 文件值形态保持裸 runId（review-<ts>）不变
- impacts: [FR-06]
- evidence: getLatestStageReviewRunId 的 marker 校验/fallback 扫描/prompt 注入三处消费链按裸 runId 契约写死，改值形态破坏存量 marker 读取兼容需全链迁移
- 否决理由: 改 marker 写入形态破坏全部存量 marker 读取兼容（getLatestStageReviewRunId 校验 review- 前缀、prompt {STAGE_REVIEW_RUN_ID} 注入、fallback 扫描三处按裸 runId 契约），迁移成本与风险远高于读侧 existsSync 容错
- 复潮条件: 出现 marker 值与目录名形态再次分叉的系统性新需求（如 per-change 多 review 并存需目录名携带更多语义）时重议

## D-003@v1: archive 完成度缺口走「批量完成自动补草稿」而非「复合真相源」
- type: architecture
- priority: P1
- status: accepted
- source: docs
- question: Task Review 退役后 archive step2 真相源（review.json）天然缺失如何对齐两层
- answer: detectExecuteBatchFinish 复核循环前调既有 generateTaskReviewDrafts 幂等补缺失草稿（挂在 runId marker 读取前，run 缺失一并建立）；archive 真相源语义不变
- normalized_requirement: 批量完成路径必须先补缺失 per-task review 草稿再跑复核循环；单步路径/completeStep 主体零草稿兜底（task-review-retire 钉 ② 更新为该契约）
- impacts: [FR-07, task-07]
- evidence: 消费仓 docs/sillyspec/task-review-retired-archive-mismatch.md 归档门口 4/4 缺失实证；src/run/complete.js detectExecuteBatchFinish；test/pitfall-batch-review-backfill.test.mjs
- 故障面: cannot_verify 草稿计数为 completed（summarize 单列 cannotVerifyCount 可见）——草稿≠真验过，verify 兑证/人工复核仍是升级通道
- 退役判据: archive 完成度判定改为 tasks.md+acceptance 复合真相源时本钩子可退化为 advisory

## D-004@v1: archive 复合真相源方案否决
- type: architecture
- priority: P2
- status: rejected
- source: docs
- question: 是否把 archive step2 真相源改为 tasks.md checkbox + execute acceptance review 复合判定
- answer: 否决，选 D-003 自动补草稿
- normalized_requirement: summarizeTaskCompletion 的 review.json 真相源口径不变
- impacts: [FR-07]
- evidence: 坑文件修复建议两选一；task-review.js summarizeTaskCompletion 消费面（archive prompt/index verify-probes 预填/consistency-doctor）三处同源
- 否决理由: 复合真相源改动语义面大（summarize 三消费方连锁）且与 backfill-reviews 手动通道先例冲突；自动补草稿复用既有幂等生成器，改动收敛在批量完成单点
- 复潮条件: 草稿补齐路径在生产再出现「草稿冒充完成」误判（cannot_verify 被当 pass 消费）时重议复合真相源

## D-005@v1: 对账 EOL-only 过滤用配对探测（正向信号才剔）
- type: architecture
- priority: P1
- status: accepted
- source: code
- question: 如何在不动 git 三源对账结构的前提下剔除纯行尾差异假红
- answer: 每个 plain diff 源配一次同范围 --ignore-cr-at-eol --numstat 对照，差集=纯行尾差异才剔（absence-based 不可用）；未跟踪豁免；探测失败 fail-open
- normalized_requirement: 剔除判定必须「正向出现在 plain diff 且内容零变更」；--name-only 不吃 --ignore-cr-at-eol（git 实测），内容过滤走 --numstat
- impacts: [FR-05, task-05]
- evidence: 消费仓 verify-close-gate-staggered-exposure 建议④ gen:types 零内容 diff 假红；src/verify-postcheck.js resolveReconcileActualFiles 配对探测；test/pitfall-reconcile-eol.test.mjs 双场景
- 故障面: post-apply 全量并入 main 后 B1 基点=分支 tip，已提交行尾重写不进 plain diff 不过滤（保守保留，软 note 无）——仅工作树与 form A 已提交段两探测面覆盖
- 退役判据: 仓统一定 .gitattributes 行尾策略后 gen 类脚本不再产纯行尾 diff 时可退役

## D-006@v1: 代勾证据源收敛为 subject token × allowed_paths 交叠
- type: architecture
- priority: P0
- status: accepted
- source: docs
- question: full-autopilot 代勾如何加实现事实锚
- answer: 提交 subject 行（%s）的 task-NN token 为证据，卡面 allowed_paths 在场时要求提及该 task 的提交触及面与声明面交叠（parseAllowedPaths+pathMatches 与草稿归属同口径）；无卡面退化仅 subject；shouldAutoCheckTask 草稿守卫 ctx 缺席同样保守不勾
- normalized_requirement: 提交正文（body）散文提及的 task 号一律不作为代勾证据；%x1e 分隔符前置（%x1e%s）保证 subject 与文件清单配对不错位
- impacts: [FR-08, task-08]
- evidence: 消费仓 wt-commit-auto-tick-unimplemented-tasks 两次实证（task-01 提交后 02/03/04 全被勾）；src/run/complete.js autoTickTasksFromCommitSubjects；test/pitfall-autotick-anchor.test.mjs
- 故障面: 漏勾方向保守（卡面 allowed_paths 声明面与实际改动不符时退化人工勾选）；execute-batch 两用例的「ctx 缺省草稿照勾」向后兼容钉随本决策更新为保守不勾
- 退役判据: task 完成事实锚出现更权威信号（如 review verdict 全链在场）时可退化为纯 review 锚
