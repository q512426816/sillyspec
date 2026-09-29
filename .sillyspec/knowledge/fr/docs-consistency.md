---
author: sillyspec-fr-index
created_at: 2026-09-28T17:07:05.883Z
---

# FR 索引 — docs-consistency

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/docs-consistency.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-docs-consistency-001 syncIndexRoutingLines（decisions 侧）按域从条目标题∪理由行派生稀有词
变更：2026-09-29-decision-route-vocab
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 增量 / 幂等 相关模块就绪；When syncIndexRoutingLines（decisions 侧）按域从条目标题∪理由行派生稀有词片（出现≤3 次的 CJK bigram／≥4 字符 ASC；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-decision-route-vocab/requirements.md#FR-01
最近确认：b8a7ccc9f572b09dbe993ae9c84a9841391181bf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-decision-route-vocab:flow:FR-01
  tests: test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-decision-route-vocab
  status: active

## FR-docs-consistency-002 真实库 reconcile 后：查询「谓词守卫」「顿号拆分」路由命中（matched 且指向 dec
变更：2026-09-29-decision-route-vocab
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 真实库 reconcile 后：查询「谓词守卫」「顿号拆分」路由命中（matched 且指向 decisions/unmapped.md）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-decision-route-vocab/requirements.md#FR-02
最近确认：b8a7ccc9f572b09dbe993ae9c84a9841391181bf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-decision-route-vocab:flow:FR-02
  tests: test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-decision-route-vocab
  status: active

## FR-docs-consistency-003 「枚举词表」既有命中不回归
变更：2026-09-29-decision-route-vocab
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 「枚举词表」既有命中不回归；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-decision-route-vocab/requirements.md#FR-03
最近确认：b8a7ccc9f572b09dbe993ae9c84a9841391181bf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-decision-route-vocab:flow:FR-03
  tests: test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-decision-route-vocab
  status: active

## FR-docs-consistency-004 蒸馏入选条目标题必填：裸号条目（## D-xxx@vN 无标题）needsWait 拦截（对齐 re
变更：2026-09-29-decision-route-vocab
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 蒸馏入选条目标题必填：裸号条目（## D-xxx@vN 无标题）needsWait 拦截（对齐 rejected 缺否决理由先例），存量夹具适配或降级为告警以实；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-decision-route-vocab/requirements.md#FR-04
最近确认：b8a7ccc9f572b09dbe993ae9c84a9841391181bf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-decision-route-vocab:flow:FR-04
  tests: test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-decision-route-vocab
  status: active

## FR-docs-consistency-005 既有蒸馏/知识测试回归全绿
变更：2026-09-29-decision-route-vocab
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 既有蒸馏/知识测试回归全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-decision-route-vocab/requirements.md#FR-05
最近确认：b8a7ccc9f572b09dbe993ae9c84a9841391181bf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-decision-route-vocab:flow:FR-05
  tests: test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-decision-route-vocab
  status: active

## FR-docs-consistency-006 test:core 全绿
变更：2026-09-29-decision-route-vocab
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When test:core 全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-decision-route-vocab/requirements.md#FR-06
最近确认：b8a7ccc9f572b09dbe993ae9c84a9841391181bf

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-decision-route-vocab:flow:FR-06
  tests: test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-decision-route-vocab
  status: active

## FR-docs-consistency-007 brainstorm --done 时 proposal.md 缺「成功标准」章节 → warnin
变更：2026-09-29-brainstorm-closure-gates
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When brainstorm --done 时 proposal.md 缺「成功标准」章节；Then warning（scale≠small 生效，small 豁免）
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-closure-gates/requirements.md#FR-01
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-closure-gates:flow:FR-01
  tests: test/brainstorm-closure-gates.test.mjs「proposal 缺成功标准 → warning／含成功标准不报／scale=small 豁免」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-closure-gates
  status: active

## FR-docs-consistency-008 decisions.md 存在当前版本 D-xxx@vN 且 requirements.md 未引用
变更：2026-09-29-brainstorm-closure-gates
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When decisions.md 存在当前版本 D-xxx@vN 且 requirements.md 未引用该 D（裸号词边界匹配）；Then warning 逐条点名
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-closure-gates/requirements.md#FR-02
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-closure-gates:flow:FR-02
  tests: test/brainstorm-closure-gates.test.mjs「D-001@v1 已引用 D-002@v1 未引用 → 仅点名 D-002／剩余风险行含裸号亦算归属」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-closure-gates
  status: active

## FR-docs-consistency-009 design.md 中「自审存疑：」标记行无闭合 token（D-xxx/R-xx/已解决/已闭合/
变更：2026-09-29-brainstorm-closure-gates
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When design.md 中「自审存疑：」标记行无闭合 token（D-xxx/R-xx/已解决/已闭合/已确认）；Then warning，含闭合 token 不报
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-closure-gates/requirements.md#FR-03
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-closure-gates:flow:FR-03
  tests: test/brainstorm-closure-gates.test.mjs「自审存疑：无闭合 token → warning／含 D-xxx/R-xx/已解决不报／checklist 模板行（无冒号应用形态）不误报」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-closure-gates
  status: active

## FR-docs-consistency-010 design.md 风险登记表 R-xx 行应对策略列为空或占位词（待填/待补充/TODO/TBD）
变更：2026-09-29-brainstorm-closure-gates
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When design.md 风险登记表 R-xx 行应对策略列为空或占位词（待填/待补充/TODO/TBD）；Then warning，显式「接受：理由」不报
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-closure-gates/requirements.md#FR-04
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-closure-gates:flow:FR-04
  tests: test/brainstorm-closure-gates.test.mjs「design-init 骨架 R-01（待填应对策略）→ warning／已填应对不报／接受：理由显式接受不报」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-closure-gates
  status: active

## FR-docs-consistency-011 proposal/requirements/tasks/design 独立成行占位词（默认占位表＋待
变更：2026-09-29-brainstorm-closure-gates
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When proposal/requirements/tasks/design 独立成行占位词（默认占位表＋待完善/待设计/待确认）；Then warning；design.md 恒查，proposal/requirements/tasks 三条与四件套存在性同条件（scale≠small 生效、sma
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-closure-gates/requirements.md#FR-05
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-closure-gates:flow:FR-05
  tests: test/brainstorm-closure-gates.test.mjs「tasks.md 独立成行 TODO/待完善 → warning／正常任务行不报」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-closure-gates
  status: active

## FR-docs-consistency-012 design.md 残留「待确认」→ warning（决策追踪逐行改「已覆盖」后消除）
变更：2026-09-29-brainstorm-closure-gates
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When design.md 残留「待确认」；Then warning（决策追踪逐行改「已覆盖」后消除）
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-closure-gates/requirements.md#FR-06
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-closure-gates:flow:FR-06
  tests: test/brainstorm-closure-gates.test.mjs「决策追踪表待确认残留 → warning／改已覆盖后消除」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-closure-gates
  status: active

## FR-docs-consistency-013 新规则全部经 stage-contract-spec manifest 声明，事前契约与事后门同源
变更：2026-09-29-brainstorm-closure-gates
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given stage-contract-spec.js 已声明全部新规则；When 新规则全部经 BRAINSTORM_RULES manifest 声明（renderStageContract 事前契约自动覆盖、事前==事后同源），引擎纯 k；Then manifest 是新规则唯一声明点，引擎/validator/prompt 三消费方零改动吃到全部新规则
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-closure-gates/requirements.md#FR-07
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-closure-gates:flow:FR-07
  tests: test/brainstorm-closure-gates.test.mjs「literal-none 纯 kind 引擎判定」 | test/stage-contract-spec.test.mjs「custom kind 引擎 skip」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-closure-gates
  status: active

## FR-docs-consistency-014 本变更测试面全绿：新增闭环门测试文件，直接关联存量测试随契约更新后零回归
变更：2026-09-29-brainstorm-closure-gates
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 本变更测试面（brainstorm-closure-gates/stage-contract-spec/stage-contract/preflight-sli；Then 行为符合本条标准描述（评审 P3-4 勘误：原「全量测试通过」为超实表述，按实际证据面收窄）
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-closure-gates/requirements.md#FR-08
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-closure-gates:flow:FR-08
  tests: test/run-tests.mjs | test/stage-contract-spec.test.mjs「全齐 0 warning」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-closure-gates
  status: active

## FR-docs-consistency-015 design-init 骨架不再预填 scale: large（scale 留空由 Step 8 规
变更：2026-09-29-brainstorm-exit-thin-default
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When design-init 骨架不再预填 scale: large（scale 留空由 Step 8 规模评估落值）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-exit-thin-default/requirements.md#FR-01
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-exit-thin-default:flow:FR-01
  tests: test/brainstorm-exit-thin-default.test.mjs「①骨架不预填／②scale 三态解析／③指引换轴」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-exit-thin-default
  status: active

## FR-docs-consistency-016 Step 8 精判与 Step 2 粗判的判据换轴：small=单上下文可吞吐（无 Wave 并行编
变更：2026-09-29-brainstorm-exit-thin-default
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When Step 8 精判与 Step 2 粗判的判据换轴：small=单上下文可吞吐（无 Wave 并行编排/上下文分片/多阶段治理需求）；Then flow start 收编 2 调用收口
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-exit-thin-default/requirements.md#FR-02
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-exit-thin-default:flow:FR-02
  tests: test/brainstorm-exit-thin-default.test.mjs「①骨架不预填／②scale 三态解析／③指引换轴」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-exit-thin-default
  status: active

## FR-docs-consistency-017 large=需要编排/分片/治理或用户显式要求
变更：2026-09-29-brainstorm-exit-thin-default
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When large=需要编排/分片/治理或用户显式要求；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-exit-thin-default/requirements.md#FR-03
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-exit-thin-default:flow:FR-03
  tests: test/brainstorm-exit-thin-default.test.mjs「①骨架不预填／②scale 三态解析／③指引换轴」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-exit-thin-default
  status: active

## FR-docs-consistency-018 拿不准默认 small（升厚留运行时证据：实测失败自动升厚＋--upgrade-thick）
变更：2026-09-29-brainstorm-exit-thin-default
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 拿不准默认 small（升厚留运行时证据：实测失败自动升厚＋--upgrade-thick）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-exit-thin-default/requirements.md#FR-04
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-exit-thin-default:flow:FR-04
  tests: test/brainstorm-exit-thin-default.test.mjs「①骨架不预填／②scale 三态解析／③指引换轴」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-exit-thin-default
  status: active

## FR-docs-consistency-019 收口提示翻转：未标/small → flow start 收编
变更：2026-09-29-brainstorm-exit-thin-default
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 收口提示翻转：未标/small；Then flow start 收编
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-exit-thin-default/requirements.md#FR-05
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-exit-thin-default:flow:FR-05
  tests: test/brainstorm-exit-thin-default.test.mjs「①骨架不预填／②scale 三态解析／③指引换轴」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-exit-thin-default
  status: active

## FR-docs-consistency-020 large → run plan
变更：2026-09-29-brainstorm-exit-thin-default
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When large；Then run plan
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-exit-thin-default/requirements.md#FR-06
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-exit-thin-default:flow:FR-06
  tests: test/brainstorm-exit-thin-default.test.mjs「①骨架不预填／②scale 三态解析／③指引换轴」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-exit-thin-default
  status: active

## FR-docs-consistency-021 单测三面（骨架不预填/指引文案含新判据与默认/收口提示翻转）＋既有回归全绿
变更：2026-09-29-brainstorm-exit-thin-default
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 单测三面（骨架不预填/指引文案含新判据与默认/收口提示翻转）＋既有回归全绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-exit-thin-default/requirements.md#FR-07
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-exit-thin-default:flow:FR-07
  tests: test/brainstorm-exit-thin-default.test.mjs「①骨架不预填／②scale 三态解析／③指引换轴」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-exit-thin-default
  status: active

## FR-docs-consistency-022 行为级闭环实测：小白鼠带模糊需求走头脑风暴至 Step 8，出口收编轻量道而非 run plan
变更：2026-09-29-brainstorm-exit-thin-default
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 行为级闭环实测：小白鼠带模糊需求走头脑风暴至 Step 8，出口收编轻量道而非 run plan；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-29-brainstorm-exit-thin-default/requirements.md#FR-08
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-29-brainstorm-exit-thin-default:flow:FR-08
  tests: test/brainstorm-exit-thin-default.test.mjs「①骨架不预填／②scale 三态解析／③指引换轴」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-29-brainstorm-exit-thin-default
  status: active
