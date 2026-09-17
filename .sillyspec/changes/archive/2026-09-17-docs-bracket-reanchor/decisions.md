---
author: zcode-feedback-hardening-20260917
created_at: 2026-09-17
generated_by: agent
change: 2026-09-17-docs-bracket-reanchor
---
# 决策记录（Decisions）— 2026-09-17-docs-bracket-reanchor

## D-001@v1: 方括号段=完整括号对并列形态，不做字符类放宽
- type: architecture
- priority: P0
- status: accepted
- source: proposal 方案对比①（design-grill CC-3 复核通过）
- question: 引用锚语法如何支持 Next.js 动态路由 `[id]`/`[cid]` 方括号路径？
- answer: 文件段展开循环迭代体并列第三种段形态 `\[类+\]`（与圆括号段同位同权），不把 `[`/`]` 加进普通段字符类。
- normalized_requirement: `REF_RE`/`SYMBOL_REF_RE` 迭代体 = `(?:\([类]+\)|\[[类]+\])[类]*`；迭代必含完整开闭同形括号对 → 划分唯一 → 线性（D-006@v1 docs-consistency 约束保持）；嵌套 `[[x]]` 行为与旧正则逐字节一致（部分提取残段）。
- impacts: [FR-01, task-01, task-03]
- evidence: src/docs-check.js:106-125（展开循环形头注）, test/docs-fix-capability.test.mjs:39-80（圆括号样板+ReDoS evil）
- 故障面: 散文形如 `arr[0].js:12` 从残段提取变全量提取（Grill CC-10 实测 invalid 计数 1→1 不变，无净增面）
- 退役判据: 引用锚迁移到结构化解析器（非正则）时本形态随 REF_RE 一并退役

## D-002@v1: 陈旧基线自动重锚（已实测不劣于远端即落盘），守卫拦 checkOpts 一次性覆盖
- type: architecture
- priority: P0
- status: accepted
- source: proposal 方案对比②（design-grill CC-5/CC-6/CC-9 修正后）
- question: docs gate 陈旧分支已实测「本次不劣于远端」后，基线文件要不要自动重锚？
- answer: 自动重锚——writeBaseline(current) + 消息披露重锚前后值与依据；守卫拦 checkOpts 四键（paths/skip/keywordAssert/crossRepoRoots）任一显式传入（一次性异口径不写盘），不拦 local.yaml 持久口径（measure 与 current 同读该配置，读写自洽）。
- normalized_requirement: 仅基线已存在 && current > baseline && 实测成功 && current ≤ originCount && 无 checkOpts 覆盖时落盘；首次立线（无基线）仍 exit 2 显式 --init-baseline；快路径零变化；返回面增 reanchored: boolean。
- impacts: [FR-02, task-02, task-04]
- evidence: src/docs-gate.js:189-209（陈旧分支现状——仅提示）, src/docs-gate.js:105/:149（measure 与本地同读 local.yaml）, .sillyspec/local.yaml（本仓 skip 非空——若误拦 cfg 层本仓重锚永不触发）
- 故障面: 并行会话同时重锚 last-write-wins（双方写的都是已验证不劣于远端的值，无害）；--against 模式落盘提交树计数与工作区瞬差（与 --init-baseline --against 既有语义一致）
- 退役判据: 基线机制整体退役（docs gate 换语义）时随 gate 一并退役

## D-003@v1: docs-fix-capability D-001「gate --delta-only 不做」非复潮声明
- type: boundary
- priority: P1
- status: accepted
- source: 防复潮扫描（brainstorm step2）
- question: 本变更是否复潮 docs-fix-capability D-001 留账的「gate --delta-only 明确不做（YAGNI，等第二次批量事件）」？
- answer: 非复潮——本变更不是 delta-only 门（拦增量/放存量的门语义不变），是陈旧分支的落盘动作；用户实证（基线 404 < 远端 414 提示反复出现）即该留账等候的「第二次批量事件」。
- normalized_requirement: 不新增 gate 阈值/模式/flag；重锚是既有陈旧分支的内联行为。
- impacts: [FR-02]
- evidence: .sillyspec/knowledge/decisions/docs-consistency.md（docs-fix-capability D-001 理由段）, proposal.md 方案对比②
