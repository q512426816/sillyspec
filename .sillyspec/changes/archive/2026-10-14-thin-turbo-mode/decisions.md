---
author: qinyi
created_at: 2026-10-14 08:27:24
generated_by: sillyspec-fourpiece-init
change: 2026-10-14-thin-turbo-mode
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

## D-001@v1: 极速模式触发权=仅用户显式触发
- type: boundary
- priority: P0
- status: accepted
- source: user
- question: agent 能否自行判断进入极速模式？
- answer: 不能。仅用户显式表达极速意图（「极速/别验证/只要 spec 和代码」类原话）时 agent 才触发；agent 不得自行启用。
- normalized_requirement: CLI 侧必须留下「用户显式触发」的留痕（谁/何时/跳过面档位）；无用户声明的 turbo 请求不成立；提示词面（AGENTS.md/命令卡）须写明触发判据且禁止 agent 自主启用。
- impacts: [FR-01, FR-03]
- evidence: 用户问答轮次（2026-10-14 AskUserQuestion「触发权」选「仅用户显式触发」）；对照既有同意门先例 src/flow.js:795（预段选道同意门——声明留痕形态）

## D-002@v1: 极速跳过面=实测面+重仪式门，spec 面与 distill 必留
- type: boundary
- priority: P0
- status: accepted
- source: user
- question: flow done 的校验面哪些可跳、哪些必留？distill 是否核心？
- answer: 跳过=test+lint 实测（runQuickTestLintGate）、hunk 归属门、dirty 收口阻断门（降 advisory 留痕）、ui 视觉探针门、评审子步（凭用户声明豁免留痕）。必留=spec 文档结构校验（verifyThinDocsV2）、tasks 全勾门、ledger 门、distill（决策+FR 索引+模块回写）、archive。distill 判为核心：纯机械文件操作毫秒级、非验证而是知识复利进料口（knowledge search 自动注入未来 prompt + FR 索引支撑动态测试面推断）。
- normalized_requirement: turbo 模式 flow done 对跳过面早退且逐项输出 skipped 留痕；必留面校验语义逐字不变；缺省（非 turbo）路径行为与改动前逐字一致。
- impacts: [FR-02, FR-04]
- evidence: src/run/quick-audit.js:476（runQuickTestLintGate 早退先例）；src/flow.js:1429（quick 门接入点）、src/flow.js:2123（hunk 门）、src/flow.js:2107（ui 探针）、src/flow.js:2420 附近（distill 子步 distillIntoKnowledge/indexRequirements 机械链）

## D-003@v1: 双层承载——提示词面触发语义，CLI 侧 flag 硬承载
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 「通过提示词方式触发」如何越过 CLI 硬门？
- answer: 提示词与 CLI 分层：提示词面（AGENTS.md 选道表/flow 命令卡）负责让 agent 理解何时、如何请求极速并转达用户意图；CLI 侧 `flow start --turbo` flag 落 flow-state 留痕（声明即过），`flow done` 读态生效跳过面。纯提示词无法跳过 CLI 硬门，纯 CLI flag 无触发语义——两层缺一不可。
- normalized_requirement: --turbo 为显式 flag（不做文本标记解析）；flow-state 持久留痕 turbo 字段；提示词面同步更新（AGENTS.md 选道行 + 命令卡 + 触发判据与禁自启条款）。
- impacts: [FR-01, FR-03]
- evidence: src/flow-state.js:13（flow-state 单一源读取器，扩字段承载点）；src/run/quick-audit.js:482（SILLYSPEC_QUICK_TEST_GATE=skip env 逃生门先例——留痕式早退形态）
- 故障面: 用户口头说极速但 agent 忘带 --turbo → 门照拦（fail-closed 可接受，提示语指路 flag）
- 退役判据: 若实测极速模式使用率趋零或频繁误触发（遥测面），收回 flag 改纯提示词约定

## D-004@v1: 作用域=薄道+头脑风暴预段，厚道零改动
- type: boundary
- priority: P0
- status: accepted
- source: user
- question: 极速模式覆盖哪些流程形态？
- answer: 仅薄道（flow start/done）与头脑风暴预段（brainstorm 轻量跑通道+单轮合并问询+一次收口）；完整五阶段厚道明确不做极速版。
- normalized_requirement: run <stage> 厚道全族代码路径零改动；预段极速形态优先复用既有轻量跑判定（brainstorm step3 指引 P0-3）与 burst 一次收口，不新增阶段机状态。
- impacts: [FR-05]
- evidence: .sillyspec/.runtime/step-guides/brainstorm-step2-847188a5.md（轻量跑判定：需求已收敛→A-D 直书结论，Grill/规范文件永不省）；用户原话「只有轻量变更这样做哦，全流程暂时没有这个需求」

## D-005@v1: 方案取舍——选 A（--turbo flag + flow-state 留痕）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 极速模式的 CLI 承载形态选哪种？
- answer: 方案 A。flow start --turbo 落 flow-state 留痕（声明即过）+ flow done 读态按 D-002 跳过面早退逐项 skipped 留痕 + 提示词面（AGENTS.md 选道行/命令卡）同步教触发判据（禁 agent 自启）。理由：唯一同时满足提示词触发语义、跳过验证仪式、仅薄道、预段也极速四条原始需求且留痕可审计的形态。
- normalized_requirement: --turbo 为显式 flag；跳过面按 D-002；缺省路径零回归；提示词面三处同步（AGENTS.md 选道表/flow 命令卡/预段指引）。
- impacts: [FR-01, FR-02, FR-03, FR-04, FR-05]
- evidence: 方案对比轮次（2026-10-14 AskUserQuestion 方案选择选 A）；先例 src/flow.js:795（同意门声明留痕形态）
- 故障面: 用户口头说极速但 agent 忘带 --turbo → 门照拦（fail-closed 可接受，提示语指路 flag）
- 退役判据: 实测极速使用率趋零或频繁误触发（遥测面），收回 flag 改纯提示词约定

## D-005@v1-rejected-B: 落选——零代码纯提示词 + env 逃生门
- type: architecture
- priority: P0
- status: rejected
- source: user
- question: 极速模式的 CLI 承载形态选哪种？
- answer: （落选）SILLYSPEC_QUICK_TEST_GATE=skip env 整门跳过。
- normalized_requirement: 不采用；仅当 env 逃生门扩出全档跳过+持久留痕时（改动面反而超过方案 A）可复评。
- impacts: [FR-02]
- evidence: src/run/quick-audit.js:482（env 逃生门现状=整门跳 test+lint，hunk/dirty/review/ui 探针照跑；env 不持久，重入 done 须重带，审计弱）——当轮劣势：覆盖面不足违反 D-002、留痕弱违反 D-003

## D-005@v1-rejected-C: 落选——local.yaml 仓级配置键
- type: architecture
- priority: P0
- status: rejected
- source: user
- question: 极速模式的 CLI 承载形态选哪种？
- answer: （落选）flow.turbo: true 仓级常开。
- normalized_requirement: 不采用；仅当出现「纯文档仓/无测试项目想全仓默认跳实测」的真实诉求时复评。
- impacts: [FR-01]
- evidence: .sillyspec/local.yaml 头注（gitignore per-machine 配置不可移植）；当轮劣势：仓级常开与 D-001「按次用户显式触发」正面冲突，实证核验缺省失效

## D-006@v1: 审计冻结件（change.patch/change-patch.json）极速模式保留
- type: boundary
- priority: P1
- status: accepted
- source: user
- question: change-patch.json / change.patch 生成慢吗？极速模式是否保留？
- answer: 保留。生成是纯 git 机械操作（毫秒-秒级，无 agent 往返）；它们是 distill 模块对账回写（change-patch.json files[] 喂模块卡回写/extraDocs 推导）的单一时点数据源 + 归档审计件。极速跳的是「验证」不是「证据」。
- normalized_requirement: turbo 模式 patch 子步（冻结）照常执行，语义与缺省路径逐字一致。
- impacts: [FR-02, FR-04]
- evidence: src/flow.js cmdFlowDone patch 子步（冻结面=归属收窄 diff，fail-soft）；src/flow.js:2384 附近（模块对账回读消费 change-patch.json files[]）

## D-007@v1: turbo 跳过面以 tier!=='thick' 为前提（升厚即失效）
- type: consistency
- priority: P1
- status: accepted
- source: design-grill
- question: 薄道运行中升厚（distill 异态 src/flow.js:2211 / verify 失败 src/flow.js:1472）后 flow-state 残留 turbo 字段，重入 done 时 turbo 跳过面是否继续生效？
- answer: 不生效。turbo 读态判定为 `turbo === true && st.tier !== 'thick'`——升厚即恢复全量仪式，turbo 残留不短路厚档；`--turbo --thick` 同给同理（留痕但不生效）。
- normalized_requirement: cmdFlowDone 的 turbo 常量以双条件判定；测试锚覆盖「升厚后 turbo 失效」路径。
- impacts: [FR-02, FR-05]
- evidence: src/flow.js:2211（distill 异态升厚点——必留面内、turbo 下仍可触达，Grill 探针实证）；src/flow.js:1472（verify 失败升厚点——turbo 下天然不触达）
