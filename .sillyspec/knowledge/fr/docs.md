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
