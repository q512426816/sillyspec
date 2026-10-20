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

## FR-docs-014 plan_level=light 与 full 的 plan.md 模板均含「Review Focus 盲区清单」节要求（≤5 条、按最可能坑到人排序、每条=输入/条件+合理人预期行为+承接 task 的 acceptance/测试落点；写不出显式写「已检查，无」而非留空）；plan_level=none 不含（轻量占位不加厚）
变更：2026-10-15-plan-review-focus
状态：active
摘要：light/full 模板含盲区清单节；none 模板不加厚
全文：.sillyspec/changes/archive/2026-10-15-plan-review-focus/requirements.md#FR-01
最近确认：043fd74722d930016ae6bba68062bcb16f8b940c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-plan-review-focus:flow:测试绑定FR-01
  tests: test/plan-review-focus.test.mjs「FR-01 盲区清单节」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-plan-review-focus
  status: active

## FR-docs-015 生成分级计划步的约束含比例自检（计划产物与 spec/design 相称；implementation 塞整段可粘贴代码=转录不是计划，签名+测试断言+规格精确值承载决策）
变更：2026-10-15-plan-review-focus
状态：active
摘要：比例自检条在场；既有约束不冲销
全文：.sillyspec/changes/archive/2026-10-15-plan-review-focus/requirements.md#FR-02
最近确认：043fd74722d930016ae6bba68062bcb16f8b940c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-plan-review-focus:flow:测试绑定FR-02
  tests: test/plan-review-focus.test.mjs「FR-02 比例自检」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-plan-review-focus
  status: active

## FR-docs-016 审查计划步 prompt 含补充复查三项：Review Focus 每行有承接测试、比例自检、共享面预扫留表（每对共享文件/契约链/依赖边的任务逐对核产出vs消费、每卡自洽；核验表进审查输出，无行的 clean 不算扫过）
变更：2026-10-15-plan-review-focus
状态：active
摘要：补充复查三项在场；清单单一来源不被触碰
全文：.sillyspec/changes/archive/2026-10-15-plan-review-focus/requirements.md#FR-03
最近确认：043fd74722d930016ae6bba68062bcb16f8b940c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-plan-review-focus:flow:测试绑定FR-03
  tests: test/plan-review-focus.test.mjs「FR-03 补充复查三项」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-plan-review-focus
  status: active

## FR-docs-017 docs/prompt/plan.md 派生件经提取管线同步（_extract→_sync→_verify 无新增 miss）
变更：2026-10-15-plan-review-focus
状态：active
摘要：派生件一致
全文：.sillyspec/changes/archive/2026-10-15-plan-review-focus/requirements.md#FR-04
最近确认：043fd74722d930016ae6bba68062bcb16f8b940c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-plan-review-focus:flow:测试绑定FR-04
  tests: test/plan-review-focus.test.mjs「FR-04 派生件一致」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-plan-review-focus
  status: active

## FR-docs-018 变更自身测试面跑绿，lint 通过
变更：2026-10-15-plan-review-focus
状态：active
摘要：新测试覆盖四条 FR；既有面零回归
全文：.sillyspec/changes/archive/2026-10-15-plan-review-focus/requirements.md#FR-05
最近确认：043fd74722d930016ae6bba68062bcb16f8b940c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-plan-review-focus:flow:测试绑定FR-05
  tests: test/plan-review-focus.test.mjs「FR-01~04 全部用例 + 既有 plan 测试绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-plan-review-focus
  status: active

## FR-docs-019 新命令 sillyspec diagnose --change <名>（只读零状态写入）：装配并输出证据包——变更身份（flow-state/tier）、按变更名过滤的 agent 会话日志路径、摩擦账本条目、verify-runs 测试结果文件、评审轮次文件（含 superseded）、取证据任务书
变更：2026-10-15-session-forensics
状态：active
摘要：六面证据包；零写入；缺数据源降级
全文：.sillyspec/changes/archive/2026-10-15-session-forensics/requirements.md#FR-01
最近确认：8862c672f137a6875d1d62af263a65ba8ededbb6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-session-forensics:flow:测试绑定FR-01
  tests: test/forensics.test.mjs「六面证据包」 | test/forensics.test.mjs「缺数据源降级」 | test/forensics.test.mjs「零写入」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-session-forensics
  status: active

## FR-docs-020 取证任务书含结构维度骨架与取证纪律（path:line 铁律、报告唯一可写产物、维度数据驱动）
变更：2026-10-15-session-forensics
状态：active
摘要：任务书必需节
全文：.sillyspec/changes/archive/2026-10-15-session-forensics/requirements.md#FR-02
最近确认：8862c672f137a6875d1d62af263a65ba8ededbb6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-session-forensics:flow:测试绑定FR-02
  tests: test/forensics.test.mjs「任务书维度与纪律」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-session-forensics
  status: active

## FR-docs-021 命令装配面在 index.js 接线（case 'diagnose'，动态 import，--help 帮助行更新）
变更：2026-10-15-session-forensics
状态：active
摘要：命令可达
全文：.sillyspec/changes/archive/2026-10-15-session-forensics/requirements.md#FR-03
最近确认：8862c672f137a6875d1d62af263a65ba8ededbb6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-session-forensics:flow:测试绑定FR-03
  tests: test/forensics.test.mjs「任务书维度与纪律」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-session-forensics
  status: active

## FR-docs-022 变更自身测试面与 lint
变更：2026-10-15-session-forensics
状态：active
摘要：新测试全绿
全文：.sillyspec/changes/archive/2026-10-15-session-forensics/requirements.md#FR-04
最近确认：8862c672f137a6875d1d62af263a65ba8ededbb6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-15-session-forensics:flow:测试绑定FR-04
  tests: test/forensics.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-15-session-forensics
  status: active

## FR-docs-023 spec-sync POST/GET 清单失败时告警行含平台响应体的 code/message（有则带 details.path），不再只有状态码
变更：2026-10-16-spec-sync-fail-alarm
状态：active
摘要：主路径；非 JSON 响应体
全文：.sillyspec/changes/archive/2026-10-16-spec-sync-fail-alarm/requirements.md#FR-01
最近确认：fe09540bcda6e0ea2282ab7603293e2fd4b51e38

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-spec-sync-fail-alarm:flow:测试绑定FR-01
  tests: test/spec-sync-fail-streak.test.mjs「A. describeErrorBody 响应体摘要」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-spec-sync-fail-alarm
  status: active

## FR-docs-024 同一 label 连续失败 ≥3 次后告警行升级为显式 🚨 提示；任一次成功后计数清零
变更：2026-10-16-spec-sync-fail-alarm
状态：active
摘要：主路径；成功清零
全文：.sillyspec/changes/archive/2026-10-16-spec-sync-fail-alarm/requirements.md#FR-02
最近确认：fe09540bcda6e0ea2282ab7603293e2fd4b51e38

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-spec-sync-fail-alarm:flow:测试绑定FR-02
  tests: test/spec-sync-fail-streak.test.mjs「B1. 连续 422 三轮：第 3 轮升级 🚨」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-spec-sync-fail-alarm
  status: active

## FR-docs-025 npm test + npm run lint 实测通过（flow done 门禁）
变更：2026-10-16-spec-sync-fail-alarm
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-10-16-spec-sync-fail-alarm/requirements.md#FR-03
最近确认：fe09540bcda6e0ea2282ab7603293e2fd4b51e38

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-spec-sync-fail-alarm:flow:测试绑定FR-03
  tests: test/run-tests.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-spec-sync-fail-alarm
  status: active

## FR-docs-026 回归用例红→绿：progress 冲突/熔断窗口内本地删除 spec 文件后，后续 pullSpecBundle / resolve --take-platform 不把服务器旧文件写回本地（活跃变更内单文件粒度；基线有、盘面无=本地删除的抑制判定，且随删除成功上行自然衰减；全新空环境无基线时全量回放行为不变）
变更：2026-10-16-fix-downstream-tool-defects
状态：active
摘要：防复活主路径；全新空环境零行为变化；显式恢复通道；删除上行成功后自然衰减
全文：.sillyspec/changes/archive/2026-10-16-fix-downstream-tool-defects/requirements.md#FR-01
最近确认：a83f1df472d8dce375b3a5796cef77d9f92183f5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-fix-downstream-tool-defects:flow:测试绑定FR-01
  tests: test/pull-spec-bundle-resurrect-guard.test.mjs「防复活：基线有盘面无不写回（红→绿）/无基线全量回放/restoreDeleted 显式恢复/非抑制文件正常回放」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-fix-downstream-tool-defects
  status: active

## FR-docs-027 回归用例红→绿：progress 409/熔断不再阻断 spec 树 delete op 上行（spec 树与 progress 六表是独立通道，冲突分流不互相封锁）
变更：2026-10-16-fix-downstream-tool-defects
状态：active
摘要：冲突抑制期间删除 op 照常上行；补跑失败不改抑制语义
全文：.sillyspec/changes/archive/2026-10-16-fix-downstream-tool-defects/requirements.md#FR-02
最近确认：a83f1df472d8dce375b3a5796cef77d9f92183f5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-fix-downstream-tool-defects:flow:测试绑定FR-02
  tests: test/spec-tree-sync-conflict-decouple.test.mjs「冲突抑制分支仍上行 spec 树删除 op（红→绿）/补跑异常不改抑制语义」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-fix-downstream-tool-defects
  status: active

## FR-docs-028 回归用例红→绿：mergeProbeSection 不再携载 :---/—/待填 等占位与分隔形态行（合法键漂移已填行仍携载且带归属注释）；extractAcceptanceMatrixSlots 对无表头归属的孤行不再栽给最近 task 锚行，改为独立「孤行」报错要求裁决删除或补归属
变更：2026-10-16-fix-downstream-tool-defects
状态：active
摘要：占位与分隔行不携载；键漂移已填行仍携载；门禁孤行独立桶不栽锚行；正常渲染零行为变化
全文：.sillyspec/changes/archive/2026-10-16-fix-downstream-tool-defects/requirements.md#FR-03
最近确认：a83f1df472d8dce375b3a5796cef77d9f92183f5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-fix-downstream-tool-defects:flow:测试绑定FR-03
  tests: test/verify-carry-orphan-guard.test.mjs「占位与分隔行不携载（红→绿）/键漂移已填行携载/门禁孤行独立桶不栽锚行（红→绿）/正常渲染零行为变化」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-fix-downstream-tool-defects
  status: active

## FR-docs-029 回归用例红→绿：快照失败分支带出结构化原因（pnpm 布局/变更文件集为空三分成因/junction 失败/worktree 异常详情），两处调用方文案替换硬编码；--done 路径把 usedSnapshot 降级事实落进结果记录
变更：2026-10-16-fix-downstream-tool-defects
状态：active
摘要：pnpm 布局拒建原因可见；文件集为空成因区分；--done 降级事实落盘；不传 failRef 零行为变化
全文：.sillyspec/changes/archive/2026-10-16-fix-downstream-tool-defects/requirements.md#FR-04
最近确认：a83f1df472d8dce375b3a5796cef77d9f92183f5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-fix-downstream-tool-defects:flow:测试绑定FR-04
  tests: test/gate-snapshot-reason.test.mjs「pnpm 拒建原因（红→绿）/文件集为空成因区分/--done 降级事实落盘（红→绿）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-fix-downstream-tool-defects
  status: active

## FR-docs-030 三端兼容 Windows/Linux/macOS；既有相关测试全绿（sync/spec-sync/pull-spec-bundle/verify-papercuts/acceptance-matrix-gate/verify-gate-snapshot 族）
变更：2026-10-16-fix-downstream-tool-defects
状态：active
摘要：回归族全绿
全文：.sillyspec/changes/archive/2026-10-16-fix-downstream-tool-defects/requirements.md#FR-05
最近确认：a83f1df472d8dce375b3a5796cef77d9f92183f5

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-fix-downstream-tool-defects:flow:测试绑定FR-05
  tests: test/run-tests.mjs「既有相关测试族全量回归（pull-spec-bundle、platform-sync 族、spec-sync 族、verify-papercuts、acceptance-matrix-gate、gate-snapshot 族、verify-quality-scan）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-fix-downstream-tool-defects
  status: active

## FR-docs-031 新增提炼函数：目标 20 字上限 30 字，优先在自然标点（。！？；：、，—等）处截断并剥尾部标点，无标点才硬切加 …，ASCII 小数点/千分位不误切
变更：2026-10-16-short-change-title
状态：active
摘要：实证坏标题——50 字硬切残句；实证坏标题——动机首句（无需提炼）；无自然截点
场景正文：
- 场景：实证坏标题——50 字硬切残句 — Given --input 首行「change 文件树「刷新」同步链路三层静默失败——后端 RPC 预算 3s 短于实测 6~13.5s 触发整树重拉」（50+ 字，含全角；When 过提炼函数；Then 必须返回「change 文件树「刷新」同步链路三层静默失败」（破折号前自然截断，≤30 字，无尾部 — 残留）
- 场景：实证坏标题——动机首句（无需提炼） — Given 动机段首句「用户报告登录的账户有时候莫名其妙被退出登录。」（21 字）；When 过提炼函数；Then 必须返回去尾句号原句，禁止截断或改写句中文字
- 场景：无自然截点 — Given 40+ 字无任何全角标点的连续中文句；When 过提炼函数；Then 必须返回前 30 字加「…」且 hardCut=true
全文：.sillyspec/changes/archive/2026-10-16-short-change-title/requirements.md#FR-01
最近确认：c33843bc117de51b00a2a6a18a111e1f00d13b8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-short-change-title:flow:测试绑定FR-01
  tests: test/short-change-title.test.mjs「distillShortTitle：实证样本/截点选择/硬切/小数保护」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-short-change-title
  status: active

## FR-docs-032 轻量道 flow start/resume/adopt 与完整流程 run initChange 的标题推导改走提炼（≤30 字），motiveFromInput 模块摘要 ≤50 口径不变
变更：2026-10-16-short-change-title
状态：active
摘要：标题入口切换
场景正文：
- 场景：标题入口切换 — Given --input 首行为 50+ 字含破折号长句；When flow start / run initChange 推导标题；Then 落库 title 必须为提炼后 ≤30 字短句（非 50 字硬切残句）
全文：.sillyspec/changes/archive/2026-10-16-short-change-title/requirements.md#FR-02
最近确认：c33843bc117de51b00a2a6a18a111e1f00d13b8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-short-change-title:flow:测试绑定FR-02
  tests: test/short-change-title.test.mjs「deriveShortChangeTitle 与 deriveChangeTitle 口径分治」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-short-change-title
  status: active

## FR-docs-033 deriveTitleFromLinkedChange 遇纯模板 H1 回退读 proposal「## 动机」首句过提炼；既有「无 H1 无动机 → 空串」契约不变
变更：2026-10-16-short-change-title
状态：active
摘要：纯模板 H1 动机回退；无动机节保底
场景正文：
- 场景：纯模板 H1 动机回退 — Given proposal.md 首行「# 提案书（Proposal）」，「## 动机」节首行为「用户报告登录的账户有时候莫名其妙被退出登录，怀疑会话过期策略误伤」；When deriveTitleFromLinkedChange 提取；Then 必须返回动机首句的自然断点提炼（非空、≤30 字、非变更名兜底）
- 场景：无动机节保底 — Given proposal.md 无 H1 亦无「## 动机」节；When deriveTitleFromLinkedChange 提取；Then 必须返回空串（调用方不刷新 title）
全文：.sillyspec/changes/archive/2026-10-16-short-change-title/requirements.md#FR-03
最近确认：c33843bc117de51b00a2a6a18a111e1f00d13b8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-short-change-title:flow:测试绑定FR-03
  tests: test/short-change-title.test.mjs「deriveTitleFromLinkedChange：动机回退/空串保底/dash 封顶」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-short-change-title
  status: active

## FR-docs-034 提炼被硬切时 flow 启动打一行软提示建议 --title，不阻断
变更：2026-10-16-short-change-title
状态：active
摘要：软提示触发与静默
场景正文：
- 场景：软提示触发与静默 — Given hardCut=true 的推导结果（非 --title）；When flow start 落标题；Then 必须输出含 --title 建议的一行提示且流程继续；Given 短句/--title 场景 Then 必须无此提示
全文：.sillyspec/changes/archive/2026-10-16-short-change-title/requirements.md#FR-04
最近确认：c33843bc117de51b00a2a6a18a111e1f00d13b8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-short-change-title:flow:测试绑定FR-04
  tests: test/short-change-title.test.mjs「deriveShortChangeTitleEx：hardCut 标记判定（软提示触发面）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-short-change-title
  status: active

## FR-docs-035 既有测试 change-title-flow / motive-from-input / change-title-backfill 全绿，新增提炼函数测试含本次实证坏标题样本
变更：2026-10-16-short-change-title
状态：active
摘要：回归与新增同绿
场景正文：
- 场景：回归与新增同绿 — When 全量测试跑毕；Then 既有标题测试零失败，新增提炼测试零失败
全文：.sillyspec/changes/archive/2026-10-16-short-change-title/requirements.md#FR-05
最近确认：c33843bc117de51b00a2a6a18a111e1f00d13b8e

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-16-short-change-title:flow:测试绑定FR-05
  tests: test/short-change-title.test.mjs「deriveChangeTitle ≤50 既有契约回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-16-short-change-title
  status: active

## FR-docs-036 .runtime 根目录不再新增按 change 命名的散文件：8 类产品写入点全部改写入 state/ 子目录（文件名保持不变，仅加目录前缀）
变更：2026-10-18-runtime-relayout
状态：active
摘要：新写入落 state/
全文：.sillyspec/changes/archive/2026-10-18-runtime-relayout/requirements.md#FR-01
最近确认：446d93fe321a1cf7366bbc00bdf269e640a97d00

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-18-runtime-relayout:flow:测试绑定FR-01
  tests: test/runtime-relayout.test.mjs「写入点产物落 state/ 子目录」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-18-runtime-relayout
  status: active

## FR-docs-037 可随时删除的产物（日志、db 备份、锁残留 tmp）统一写入 temp/ 子目录，删除 temp/ 内容后各流程功能不受影响
变更：2026-10-18-runtime-relayout
状态：active
摘要：删除 temp/ 后功能不受影响
全文：.sillyspec/changes/archive/2026-10-18-runtime-relayout/requirements.md#FR-02
最近确认：446d93fe321a1cf7366bbc00bdf269e640a97d00

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-18-runtime-relayout:flow:测试绑定FR-02
  tests: test/runtime-relayout.test.mjs「日志与备份产物落 temp/ 子目录且删除不阻断」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-18-runtime-relayout
  status: active

## FR-docs-038 变更归档/删除时同步回收该变更在 state/ 下的全部散文件（pruneArchivedChangeRuntime 扩名单），不再随归档数累积
变更：2026-10-18-runtime-relayout
状态：active
摘要：归档回收 state/ 散文件
全文：.sillyspec/changes/archive/2026-10-18-runtime-relayout/requirements.md#FR-03
最近确认：446d93fe321a1cf7366bbc00bdf269e640a97d00

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-18-runtime-relayout:flow:测试绑定FR-03
  tests: test/runtime-relayout.test.mjs「pruneArchivedChangeRuntime 回收 state/ 全家族并保留根路径兜底」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-18-runtime-relayout
  status: active

## FR-docs-039 旧布局兼容：升级后旧位置文件自动迁移到新位置（幂等、fail-open），既有仓库不丢状态
变更：2026-10-18-runtime-relayout
状态：active
摘要：旧仓升级自动迁移
全文：.sillyspec/changes/archive/2026-10-18-runtime-relayout/requirements.md#FR-04
最近确认：446d93fe321a1cf7366bbc00bdf269e640a97d00

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-18-runtime-relayout:flow:测试绑定FR-04
  tests: test/runtime-relayout.test.mjs「旧布局迁移幂等且 fail-open」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-18-runtime-relayout
  status: active

## FR-docs-040 本仓 .sillyspec/.runtime 完成迁移：根目录只剩核心单例与子目录，条目数从 1649 降至 30 以内
变更：2026-10-18-runtime-relayout
状态：active
摘要：本仓清理验收
全文：.sillyspec/changes/archive/2026-10-18-runtime-relayout/requirements.md#FR-05
最近确认：446d93fe321a1cf7366bbc00bdf269e640a97d00

## FR-docs-041 init 不再生成/注入 GEMINI.md 与 INSTRUCTIONS.md
变更：2026-10-19-init-drop-gemini-opencode
状态：active
摘要：选中 gemini/opencode 跑 init
全文：.sillyspec/changes/archive/2026-10-19-init-drop-gemini-opencode/requirements.md#FR-01
最近确认：9a01342aa41bd725098f810dcf742c0d64562846

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-init-drop-gemini-opencode:flow:测试绑定FR-01
  tests: test/init-tool-multi.test.mjs「Test 5: --tool gemini,opencode → 不产 GEMINI.md/INSTRUCTIONS.md」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-init-drop-gemini-opencode
  status: active

## FR-docs-042 gemini/opencode 的指引落点统一并到 AGENTS.md
变更：2026-10-19-init-drop-gemini-opencode
状态：active
摘要：--tool gemini 单选
全文：.sillyspec/changes/archive/2026-10-19-init-drop-gemini-opencode/requirements.md#FR-02
最近确认：9a01342aa41bd725098f810dcf742c0d64562846

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-init-drop-gemini-opencode:flow:测试绑定FR-02
  tests: test/init-tool-multi.test.mjs「Test 5 同场景断言 AGENTS.md 生成」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-init-drop-gemini-opencode
  status: active

## FR-docs-043 相关测试与文档（README/file-lifecycle/scan）同步，测试面跑绿
变更：2026-10-19-init-drop-gemini-opencode
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-10-19-init-drop-gemini-opencode/requirements.md#FR-03
最近确认：9a01342aa41bd725098f810dcf742c0d64562846

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-19-init-drop-gemini-opencode:flow:测试绑定FR-03
  tests: test/doc-ref-check.test.mjs「platform-interface-map 锚全绿」 | test/init-agents-injection.test.mjs「Cases 12-14 删除后全绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-19-init-drop-gemini-opencode
  status: active

## FR-docs-044 边界：工具类型与检测面不动
变更：2026-10-19-init-drop-gemini-opencode
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-10-19-init-drop-gemini-opencode/requirements.md#FR-04
最近确认：9a01342aa41bd725098f810dcf742c0d64562846

## FR-docs-045 CLI 入口对 worktree cwd（cwd 或 --dir 命中 worktree 段）：不再 exit 2，改为⚠️警告（变更名/原 cwd/锚定主仓根/逃生门整行）+ 自动把执行目录重锚定到主仓根——命令按主仓口径执行（进度库/变更状态单源）
变更：2026-10-20-cli-worktree-cwd-anchor
状态：active
摘要：主路径（status 在 worktree 内）；--dir 显式指进 worktree
场景正文：
- 场景：主路径（status 在 worktree 内） — Given cwd 位于 `.sillyspec/.runtime/worktrees/<change>` 内，主仓根已初始化；When 跑 `sillyspec status`；Then stderr 含锚定警告（变更名+主仓根路径），命令以主仓根为执行目录完成（exit 非 2，输出主仓口径）
- 场景：--dir 显式指进 worktree — Given `--dir <worktree 内路径>`；When 守卫命中；Then 同款警告+锚定主仓根（显式 --dir 进 worktree 同属误入面；刻意独立实例跑走逃生门）
全文：.sillyspec/changes/archive/2026-10-20-cli-worktree-cwd-anchor/requirements.md#FR-01
最近确认：4e1a9d8b27367df8463445297e52dfc39e5dd5c6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-cli-worktree-cwd-anchor:flow:测试绑定FR-01
  tests: test/worktree-cwd-guard.test.mjs「cwd 在 worktree 内跑 status → 锚定警告+主仓口径（第一次静默事故的回归改钉）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-cli-worktree-cwd-anchor
  status: active

## FR-docs-046 --allow-worktree-cwd 显式放行语义不变（跳过守卫零警告零锚定）；wt-commit 豁免不变；--dir 显式主仓根不经守卫（本来就命中不了 worktree 段）
变更：2026-10-20-cli-worktree-cwd-anchor
状态：active
摘要：逃生门零打扰
场景正文：
- 场景：逃生门零打扰 — Given cwd 在 worktree 内且带 `--allow-worktree-cwd`；Then 无锚定警告、无重锚定（命令按 worktree 本地口径跑）
全文：.sillyspec/changes/archive/2026-10-20-cli-worktree-cwd-anchor/requirements.md#FR-02
最近确认：4e1a9d8b27367df8463445297e52dfc39e5dd5c6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-cli-worktree-cwd-anchor:flow:测试绑定FR-02
  tests: test/worktree-cwd-guard.test.mjs「逃生门 --allow-worktree-cwd → 零警告零锚定」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-cli-worktree-cwd-anchor
  status: active

## FR-docs-047 主仓根 .sillyspec 存在性由后续未初始化门自然判定（锚定后主仓未 init 的极端态走既有出口，不在守卫内重复判）
变更：2026-10-20-cli-worktree-cwd-anchor
状态：active
摘要：主仓未 init 的极端态
场景正文：
- 场景：主仓未 init 的极端态 — Given worktree 存在但主仓根无 .sillyspec；When 跑 `status`（查询类豁免）；Then 锚定警告照常输出，status 按主仓未初始化口径输出（不因守卫新增失败面）
全文：.sillyspec/changes/archive/2026-10-20-cli-worktree-cwd-anchor/requirements.md#FR-03
最近确认：4e1a9d8b27367df8463445297e52dfc39e5dd5c6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-cli-worktree-cwd-anchor:flow:测试绑定FR-03
  tests: test/worktree-cwd-guard.test.mjs「主仓未 init 极端态（路径结构不可达注记——同态回归钉）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-cli-worktree-cwd-anchor
  status: active

## FR-docs-048 detectCwdInsideWorktree 单元行为不变；既有 worktree-cwd-guard e2e 断言改钉（exit 2 → 锚定警告 + 主仓口径执行）；守卫相关回归全绿
变更：2026-10-20-cli-worktree-cwd-anchor
状态：active
摘要：改钉五形态
场景正文：
- 场景：改钉五形态 — Given worktree-cwd-guard e2e 套件；When 改钉后复跑；Then 单元 2 例 + e2e 5 例全绿（断言语义=锚定而非硬拦）
全文：.sillyspec/changes/archive/2026-10-20-cli-worktree-cwd-anchor/requirements.md#FR-04
最近确认：4e1a9d8b27367df8463445297e52dfc39e5dd5c6

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-cli-worktree-cwd-anchor:flow:测试绑定FR-04
  tests: test/worktree-cwd-guard.test.mjs「detectCwdInsideWorktree（判定单元）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-cli-worktree-cwd-anchor
  status: active

## FR-docs-049 本仓 AGENTS/CLAUDE 若述及硬拦行为则同步（查无则记不适用）
变更：2026-10-20-cli-worktree-cwd-anchor
状态：active
摘要：查无即不适用
场景正文：
- 场景：查无即不适用 — Given grep 零命中；Then 文档面零改动，本 FR 以不适用记录收口
全文：.sillyspec/changes/archive/2026-10-20-cli-worktree-cwd-anchor/requirements.md#FR-05
最近确认：4e1a9d8b27367df8463445297e52dfc39e5dd5c6

## FR-docs-050 type/status 值集单一源：decisions-io 导出正典集，decision-distill 入选集自其派生（类型=正典去 scope），零独立字面集
变更：2026-10-20-decision-caliber-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given src/decision-values.js 导出正典集；When decisions-io 校验与 decision-distill 裁决引用值集；Then 两处零字面重复定义（导入派生），scope 在写入面合法、在蒸馏入选面恒排除
全文：.sillyspec/changes/archive/2026-10-20-decision-caliber-unify/requirements.md#FR-01
最近确认：8227bd0a861f8d1e52aa56ce90ae7626b84c6a71

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-decision-caliber-unify:flow:测试绑定FR-01
  tests: test/decision-caliber-unify.test.mjs「① 单一源派生」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-decision-caliber-unify
  status: active

## FR-docs-051 decisions add 可写 feasibility/consistency（写入白名单对齐蒸馏入选面）
变更：2026-10-20-decision-caliber-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given renderDecisionEntry 入参 type=feasibility / type=consistency；When 渲染条目；Then 零抛错正常产出；type=term / type=risk 等正典外值仍抛「type 白名单外」
全文：.sillyspec/changes/archive/2026-10-20-decision-caliber-unify/requirements.md#FR-02
最近确认：8227bd0a861f8d1e52aa56ce90ae7626b84c6a71

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-decision-caliber-unify:flow:测试绑定FR-02
  tests: test/decision-caliber-unify.test.mjs「② 写入白名单对齐」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-decision-caliber-unify
  status: active

## FR-docs-052 status=implemented 条目蒸馏入选（IMPLEMENTED_STATUSES 加 implemented）
变更：2026-10-20-decision-caliber-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given decisions.md 含 status=implemented、type=architecture 条目；When distillIntoKnowledge 执行；Then 该条目写盘入选；status=draft 同 type 条目不入选
全文：.sillyspec/changes/archive/2026-10-20-decision-caliber-unify/requirements.md#FR-03
最近确认：8227bd0a861f8d1e52aa56ce90ae7626b84c6a71

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-decision-caliber-unify:flow:测试绑定FR-03
  tests: test/decision-caliber-unify.test.mjs「③ implemented 入选」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-decision-caliber-unify
  status: active

## FR-docs-053 brainstorm 两处 type 提示清单与正典集一致（term/premise/risk 等散值从提示面清除）
变更：2026-10-20-decision-caliber-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given brainstorm.js 两处模板清单；When 提取清单值与正典集对比；Then 集合相等（零多值零缺值）；渲染产物含同样清单
全文：.sillyspec/changes/archive/2026-10-20-decision-caliber-unify/requirements.md#FR-04
最近确认：8227bd0a861f8d1e52aa56ce90ae7626b84c6a71

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-decision-caliber-unify:flow:测试绑定FR-04
  tests: test/decision-caliber-unify.test.mjs「④ brainstorm 提示清单同步」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-decision-caliber-unify
  status: active

## FR-docs-054 手写开放世界兼容不变：解析宽容保留、存量散值条目行为零变化
变更：2026-10-20-decision-caliber-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 含 type=term 条目的 decisions.md（存量形态）；When parseDecisions + distillIntoKnowledge；Then 解析零报错，该条目不入选不写盘（与改动前行为逐字节一致）
全文：.sillyspec/changes/archive/2026-10-20-decision-caliber-unify/requirements.md#FR-05
最近确认：8227bd0a861f8d1e52aa56ce90ae7626b84c6a71

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-decision-caliber-unify:flow:测试绑定FR-05
  tests: test/decision-caliber-unify.test.mjs「⑤ 开放世界兼容」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-decision-caliber-unify
  status: active

## FR-docs-055 新增/更新测试全绿，decisions-io/decision-distill 相关既有套件零回归
变更：2026-10-20-decision-caliber-unify
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更交付完成；When node --test 跑新套件与四既有套件；Then 全部 pass、零 fail
全文：.sillyspec/changes/archive/2026-10-20-decision-caliber-unify/requirements.md#FR-06
最近确认：8227bd0a861f8d1e52aa56ce90ae7626b84c6a71

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-decision-caliber-unify:flow:测试绑定FR-06
  tests: test/decision-caliber-unify.test.mjs「⑥ 既有套件零回归」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-decision-caliber-unify
  status: active

## FR-docs-056 生成要求溯源硬边界（必须）
变更：2026-10-20-proto-provenance-hardline
状态：active
摘要：主路径——页面级原型管线撑不起；排除——手写视觉稿
场景正文：
- 场景：主路径——页面级原型管线撑不起 — Given 本仓原型管线只支持组件级（如仅相对导入 primer），页面级原型需要完整依赖树（antd/状态库/别名导入）；When agent 需产页面级定稿原型；Then 按通道②用项目真实运行面渲染（dev 路由渲染真实组件）后离线化捕获交付——而不是自创旁门或退回手写 HTML。
- 场景：排除——手写视觉稿 — Given agent 想手写单文件 HTML 作为现状 vs 改进对比稿供用户决策；Then 禁令生效：供用户决策即定稿，必须走三通道之一。
全文：.sillyspec/changes/archive/2026-10-20-proto-provenance-hardline/requirements.md#FR-01
最近确认：f31822445273a384b80ed6f5d5c4189176a86f43

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-proto-provenance-hardline:flow:测试绑定FR-01
  tests: test/proto-provenance-hardline.test.mjs「生成要求四要素锚」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-proto-provenance-hardline
  status: active

## FR-docs-057 声明面同步（必须）
变更：2026-10-20-proto-provenance-hardline
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 改动落盘；When grep 四处文本面；Then 溯源口径在场且措辞同源。
全文：.sillyspec/changes/archive/2026-10-20-proto-provenance-hardline/requirements.md#FR-02
最近确认：f31822445273a384b80ed6f5d5c4189176a86f43

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-proto-provenance-hardline:flow:测试绑定FR-02
  tests: test/proto-provenance-hardline.test.mjs「三处声明面同步锚」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-proto-provenance-hardline
  status: active

## FR-docs-058 测试覆盖与全绿（必须）
变更：2026-10-20-proto-provenance-hardline
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 改动落盘；When 跑新增测试与全量；Then 全过、零回归、lint 零错误。
全文：.sillyspec/changes/archive/2026-10-20-proto-provenance-hardline/requirements.md#FR-03
最近确认：f31822445273a384b80ed6f5d5c4189176a86f43

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-20-proto-provenance-hardline:flow:测试绑定FR-03
  tests: test/proto-provenance-hardline.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-20-proto-provenance-hardline
  status: active
