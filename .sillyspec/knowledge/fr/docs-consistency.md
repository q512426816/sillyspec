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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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
骨架：thin
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

## FR-docs-consistency-023 三个解析器（parseModulePathsSubset / parseModuleMapPaths / parseModuleMapSimple）修复列表收集终止条件：任何缩进 4 的字段头行（形如 '字段名:' 或 '字段名: 值'——开放世界判据，不枚举字段名清单）终结上一个 list 字段的收集；块式 paths 后跟 tags/aliases/depends_on 的 yaml 解析后 paths/core_files 恰只含各自声明的列表项；未来新增字段名（当前未识别的自定义字段）同样不泄漏；既有内联 'paths: [..]' 行为不变
变更：2026-10-06-module-map-list-leak
状态：active
摘要：块式多字段（实测形态）；未识别自定义字段（开放世界）
全文：.sillyspec/changes/archive/2026-10-06-module-map-list-leak/requirements.md#FR-01
最近确认：bb882b535e34e2a82d97f0324d0f88e4420bf591

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-module-map-list-leak:flow:测试绑定FR-01
  tests: test/module-map-list-leak.test.mjs「块式多字段不泄漏（三解析器）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-module-map-list-leak
  status: active

## FR-docs-consistency-024 flow start fresh 起点域路由的 input token 增加在场过滤：token 相对 cwd 在文件系统存在（existsSync）才参与域路由——文件系统当裁判不建前缀白名单；绿地模块图草案的路径提取（bsPaths）保持不过滤（绿地语料允许指向尚不存在的目标）；实测误路由用例回归：git/DB/JSON 不再路由到 server-parser
变更：2026-10-06-module-map-list-leak
状态：active
摘要：散文斜杠词不路由（实测回归）；图内目标文件（尚不存在）照常路由；绿地草案不受影响
全文：.sillyspec/changes/archive/2026-10-06-module-map-list-leak/requirements.md#FR-02
最近确认：bb882b535e34e2a82d97f0324d0f88e4420bf591

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-module-map-list-leak:flow:测试绑定FR-02
  tests: test/module-map-list-leak.test.mjs「域路由在场过滤与绿地草案不受影响」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-module-map-list-leak
  status: active

## FR-docs-consistency-025 测试覆盖：三解析器的块式多字段不泄漏回归、未识别自定义字段名不泄漏（开放世界性）、routing 在场过滤保留真实路径 token 且过滤散文斜杠词、绿地草案路径提取不受影响
变更：2026-10-06-module-map-list-leak
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-06-module-map-list-leak/requirements.md#FR-03
最近确认：bb882b535e34e2a82d97f0324d0f88e4420bf591

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-module-map-list-leak:flow:测试绑定FR-03
  tests: test/module-map-list-leak.test.mjs「全量用例（含 resolveTouchedDomains 端到端误路由回归）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-module-map-list-leak
  status: active

## FR-docs-consistency-026 verify-probes --init --force 覆盖前自动落带时间戳备份到 .sillyspec/.runtime/verify-runs/ 并打印备份路径；新增 --refresh-probes 定向刷新：只刷新未手填的探针预填段，已手填段保留并逐段报告跳过原因
变更：2026-10-06-verify-friction-fix
状态：active
摘要：手填结论在刷新后存活；force 重置可找回
场景正文：
- 场景：手填结论在刷新后存活 — Given verify-result.md 已手填结论枚举与探针 7 部分矩阵格 / When `verify-probes --change <名> --refresh
- 场景：force 重置可找回 — Given verify-result.md 含手填内容 / When `verify-probes --change <名> --init --force` / Then
全文：.sillyspec/changes/archive/2026-10-06-verify-friction-fix/requirements.md#FR-01
最近确认：2faced26e0c4129d1489655c68b78a21c1cbc90a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-friction-fix:flow:测试绑定FR-01
  tests: test/verify-probes-refresh-backup.test.mjs「backupVerifyResult：落时间戳备份，原文不动，路径在 verify-runs 下」 | test/verify-probes-refresh-backup.test.mjs「refreshProbeSections：含待填占位的段被刷新，已手填段保留，表格已填行携载」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-friction-fix
  status: active

## FR-docs-consistency-027 sillyspec gate last --change <名> 直接打印 gate-last 指针内容与 blocked 明细（含 reconcile missing/undeclared 摘要），exit code 反映是否存在阻断；sillyspec runtime list 的 KNOWN 清单登记 verify-runs
变更：2026-10-06-verify-friction-fix
状态：active
摘要：无锚点；blocked 锚点直读
场景正文：
- 场景：无锚点 — Given 该变更从未发生 verify --done 阻断落锚 / When `gate last --change <名>` / Then 打印「无 gate-last
- 场景：blocked 锚点直读 — Given gate-last 指针 blocked=true 且指向的取证目录含 reconcile-result.json（missing 1 条）/ When `ga
全文：.sillyspec/changes/archive/2026-10-06-verify-friction-fix/requirements.md#FR-02
最近确认：2faced26e0c4129d1489655c68b78a21c1cbc90a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-friction-fix:flow:测试绑定FR-02
  tests: test/gate-last-reader.test.mjs「blocked 指针 + 取证目录 → 摘要含 reconcile missing/undeclared 与 probe mismatches」 | test/gate-last-reader.test.mjs「无指针 → found:false（不抛）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-friction-fix
  status: active

## FR-docs-consistency-028 plan postcheck YAML 硬门报错按 js-yaml 错误类型分诊：至少覆盖半角冒号（mapping values are not allowed）、保留指示符（cannot start any token，含反引号）、流序列（expected , or ]）三类，各给中文修复动作；新增 sillyspec taskcard validate [--all|--task task-NN] 独立校验命令（frontmatter/必要字段/占位符/target_files 形态），失败 exit 1
变更：2026-10-06-verify-friction-fix
状态：active
摘要：冒号值卡的分诊；validate 拦严格形态
场景正文：
- 场景：冒号值卡的分诊 — Given 任务卡 frontmatter 含 `title: A: B` 形态（js-yaml 报 bad indentation of a mapping entry）
- 场景：validate 拦严格形态 — Given 任务卡 target_files 含 `src/*.js` glob 条目 / When `taskcard <change> --validate` / Th
全文：.sillyspec/changes/archive/2026-10-06-verify-friction-fix/requirements.md#FR-03
最近确认：2faced26e0c4129d1489655c68b78a21c1cbc90a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-friction-fix:flow:测试绑定FR-03
  tests: test/taskcard-yaml-triage-validate.test.mjs「diagnoseTaskYamlError：冒号值 / 反引号指示符 / 引号不成对 / 流序列四类分诊」 | test/taskcard-yaml-triage-validate.test.mjs「validatePlanFeasibility：非法 YAML 报错含分诊动作」 | test/taskcard-yaml-triage-validate.test.mjs「validateTaskcardsCli：好卡过、target_files 非法形态拦、占位骨架拦」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-friction-fix
  status: active

## FR-docs-consistency-029 API_FACE_DECLARED_RE 宽收同义声明（无接口变更/不涉及接口/零端点/无端点/0 端点），design 骨架接口段 TODO 注释附可直接粘贴的声明句式；宽收有回归测试钉住
变更：2026-10-06-verify-friction-fix
状态：active
摘要：散文零端点声明入矩阵；骨架句式不自动生效
场景正文：
- 场景：散文零端点声明入矩阵 — Given design.md 接口段写「本变更不涉及接口」/ When parseDesignApiTable / Then declared=0（API 矩阵按 age
- 场景：骨架句式不自动生效 — Given design.md 由新版骨架生成、声明句式仍在 HTML 注释内未被粘贴为正文 / When parseDesignApiTable / Then decla
全文：.sillyspec/changes/archive/2026-10-06-verify-friction-fix/requirements.md#FR-04
最近确认：2faced26e0c4129d1489655c68b78a21c1cbc90a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-friction-fix:flow:测试绑定FR-04
  tests: test/verify-probes-refresh-backup.test.mjs「design 骨架接口段 TODO 附可粘贴声明句式（注释形态不自动生效）」 | test/verify-probes-refresh-backup.test.mjs「parseDesignApiTable 声明宽收：同义零端点 → declared=0；数字优先；注释内不认」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-friction-fix
  status: active

## FR-docs-consistency-030 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core
变更：2026-10-06-verify-friction-fix
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更全部实现合入 / When `npm run test:core` 与 `npm run lint` / Then 两者均 0 失败退出（E2E 冒烟另证
全文：.sillyspec/changes/archive/2026-10-06-verify-friction-fix/requirements.md#FR-05
最近确认：2faced26e0c4129d1489655c68b78a21c1cbc90a

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-friction-fix:flow:测试绑定FR-05
  tests: test/verify-probes-refresh-backup.test.mjs「backupVerifyResult：目标缺失时返回 null 不抛（fail-soft）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-friction-fix
  status: active

## FR-docs-consistency-031 gate execute/verify 默认档新增 stage-review informational 检查：缺 review.json 时 warning 含 register-stage-review 指引、在场时静默 ok；--full 档 full-stage-review 的 error 语义与 id 均不变（默认档用独立 check id 不碰撞）
变更：2026-10-07-flow-friction-batch3
状态：active
摘要：缺 review 的默认档提示；--full 不回归
场景正文：
- 场景：缺 review 的默认档提示 — Given execute 变更未注册 stage review / When gate execute（默认档）/ Then checks 含 stage-review-
- 场景：--full 不回归 — Given 同上 / When gate execute --full / Then full-stage-review 在场、ok=false（缺 review 即 er
全文：.sillyspec/changes/archive/2026-10-07-flow-friction-batch3/requirements.md#FR-01
最近确认：ea25b2c67fabd8c926fe19389cb2b01dbade271e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-flow-friction-batch3:flow:测试绑定FR-01
  tests: test/gate-stage-review-hint.test.mjs「H1 默认档：缺 review → stage-review-hint informational + register 指引；在场 → 静默 ok」 | test/gate-stage-review-hint.test.mjs「H1b 默认档 verify 同款提示」 | test/gate-stage-review-hint.test.mjs「H2 --full 档 full-stage-review 的 id 与 error 语义不变」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-flow-friction-batch3
  status: active

## FR-docs-consistency-032 design_file_ref_invalid 报错：根下存在 basename 相同的既有文件时附「相近既有路径：…」（至多 3 条），无相近时不附建议段（不加噪）；NEW: 前缀提示保留
变更：2026-10-07-flow-friction-batch3
状态：active
摘要：缺前缀幻觉；零命中零加噪
场景正文：
- 场景：缺前缀幻觉 — Given 根下有 backend/app/modules/x.py 而 design 清单写 app/modules/x.py / When 校验 / Then 报错含「
- 场景：零命中零加噪 — Given 清单路径的 basename 在根下无同名文件 / When 校验 / Then 报错不含「相近既有路径」段。
全文：.sillyspec/changes/archive/2026-10-07-flow-friction-batch3/requirements.md#FR-02
最近确认：ea25b2c67fabd8c926fe19389cb2b01dbade271e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-flow-friction-batch3:flow:测试绑定FR-02
  tests: test/design-ref-suggest.test.mjs「S1 幻觉路径：报错附相近既有路径（basename did-you-mean）」 | test/design-ref-suggest.test.mjs「S2 无相近/NEW: 前缀：不加建议段不误报」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-flow-friction-batch3
  status: active

## FR-docs-consistency-033 同 Wave 共享文件 error 文案含 plan-adopt-waves 一键重排指引；伪并行串行链报错（既有）不回归
变更：2026-10-07-flow-friction-batch3
状态：active
摘要：冲突指路
场景正文：
- 场景：冲突指路 — 
全文：.sillyspec/changes/archive/2026-10-07-flow-friction-batch3/requirements.md#FR-03
最近确认：ea25b2c67fabd8c926fe19389cb2b01dbade271e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-flow-friction-batch3:flow:测试绑定FR-03
  tests: test/flow-friction-batch3.test.mjs「W1 同 Wave 共享文件 error 含 plan-adopt-waves 一键重排指引」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-flow-friction-batch3
  status: active

## FR-docs-consistency-034 sillyspec module-impact --change <名> --fill-skipped [--reason "..."]：pending/待办行状态改 skipped、--reason 追加进操作列、其余内容逐字不动；无 module-impact.md 或无更新结果表时 exit 2 报错；幂等（重跑零改动）
变更：2026-10-07-flow-friction-batch3
状态：active
摘要：批量回填；缺文件拒跑
场景正文：
- 场景：批量回填 — Given 更新结果表 2 行 pending/待办 + 1 行 done / When --fill-skipped --reason "模块卡同步并入下批" / The
- 场景：缺文件拒跑 — Given 变更目录无 module-impact.md / When 同命令 / Then exit 2 且报错点名文件。
全文：.sillyspec/changes/archive/2026-10-07-flow-friction-batch3/requirements.md#FR-04
最近确认：ea25b2c67fabd8c926fe19389cb2b01dbade271e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-flow-friction-batch3:flow:测试绑定FR-04
  tests: test/flow-friction-batch3.test.mjs「F1 fillModuleImpactSkipped：pending/待办→skipped、reason 进操作列、done 行不动、幂等」 | test/flow-friction-batch3.test.mjs「F2 CLI：--fill-skipped 落盘生效；缺 module-impact.md exit 2」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-flow-friction-batch3
  status: active

## FR-docs-consistency-035 execute 收口对 UI 触达且缺 visual-evidence.md 的变更打前置 advisory（warn 级，含落盘路径与 verify 执法提示）；非 UI 变更零输出零行为变化
变更：2026-10-07-flow-friction-batch3
状态：active
摘要：前置提醒；零打扰
场景正文：
- 场景：前置提醒 — Given design 清单含前端 .tsx 且变更目录无 visual-evidence.md / When execute --done 收口 / Then cons
- 场景：零打扰 — Given 非 UI 变更 / When execute --done 收口 / Then 无该 advisory 输出。
全文：.sillyspec/changes/archive/2026-10-07-flow-friction-batch3/requirements.md#FR-05
最近确认：ea25b2c67fabd8c926fe19389cb2b01dbade271e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-flow-friction-batch3:flow:测试绑定FR-05
  tests: test/design-ref-suggest.test.mjs「U1 UI 触达 + 证据缺失 → 前置 advisory 含落盘路径与 verify 执法提示」 | test/design-ref-suggest.test.mjs「U2 证据在场 / 非 UI → null 零打扰」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-flow-friction-batch3
  status: active

## FR-docs-consistency-036 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core
变更：2026-10-07-flow-friction-batch3
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更全部实现合入 / When npm run test:core 与 npm run lint / Then 均零失
全文：.sillyspec/changes/archive/2026-10-07-flow-friction-batch3/requirements.md#FR-06
最近确认：ea25b2c67fabd8c926fe19389cb2b01dbade271e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-flow-friction-batch3:flow:测试绑定FR-06
  tests: test/gate-stage-review-hint.test.mjs「H2 --full 档 full-stage-review 的 id 与 error 语义不变」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-flow-friction-batch3
  status: active

## FR-docs-consistency-037 syncModuleDocSidecars 戳的卡 updated_at 为全量 ISO（toISOString()，带 Z），瞬间正确（解析值=真实写入时刻），不再拼硬编码偏移
变更：2026-10-09-module-card-updated-at-iso
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-module-card-updated-at-iso/requirements.md#FR-01
最近确认：7cbdba1009a347093ab7be9d7d4309b86acd2c57

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-module-card-updated-at-iso:flow:测试绑定FR-01
  tests: test/knife-batch2.test.mjs「syncModuleDocSidecars：sidecar 追加 + 卡戳 + 幂等二跑跳过」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-module-card-updated-at-iso
  status: active

## FR-docs-consistency-038 回归测试：同步后卡 updated_at 经 Date.parse 落在同步前后时刻窗内（旧实现恒偏 8h 必出窗）
变更：2026-10-09-module-card-updated-at-iso
状态：active
摘要：时区拼接回归被拦
全文：.sillyspec/changes/archive/2026-10-09-module-card-updated-at-iso/requirements.md#FR-02
最近确认：7cbdba1009a347093ab7be9d7d4309b86acd2c57

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-module-card-updated-at-iso:flow:测试绑定FR-02
  tests: test/knife-batch2.test.mjs「syncModuleDocSidecars：sidecar 追加 + 卡戳 + 幂等二跑跳过」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-module-card-updated-at-iso
  status: active

## FR-docs-consistency-039 既有 module-docs-sync 测试面（knife-batch2.test.mjs 等）全绿
变更：2026-10-09-module-card-updated-at-iso
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-09-module-card-updated-at-iso/requirements.md#FR-03
最近确认：7cbdba1009a347093ab7be9d7d4309b86acd2c57

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-09-module-card-updated-at-iso:flow:测试绑定FR-03
  tests: test/knife-batch2.test.mjs | test/r4-followup-fixes.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-09-module-card-updated-at-iso
  status: active

## FR-docs-consistency-040 brainstorm「HTML 原型分级」含登记复用档（必须）
变更：2026-10-13-proto-reuse-register
状态：active
摘要：主路径——既有可复跑原型；排除——静态截图
场景正文：
- 场景：主路径——既有可复跑原型 — Given 用户在 brainstorm 前提供了终稿 HTML 原型（如 fire-equipment 的 4497 行原型）；When agent 走到「展示设计方案」步做原型分级；Then 走登记复用档：把原型复制为变更目录下 `prototype-<名称>.html`、声明来源与覆盖面，不重画。
- 场景：排除——静态截图 — Given 用户只提供了截图/静态设计稿；When agent 做原型分级；Then 不适用登记复用档，仍按「必须生成」产出可复跑的 HTML 原型。
全文：.sillyspec/changes/archive/2026-10-13-proto-reuse-register/requirements.md#FR-01
最近确认：1e191cfeb5a1d0b75177790172f07ea7386964e2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-proto-reuse-register:flow:测试绑定FR-01
  tests: test/proto-reuse-register.test.mjs「分级含登记复用档且命名硬要求在场」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-proto-reuse-register
  status: active

## FR-docs-consistency-041 分级决策从二选一扩为三选一（必须）
变更：2026-10-13-proto-reuse-register
状态：active
摘要：主路径——三选一落在复用
场景正文：
- 场景：主路径——三选一落在复用 — Given 本次 UI 面已有可复跑既有原型；When agent 完成分级决策；Then 输出含复用声明（来源路径+覆盖面）与登记后的 `prototype-*.html` 路径，且暂停前该文件已在变更目录。
全文：.sillyspec/changes/archive/2026-10-13-proto-reuse-register/requirements.md#FR-02
最近确认：1e191cfeb5a1d0b75177790172f07ea7386964e2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-proto-reuse-register:flow:测试绑定FR-02
  tests: test/proto-reuse-register.test.mjs「三选一口径落在操作/铁律/输出三处」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-proto-reuse-register
  status: active

## FR-docs-consistency-042 周边四处指引同步复用口径（必须）
变更：2026-10-13-proto-reuse-register
状态：active
摘要：主路径——提醒兜底
场景正文：
- 场景：主路径——提醒兜底 — Given agent 声明了登记复用但忘了把文件复制进变更目录；When brainstorm「生成规范文件」步 --done 触发软提醒；Then 提醒文案给出登记复用出路（复制为 prototype-<名称>.html），用户可照办或否决。
全文：.sillyspec/changes/archive/2026-10-13-proto-reuse-register/requirements.md#FR-03
最近确认：1e191cfeb5a1d0b75177790172f07ea7386964e2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-proto-reuse-register:flow:测试绑定FR-03
  tests: test/proto-reuse-register.test.mjs「四处周边指引同步复用口径」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-proto-reuse-register
  status: active

## FR-docs-consistency-043 测试覆盖与全绿（必须）
变更：2026-10-13-proto-reuse-register
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 改动落盘；When 跑新增测试与全量测试；Then 新测试断言全过、既有测试零失败、lint 零错误。
全文：.sillyspec/changes/archive/2026-10-13-proto-reuse-register/requirements.md#FR-04
最近确认：1e191cfeb5a1d0b75177790172f07ea7386964e2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-proto-reuse-register:flow:测试绑定FR-04
  tests: test/proto-reuse-register.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-proto-reuse-register
  status: active

## FR-docs-consistency-044 brainstorm「生成要求」升级为真码产物口径（必须）
变更：2026-10-13-proto-real-code
状态：active
摘要：主路径——React 项目出原型；降级——小程序平台无 HTML 面
场景正文：
- 场景：主路径——React 项目出原型 — Given 项目前端为 React+antd 且 node_modules 在场；When brainstorm 走到「必须生成」档产出定稿原型；Then 入口为变更目录 `prototype-<名称>.html`，其中挂载真实组件（从项目源码或 node_modules 引入），浏览器打开即真实组件渲染，而非手搓
- 场景：降级——小程序平台无 HTML 面 — Given 目标平台无 HTML 运行面（如小程序原生）；When 无法同方言真码化；Then 显式声明降级与理由、请用户裁决留痕——不得静默交手绘件充当定稿。
全文：.sillyspec/changes/archive/2026-10-13-proto-real-code/requirements.md#FR-01
最近确认：0c335da4c6c120874b3504d7b1cbaf6155067708

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-proto-real-code:flow:测试绑定FR-01
  tests: test/proto-real-code.test.mjs「生成要求＝真码产物五要素在场且旧手绘指令移除」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-proto-real-code
  status: active

## FR-docs-consistency-045 explore 原型定位为粗选件并注明交接升级（必须）
变更：2026-10-13-proto-real-code
状态：active
摘要：主路径——探索手稿进入 brainstorm
场景正文：
- 场景：主路径——探索手稿进入 brainstorm — Given explore 产出了手绘粗选件且话题进入 brainstorm；When brainstorm 做原型分级；Then 该手稿仅作方向输入；定稿必须按 FR-01 生成真码（或登记其他可复跑真码），手稿不得复制充当变更原型登记。
全文：.sillyspec/changes/archive/2026-10-13-proto-real-code/requirements.md#FR-02
最近确认：0c335da4c6c120874b3504d7b1cbaf6155067708

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-proto-real-code:flow:测试绑定FR-02
  tests: test/proto-real-code.test.mjs「explore 粗选定位与交接升级在场」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-proto-real-code
  status: active

## FR-docs-consistency-046 design-facts 自审清单同步真码口径（必须）
变更：2026-10-13-proto-real-code
状态：active
摘要：主路径——自审复核
场景正文：
- 场景：主路径——自审复核 — Given agent 在 brainstorm 写 design.md 自审；When 过 UI 原型分级核对清单项；Then 该项提示定稿须真码同方言，手绘仅粗选。
全文：.sillyspec/changes/archive/2026-10-13-proto-real-code/requirements.md#FR-03
最近确认：0c335da4c6c120874b3504d7b1cbaf6155067708

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-proto-real-code:flow:测试绑定FR-03
  tests: test/proto-real-code.test.mjs「design-facts 清单真码口径 + 注入契约未动」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-proto-real-code
  status: active

## FR-docs-consistency-047 测试锁口径防漂移且全绿（必须）
变更：2026-10-13-proto-real-code
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 改动落盘；When 跑新增测试与全量测试；Then 断言全过、既有测试零失败、lint 零错误、`_verify` 对 brainstorm/explore 零 miss。
全文：.sillyspec/changes/archive/2026-10-13-proto-real-code/requirements.md#FR-04
最近确认：0c335da4c6c120874b3504d7b1cbaf6155067708

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-13-proto-real-code:flow:测试绑定FR-04
  tests: test/proto-real-code.test.mjs「brainstorm 与 ui-visual 须知关键词同源锁」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-13-proto-real-code
  status: active

## FR-docs-consistency-048 brainstorm Step 8 规模评估的 large 判据含反判据：跨多端/多仓/多文件不是 large 依据（thin 支持多文件与跨仓交付）；任务间顺序依赖不是 Wave 证据（Wave 证据=可真并行且单会话吃不下的任务簇）
变更：2026-10-14-scale-large-evidence
状态：active
摘要：措辞锁（getStageSteps 渲染面）
场景正文：
- 场景：措辞锁（getStageSteps 渲染面） — Given 已初始化仓；When 读取 brainstorm Step 8「生成规范文件」渲染 prompt；Then 含「跨多端/多仓」反判据、「顺序依赖不是 Wave 证据」、「真并行」措辞（test/brainstorm-exit-thin-default.test.mjs
全文：.sillyspec/changes/archive/2026-10-14-scale-large-evidence/requirements.md#FR-01
最近确认：ae0d37e13659260fa6d9e906a82d03bc6363d3e6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-scale-large-evidence:flow:测试绑定FR-01
  tests: test/brainstorm-exit-thin-default.test.mjs「④ large 反判据：跨端/多仓/顺序依赖不算 Wave 证据；判 large 须落 Wave 证据；按定稿重判」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-scale-large-evidence
  status: active

## FR-docs-consistency-049 判 large 时要求在 design.md 写明 Wave 证据（哪些任务可真并行/单上下文为何吃不下），写不出即 small
变更：2026-10-14-scale-large-evidence
状态：active
摘要：Wave 证据落盘要求措辞
场景正文：
- 场景：Wave 证据落盘要求措辞 — Given 已初始化仓；When 读取 Step 8 渲染 prompt；Then 含「Wave 证据」×「design.md」关联要求与「写不出…small」兜底措辞（④）
全文：.sillyspec/changes/archive/2026-10-14-scale-large-evidence/requirements.md#FR-02
最近确认：ae0d37e13659260fa6d9e906a82d03bc6363d3e6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-scale-large-evidence:flow:测试绑定FR-02
  tests: test/brainstorm-exit-thin-default.test.mjs「④ large 反判据（Wave 证据落 design.md/写不出 small 断言）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-scale-large-evidence
  status: active

## FR-docs-consistency-050 Step 8 明确要求按定稿方案实质重判，不沿用 Step 2 早期筛查印象（方案缩水是常态）
变更：2026-10-14-scale-large-evidence
状态：active
摘要：定稿重判措辞双落点
场景正文：
- 场景：定稿重判措辞双落点 — Given 已初始化仓；When 读取 Step 8 与 Step 2 渲染 prompt；Then Step 8 含「定稿…重判」与「早期筛查印象/早期印象」措辞（④）；Step 2 含「缩水后按定稿重判，本步印象不作数」（实现面）
全文：.sillyspec/changes/archive/2026-10-14-scale-large-evidence/requirements.md#FR-03
最近确认：ae0d37e13659260fa6d9e906a82d03bc6363d3e6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-scale-large-evidence:flow:测试绑定FR-03
  tests: test/brainstorm-exit-thin-default.test.mjs「④ large 反判据（定稿重判/早期印象断言）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-scale-large-evidence
  status: active

## FR-docs-consistency-051 design-init 骨架的 scale TODO 提示行同步反判据口径
变更：2026-10-14-scale-large-evidence
状态：active
摘要：TODO 口径与语义不变
场景正文：
- 场景：TODO 口径与语义不变 — Given design-init 骨架生成；Then TODO 注释含「跨端/多仓…不算」口径（①）；`scale: ""` 仍读作 null（未标→收编默认，② 既有用例回归）
全文：.sillyspec/changes/archive/2026-10-14-scale-large-evidence/requirements.md#FR-04
最近确认：ae0d37e13659260fa6d9e906a82d03bc6363d3e6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-scale-large-evidence:flow:测试绑定FR-04
  tests: test/brainstorm-exit-thin-default.test.mjs「① design-init 骨架不预填 large（TODO 反判据口径断言）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-scale-large-evidence
  status: active

## FR-docs-consistency-052 docs/prompt 提取产物与源逐字一致（_extract/_sync/_verify 链路）
变更：2026-10-14-scale-large-evidence
状态：active
摘要：流水线一致性
场景正文：
- 场景：流水线一致性 — Given brainstorm.js 已改；When node _extract.mjs && node _sync.mjs brainstorm && node _verify.mjs；Then Step 8 fence 已替换且校验通过（实现面执行记录）；brainstorm 阶段零 miss
全文：.sillyspec/changes/archive/2026-10-14-scale-large-evidence/requirements.md#FR-05
最近确认：ae0d37e13659260fa6d9e906a82d03bc6363d3e6

## FR-docs-consistency-053 全量 npm test 零失败
变更：2026-10-14-scale-large-evidence
状态：active
摘要：归因验证
场景正文：
- 场景：归因验证 — Given 全量 npm test 存在 1 失败；When 仅回退本变更文件（git stash -- 本变更 5 文件）重跑该测试；Then 失败依旧（归因并行在途变更，非本变更引入）；恢复后目标用例 4/4 绿
全文：.sillyspec/changes/archive/2026-10-14-scale-large-evidence/requirements.md#FR-06
最近确认：ae0d37e13659260fa6d9e906a82d03bc6363d3e6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-scale-large-evidence:flow:测试绑定FR-06
  tests: test/brainstorm-exit-thin-default.test.mjs「①~④ 全绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-scale-large-evidence
  status: active

## FR-docs-consistency-054 supersedes 边只在同变更内解析（含双 legacy 无「变更：」行的同源匹配）；同变更无目标时不建边，不再回退他变更同号条目；用与审计同口径脚本复核，33 条误连归零
变更：2026-10-14-supersedes-mislink-and-change-display
状态：active
摘要：同变更（含双 legacy）建边；跨变更同号不建边
场景正文：
- 场景：同变更（含双 legacy）建边 — Given 同域文件含同变更的 D-005@v2 与 D-005@v1 两条，且另有一对双方均无「变更：」行的 legacy 同号新旧条目；When 构建知识图谱；Then 两条 supersedes 边均建立（v2 → v1，同变更限定）
- 场景：跨变更同号不建边 — Given 同域文件含 D-001@v2（变更 A，supersedes：D-001@v1）与 D-001@v1（变更 B，与 A 无关）；When 构建知识图谱；Then 不建任何指向 D-001@v1（变更 B）的 supersedes 边（旧「同变更优先、再退同文件首个」回退已除）
全文：.sillyspec/changes/archive/2026-10-14-supersedes-mislink-and-change-display/requirements.md#FR-01
最近确认：beeb1ebae01f15018240be37e474b9114d7119ca

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-supersedes-mislink-and-change-display:flow:测试绑定FR-01
  tests: test/knowledge-graph.test.mjs「①解析：supersedes 只认同变更——同变更（含双 legacy）建边、跨变更同号不建边」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-supersedes-mislink-and-change-display
  status: active

## FR-docs-consistency-055 四处决策展示行渲染变更名限定（change 在场显示变更名；缺失时稳定降级形态「变更未记录」不编造）；同号条目在展示面即可区分
变更：2026-10-14-supersedes-mislink-and-change-display
状态：active
摘要：同号条目在场区分；legacy 缺变更行降级
场景正文：
- 场景：同号条目在场区分 — Given 两个 D-001@v1 分属不同变更且同被命中；When 渲染任一展示面；Then 两条展示行各含自己的「变更 <名>」限定，可直接区分
- 场景：legacy 缺变更行降级 — Given 命中条目无「变更：」行；When 渲染展示面；Then 该行渲染「变更未记录」（不编造、不省略）
全文：.sillyspec/changes/archive/2026-10-14-supersedes-mislink-and-change-display/requirements.md#FR-02
最近确认：beeb1ebae01f15018240be37e474b9114d7119ca

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-supersedes-mislink-and-change-display:flow:测试绑定FR-02
  tests: test/decision-change-qualifier.test.mjs「接线钉：{DECISION_HITS} 渲染使用 decisionChangeQualifier」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-supersedes-mislink-and-change-display
  status: active

## FR-docs-consistency-056 新增/更新测试跑绿；全量测试 + lint 绿
变更：2026-10-14-supersedes-mislink-and-change-display
状态：active
摘要：收口实测
场景正文：
- 场景：收口实测 — Given 交付提交完成；When flow done 实测门运行；Then 全量测试零失败且 lint 零 hard fail，否则整单 FAIL
全文：.sillyspec/changes/archive/2026-10-14-supersedes-mislink-and-change-display/requirements.md#FR-03
最近确认：beeb1ebae01f15018240be37e474b9114d7119ca

## FR-docs-consistency-057 「来源：」legacy 兼容读：knowledge-match（parseDecisionFile）、decision-distill（splitKnowledgeSections）、docs-check（parseDecisionEntries）三解析器 MUST 支持来源行兜底——「变更：」优先、「来源：」仅在变更行缺失时生效；decision-distill 侧 legacy 段（带来源行）从此参与同变更匹配（重蒸馏收敛为在位更新而非重复追加），无任何限定行的纯 legacy 段仍不互认
变更：2026-10-14-decision-id-p2-hardening
状态：active
摘要：来源兜底解析；distill 在位更新收敛；变更优先
场景正文：
- 场景：来源兜底解析 — Given 域文件条目仅含「来源：2026-01-01-alpha」行；When 任一解析器读取；Then change=2026-01-01-alpha（机器可见）
- 场景：distill 在位更新收敛 — Given 知识域文件存在带「来源：2026-01-01-alpha」的 legacy D-001@v1 段；When 重蒸馏 change 2026-01-01-alpha 的 D-001@v2；Then legacy 段被在位更新为「变更：」形态，不产生重复段
- 场景：变更优先 — Given 条目同时含「变更：」与「来源：」行（理论形态）；When 解析；Then change 取「变更：」值
全文：.sillyspec/changes/archive/2026-10-14-decision-id-p2-hardening/requirements.md#FR-01
最近确认：b8ab4be3713e53c344ae5ecda70994b775a62d6e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-id-p2-hardening:flow:测试绑定FR-01
  tests: test/decision-id-p2-hardening.test.mjs「① 来源兜底：三解析器读出来源行、变更优先、distill 在位更新收敛」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-id-p2-hardening
  status: active

## FR-docs-consistency-058 折叠修复：同文件同号双 legacy（无任何限定行）MUST 不再互折叠（2 条隐身条目复现）；多条路由行指向同一域文件仍不产生重复解析
变更：2026-10-14-decision-id-p2-hardening
状态：active
摘要：双 legacy 同号共存；路由行重复不放大
场景正文：
- 场景：双 legacy 同号共存 — Given 同域文件两个 D-001@v1 条目均无变更/来源行；When parseDecisionEntries；Then 两条均返回（不再先到遮蔽）
- 场景：路由行重复不放大 — Given INDEX 两条路由行指向同一域文件；When parseDecisionEntries；Then 条目数与单路由一致
全文：.sillyspec/changes/archive/2026-10-14-decision-id-p2-hardening/requirements.md#FR-02
最近确认：b8ab4be3713e53c344ae5ecda70994b775a62d6e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-id-p2-hardening:flow:测试绑定FR-02
  tests: test/decision-id-p2-hardening.test.mjs「② 折叠修复：双 legacy 同号共存 + 路由行重复单解析」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-id-p2-hardening
  status: active

## FR-docs-consistency-059 docs-check 豁免键域限定：新键形态 decisions.<域>/<id>[.<kind>]（规则级精确/条目级伞形）MUST 生效；裸键形态保留兼容
变更：2026-10-14-decision-id-p2-hardening
状态：active
摘要：域限定键命中与他域不豁免
场景正文：
- 场景：域限定键命中与他域不豁免 — Given known_failures 含 decisions/core-engine/D-001@v1.anchor；When 豁免匹配 core-engine 域 D-001@v1 的 anchor 规则与他域同号条目；Then 前者豁免、后者不豁免
全文：.sillyspec/changes/archive/2026-10-14-decision-id-p2-hardening/requirements.md#FR-03
最近确认：b8ab4be3713e53c344ae5ecda70994b775a62d6e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-id-p2-hardening:flow:测试绑定FR-03
  tests: test/decision-id-p2-hardening.test.mjs「③ 豁免键域限定：decisions.<域>/<id>[.<kind>] 命中、裸键兼容、他域同号不豁免」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-id-p2-hardening
  status: active

## FR-docs-consistency-060 已回应判据收紧：complete.js 防复潮「已回应」判定 MUST 从文件级共现收紧为行级共现（命中 id 与域名词或变更名出现在同一行）——自身同号+常见词不再静默吞他变更命中；真实回应形态（unmapped.md D-001@v1 同行）仍被识别
变更：2026-10-14-decision-id-p2-hardening
状态：active
摘要：误吞清偿；真实回应仍识别
场景正文：
- 场景：误吞清偿 — Given 本变更 decisions.md 含自身 D-001@v1 行、他处另一行含「unmapped」词、命中为他变更 unmapped 域 D-001@v1；When knowledge-gate 判定；Then 命中照常回显（不再被吞）
- 场景：真实回应仍识别 — Given decisions.md 某行同时含「unmapped.md」与「D-001@v1」（小白鼠回应形态）；When 判定；Then 抑制（不重弹）
全文：.sillyspec/changes/archive/2026-10-14-decision-id-p2-hardening/requirements.md#FR-04
最近确认：b8ab4be3713e53c344ae5ecda70994b775a62d6e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-id-p2-hardening:flow:测试绑定FR-04
  tests: test/knowledge-gate-denoise.test.mjs「③ 门已回应静默：decisions 正文含 id＋域共现 → 不再回显；未回应照常回显」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-id-p2-hardening
  status: active

## FR-docs-consistency-061 注入文案引用契约：{DECISION_HITS} 与轻量道防复潮段头 MUST 含跨变更引用形态指引（变更名#D-xxx@vN，同号不同变更互不相干）
变更：2026-10-14-decision-id-p2-hardening
状态：active
摘要：指引在场
场景正文：
- 场景：指引在场 — Given 两处段头渲染文本；Then 均含「变更名#D-xxx@vN」字样
全文：.sillyspec/changes/archive/2026-10-14-decision-id-p2-hardening/requirements.md#FR-05
最近确认：b8ab4be3713e53c344ae5ecda70994b775a62d6e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-id-p2-hardening:flow:测试绑定FR-05
  tests: test/decision-id-p2-hardening.test.mjs「⑤ 引用契约接线钉：两处段头含 变更名#D-xxx@vN」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-id-p2-hardening
  status: active

## FR-docs-consistency-062 新增/更新测试跑绿；全量测试 + lint 绿
变更：2026-10-14-decision-id-p2-hardening
状态：active
摘要：收口实测
场景正文：
- 场景：收口实测 — Given 交付提交完成；When flow done 实测门运行；Then 全量测试零失败且 lint 零 hard fail
全文：.sillyspec/changes/archive/2026-10-14-decision-id-p2-hardening/requirements.md#FR-06
最近确认：b8ab4be3713e53c344ae5ecda70994b775a62d6e

## FR-docs-consistency-063 蒸馏写面发号：新蒸馏条目 MUST 落全局号标题 ## D-<发号域>-NNN@vN（发号域=resolveDomains 首域、sanitizeDomain 同口径；NNN=该域前缀全域扫描 max+1，只增不复用）+ 字段行「原编号：<局部号>」（位置在「变更：」后、「锚点：」前——不破「文件：紧跟锚点」既有测试红线）+ 既有「变更：」行
变更：2026-10-14-decision-global-id-epoch
状态：active
摘要：新条目发号
场景正文：
- 场景：新条目发号 — Given 全新知识库（或该域前缀 max=007）蒸馏 change X 的 D-011@v1（首域 core）；When distillIntoKnowledge；Then 落标题 `## D-core-008@v1` + 「变更：X」+「原编号：D-011@v1」
全文：.sillyspec/changes/archive/2026-10-14-decision-global-id-epoch/requirements.md#FR-01
最近确认：79c831d3e1fe990145066757e8c0b0850191f1c1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-global-id-epoch:flow:测试绑定FR-01
  tests: test/decision-global-id-epoch.test.mjs「① 发号与形态：全局号标题+原编号字段+域前缀 max+1 只增不复用」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-global-id-epoch
  status: active

## FR-docs-consistency-064 幂等与单一身份：同变更同号（含版本演进 v1→v2）重蒸馏 MUST 复用已发号（匹配谓词=变更一致 且 号或原编号一致；在位更新标题版本、原编号随版本更新）；多域扇出 MUST 单一身份（同一全局号落多个域文件）；跨文件清理按同一扩展谓词
变更：2026-10-14-decision-global-id-epoch
状态：active
摘要：重蒸馏复用；扇出单一身份
场景正文：
- 场景：重蒸馏复用 — Given change X 的 D-011@v1 已发 D-core-008@v1；When 重蒸馏 change X 的 D-011@v1（重放）与 D-011@v2（版本演进）；Then 重放零重复（同号只一段）；v2 在位承接 D-core-008@v2（原编号 D-011@v2），全局号不复用给他人
- 场景：扇出单一身份 — Given 条目解析域=[core, runtime]；When 蒸馏；Then core.md 与 runtime.md 各落一段且全局号相同
全文：.sillyspec/changes/archive/2026-10-14-decision-global-id-epoch/requirements.md#FR-02
最近确认：79c831d3e1fe990145066757e8c0b0850191f1c1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-global-id-epoch:flow:测试绑定FR-02
  tests: test/decision-global-id-epoch.test.mjs「② 幂等与单一身份：重蒸馏复用号、v2 在位承接、多域扇出同号、跨文件清理」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-global-id-epoch
  status: active

## FR-docs-consistency-065 存量零触碰：既有 legacy 形态条目（无原编号字段）MUST 不被无关蒸馏改写（真实库副本演练：蒸馏样例新条目后 legacy 节段逐字节不变）
变更：2026-10-14-decision-global-id-epoch
状态：active
摘要：真实库副本演练
场景正文：
- 场景：真实库副本演练 — Given 真实知识库副本（700 legacy 节段快照）；When 蒸馏样例新条目（fresh change 目录）；Then 除新落段外全部节段与快照逐字节一致
全文：.sillyspec/changes/archive/2026-10-14-decision-global-id-epoch/requirements.md#FR-03
最近确认：79c831d3e1fe990145066757e8c0b0850191f1c1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-global-id-epoch:flow:测试绑定FR-03
  tests: test/decision-global-id-epoch.test.mjs「③ 存量零触碰：无关蒸馏后 legacy 节段逐字节不变（真实库副本演练）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-global-id-epoch
  status: active

## FR-docs-consistency-066 读面双形态：splitKnowledgeSections/knowledge-match（含 graph 消费）/docs-check parseDecisionEntries/doctor 计数正则 MUST 同时解析局部形态（D-011@v1）与全局形态（D-<域>-042@v1）；graph supersedes 同变更解析 MUST 支持经原编号匹配全局形态目标
变更：2026-10-14-decision-global-id-epoch
状态：active
摘要：双形态同库解析
场景正文：
- 场景：双形态同库解析 — Given 同域文件含局部形态段与全局形态段各一；When 四处读面解析；Then 两段均可见（id 各自形态），graph 节点均建立；全局段的 supersedes：D-011@v1 可经原编号解析到同变更全局段
全文：.sillyspec/changes/archive/2026-10-14-decision-global-id-epoch/requirements.md#FR-04
最近确认：79c831d3e1fe990145066757e8c0b0850191f1c1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-global-id-epoch:flow:测试绑定FR-04
  tests: test/decision-global-id-epoch.test.mjs「④ 读面双形态：三解析器+doctor 计数双形态 + graph supersedes 经原编号匹配」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-global-id-epoch
  status: active

## FR-docs-consistency-067 平台向量 anchor：新条目 anchor 即全局号（knowledge-vector 等值匹配语义不变；平台重建索引窗口内向量召回对新条目降级属可接受边界，代码注释如实注记）
变更：2026-10-14-decision-global-id-epoch
状态：active
摘要：等值匹配
场景正文：
- 场景：等值匹配 — Given 平台召回条目 anchor=新条目全局号；When buildResultFromPlatform 匹配；Then 命中该条目（等值语义与局部形态时代一致）
全文：.sillyspec/changes/archive/2026-10-14-decision-global-id-epoch/requirements.md#FR-05
最近确认：79c831d3e1fe990145066757e8c0b0850191f1c1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-global-id-epoch:flow:测试绑定FR-05
  tests: test/decision-global-id-epoch.test.mjs「⑤ 向量契约锚：等值匹配语义不变 + 平台窗口降级注记在场」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-global-id-epoch
  status: active

## FR-docs-consistency-068 新增/更新测试跑绿；全量测试 + lint 绿
变更：2026-10-14-decision-global-id-epoch
状态：active
摘要：收口实测
场景正文：
- 场景：收口实测 — Given 交付提交完成；When flow done 实测门运行；Then 全量测试零失败且 lint 零 hard fail
全文：.sillyspec/changes/archive/2026-10-14-decision-global-id-epoch/requirements.md#FR-06
最近确认：79c831d3e1fe990145066757e8c0b0850191f1c1

## FR-docs-consistency-069 迁移 CLI（sillyspec knowledge renumber）：--dry-run 输出迁移计划（总号数/fanout 收敛组数/无变更条目数/各域号段起点），--apply 执行重写——legacy 节段标题改 D-<域>-NNN@vN（域=所在文件名；fanout 组=同变更同号跨文件副本取字母序首文件域、全组同号；无变更行条目逐节独立发号不分组）、「原编号：<旧号>」插入变更行后（无变更行则状态行后）、其余行逐字节保留、节段次序不变；epoch 形态节段零触碰；各域发号从全域既有 epoch 号 max+1 起
变更：2026-10-14-decision-legacy-renumber
状态：active
摘要：dry-run 计划对账；fanout 单一身份
场景正文：
- 场景：dry-run 计划对账 — Given 真实知识库（701 legacy 节段、75 fanout 组、1 epoch 节段）；When knowledge renumber --dry-run；Then 计划输出迁移号数 597（701−179 副本+75 组号）、epoch 零触碰、各域起点=该域既有 epoch max+1
- 场景：fanout 单一身份 — Given 同变更同号条目分布于 alpha.md 与 beta.md；When --apply；Then 两副本标题同为 D-alpha-NNN@vN（字母序首文件域），原编号均为旧局部号
全文：.sillyspec/changes/archive/2026-10-14-decision-legacy-renumber/requirements.md#FR-01
最近确认：1cb2fc91c7a752bac7172540c9892efedc0b476b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-legacy-renumber:flow:测试绑定FR-01
  tests: test/decision-legacy-renumber.test.mjs「① 计划与重写：fanout 同号/无变更独立发号/原编号插行/其余字节保留/epoch 零触碰/域起点 max+1」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-legacy-renumber
  status: active

## FR-docs-consistency-070 幂等与安全：--apply 重跑零变化（原编号在场的节段不再迁移）；计划与重写分离为纯函数；真实库执行走 dry-run 先行（计划数与实测底数对账 701→≈597）
变更：2026-10-14-decision-legacy-renumber
状态：active
摘要：重跑幂等
场景正文：
- 场景：重跑幂等 — Given 已 --apply 的知识库；When 再次 --apply；Then 全部文件零字节变化，退出码 0
全文：.sillyspec/changes/archive/2026-10-14-decision-legacy-renumber/requirements.md#FR-02
最近确认：1cb2fc91c7a752bac7172540c9892efedc0b476b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-legacy-renumber:flow:测试绑定FR-02
  tests: test/decision-legacy-renumber.test.mjs「② 幂等与纯函数：重跑零变化、真实库副本 dry-run 对账 701→597」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-legacy-renumber
  status: active

## FR-docs-consistency-071 兼容：docs-check isDecisionExempt 认原编号（消费仓旧裸键 decisions.D-002@vN 迁移后仍命中）；迁移后 parseDecisionEntries 全节段可见、graph 构建正常、doctor 计数=节段总数
变更：2026-10-14-decision-legacy-renumber
状态：active
摘要：旧裸键仍命中
场景正文：
- 场景：旧裸键仍命中 — Given known_failures 含 decisions.D-002@v1，条目已迁移为 D-core-014@v1（原编号：D-002@v1）；When isDecisionExempt；Then 命中豁免
全文：.sillyspec/changes/archive/2026-10-14-decision-legacy-renumber/requirements.md#FR-03
最近确认：1cb2fc91c7a752bac7172540c9892efedc0b476b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-legacy-renumber:flow:测试绑定FR-03
  tests: test/decision-legacy-renumber.test.mjs「③ 兼容：isDecisionExempt 认原编号、迁移后全节段可见/图构建」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-legacy-renumber
  status: active

## FR-docs-consistency-072 平台迁移：真实库 apply 后 platform sync 推送 spec 树；向量检索验证（查询探针核对锚点形态或如实记录重建窗口降级）
变更：2026-10-14-decision-legacy-renumber
状态：active
摘要：平台推送
场景正文：
- 场景：平台推送 — Given 迁移已 apply 且已提交；When platform sync；Then 推送成功回执；向量探针结果（锚点命中或降级窗口注记）留档提交消息
全文：.sillyspec/changes/archive/2026-10-14-decision-legacy-renumber/requirements.md#FR-04
最近确认：1cb2fc91c7a752bac7172540c9892efedc0b476b

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-decision-legacy-renumber:flow:测试绑定FR-04
  tests: test/decision-legacy-renumber.test.mjs「④ CLI 接线钉：knowledge renumber 两档 + 真实库演练由提交流程承担」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-decision-legacy-renumber
  status: active

## FR-docs-consistency-073 新增/更新测试跑绿；全量测试 + lint 绿
变更：2026-10-14-decision-legacy-renumber
状态：active
摘要：收口实测
场景正文：
- 场景：收口实测 — Given 交付提交完成；When flow done 实测门运行；Then 全量测试零失败且 lint 零 hard fail
全文：.sillyspec/changes/archive/2026-10-14-decision-legacy-renumber/requirements.md#FR-05
最近确认：1cb2fc91c7a752bac7172540c9892efedc0b476b

## FR-auto-claude-004 uncategorized.md 收件箱必须清空且仅留头部与清账留痕
变更：2026-10-08-knowledge-inbox-triage
状态：active
摘要：清账后收件箱为空
全文：.sillyspec/changes/archive/2026-10-08-knowledge-inbox-triage/requirements.md#FR-01
最近确认：bda98076636049009a2f2e032aade374999ea969

## FR-auto-claude-005 全部内容块必须按语义无损迁入五个分类文件
变更：2026-10-08-knowledge-inbox-triage
状态：active
摘要：逐块对号入座
全文：.sillyspec/changes/archive/2026-10-08-knowledge-inbox-triage/requirements.md#FR-02
最近确认：bda98076636049009a2f2e032aade374999ea969

## FR-auto-claude-006 已修复条目必须按 known-issues 惯例标注且不得虚标
变更：2026-10-08-knowledge-inbox-triage
状态：active
摘要：修复凭据分级标注
全文：.sillyspec/changes/archive/2026-10-08-knowledge-inbox-triage/requirements.md#FR-03
最近确认：bda98076636049009a2f2e032aade374999ea969

## FR-auto-claude-007 INDEX.md 必须补齐迁入条目索引且不动他会话未提交 hunks
变更：2026-10-08-knowledge-inbox-triage
状态：active
摘要：关键词命中新落点
全文：.sillyspec/changes/archive/2026-10-08-knowledge-inbox-triage/requirements.md#FR-04
最近确认：bda98076636049009a2f2e032aade374999ea969

## FR-auto-analysis-001 报告落盘 docs/analysis/fire-equipment-dogfood-复盘-2026-10-12.md，含五节：样本概况 / 调用量化（子命令分布、重试密度、读源码猜格式次数）/ 门禁有效性正面清单（评审真拦截的缺陷实录）/ 问题-处置对照表（P1~P11 与本批四变更 commit 锚）/ 校准基线与遗留项
变更：2026-10-12-fire-dogfood-retrospective
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 四子代理分析回执在场；When 报告落盘；Then 五节标题齐全且每节有实数据（表/时间戳/commit 锚），无空节。
全文：.sillyspec/changes/archive/2026-10-12-fire-dogfood-retrospective/requirements.md#FR-01
最近确认：b863fc2c1f986889e87f0228ea38c0f1041f7db4

## FR-auto-analysis-002 报告内数据全部来自四子代理取证（时间戳/计数可回溯 full.json），不做无据推断
变更：2026-10-12-fire-dogfood-retrospective
状态：active
摘要：可回溯
场景正文：
- 场景：可回溯 — When 抽查报告内任一数字；Then 能在子代理回执或 full.json 取证命令中找到同值出处。
全文：.sillyspec/changes/archive/2026-10-12-fire-dogfood-retrospective/requirements.md#FR-02
最近确认：b863fc2c1f986889e87f0228ea38c0f1041f7db4

## FR-auto-analysis-003 docs-check skip 登记（R16 同级：带日期快照行号冻结），doc-ref-check 与 lint 复绿
变更：2026-10-12-fire-dogfood-retrospective
状态：active
摘要：校验绿
场景正文：
- 场景：校验绿 — When `node test/doc-ref-check.test.mjs` 与 `npm run lint`；Then 分别输出全部通过。
全文：.sillyspec/changes/archive/2026-10-12-fire-dogfood-retrospective/requirements.md#FR-03
最近确认：b863fc2c1f986889e87f0228ea38c0f1041f7db4

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-12-fire-dogfood-retrospective:flow:测试绑定FR-03
  tests: test/doc-ref-check.test.mjs「93 处引用全通过（含新增 skip 登记与重锚）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-12-fire-dogfood-retrospective
  status: active

## FR-auto-analysis-004 纯文档变更：实测面按仓规自动跳过（docs gate 判定）
变更：2026-10-12-fire-dogfood-retrospective
状态：active
摘要：收口
场景正文：
- 场景：收口 — When flow done；Then docs gate 判定纯文档跳过实测，归档完成。
全文：.sillyspec/changes/archive/2026-10-12-fire-dogfood-retrospective/requirements.md#FR-04
最近确认：b863fc2c1f986889e87f0228ea38c0f1041f7db4

## FR-auto-round5-003 R17 报告入库
变更：2026-09-25-r17-assets-intake
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given R17 三臂实验报告在临时目录；When 按 R16 先例格式（引言含目的/口径/判据）入 docs/analysis/；Then docs/analysis/R17-对撞-三臂轻量完整与openspec-2026-09-25.md 在场且含总表/四结论/成本细分/资产对比
全文：.sillyspec/changes/archive/2026-09-25-r17-assets-intake/requirements.md#FR-01
最近确认：d3342a85bb06e43dab876a12b30c62ad7c6905dd

## FR-auto-round5-004 实验知识入 known-issues
变更：2026-09-25-r17-assets-intake
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 4 条实验知识有跨会话复利价值（flag 死路类/摘录碎片化/verify 互锁/绿地伪域断流）；When 追加为 known-issues.md 条目；Then 每条含现象/证据锚点/修复状态；INDEX.md 补可区分关键词路由行（知识命中面可及）
全文：.sillyspec/changes/archive/2026-09-25-r17-assets-intake/requirements.md#FR-02
最近确认：d3342a85bb06e43dab876a12b30c62ad7c6905dd

## FR-auto-sillyspec-024 knowledge digest 伪域信号归零（pseudo=0，36 条全部迁入真域，ID 不变）
变更：2026-10-15-pseudo-domain-clearance
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-pseudo-domain-clearance/requirements.md#FR-01
最近确认：5570285d46e6b499799c7a903903ea11bdd970e0

## FR-auto-sillyspec-025 六个 auto-* 域文件删空壳，INDEX 路由行无 auto-* 残留、新域路由行在场
变更：2026-10-15-pseudo-domain-clearance
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-pseudo-domain-clearance/requirements.md#FR-02
最近确认：5570285d46e6b499799c7a903903ea11bdd970e0

## FR-auto-sillyspec-026 release 模块卡与 _module-map 注册在场，未来 release 变更触达 package.json 可路由真域
变更：2026-10-15-pseudo-domain-clearance
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-pseudo-domain-clearance/requirements.md#FR-03
最近确认：5570285d46e6b499799c7a903903ea11bdd970e0

## FR-auto-sillyspec-027 迁移后 knowledge validate 全绿（锚点/注册/幽灵条目零新增问题）
变更：2026-10-15-pseudo-domain-clearance
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-pseudo-domain-clearance/requirements.md#FR-04
最近确认：5570285d46e6b499799c7a903903ea11bdd970e0

## FR-docs-consistency-074 anchorBackfillCandidate 单元：恰一路径（含 :行号形态）→token、多路径→null、仅裸名→null、.sillyspec/knowledge 自引用排除、空→null
变更：2026-10-15-decision-anchor-backfill
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-decision-anchor-backfill/requirements.md#FR-01
最近确认：2d8d863e368470f4c81b5502763a84de31741701

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-decision-anchor-backfill:flow:测试绑定FR-01
  tests: test/decision-anchor-backfill.test.mjs「① anchorBackfillCandidate 全形态」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-decision-anchor-backfill
  status: active

## FR-docs-consistency-075 收割端端到端：风险段恰一路径 → 产出 - 锚点：行；无路径 → 无该行（不编造）
变更：2026-10-15-decision-anchor-backfill
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-decision-anchor-backfill/requirements.md#FR-02
最近确认：2d8d863e368470f4c81b5502763a84de31741701

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-decision-anchor-backfill:flow:测试绑定FR-02
  tests: test/decision-anchor-backfill.test.mjs「② 收割端：恰一路径 → - 锚点：行；无路径 → 无该行」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-decision-anchor-backfill
  status: active

## FR-docs-consistency-076 蒸馏端端到端：条目无锚点正文含单一路径 → 蒸馏段锚点=该路径；多路径 → 未记录；既有锚点不覆盖
变更：2026-10-15-decision-anchor-backfill
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-decision-anchor-backfill/requirements.md#FR-03
最近确认：2d8d863e368470f4c81b5502763a84de31741701

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-decision-anchor-backfill:flow:测试绑定FR-03
  tests: test/decision-anchor-backfill.test.mjs「③ 蒸馏端：无锚点正文单一路径 → 回填；多路径 → 未记录；既有锚点不覆盖」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-decision-anchor-backfill
  status: active

## FR-docs-consistency-077 存量手术回填实测：graph anchors 边显著增长，坏锚裁决还原留痕
变更：2026-10-15-decision-anchor-backfill
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-15-decision-anchor-backfill/requirements.md#FR-04
最近确认：2d8d863e368470f4c81b5502763a84de31741701

## FR-docs-consistency-078 distillIntoKnowledge 返回 needsWait 非空字符串时，flow done distill 子步必须真实升厚（flow-state tier=thick 落盘、upgrade_reason 留痕）
变更：2026-10-20-distill-abnormal-upgrade-fix
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given decisions.md 含 rejected 条目缺否决理由（distill 返回 needsWait 非空）；When 升厚判定执行；Then 判定为真：tier=thick 落盘 + upgrade_reason 留痕
全文：.sillyspec/changes/archive/2026-10-20-distill-abnormal-upgrade-fix/requirements.md#FR-01
最近确认：d163bb94859ba54c2dfe0daa6f07a255d06ac7e1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-distill-abnormal-upgrade-fix:flow:测试绑定FR-01
  tests: test/distill-abnormal-upgrade.test.mjs「① needsWait 非空判真」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-distill-abnormal-upgrade-fix
  status: active

## FR-docs-consistency-079 needsWait 为 null（正常路径）时升厚判定必须恒不触发，既有行为零回归
变更：2026-10-20-distill-abnormal-upgrade-fix
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 正常蒸馏（needsWait=null，含 skipped 零输出形态）；When 升厚判定执行；Then 判定为假，tier 不变
全文：.sillyspec/changes/archive/2026-10-20-distill-abnormal-upgrade-fix/requirements.md#FR-02
最近确认：d163bb94859ba54c2dfe0daa6f07a255d06ac7e1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-distill-abnormal-upgrade-fix:flow:测试绑定FR-02
  tests: test/distill-abnormal-upgrade.test.mjs「② 正常路径判假零副作用」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-distill-abnormal-upgrade-fix
  status: active

## FR-docs-consistency-080 升厚判定必须不再引用蒸馏返回值不存在的字段（rejected 幽灵引用清除）
变更：2026-10-20-distill-abnormal-upgrade-fix
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given src/flow.js distill 子步；When 检查升厚判定调用；Then flow.js 调用导出纯函数，内联幽灵表达式不在场
全文：.sillyspec/changes/archive/2026-10-20-distill-abnormal-upgrade-fix/requirements.md#FR-03
最近确认：d163bb94859ba54c2dfe0daa6f07a255d06ac7e1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-distill-abnormal-upgrade-fix:flow:测试绑定FR-03
  tests: test/distill-abnormal-upgrade.test.mjs「③ 幽灵引用清除与调用点钉」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-distill-abnormal-upgrade-fix
  status: active

## FR-docs-consistency-081 判定逻辑有测试覆盖；既有 distill 相关套件零回归
变更：2026-10-20-distill-abnormal-upgrade-fix
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更交付完成；When node --test 跑新套件与两既有套件；Then 全部 pass、零 fail
全文：.sillyspec/changes/archive/2026-10-20-distill-abnormal-upgrade-fix/requirements.md#FR-04
最近确认：d163bb94859ba54c2dfe0daa6f07a255d06ac7e1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-distill-abnormal-upgrade-fix:flow:测试绑定FR-04
  tests: test/distill-abnormal-upgrade.test.mjs「④ 既有套件零回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-distill-abnormal-upgrade-fix
  status: active
