---
author: qinyi
created_at: 2026-11-21 23:06:32
generated_by: sillyspec-fourpiece-init
change: 2026-11-21-verify-gate-scope-speed
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（形如 src/foo.js:<行号>——行号写实际数字）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

## D-001@v1: 收口实测门走分层门语义——必过面收窄到变更自身测试+直接依赖测试
- type: architecture
- priority: P0
- status: confirmed
- source: user
- question: 收口必过门的实测面底线保到哪一层？（收窄分层门 / 不收窄只提速 / 分阶段两步走）
- answer: 用户选「收窄（分层门）」：收口必过门收窄到「变更自身测试＋直接依赖测试」；间接回归面（FR 回归层、枢纽扩散面）移出收口阻断，转后台或 pre-push 门——跑但不阻断，证据留痕。「亲自实测防作弊」亮点语义保留（收口内必过面仍真实执行），只切除间接回归面拖慢收口的缺陷面。
- normalized_requirement: 收口 flow done 实测门的阻断面 = 本变更测试 ∪ 直接 import 依赖测试；FR 回归层与间接依赖扩散面不得阻断收口，其执行结果以留痕证据形式存在（后台任务或 pre-push 门之一，落 Step 4 设计裁决）。
- impacts: [FR-01, FR-02, design, verify]
- evidence: src/verify-postcheck.js:2421（runVerifyTestCheck 三源并集现状）、src/verify-postcheck.js:3334（quotaFill 优先面豁免帽现状）、用户回答轮次（AskUserQuestion「收口语义」选「收窄（分层门）」）
- 故障面: 间接回归面移出阻断后，间接破坏发现时点后移——依赖「证据留痕不静默」纪律兜底；若留痕通道缺失或被忽略，间接回归失败将无人看到。
- 退役判据: 若收口实测面收窄后评审/CI 层间接回归逃逸率显著上升（P0/P1 缺陷绕过收口），重审分层切线。

## D-002@v1: 验收口径=范围构成+时长护栏双验收
- type: boundary
- priority: P0
- status: confirmed
- source: user
- question: 「不再跑半天」怎么验收？（只验范围构成 / 硬时长预算 / 范围+时长双验收）
- answer: 用户选「范围+时长双验收」：主指标=收口阻断面构成可审计（「本变更测试∪直接依赖测试」的披露行/ledger 可查证）；另加时长护栏——必过面超预算（可配置）自动转留痕不阻断＋loud 披露，防变更自身测试套件本身就慢的仓把 agent 卡死在收口。
- normalized_requirement: ①收口实测输出必须含阻断面构成披露（各源文件数+总时长），ledger 落盘可追溯；②必过面存在可配置时长预算，超限转留痕不阻断且必须 loud 披露（不可静默）。
- impacts: [FR-03, FR-04, design, verify]
- evidence: src/verify-postcheck.js:78（TEST_TIMEOUT_MS 缺省 600s 现状）、用户回答轮次（AskUserQuestion「验收口径」选「范围+时长双验收」）
- 故障面: 时长护栏的降级通道可能被滥用为「跳过慢测试」——强制 loud 披露 + ledger 留痕 + 全量归 pre-push/CI 门兜底；若降级被静默化即退化。
- 退役判据: 若降级通道使用率异常高（多数收口都在超预算降级）或降级后 pre-push 全量门频繁放行失败，重审护栏切线。

## D-003@v1: 重灾场景推断与时长预算缺省（我的判断）
- type: scope
- priority: P2
- status: accepted
- source: code
- question: 跑半天的主要实证场景与时长预算缺省值
- answer: 我的判断：①重灾场景=多语言混合仓与带跨仓 ctx 的变更——代码注释实证链（src/verify-postcheck.js:3358 py 批 124 文件单核 1183s、R22 裸 fallback 600s×8、src/verify-postcheck.js:2780 跨仓恒 full npm test），本仓 node --test 相对轻；②时长护栏缺省沿用 TEST_TIMEOUT_MS 口径（600s，10 分钟）作为必过面预算缺省，local.yaml 可配置覆盖——不新增第二套时长配置源。
- normalized_requirement: 方案设计以「多语言混合仓+跨仓」为第一优先实证场景；时长预算缺省=既有 TEST_TIMEOUT_MS（600s），不新增平行配置键。
- impacts: [design]
- evidence: src/verify-postcheck.js:78、src/verify-postcheck.js:2780、src/verify-postcheck.js:3358（注释内实证数字）

## D-004@v1: 间接回归面落点=只归 pre-push 门（不在收口跑）
- type: boundary
- priority: P1
- status: confirmed
- source: user
- question: 间接回归面（FR 回归层/枢纽扩散面）移出收口阻断后落到哪里跑？
- answer: 用户选「只归 pre-push」：间接面不在收口执行、不做收口后台编排，全部归 pre-push 门承担（与 2026-10-23-fr-regress-default-off 用户裁决「默认不跑归 pre-push/CI 门」同口径延伸）。收口对间接面只做披露（面清单+归属去向），不执行。
- normalized_requirement: 收口 flow done 不执行 FR 回归层与间接扩散面；其面清单在收口输出中披露并标注去向 pre-push；pre-push 链路的实测面含间接回归层。
- impacts: [FR-02, FR-05, design]
- evidence: .sillyspec/local.yaml（fr_regress_cap 先例注释「缺省不跑归 pre-push/CI 门」）、用户回答轮次（收尾一轮 Q1 选「只归 pre-push」）
- 故障面: 收口到推送之间间接回归无执行窗口——收口披露必须显式标注「间接面未跑、归 pre-push」，防 agent 与用户误读为「全绿已验证」。

## D-005@v1: 交付范围=纯分层门，提速项不进本变更
- type: scope
- priority: P1
- status: confirmed
- source: user
- question: 本次变更交付范围怎么切？
- answer: 用户选「纯分层门」：本变更只做范围收窄+时长护栏；命中口径升级（真 import 图/AST）、批次并行、runner 并发 flag 缺省注入、缓存粒度下探全部留后续变更。直接依赖面的发现继续沿用现有字符串命中口径（多跑侧保守不动，保「只可能多跑不漏」契约 D-core-engine-051@v1）。
- normalized_requirement: 本变更 diff 不得触及 deps 命中口径算法、批次执行调度、缓存指纹计算三面；提速项在本变更 decisions/ROADMAP 留后续条目。
- impacts: [FR-06, design, tasks]
- evidence: 用户回答轮次（收尾一轮 Q2 选「纯分层门」）、src/deps-symbol-narrow.js:1（现行口径单源）

## D-006@v1: 分层门作为 dynamic 策略缺省行为，逃生阀回旧阻断面
- type: compatibility
- priority: P1
- status: confirmed
- source: user
- question: 分层门作为缺省行为还是配置开启？
- answer: 用户选「收窄为缺省」：dynamic 策略（缺省策略）的收口阻断面缺省即「本变更测试∪直接依赖测试」；local.yaml 逃生阀键回旧行为（三源全阻断面，间接面回收口阻断）。符合「默认零配置可用+机制类调优键缺省即最优」配置哲学；缺省行为变化需迁移披露（版本 note/输出提示行）。
- normalized_requirement: 未配置任何新键时收口阻断面=收窄语义；显式配置逃生阀键时恢复现状三源全阻断面行为（逐字对齐 2026-11-21 前行为）。
- impacts: [FR-01, FR-05, design, verify]
- evidence: 用户回答轮次（收尾一轮 Q3 选「收窄为缺省」）、.sillyspec/local.yaml（配置哲学注释「机制类调优键缺省即最优」）、src/config-schema.js:146（modules 退役先例——缺省行为变更配披露行的既有形态）

## D-007@v1: 收窄切线=方案A 枢纽分层（命中计数广度切线）
- type: architecture
- priority: P0
- status: confirmed
- source: user
- question: 收窄切线方案选哪个？（A 枢纽分层 / C 预算分层 / A+C 融合）
- answer: 用户选方案 A「枢纽分层」：import 依赖面按引用广度分层——被命中的变更源文件中，命中测试数 > 既有 hub 阈值（DEPS_SYMBOL_NARROW_HUB_MIN，语言无关命中计数）的枢纽源带来的测试=间接回归面（收口只披露+归 pre-push）；非枢纽命中+本变更测试=收口阻断面。时长护栏（D-002）套阻断面执行外层。JS/TS 不做符号级精细化（枢纽面整体出阻断），精细化留后续。C 的兜底价值由时长护栏承接，不为兜底牺牲切线语义。
- normalized_requirement: ①hub 判定复用既有命中计数与阈值常量，命中算法本体零改动（仅新增面归因出参）；②阻断面=自身测试∪非枢纽依赖命中；间接面=枢纽源命中测试，收口披露+归 pre-push；③全语言同口径（不做符号级分流）。
- impacts: [FR-01, FR-02, FR-05, design, tasks, verify]
- evidence: src/verify-postcheck.js:1181（discoverModuleDependentTests 命中计数现有位置）、src/deps-symbol-narrow.js（DEPS_SYMBOL_NARROW_HUB_MIN 常量单源）、用户回答轮次（AskUserQuestion「方案选择」选「A 枢纽分层」）
- 故障面: hub 阈值是硬切线——命中数在阈值两侧横跳的文件两轮收口切线不稳（抖动面）；枢纽测试移出阻断后枢纽行为破坏延迟到 pre-push 才发现。
- 退役判据: 若枢纽切线后 pre-push 间接面失败率显著高于阻断面（切线失准信号），或小仓/中仓普遍无 hub 导致收益趋零，重审阈值或切线形态。

## D-008@v1: 落选——方案B 紧度分层（rejected 防复潮）
- type: architecture
- priority: P0
- status: rejected
- source: user
- question: 收窄切线方案选哪个？
- answer: 落选：namedImportEvidence 符号命中=直接阻断、纯字符串路径命中=间接 pre-push 的证据强度切线。
- normalized_requirement: 不采用证据强度切线作为收窄切线。
- impacts: [design]
- evidence: src/deps-symbol-narrow.js（namedImportEvidence 依赖符号信息，Python 无符号信息整体 fail-open 回落）
- 否决理由: Python 等无符号信息语言整体回落全归直接 → 面不变 → 重灾仓（多语言混合仓，D-003 第一优先实证场景）零收益，方案对主痛点失效。
- 复潮条件: Python/泛语言符号提取适配器落地且全语言覆盖（无符号回落不再退化）后可重议。

## D-009@v1: 落选——方案C 预算分层与 A+C 融合（rejected 防复潮）
- type: architecture
- priority: P0
- status: rejected
- source: user
- question: 收窄切线方案选哪个？
- answer: 落选：①方案 C（①+③ 整体套规模帽、超帽按字母序弃置归 pre-push）；②A+C 融合（枢纽切线+整体规模帽双保险）。
- normalized_requirement: 不采用规模帽作为收窄切线（字母序弃置），阻断面切线以依赖广度语义为准；整体规模帽不叠加于枢纽切线之上。
- impacts: [design]
- evidence: src/verify-postcheck.js:3334（quotaFill CAP=30 帽机制现状）、用户回答轮次（AskUserQuestion「方案选择」仅选 A）
- 否决理由: 切线任意（字母序≠依赖语义——第 31 个文件被弃不是因为不依赖而是字母序靠后），与 C1「阻断面=直接依赖」名实不符；同一变更在不同仓切线结果不可预期；A+C 融合叠加两套切线机制面最大、披露最复杂，且兜底价值已被时长护栏（D-002）承接。
- 复潮条件: 枢纽切线在实证中被证明无法给出确定上界（如无 hub 大仓面仍失控）且时长护栏降级通道使用率过高时，可重议规模帽兜底。
