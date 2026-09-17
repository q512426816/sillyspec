---
author: qinyi
created_at: 2026-09-17 14:04:39
generated_by: sillyspec-fourpiece-init
change: 2026-09-17-mi-diagnostic-codes
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

<!-- 背景（本变更动机，2026-09-17 OpenSpec 源码对比三轮评审定稿的②号能力项）：
     machine-interface 族（gate/derive/progress-show）的 JSON 信封里 errors/warnings 是自由文本
     中文句子（如「变更不存在: X」「测试失败: <原因>」），程序化消费方（SillyHub/未来 MCP 消费者）
     无法按错误类型稳定分支——提示语改一个字就是一次静默破坏性变更。同时契约文档
     interface-contract.md（SillySpec↔SillyHub 对账基准 D-005@v1）已与实现漂移三处
     （design-file-list 缺档/progress-show 面缺约/transition §2.3 informational 语义反向漂移——
     代码有意改为参与 ok 防判定分裂，契约没跟）。本变更 = 码表（加法式）+ 三项对账 + parity 测试。 -->

## D-001@v1: 信封加法式可选 code，不升 schema_version 2
- type: architecture
- status: accepted
- 问题: errors 是 string[]（中文散文），消费方要分支只能正则匹配散文；但 interface-contract.md 是冻结的 v1 对账基准，errors 升对象数组 {code,message} 属破坏性语义变更，需 SillyHub 协同改造。
- 选定: 加法式扩展——checks[i].code 恒在场（check 失败身份码）+ 顶层 codes: string[] 聚合（gate 按失败 check 顺序去重 / 信封级错误路径单码），errors/warnings/退出码零改动，schema_version 保持 1。消费方忽略未知字段即零破坏（SillyHub 实证只读 exit_code+errors）。
- alternatives: B 一步到位 errors 对象化+升 v2（否决——唯一消费方 SillyHub 的 errors 转发/截断逻辑需协同改造，评审裁决「先加法后升 v2」迁移纪律）；C 不动信封只写文档码目录（否决——无发射方绑定，码表必然漂移）。
- normalized_requirement: 信封新增 checks[].code 与顶层 codes[]，均为加法式可选键；schema_version=1 不变；既有 errors 语义、退出码语义、中文 message 全保留。
- impacts: [FR-01, FR-03]
- evidence: src/machine-interface.js buildEnvelope（optional-once 约定 57-85）、SillyHub backend/app/modules/daemon/run_sync/service/gate.py:160（exit_code 三分支消费模型）
- 故障面: codes 与 errors 的对应关系被消费方误读为逐下标映射——契约明示 codes 是去重聚合非 1:1；check.code 恒在场（含通过时）消除「有时无」的歧义。
- 退役判据: v2 升版（errors 对象化）落地时，codes[] 聚合键退役，check.code 并入对象元素。

## D-002@v1: 范围钉死 machine-interface 族自产错误，散文码首期不做
- type: scope
- status: accepted
- 问题: 全仓错误面巨大（stage-contract 校验器散文几十处、doctor/validate/scope-audit 形态分裂），一次全吞必然二次膨胀且形态强行统一伤消费方。
- 选定: 首期只码 machine-interface.js 三面（gate/derive/progress-show）的自产错误：信封级 4 码（db_missing/change_not_found/unknown_facet/internal_error）+ check 级 6 码（artifacts_invalid/design_file_ref_invalid[直承 design-facts 既有稳定码]/transition_blocked/execute_evidence_unchanged/task_reviews_invalid/verify_test_failed）。check 内部逐条 validator 散文不逐条码（码标识失败面不标识每条消息）。
- alternatives: 全 --json 面统一码表（否决——评审 guardrail：doctor/validate/scope-audit 形态本就分裂，一次不吞）；warnings 级也码（否决——首期只码错误路径，warnings 消费场景未现）。
- normalized_requirement: DIAGNOSTIC_CODES 首批恰 10 码，全部由 machine-interface 三面发射；stage-contract/doctor/validate 族零改动。
- impacts: [FR-01, FR-02]
- evidence: src/machine-interface.js 错误路径全量清单（本轮通读）、三轮评审②号收窄裁决
- 故障面: 消费方期望「所有错误都有码」而 stage-contract 散文仍无码——契约码目录明示覆盖边界；v2/二期再扩。
- 退役判据: 二期扩面（stage-contract 校验器码化）时按同一码表模式增量追加。

## D-003@v1: 三项契约对账先行，transition 改约跟代码（消费侧已实证）
- type: contract
- status: accepted
- 问题: interface-contract.md 与实现漂移三处：①check id 枚举缺 design-file-list（实现在发射）②命令面缺 progress-show（§1 自称两命令，实现有三）③§2.3 transition informational 语义与代码反向漂移（代码 199-200 行注释钉死：transition 必须参与 ok，否则 gate exit 0 而 runStage --done 硬阻断，判定分裂）。
- 选定: 契约跟代码改：①§2 check 表补 design-file-list 行 ②§1 补 1.3 progress show（runStatusOverview）③§2.3 从「informational 不参与 ok」重写为「参与综合 ok，与 completeStep 硬阻断一致」，161-173 行 informational 示例段同步替换。消费侧安全已实证：SillyHub gate.py 仅按 exit_code 三分支（0推进/1打回/2卡住，design §5.4），不读 informational——旧契约语义（非法转移 exit 0）在消费方模型里恰恰会判「推进」，改约对消费方有利。
- alternatives: 代码改回 informational 跟契约（否决——复活 gate/run 判定分裂，代码注释明示这是 design §8 漂移修复）；漂移暂记不改（否决——parity 测试会把错语义焊死）。
- normalized_requirement: 对账后契约三处与实现一致；无第二真相。
- impacts: [FR-04]
- evidence: docs/sillyspec/interface-contract.md:119（check 枚举无 design-file-list）、:38-43（transition informational 行）、:161-173（informational 示例）、src/machine-interface.js:196-208（参与 ok 实现+注释）、multi-agent-platform backend gate.py:158-160
- 故障面: 改约后 SillyHub 若有按旧语义的隐藏分支——已全仓 grep 实证无 informational/transition 特判，风险闭环。
- 退役判据: 无（对账是终态，语义变更记录节长期保留）。

## D-004@v1: 码表单一源模块 + parity 双向测试
- type: architecture
- status: accepted
- 问题: OpenSpec 的 agent-contract.md 靠人工审计保真（文档头 capstone audit，仓内无文档↔代码 parity 测试），码漂移只能等下次审计或集成方挂掉——这是它的已实证弱点。
- 选定: 新模块 src/diagnostic-codes.js 导出冻结表 DIAGNOSTIC_CODES（码→{surface, exit 语义, 触发条件}），machine-interface.js 发射与契约文档目录共用此单一源；test/diagnostic-codes-parity.test.mjs 双向核对：注册码全在文档目录 ∧ 目录码全在码表（防单侧漂移），另有运行时发射抽查（fixture 证 db_missing/change_not_found/unknown_facet 信封级码 + gate check.code 在场）。
- alternatives: 码表常量内嵌 machine-interface.js（否决——parity 测试 import 单一源更清晰，且为二期扩面留独立增长点）；parity 只查文档含码（否决——单向核对拦不住文档多写死码）。
- normalized_requirement: 码表是码身份唯一源；文档目录与运行时发射均不得出现表外码；parity 失败即 CI 红。
- impacts: [FR-02, FR-03]
- evidence: OpenSpec docs/agent-contract.md 头部「verified against src/ (capstone audit)」+ 仓内无 parity 测试（本轮源码核查）、三轮评审「parity 是胜负手」裁决
- 故障面: 码表膨胀失控——首期 10 码硬边界（D-002），二期扩面走变更流程追加。
- 退役判据: v2 码表结构重构时冻结表键值迁移，parity 测试同步改写。

## D-005@v1: 契约新增「v1 存续期语义变更记录」节（披露式而非静默改）
- type: contract
- status: accepted
- 问题: interface-contract.md 是冻结版对账基准，transition 语义在 v1 存续期内实际变了（informational→参与 ok）；冻结文档里静默改语义比漂移本身更伤对账信任。
- 选定: 学 OpenSpec Known inconsistencies 台账做法，契约新增一节「v1 存续期语义变更记录」：逐条记变更日期/旧语义/新语义/消费侧影响评估（transition 条目附 SillyHub gate.py 实证）。已知的另一处小漂移（progress JSON 未入约）随 §1.3 补约一并销账。
- alternatives: 只改正文不留痕（否决——SillyHub 侧未来对账无法追溯语义何时变过）；升 v2 版本化（否决——本变更不动 schema_version，D-001）。
- normalized_requirement: 语义变更记录节与正文同改；正文与实现一致是第一真相，记录节是变更溯源。
- impacts: [FR-04]
- evidence: OpenSpec docs/agent-contract.md §Known inconsistencies（编号台账+划线销账式）、interface-contract.md 头部「冻结」自述
- 故障面: 记录节沦为杂物堆——只录语义级变更（行为可观察差异），格式类勘误不入此节。
- 退役判据: v2 升版时本节折叠进版本 changelog。
