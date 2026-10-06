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
