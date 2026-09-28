---
author: qinyi
created_at: 2026-09-28 09:20:52
generated_by: sillyspec-fourpiece-init
change: 2026-09-28-unclear-req-to-brainstorm
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

## D-001@v1: 问题定位——选道判断是 agent 纯自评，格式门拦不住语义模糊
- type: premise
- priority: P0
- status: accepted
- source: code
- question: 「需求不清晰→头脑风暴预段→flow start 收编」链路已实现（2026-09-25-thin-brainstorm-prestage，commit 82b3d9c1），为何实际几乎从不进头脑风暴？
- answer: 代码查证三重根因：① 清晰度门（src/flow.js:442-455）触发条件仅「--input 缺失或 extractSuccessCriteria 提取 0 条」，是格式门非语义门；② 提取器极宽（src/flow-draft.js:114-150：无「成功标准：」节头的前置 bullet 也计入、编号条目 ≥3 条即取代），agent 按指引教的格式随手可编出条目，绕门成本为零；③ 选道决策发生在 CLI 调用之前的 agent 自评，AGENTS.md 模板第 1 行标「默认快道」（templates/agents-instruction.md:9），自评门槛极低且无任何机器信号强制对照需求模糊症状
- normalized_requirement: 修复面必须是双轮：判断面（模板选道指令改前提式自检+负面信号清单）+ 行为面（清晰度门补语义弱信号）。只改文档已被现状证伪——选道表第 2 行明文在场也没人走
- impacts: [FR-01, FR-02]
- evidence: src/flow.js:442, src/flow.js:447, src/flow-draft.js:114, src/flow-draft.js:132, templates/agents-instruction.md:9

## D-002@v1: 范围裁定——只管 thin 道入口，run 族入口不动
- type: boundary
- priority: P1
- status: accepted
- source: code
- question: 语义信号门要不要同时管 run 族新变更入口？
- answer: 不需要。run 族（完整流程）本来就从 brainstorm 阶段起步（.sillyspec 状态机 stage 序列 brainstorm→…→archive，src/db.js:266 current_stage 默认 'brainstorm'），不存在「跳过头脑风暴」问题；失效面只在 thin 道 flow start 直通
- normalized_requirement: 改动面限定 flow start 清晰度门及其上下游（信号扫描模块、AGENTS.md 模板、指路文案）；run 族命令零改动
- impacts: [FR-01]
- evidence: src/db.js:266, src/flow.js:442

## D-003@v1: 否决词表枚举检测路线——复潮既有 D-001（枚举开放世界是错误方向）
- type: architecture
- priority: P0
- status: rejected
- source: user
- question: 清晰度门补语义信号，是否用「模糊词窄表全文扫描＋可观测原语词表判空话」两道词表检测？
- answer: 用户否决：「不要用枚举定义这个开放世界」——本变更设计时未检出既有知识（knowledge/decisions/unmapped.md D-001@v1，2026-09-26-thin-agent-tasks 已记「第三次同款错误」），本次为第四例（①R17 标点自检②复合拆分枚举词表③WORK_UNIT_BUCKETS 域分类表④本次模糊词表）。正确模式照录：开放世界的分类/计划归 agent（人有上下文），机器只锚定可枚举的封闭面（验收标准文本、字段格式契约）；死路=枚举更多桶/更多关键词——穷举错误不因规模变小而变对
- normalized_requirement: 行为面机制不得依赖任何「枚举模糊形态/枚举可观测词汇」的检测表；改为封闭形式——要求收敛产物结构显式在场（声明门，机器只查结构），语义判断归 agent 选道时点自检与收口时点审计；设计与既有「三层分工」模式（机械层结构归属／判定层归 agent／门禁层 fail-closed 只查槽位在场不查内容，knowledge/decisions/stages.md D 条目）同构对齐
- impacts: [FR-02]
- evidence: .sillyspec/knowledge/decisions/unmapped.md:1086（D-001@v1），.sillyspec/knowledge/INDEX.md:168（路由行），knowledge/decisions/stages.md:113（三层分工），用户方案轮反馈（2026-09-28）

## D-004@v1: 知识注入只锚变更入口，设计时点新关键词零检索面——工具引导缺位
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 库内已有「枚举开放世界是错误方向」（2026-09-26-thin-agent-tasks 落 D-001@v1）为何仍发生第四次复潮？知识注入机制哪里缺位？
- answer: 用户归因（采纳）：不是 agent 个人失误，是工具引导不到位——不然知识库没意义了。结构性缺口三处：① 自动注入只锚「变更入口」——轻量道按 input/FR/changed-files 关键词路由（src/flow.js:137），否决决策注入同源；brainstorm Step2 按 INDEX 路由行＋decisionHits（src/knowledge-match.js:6）；② 设计时点（方案步/设计步/decisions.md 落盘）新产生的机制词（枚举/词表——入口时刻不存在）没有任何强制检索面，knowledge search 在引导协议里零接线；③ AGENTS.md 速查行「命中知识 CLI 会自动注入 prompt，勿自行重复检索」反向劝退主动检索
- normalized_requirement: 设计时点必须有知识检索面：指引面（方案/设计步加固定动作——方案引入的机制词先 knowledge search，命中必读再定稿）＋机器面（步 --done 门对方案摘要与 decisions.md 新增条目自动跑检索，命中即回显摘要并要求 evidence 回应——机械层只报命中事实（封闭面），读否/复潮与否归 agent，门禁层 v1 只 warn 不阻断）；AGENTS.md 速查行改写为「设计引入新机制词主动 search——入口注入不覆盖设计时点」
- impacts: [FR-03]
- evidence: src/knowledge-match.js:6, src/flow.js:137, src/flow.js:193, templates/agents-instruction.md:27（勿自行重复检索）, 本变更 D-003 复潮实证（2026-09-28）
- 故障面: --done 门自动检索的误命中（决策条目措辞与库内条目关键词偶然重叠）→ 回显噪音让 agent 习惯性无视所有命中（狼来了效应）——v1 只 warn 不阻断即为此留退路；检索查询串拼装质量差（标题短词）会放大命中噪音
- 退役判据: 若归档遥测显示命中回显绝大多数未被 evidence 回应且未引发实际复潮拦截（信号无行为后果），说明该面无效——退化为纯指引面（去掉机器检索）或直接删除

## D-005@v1: 方案选择——Ⅱ 事后闭环主（前门弱盘问＋事后强信号）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 选道架构选哪档？（Ⅰ 纯前门轻提示／Ⅱ 前门弱盘问+事后闭环／Ⅲ 加已定方案节硬门双卡）
- answer: 用户选 Ⅱ。要点：需求清晰度是谱值且只能事后证伪——事前任何硬判定都是布尔处置（用户两次推进否决词表与声明硬门）；前门只做盘问重述（自检问题从「需求清晰吗」换成「还有没有必须问用户才能动手的问题」，不阻断不设新节），强信号放事后：归档时封闭面指标（design 重写比/tasks 改写率/盲维命中/返工次数——diff 比例与计数，非词表）判「疑似该走预段未走」落库，下次 flow start 渲染点名提示，形成每仓自我校准回路。FR-03（设计时点知识检索面，D-004）随行收进本变更
- normalized_requirement: 前门＝flow start 渲染盘问+指路（纯提示面，无新节无 flag 无阻断）；后门＝归档时过程形态判定落库+下次 start 历史提示；假自检的代价由闭环兜底；Ⅲ 的已定方案节硬门不做
- impacts: [FR-01, FR-02, FR-03]
- evidence: 用户方案轮选择（2026-09-28），decisions.md D-003（枚举否决）与「没那么简单」轮反馈
- 故障面: 事后指标误标（用户中途合法改需求被记为「疑似该走预段未走」）→ 下次 start 提示成为噪音，agent 学会无视——「疑似」措辞与可无视设计是减压阀但也是衰减路径；指标快照时机错误（如 design 首快照取在收口后）会让重写比恒 0
- 退役判据: 若遥测显示被标记变更的下一变更仍高频复现同形态（提示未改变选道行为），说明闭环无效——考虑退回纯指引或升为硬门（届时重新过方案轮）
