---
author: qinyi
created_at: 2026-09-11T09:55:00+0800
---

# 决策记录

## D-001@v1 摩擦触发经验沉淀的触发器形态：CLI 结构化计数
- 状态：confirmed
- 类型：architecture
- 模块域：runtime
- 问题：摩擦信号自动触发经验沉淀，触发器由谁判定——agent 读报告自判、hook 旁挂 transcript 分析、还是 CLI 状态机埋点计数？
- 答案：**CLI 状态机埋点计数 + 收尾 advisory 提示**（方案 B）。埋点选摩擦事件流经 CLI 自身状态机的三个高信噪比位置：gate 失败回滚（rollbackCompletionAndReturn）、verify test/lint 实测失败、审查 verdict=fail；计数非零时在 quick/verify --done 收尾输出一行提示，建议按 现象/根因/护栏/证据 补 postmortem（与 verify.js/doctor.js 已有 advisory 同一落点链路，不新建命令）。
- 否决理由：方案 A（hook 旁挂 transcript 分析，teamai 原样）——摩擦事件本就流经 sillyspec 状态机，绕道猜 transcript 是降级，且触碰对话原文违反隐私红线；方案 C（计数非零自动写 QUICKLOG 草稿）——agent 为消除提示而灌水反而污染知识库，人判是知识质量最后闸门。
- 复潮条件：若未来出现流经 CLI 之外的摩擦源（如 agent 宿主侧 ESC 打断需要统计），可重议 transcript/hook 采集。
- normalized_requirement：触发器由确定性代码从结构化信号算出（同 docs-debt D-006「CLI 算事实，agent 判语义」立场），不由模型自判。
- 影响：src/run/gates.js、src/run/verify-quality-scan.js、src/run/complete-handlers.js 新增埋点/输出；新增 src/friction-tally.js。
- source: user
- evidence: 2026-09-11 调研轮对话——用户对三点借鉴评估回复「干吧」实施第 1 点；方案对比见 brainstorm step4 --output。
- priority: P1

## D-002@v1 摩擦计数文件落点：.runtime 本机运行时区，禁止 changes/ 目录
- 状态：confirmed
- 类型：boundary
- 模块域：runtime
- 问题：按 change 维度的摩擦计数文件落哪——changes/<change>/（随变更文档）还是 .sillyspec/.runtime/（本机运行时区）？
- 答案：**落 .sillyspec/.runtime/friction-tally-<changeName>.json**；quick 会话落 .runtime/quick-sessions/<sessionId>/friction-tally.json；平台模式跟随 specBase 解析与 lint tally 同落点。**禁止落 changes/<change>/**。
- 否决理由：spec-sync.js UPLOAD_EXCLUDE_TOP_BASE（顶层排除 .runtime/runtime/projects）之外的一切都在平台同步面内——changes/ 下的文件会被平台当文档跨机同步，本机计数将污染其他机器；且跨机聚合行为信号本身触碰隐私红线。
- 复潮条件：若未来需要团队级摩擦聚合（须先过隐私评审），可重议同步策略。
- normalized_requirement：计数是本机视角信号，只在摩擦发生的那台机器上消费。
- 影响：src/friction-tally.js 路径解析；文档需记录该落点约束。
- source: user
- evidence: 2026-09-11 用户原话：「摩擦计数文件请落 .sillyspec/.runtime/ 下（本机运行时区，平台 spec 同步天然排除），不要落 changes/<change>/ 目录——平台会把 change 目录下的文件当文档跨机同步，本机计数会污染其他机器。」；spec-sync.js:24-26 代码核实。
- priority: P0

## D-003@v1 提示克制语义：全零静默、每收尾最多一行、提示后清零、可关默认开
- 状态：confirmed
- 类型：process
- 模块域：runtime, setup
- 问题：如何防止摩擦提示本身变成新噪音？
- 答案：照抄 teamai 的克制约束并适配：① 任何类型计数全零 → 收尾零输出（顺利会话零打扰）；② 每次收尾最多输出一行；③ 提示输出后计数清零（「每会话最多提示一次」的等价实现——同一段摩擦只提示一次）；④ 措辞保持「若其中有值得沉淀的坑」条件式（防 agent 为消除提示而制造记录）；⑤ local.yaml 新键 friction_hint.enabled，默认 true，可一键关。
- normalized_requirement：advisory 性质——提示失败/读取失败静默降级，绝不反向阻断收尾（同 verify-lint-tally「计数器不许反向阻断」立场）。
- 影响：src/friction-tally.js 提供读+清零接口；src/config-schema.js 注册 friction_hint.enabled；quick/verify --done 输出点。
- source: user
- evidence: 2026-09-11 调研轮评估报告「克制约束照抄 teamai」段；用户「干吧」确认。
- priority: P1

## D-004@v1 信号类型枚举与埋点边界（MVP 范围）
- 状态：confirmed
- 类型：scope
- 模块域：runtime
- 问题：哪些摩擦事件计入、哪些明确不做？
- 答案：计入三类：**gate_rollback**（gate 级联失败回滚，带 gate 来源标签：validators/verify-test/contract/stage-review/task-review）、**verify_run_failed**（verify test/lint CLI 实测失败）、**review_rejected**（审查 verdict=fail，走专属类型不与 gate_rollback 重复计——审查失败虽也经回滚路径，但语义独立）。明确不做（Non-Goal）：reopen/revision 计数消费、archive 输出点、wait/rounds 信号、stall 信号——留待 MVP 数据验证信噪比后再议。
- normalized_requirement：每类信号 = { count, lastAt, history 截尾 }，history 单条只含 { at, type, detail } 结构化字段。
- 影响：src/friction-tally.js 类型枚举；埋点调用方。
- source: agent（用户批准的评估报告）
- evidence: 2026-09-11 调研轮评估报告优先级表 #1。
- priority: P1

## D-005@v1 隐私红线：只落结构化信号，不落内容
- 状态：confirmed
- 类型：boundary
- 模块域：runtime
- 问题：摩擦计数允许落盘哪些信息？
- 答案：**只允许计数/类型/时间戳（+gate 来源标签、failure reason 摘要等结构化短字段）**；禁止落地提示词、对话原文、任务语义摘要。sillyspec 的信号从头到尾不接触对话内容，比 teamai（需对任务摘要脱敏）更干净。
- normalized_requirement：friction-tally.json 的任何字段值不得包含 prompt/对话文本。
- 影响：src/friction-tally.js 落盘字段设计。
- source: user
- evidence: 2026-09-11 调研任务书「隐私红线」段原文。
- priority: P0

## D-006@v1 Design Grill 修正包（independent 审查 3×P1 + 4×P2）
- 状态：accepted
- 类型：compatibility
- 模块域：runtime
- 问题：独立设计审查（agent-tool 通道，review.json 落 .runtime/stage-reviews/brainstorm-review-2026-09-11-095259/）发现的 design.md 缺陷如何处置？
- 答案：全部采纳修入 design.md——① CC-03（P1）verify 收尾 consume 补第二落点 complete.js continueStep ~1475（wait 解除完成路径，G-2 注释已记录该双路径陷阱）；② CC-04（P1）friction-tally.js 内部推导 specBase（platformOpts.specRoot || specDriftAnchor || cwd/.sillyspec，与 complete.js:125 同序），gates.js 尾参只带 type/detail；③ CC-05（P1）file-lifecycle.md 真实路径为仓根 docs/sillyspec/（.sillyspec/docs/ 下只有 modules/+scan/）；④ CC-02 调用点核正 16→13；⑤ CC-10 verify_run_failed 计入 advisory lint 失败（记录条件与 throw 条件解耦）；⑥ CC-11 标签图补 verify-lint@697；⑦ CC-12 归档时 pruneArchivedChangeRuntime 清 friction-tally，放弃变更残留接受（R-06）。
- normalized_requirement：design.md v2（本版）已含全部修正；无 unresolved blocker。
- 影响：design.md 总体方案/文件清单/风险登记/自审各节；新增 R-06。
- source: design-grill
- evidence: .sillyspec/.runtime/stage-reviews/brainstorm-review-2026-09-11-095259/review.json（specVerdict: pass, qualityVerdict: fail → 修正后放行）。
- priority: P1
