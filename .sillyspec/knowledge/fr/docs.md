---
author: sillyspec-fr-index
created_at: 2026-10-15T09:21:13.934Z
---

# FR 索引 — docs

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/docs.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-docs-001 需求确认清单逐条带来源标记（用户原话/agent 推断两态），未确认过的推断点不得混入已确认清单
变更：2026-10-15-brainstorm-interaction-refine
状态：active
摘要：清单标注两态；旧口径已替换
全文：.sillyspec/changes/archive/2026-10-15-brainstorm-interaction-refine/requirements.md#FR-01
最近确认：8a79c702fefe2eb25c222e6c7155d7e8cc7ff90f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-brainstorm-interaction-refine:flow:测试绑定FR-01
  tests: test/brainstorm-interaction-refine.test.mjs「FR-01 来源标记两态」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-brainstorm-interaction-refine
  status: active

## FR-docs-002 对话式探索支持分块回放：每轮输出含 200-300 字回放块（猜测标为猜测）+ 一句「哪里不对或漏了什么」，步骤保持 repeatableWait 语义
变更：2026-10-15-brainstorm-interaction-refine
状态：active
摘要：分块回放交替；重复进入仍带回放
全文：.sillyspec/changes/archive/2026-10-15-brainstorm-interaction-refine/requirements.md#FR-02
最近确认：8a79c702fefe2eb25c222e6c7155d7e8cc7ff90f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-brainstorm-interaction-refine:flow:测试绑定FR-02
  tests: test/brainstorm-interaction-refine.test.mjs「FR-02 分块回放」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-brainstorm-interaction-refine
  status: active

## FR-docs-003 进入「提出 2-3 种方案」前：P1/P2 未决项为 0 或已记录为「我的判断」落 decisions.md
变更：2026-10-15-brainstorm-interaction-refine
状态：active
摘要：三分规则在场；收尾不再追问
全文：.sillyspec/changes/archive/2026-10-15-brainstorm-interaction-refine/requirements.md#FR-03
最近确认：8a79c702fefe2eb25c222e6c7155d7e8cc7ff90f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-brainstorm-interaction-refine:flow:测试绑定FR-03
  tests: test/brainstorm-interaction-refine.test.mjs「FR-03 Grill 出口三分」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-brainstorm-interaction-refine
  status: active

## FR-docs-004 分段展示设计输出含「我替你做的决定」节，条目来源为 decisions.md 中 source≠user 的条目
变更：2026-10-15-brainstorm-interaction-refine
状态：active
摘要：决策节在场；不冲销既有必填项
全文：.sillyspec/changes/archive/2026-10-15-brainstorm-interaction-refine/requirements.md#FR-04
最近确认：8a79c702fefe2eb25c222e6c7155d7e8cc7ff90f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-brainstorm-interaction-refine:flow:测试绑定FR-04
  tests: test/brainstorm-interaction-refine.test.mjs「FR-04 我替你做的决定」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-brainstorm-interaction-refine
  status: active

## FR-docs-005 Design Grill 子代理派发 prompt 含实现者视角四要素（真身份/联系不到作者/只报猜错会出事的必须被回答项/显式跳过项与 nothing important left 出口），主代理回收后分三堆处理
变更：2026-10-15-brainstorm-interaction-refine
状态：active
摘要：子代理四要素在场；三堆分拣与指出口；gate 契约不变
全文：.sillyspec/changes/archive/2026-10-15-brainstorm-interaction-refine/requirements.md#FR-05
最近确认：8a79c702fefe2eb25c222e6c7155d7e8cc7ff90f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-brainstorm-interaction-refine:flow:测试绑定FR-05
  tests: test/brainstorm-interaction-refine.test.mjs「FR-05 实现者视角四要素与三堆分拣」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-brainstorm-interaction-refine
  status: active

## FR-docs-006 brainstorm 阶段 prompt 含自欺逃逸口对照表（三条：够清晰、太简单、用户说听起来不错）
变更：2026-10-15-brainstorm-interaction-refine
状态：active
摘要：三条对照在场
全文：.sillyspec/changes/archive/2026-10-15-brainstorm-interaction-refine/requirements.md#FR-06
最近确认：8a79c702fefe2eb25c222e6c7155d7e8cc7ff90f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-brainstorm-interaction-refine:flow:测试绑定FR-06
  tests: test/brainstorm-interaction-refine.test.mjs「FR-06 自欺逃逸口表」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-brainstorm-interaction-refine
  status: active

## FR-docs-007 发现规模超出当前档位时当场说明并给出升级建议（不改客观定价机制）
变更：2026-10-15-brainstorm-interaction-refine
状态：active
摘要：主动说明约束在场；定价机制不被绕过
全文：.sillyspec/changes/archive/2026-10-15-brainstorm-interaction-refine/requirements.md#FR-07
最近确认：8a79c702fefe2eb25c222e6c7155d7e8cc7ff90f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-brainstorm-interaction-refine:flow:测试绑定FR-07
  tests: test/brainstorm-interaction-refine.test.mjs「FR-07 规模超档说明」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-brainstorm-interaction-refine
  status: active

## FR-docs-008 变更自身测试面跑绿（node --test 相关用例），lint 通过
变更：2026-10-15-brainstorm-interaction-refine
状态：active
摘要：新测试覆盖七条 FR；既有面零回归
全文：.sillyspec/changes/archive/2026-10-15-brainstorm-interaction-refine/requirements.md#FR-08
最近确认：8a79c702fefe2eb25c222e6c7155d7e8cc7ff90f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-brainstorm-interaction-refine:flow:测试绑定FR-08
  tests: test/brainstorm-interaction-refine.test.mjs「FR-01~07 全部用例 + 既有 brainstorm 测试绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-brainstorm-interaction-refine
  status: active

## FR-docs-009 local.yaml ui_prototype 段解析（必须）
变更：2026-10-15-ui-proto-form-config
状态：active
摘要：主路径——豁免登记；边界——豁免缺裁决字段
场景正文：
- 场景：主路径——豁免登记 — Given local.yaml 含 `ui_prototype: { form: single-html, ruling: { by, at, reason } }`；When readUiPrototypeForm(specBase)；Then registered=true、form='single-html'、rulingComplete=true。
- 场景：边界——豁免缺裁决字段 — Given form=single-html 而 ruling 缺 reason；Then rulingComplete=false（消费方须响警告——静默漂移禁止）。
全文：.sillyspec/changes/archive/2026-10-15-ui-proto-form-config/requirements.md#FR-01
最近确认：e5c97358455a9a91d268be95d4d7c48ef4c75e52

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-ui-proto-form-config:flow:测试绑定FR-01
  tests: test/ui-prototype-form.test.mjs「readUiPrototypeForm 五态解析」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-ui-proto-form-config
  status: active

## FR-docs-010 多仓 override 按触达路径优先（必须）
变更：2026-10-15-ui-proto-form-config
状态：active
摘要：主路径——三仓变更
场景正文：
- 场景：主路径——三仓变更 — Given repos 注册 subgrid/spdemo 两子仓且各有 override，触达路径落在 spdemo 下；Then spdemo 的 override 生效，未触达 subgrid 不并列。
全文：.sillyspec/changes/archive/2026-10-15-ui-proto-form-config/requirements.md#FR-02
最近确认：e5c97358455a9a91d268be95d4d7c48ef4c75e52

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-ui-proto-form-config:flow:测试绑定FR-02
  tests: test/ui-prototype-form.test.mjs「多仓 override 按触达路径优先」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-ui-proto-form-config
  status: active

## FR-docs-011 buildUiGuidanceLines 四态注入（必须）
变更：2026-10-15-ui-proto-form-config
状态：active
摘要：主路径——未登记仓
场景正文：
- 场景：主路径——未登记仓 — Given local.yaml 无 ui_prototype 段且 flow start 检测 UI 触达；When 须知注入；Then 含「未登记」「阶梯」「收口前补登记」关键词的强提醒块。
全文：.sillyspec/changes/archive/2026-10-15-ui-proto-form-config/requirements.md#FR-03
最近确认：e5c97358455a9a91d268be95d4d7c48ef4c75e52

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-ui-proto-form-config:flow:测试绑定FR-03
  tests: test/ui-prototype-form.test.mjs「四态注入 + 无参兼容零新增」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-ui-proto-form-config
  status: active

## FR-docs-012 生成要求四句修正与声明面同步（必须）
变更：2026-10-15-ui-proto-form-config
状态：active
摘要：主路径——文本锚
场景正文：
- 场景：主路径——文本锚 — Given 改动落盘；When grep brainstorm 生成要求；Then 四句锚与 ui_prototype 引用在场；design-facts/gates 同步。
全文：.sillyspec/changes/archive/2026-10-15-ui-proto-form-config/requirements.md#FR-04
最近确认：e5c97358455a9a91d268be95d4d7c48ef4c75e52

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-ui-proto-form-config:flow:测试绑定FR-04
  tests: test/ui-prototype-form.test.mjs「生成要求四句锚 + 声明面同步」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-ui-proto-form-config
  status: active

## FR-docs-013 测试覆盖与全绿（必须）
变更：2026-10-15-ui-proto-form-config
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 改动落盘；When 跑新增测试与全量；Then 全过、零回归、lint 零错误。
全文：.sillyspec/changes/archive/2026-10-15-ui-proto-form-config/requirements.md#FR-05
最近确认：e5c97358455a9a91d268be95d4d7c48ef4c75e52

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-ui-proto-form-config:flow:测试绑定FR-05
  tests: test/ui-prototype-form.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-ui-proto-form-config
  status: active
