---
author: sillyspec-fr-index
created_at: 2026-09-20T18:20:21.442Z
---

# FR 索引 — setup

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/setup.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-setup-001 init 按 tools 生成命令卡
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 一个未初始化（或重跑）的项目目录；When `sillyspec init --tools zcode` 执行；Then `.zcode/commands/sillyspec/` 下出现 7 张卡（run-brainstorm/plan/execute/verify/archive
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-01
最近确认：61995a32

## FR-setup-002 三态幂等
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 目标卡已存在；When 重跑 init 且尾部锚行在、剥离锚行重算的落盘正文 sha 与锚行记录一致（完好）；Then 与包内资产正文一致 → 不写（mtime 不动）；不一致（CLI 版本更新）→ 覆盖写新；锚行缺失（外来同名文件）或重算 sha 不符（用户手改正文）→ war
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-02
最近确认：61995a32

## FR-setup-003 claude 双落点
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given init tools 含 claude；Then `.claude/commands/sillyspec/` 下同 7 张卡，语义同 FR-01/02
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-03
最近确认：61995a32

## FR-setup-004 卡内容四段契约
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 任一张包内卡资产；When 检视其内容
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-04
最近确认：61995a32

## FR-setup-005 zcode 入工具面
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given init 交互菜单或 --tools 校验；When 选择/传入 zcode；Then 被接受（VALID_TOOLS 新增项），且 zcode 工具同时获得 AGENTS.md 注入（跨工具通用标准内容源）+ 命令卡注入
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-05
最近确认：61995a32

## FR-setup-006 不动他者产物
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 注入执行；When 目标目录存在用户自建文件；Then 仅触碰 sillyspec 命名空间的 7 张卡文件，其余文件零接触
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-06
最近确认：61995a32

## FR-setup-007 readFlowConfig 缺省 thin；legacy 拒跑文案与 conf
变更：2026-09-25-thin-default-flip
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then readFlowConfig 缺省 thin；legacy 拒跑文案与 config-schema flow.mode 描述示例同步翻转；本仓 local.ya
全文：.sillyspec/changes/archive/2026-09-25-thin-default-flip/requirements.md#FR-01
最近确认：ac229db8c4e186754dc15e72d57b336f6c834e2c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-default-flip:flow:FR-01
  tests: test/stage-burst.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-default-flip
  status: active

## FR-setup-008 run quick 渲染入口打一行过渡横幅指路 flow start（--don
变更：2026-09-25-thin-default-flip
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then run quick 渲染入口打一行过渡横幅指路 flow start（--done 收尾不吵），quick 全功能不变
全文：.sillyspec/changes/archive/2026-09-25-thin-default-flip/requirements.md#FR-02
最近确认：ac229db8c4e186754dc15e72d57b336f6c834e2c

## FR-setup-009 flow start 清晰度门通过后跑 classifyChange 预判：mo
变更：2026-09-25-thin-default-flip
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then flow start 清晰度门通过后跑 classifyChange 预判：mode=full 时打一行升档建议，advisory 不阻断
全文：.sillyspec/changes/archive/2026-09-25-thin-default-flip/requirements.md#FR-03
最近确认：ac229db8c4e186754dc15e72d57b336f6c834e2c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-default-flip:flow:FR-03
  tests: test/flow-protocol.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-default-flip
  status: active

## FR-setup-010 agents-instruction 规则 6、9、17 同步：quick 存量
变更：2026-09-25-thin-default-flip
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then agents-instruction 规则 6、9、17 同步：quick 存量过渡、倒推 B 薄道优先、quicklog 存量标注
全文：.sillyspec/changes/archive/2026-09-25-thin-default-flip/requirements.md#FR-04
最近确认：ac229db8c4e186754dc15e72d57b336f6c834e2c

## FR-setup-011 新增测试覆盖缺省 thin 与预判提示；flow 系与 test:core 全绿
变更：2026-09-25-thin-default-flip
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 新增测试覆盖缺省 thin 与预判提示；flow 系与 test:core 全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-default-flip/requirements.md#FR-05
最近确认：ac229db8c4e186754dc15e72d57b336f6c834e2c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-thin-default-flip:flow:FR-05
  tests: test/stage-burst.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-thin-default-flip
  status: active

## FR-setup-012 src 与 templates/SKILL/config-schema 的全部用
变更：2026-09-25-thin-rename-lightweight
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then src 与 templates/SKILL/config-schema 的全部用户面文案（console 输出、机器稿模板、任务书、简报、横幅、schema 描
全文：.sillyspec/changes/archive/2026-09-25-thin-rename-lightweight/requirements.md#FR-01
最近确认：c0cb9ab6f6c8a924768433a3e3374d55ee461fc2

## FR-setup-013 测试断言与新文案同步全绿
变更：2026-09-25-thin-rename-lightweight
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 测试断言与新文案同步全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-rename-lightweight/requirements.md#FR-02
最近确认：c0cb9ab6f6c8a924768433a3e3374d55ee461fc2

## FR-setup-014 英文 thin 字面与行为零变化
变更：2026-09-25-thin-rename-lightweight
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 英文 thin 字面与行为零变化
全文：.sillyspec/changes/archive/2026-09-25-thin-rename-lightweight/requirements.md#FR-03
最近确认：c0cb9ab6f6c8a924768433a3e3374d55ee461fc2

## FR-setup-015 quick 新会话硬拒
变更：2026-09-25-quick-channel-retire
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 目标 quick 会话的 guard.json 不存在（新会话），When 渲染入口收到 `sillyspec (run) quick`（任意非 --done/
全文：.sillyspec/changes/archive/2026-09-25-quick-channel-retire/requirements.md#FR-01
最近确认：9a85ce34a693f6f56f6688d9531da7f120bac05f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-quick-channel-retire:flow:FR-01
  tests: test/quick-retired.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-quick-channel-retire
  status: active

## FR-setup-016 在途会话收尾不受影响
变更：2026-09-25-quick-channel-retire
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given quick 会话 guard.json 已存在（升级前启动），When 执行渲染/续跑（含 `--files` 追加边界）、`--done`、`--cancel
全文：.sillyspec/changes/archive/2026-09-25-quick-channel-retire/requirements.md#FR-02
最近确认：9a85ce34a693f6f56f6688d9531da7f120bac05f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-quick-channel-retire:flow:FR-02
  tests: test/quick-cli-managed-e2e.test.mjs | test/quick-done-fallback-guard.test.mjs | test/quick-retired.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-quick-channel-retire
  status: active

## FR-setup-017 文档与模板去 quick 通道化（新项目视角重写）
变更：2026-09-25-quick-channel-retire
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 新项目经 init 拿到的注入面（templates/agents-instruction.md、命令卡 assets/command-cards/、skill
全文：.sillyspec/changes/archive/2026-09-25-quick-channel-retire/requirements.md#FR-03
最近确认：9a85ce34a693f6f56f6688d9531da7f120bac05f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-quick-channel-retire:flow:FR-03
  tests: test/quick-retired.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-quick-channel-retire
  status: active

## FR-setup-018 快道配套面补齐与 thin 感知
变更：2026-09-25-quick-channel-retire
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given quick 退役后轻量变更为默认道，When 使用者经 skills/命令卡/handoff/next 触达，Then sillyspec-quick skil
全文：.sillyspec/changes/archive/2026-09-25-quick-channel-retire/requirements.md#FR-06
最近确认：9a85ce34a693f6f56f6688d9531da7f120bac05f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-quick-channel-retire:flow:FR-06
  tests: test/command-cards.test.mjs | test/handoff.test.mjs | test/next-command.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-quick-channel-retire
  status: active

## FR-setup-019 存量数据工具行为不变
变更：2026-09-25-quick-channel-retire
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 已存在的 QUICKLOG 条目 / quick 会话历史，When 执行 `quicklog commit`、`scope-audit --change qu
全文：.sillyspec/changes/archive/2026-09-25-quick-channel-retire/requirements.md#FR-04
最近确认：9a85ce34a693f6f56f6688d9531da7f120bac05f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-25-quick-channel-retire:flow:FR-04
  tests: test/commit-guard.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-25-quick-channel-retire
  status: active

## FR-setup-020 全量测试与 lint 绿
变更：2026-09-25-quick-channel-retire
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本变更合入后，When 执行 `npm test`（全量）与 `npm run lint`，Then 全部通过；新启会话的既有 quick 测试改造后语义保留（
全文：.sillyspec/changes/archive/2026-09-25-quick-channel-retire/requirements.md#FR-05
最近确认：9a85ce34a693f6f56f6688d9531da7f120bac05f

## FR-setup-021 测试门（thin+full 共用 runVerifyTestCheck）缺省走动态推断：本变更测试
变更：2026-09-26-dynamic-test-inference
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 测试门（thin+full 共用 runVerifyTestCheck）缺省走动态推断：本变更测试 ∪ FR 关联回归（active FR 覆盖面∩触碰文件；Then 其绑定 tests）∪ import 依赖测试
全文：.sillyspec/changes/archive/2026-09-26-dynamic-test-inference/requirements.md#FR-01
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-dynamic-test-inference:flow:FR-01
  tests: test/dynamic-test-inference.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-dynamic-test-inference
  status: active

## FR-setup-022 runner 自项目结构推断（uv run pytest/vitest/jest/node --te
变更：2026-09-26-dynamic-test-inference
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When runner 自项目结构推断（uv run pytest/vitest/jest/node --test），不依赖 local.yaml 测试配置；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-dynamic-test-inference/requirements.md#FR-02
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-dynamic-test-inference:flow:FR-02
  tests: test/dynamic-test-inference.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-dynamic-test-inference
  status: active

## FR-setup-023 local.yaml modules.*.test 不再消费（在场打印退役指引）
变更：2026-09-26-dynamic-test-inference
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When local.yaml modules.*.test 不再消费（在场打印退役指引）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-dynamic-test-inference/requirements.md#FR-03
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-dynamic-test-inference:flow:FR-03
  tests: test/dynamic-test-inference.test.mjs | test/verify-artifact-triage.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-dynamic-test-inference
  status: active

## FR-setup-024 commands.test 仅显式 test_strategy: full 时生效作全量逃生阀
变更：2026-09-26-dynamic-test-inference
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When commands.test 仅显式 test_strategy: full 时生效作全量逃生阀；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-dynamic-test-inference/requirements.md#FR-04
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-dynamic-test-inference:flow:FR-04
  tests: test/verify-artifact-triage.test.mjs | test/verify-gate-command-missing.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-dynamic-test-inference
  status: active

## FR-setup-025 FR 绑定写入侧路径归一为仓根相对（upsertFrBindings 接受 projectRoot
变更：2026-09-26-dynamic-test-inference
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When FR 绑定写入侧路径归一为仓根相对（upsertFrBindings 接受 projectRoot 归一 tests）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-dynamic-test-inference/requirements.md#FR-05
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-dynamic-test-inference:flow:FR-05
  tests: test/dynamic-test-inference.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-dynamic-test-inference
  status: active

## FR-setup-026 新增 tests repair-paths 子命令修复存量错形路径
变更：2026-09-26-dynamic-test-inference
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 新增 tests repair-paths 子命令修复存量错形路径；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-dynamic-test-inference/requirements.md#FR-06
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-26-dynamic-test-inference:flow:FR-06
  tests: test/dynamic-test-inference.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-26-dynamic-test-inference
  status: active

## FR-setup-027 平台仓 multi-agent-platform 修复后 fr/*.md 内 tests: 全部可自
变更：2026-09-26-dynamic-test-inference
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 平台仓 multi-agent-platform 修复后 fr/*.md 内 tests: 全部可自仓根解析；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-dynamic-test-inference/requirements.md#FR-07
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9

## FR-setup-028 全仓测试绿
变更：2026-09-26-dynamic-test-inference
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 全仓测试绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-26-dynamic-test-inference/requirements.md#FR-08
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9

## FR-setup-029 runVerifyTestCheck 接受 faceOverride：在场时跳过快照内二次推导（含收
变更：2026-09-27-gate-face-binding-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When runVerifyTestCheck 接受 faceOverride：在场时跳过快照内二次推导（含收窄），直接用调用方权威面算动态子集——commit-then；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-face-binding-parity/requirements.md#FR-01
最近确认：978beb6e8799b986d5a63c7ce2b8a10fa12c17aa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-gate-face-binding-parity:flow:FR-01
  tests: test/gate-face-binding-parity.test.mjs「① faceOverride commit-then-done」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-gate-face-binding-parity
  status: active

## FR-setup-030 quick-audit 透传 faceOverride，flow done ledger 门接线（c
变更：2026-09-27-gate-face-binding-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When quick-audit 透传 faceOverride，flow done ledger 门接线（changedFiles 即权威面）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-face-binding-parity/requirements.md#FR-02
最近确认：978beb6e8799b986d5a63c7ce2b8a10fa12c17aa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-gate-face-binding-parity:flow:FR-02
  tests: test/gate-face-binding-parity.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-gate-face-binding-parity
  status: active

## FR-setup-031 full 流程 brainstorm --done 对有 FR 块而无绑定面的 requiremen
变更：2026-09-27-gate-face-binding-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When full 流程 brainstorm --done 对有 FR 块而无绑定面的 requirements 追加绑定槽（复用 thin 追加逻辑单源）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-face-binding-parity/requirements.md#FR-03
最近确认：978beb6e8799b986d5a63c7ce2b8a10fa12c17aa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-gate-face-binding-parity:flow:FR-03
  tests: test/gate-face-binding-parity.test.mjs「② ensureBindingSlots 单源行为」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-gate-face-binding-parity
  status: active

## FR-setup-032 verify 侧既有 auto-bind 因槽在场而闭环，R23-full 形态（trace 0 行
变更：2026-09-27-gate-face-binding-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When verify 侧既有 auto-bind 因槽在场而闭环，R23-full 形态（trace 0 行）不再复现；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-face-binding-parity/requirements.md#FR-04
最近确认：978beb6e8799b986d5a63c7ce2b8a10fa12c17aa

## FR-setup-033 renderExample 的 test_strategy 行注释化（主仓与实验快照一致）
变更：2026-09-27-gate-face-binding-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When renderExample 的 test_strategy 行注释化（主仓与实验快照一致）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-face-binding-parity/requirements.md#FR-05
最近确认：978beb6e8799b986d5a63c7ce2b8a10fa12c17aa

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-gate-face-binding-parity:flow:FR-05
  tests: test/config-schema.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-gate-face-binding-parity
  status: active

## FR-setup-034 全仓测试绿
变更：2026-09-27-gate-face-binding-parity
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 全仓测试绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-face-binding-parity/requirements.md#FR-06
最近确认：978beb6e8799b986d5a63c7ce2b8a10fa12c17aa

## FR-setup-035 flow start 检测 UI 触达并输出「UI 变更执行须知」
变更：2026-09-27-ui-visual-guidance
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given flow start 就绪；When --input 文本命中前端页面或 UI 关键词启发式；Then 输出须知段：改前确认视觉基准、边改边渲染对照、证据随手落变更目录 visual-evidence.md、视觉降级须用户裁决留痕
全文：.sillyspec/changes/archive/2026-09-27-ui-visual-guidance/requirements.md#FR-01
最近确认：4f85905373507953789367b59bb41792eb0e5431

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-ui-visual-guidance:flow:FR-01
  tests: test/ui-visual-guidance.test.mjs「detectUiTouch 正例：页面/前端/UI/视觉/组件/tsx」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-ui-visual-guidance
  status: active

## FR-setup-036 verify 新增「UI 视觉证据」分级探针
变更：2026-09-27-ui-visual-guidance
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更触及 UI（声明文件面或 input 命中）；When 收口时变更目录缺 visual-evidence.md 证据；Then 默认 ⚠️ 警告（advisory）；local.yaml ui_visual_gate=error 升级阻断、off 关闭
全文：.sillyspec/changes/archive/2026-09-27-ui-visual-guidance/requirements.md#FR-02
最近确认：4f85905373507953789367b59bb41792eb0e5431

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-ui-visual-guidance:flow:FR-02
  tests: test/ui-visual-guidance.test.mjs「UI 触达缺证据：默认 warn / gate=error 升阻断 / off 关闭」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-ui-visual-guidance
  status: active

## FR-setup-037 视觉降级硬规则（不可配置降档）
变更：2026-09-27-ui-visual-guidance
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given design.md 或 requirements.md 出现「降级」与「视觉、UI、页面、样式」共现声明；When 变更目录无用户裁决留痕（visual-evidence.md 含「用户裁决」段或 decisions 记录）；Then 无论 ui_visual_gate 配置一律 error 阻断（off 除外）
全文：.sillyspec/changes/archive/2026-09-27-ui-visual-guidance/requirements.md#FR-03
最近确认：4f85905373507953789367b59bb41792eb0e5431

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-ui-visual-guidance:flow:FR-03
  tests: test/ui-visual-guidance.test.mjs「降级硬规则：视觉降级声明无用户裁决留痕 → 无论档位恒 error」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-ui-visual-guidance
  status: active

## FR-setup-038 非 UI 变更零打扰
变更：2026-09-27-ui-visual-guidance
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 变更不触及 UI；When flow start 与 verify 收口；Then 须知不注入、探针标「不适用」，既有输出与探针行为零变化
全文：.sillyspec/changes/archive/2026-09-27-ui-visual-guidance/requirements.md#FR-04
最近确认：4f85905373507953789367b59bb41792eb0e5431

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-ui-visual-guidance:flow:FR-04
  tests: test/ui-visual-guidance.test.mjs「detectUiTouch 反例：后端/CLI/文档变更零命中」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-ui-visual-guidance
  status: active

## FR-setup-039 单测覆盖
变更：2026-09-27-ui-visual-guidance
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 本变更交付；When 跑新增测试文件；Then 覆盖检测启发式正反例、探针三档（warn、error、off）、降级硬规则、骨架段落生成
全文：.sillyspec/changes/archive/2026-09-27-ui-visual-guidance/requirements.md#FR-05
最近确认：4f85905373507953789367b59bb41792eb0e5431

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-ui-visual-guidance:flow:FR-05
  tests: test/ui-visual-guidance.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-ui-visual-guidance
  status: active

## FR-setup-040 CLI 仓中立
变更：2026-09-27-ui-visual-guidance
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given sillyspec 服务多仓；When 须知与探针文案生成；Then 不硬编码任何特定仓的路径或命令
全文：.sillyspec/changes/archive/2026-09-27-ui-visual-guidance/requirements.md#FR-06
最近确认：4f85905373507953789367b59bb41792eb0e5431

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-ui-visual-guidance:flow:FR-06
  tests: test/ui-visual-guidance.test.mjs「buildUiGuidanceLines：仓中立 + 证据约定与探针同源」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-ui-visual-guidance
  status: active

## FR-setup-041 新增 knowledge digest 命令：四类信号扫描（rot 待复核标记按域计数/收件箱积压/
变更：2026-09-27-knowledge-digest
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 新增 knowledge digest 命令：四类信号扫描（rot 待复核标记按域计数/收件箱积压/伪域 auto-* 与 unmapped 占比/绑定路径解析；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-knowledge-digest/requirements.md#FR-01
最近确认：a3b99f259e9ac7e7fc5b8a06ff0d65845a21a8b2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-knowledge-digest:flow:FR-01
  tests: test/knowledge-digest.test.mjs「① 四信号阈值」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-knowledge-digest
  status: active

## FR-setup-042 落域机械改进：归档蒸馏落域为伪域（auto-*/unmapped）时，按交付路径推导建议域（back
变更：2026-09-27-knowledge-digest
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 落域机械改进：归档蒸馏落域为伪域（auto-*/unmapped）时，按交付路径推导建议域（backend/app/modules/<seg>；Then <seg> 等）并在归档输出显式提示（advisory 不阻断）
全文：.sillyspec/changes/archive/2026-09-27-knowledge-digest/requirements.md#FR-02
最近确认：a3b99f259e9ac7e7fc5b8a06ff0d65845a21a8b2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-knowledge-digest:flow:FR-02
  tests: test/knowledge-digest.test.mjs「④」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-knowledge-digest
  status: active

## FR-setup-043 伪域条目+建议进 digest 信号
变更：2026-09-27-knowledge-digest
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 伪域条目+建议进 digest 信号；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-knowledge-digest/requirements.md#FR-03
最近确认：a3b99f259e9ac7e7fc5b8a06ff0d65845a21a8b2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-knowledge-digest:flow:FR-03
  tests: test/knowledge-digest.test.mjs「② suggestDomainFromFiles」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-knowledge-digest
  status: active

## FR-setup-044 digest 的绑定扫描与 repair-paths 同口径（resolveTestFileRel
变更：2026-09-27-knowledge-digest
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When digest 的绑定扫描与 repair-paths 同口径（resolveTestFileRel 单源复用）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-knowledge-digest/requirements.md#FR-04
最近确认：a3b99f259e9ac7e7fc5b8a06ff0d65845a21a8b2

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-knowledge-digest:flow:FR-04
  tests: test/knowledge-digest.test.mjs「①」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-knowledge-digest
  status: active

## FR-setup-045 全仓测试绿
变更：2026-09-27-knowledge-digest
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 全仓测试绿；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-knowledge-digest/requirements.md#FR-05
最近确认：a3b99f259e9ac7e7fc5b8a06ff0d65845a21a8b2

## FR-setup-046 声明面归集：design 文件变更清单与 requirements 测试绑定路径复用既有解析器合并（
变更：2026-09-27-hunk-attribution-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 测试 相关模块就绪；When 声明面归集：design 文件变更清单与 requirements 测试绑定路径复用既有解析器合并（parseFileChangeList 与 extractR；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-hunk-attribution-gate/requirements.md#FR-01
最近确认：72be8fc7d2c78c132ca9fa612a3a8b14c469bd9c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-hunk-attribution-gate:flow:FR-01
  tests: test/hunk-attribution-gate.test.mjs「声明面归集：design 清单 + requirements 绑定（NEW: 前缀与反斜杠归一）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-hunk-attribution-gate
  status: active

## FR-setup-047 提交面 hunk 对账：flow done 时逐文件统计 baseline..HEAD 的 hunk
变更：2026-09-27-hunk-attribution-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 提交面 hunk 对账：flow done 时逐文件统计 baseline..HEAD 的 hunk 数，不在声明面的文件列入未归因清单并警告；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-hunk-attribution-gate/requirements.md#FR-02
最近确认：72be8fc7d2c78c132ca9fa612a3a8b14c469bd9c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-hunk-attribution-gate:flow:FR-02
  tests: test/hunk-attribution-gate.test.mjs「未归因 + 竞争 + 残留三信号全路径」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-hunk-attribution-gate
  status: active

## FR-setup-048 跨变更竞争检测：其他活跃变更的声明面与提交面相交时，列出竞争文件、对方变更名与 hunk 数（同文件
变更：2026-09-27-hunk-attribution-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 跨变更竞争检测：其他活跃变更的声明面与提交面相交时，列出竞争文件、对方变更名与 hunk 数（同文件无法按行归属，显式暴露）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-hunk-attribution-gate/requirements.md#FR-03
最近确认：72be8fc7d2c78c132ca9fa612a3a8b14c469bd9c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-hunk-attribution-gate:flow:FR-03
  tests: test/hunk-attribution-gate.test.mjs「未归因 + 竞争 + 残留三信号全路径」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-hunk-attribution-gate
  status: active

## FR-setup-049 在途残留信号：提交面文件当前工作树仍有未提交 diff 时警告活跃并发 WIP
变更：2026-09-27-hunk-attribution-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 在途残留信号：提交面文件当前工作树仍有未提交 diff 时警告活跃并发 WIP；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-hunk-attribution-gate/requirements.md#FR-04
最近确认：72be8fc7d2c78c132ca9fa612a3a8b14c469bd9c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-hunk-attribution-gate:flow:FR-04
  tests: test/hunk-attribution-gate.test.mjs「未归因 + 竞争 + 残留三信号全路径」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-hunk-attribution-gate
  status: active

## FR-setup-050 分级配置：local.yaml hunk_gate 三档（warn 默认、error、off），非
变更：2026-09-27-hunk-attribution-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 分级配置：local.yaml hunk_gate 三档（warn 默认、error、off），非 git 环境与异常 fail-soft 降级跳过；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-hunk-attribution-gate/requirements.md#FR-05
最近确认：72be8fc7d2c78c132ca9fa612a3a8b14c469bd9c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-hunk-attribution-gate:flow:FR-05
  tests: test/hunk-attribution-gate.test.mjs「off 关闭与空面降级」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-hunk-attribution-gate
  status: active

## FR-setup-051 单测覆盖：声明面归集、hunk 对账、竞争检测、残留信号、三档分级、fail-soft 降级
变更：2026-09-27-hunk-attribution-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 单测覆盖：声明面归集、hunk 对账、竞争检测、残留信号、三档分级、fail-soft 降级；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-hunk-attribution-gate/requirements.md#FR-06
最近确认：72be8fc7d2c78c132ca9fa612a3a8b14c469bd9c

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-hunk-attribution-gate:flow:FR-06
  tests: test/hunk-attribution-gate.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-hunk-attribution-gate
  status: active

## FR-setup-052 不改 worktree 机制与既有「提交面夹带嫌疑 advisory」块（并行会话归属代码，保留原样
变更：2026-09-27-hunk-attribution-gate
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 不改 worktree 机制与既有「提交面夹带嫌疑 advisory」块（并行会话归属代码，保留原样，本门独立输出）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-hunk-attribution-gate/requirements.md#FR-07
最近确认：72be8fc7d2c78c132ca9fa612a3a8b14c469bd9c

## FR-setup-053 config-schema.js 的 hunk_gate 描述改为与实现一致：error 档未归因与
变更：2026-09-27-gate-docs-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When config-schema.js 的 hunk_gate 描述改为与实现一致：error 档未归因与跨变更竞争任一在场阻断、在途残留恒仅警告；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-docs-cleanup/requirements.md#FR-01
最近确认：c3859534f48098d1a1fc64fbb3192a8b578a1b62

## FR-setup-054 cli-entry.md 补带日期注记：flow start UI 触达注入执行须知与 flow d
变更：2026-09-27-gate-docs-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When cli-entry.md 补带日期注记：flow start UI 触达注入执行须知与 flow done probes 子步双门执法；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-docs-cleanup/requirements.md#FR-02
最近确认：c3859534f48098d1a1fc64fbb3192a8b578a1b62

## FR-setup-055 core-engine.md 补带日期注记：verify 探针族增员至 12（UI 视觉证据分级门预
变更：2026-09-27-gate-docs-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When core-engine.md 补带日期注记：verify 探针族增员至 12（UI 视觉证据分级门预填与段渲染）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-docs-cleanup/requirements.md#FR-03
最近确认：c3859534f48098d1a1fc64fbb3192a8b578a1b62

## FR-setup-056 setup.md 补带日期注记：local.yaml 新增 ui_visual_gate 与 hun
变更：2026-09-27-gate-docs-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When setup.md 补带日期注记：local.yaml 新增 ui_visual_gate 与 hunk_gate 两键及三档语义；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-docs-cleanup/requirements.md#FR-04
最近确认：c3859534f48098d1a1fc64fbb3192a8b578a1b62

## FR-setup-057 三卡 updated_at 刷新
变更：2026-09-27-gate-docs-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 三卡 updated_at 刷新；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-docs-cleanup/requirements.md#FR-05
最近确认：c3859534f48098d1a1fc64fbb3192a8b578a1b62

## FR-setup-058 零代码行为改动（config-schema 仅字符串描述）
变更：2026-09-27-gate-docs-cleanup
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 零代码行为改动（config-schema 仅字符串描述）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-gate-docs-cleanup/requirements.md#FR-06
最近确认：c3859534f48098d1a1fc64fbb3192a8b578a1b62

## FR-setup-059 test/doc-ref-check.test.mjs 全绿（93 处引用 0 失效）
变更：2026-09-27-pushgate-green-repair
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When test/doc-ref-check.test.mjs 全绿（93 处引用 0 失效）；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-pushgate-green-repair/requirements.md#FR-01
最近确认：eb946a2e7bf4a93671effef01ac7778043b7ba3f

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-09-27-pushgate-green-repair:flow:FR-01
  tests: test/config-schema.test.mjs | test/doc-ref-check.test.mjs
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-09-27-pushgate-green-repair
  status: active

## FR-setup-060 纯文档+example 模板注释行，不改任何门档位缺省值与运行逻辑
变更：2026-09-27-pushgate-green-repair
状态：active
骨架：thin
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 系统就绪；When 纯文档+example 模板注释行，不改任何门档位缺省值与运行逻辑；Then 行为符合本条标准描述
全文：.sillyspec/changes/archive/2026-09-27-pushgate-green-repair/requirements.md#FR-02
最近确认：eb946a2e7bf4a93671effef01ac7778043b7ba3f

## FR-setup-061 sillyspec gate verify --change <名> --docs-only 输出含 verify-test/verify-lint 的 informational 跳过说明、不执行测试命令、其余检查照跑；--docs-only 与 --full 并存 exit 2
变更：2026-10-06-verify-docs-prefill
状态：active
摘要：docs-only 预检；互斥
场景正文：
- 场景：docs-only 预检 — Given 任一 verify 阶段变更 / When `sillyspec gate verify --change <名> --docs-only` / Then ve
- 场景：互斥 — Given 任一变更名 / When `gate verify --change <名> --docs-only --full` / Then exit 2 且报错含互斥说
全文：.sillyspec/changes/archive/2026-10-06-verify-docs-prefill/requirements.md#FR-01
最近确认：e9c01f7cd4f66c5a2fb43bc6775ab9eb3723fad1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-docs-prefill:flow:测试绑定FR-01
  tests: test/gate-docs-only.test.mjs「D1 docsOnly：verify-test/verify-lint informational 占位，测试命令不执行，artifacts 照跑」 | test/gate-docs-only.test.mjs「D2 对照：完整档走真实决策路径（非 docs-only 占位；跳过时有 CLI 自身的 dynamic-empty 理由）」 | test/gate-docs-only.test.mjs「D3 CLI 互斥：--docs-only 与 --full 并存 exit 2（先于变更存在性检查）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-docs-prefill
  status: active

## FR-setup-062 探针 7 对 testFiles 为空的卡注入 FR 关联回归测试候选（渲染「既有用例」注记行，有归属卡的格子不受影响）；无 FR 知识/无命中时行为与现状逐字一致
变更：2026-10-06-verify-docs-prefill
状态：active
摘要：无归属卡获得候选；无 FR 知识
场景正文：
- 场景：无归属卡获得候选 — Given 变更触碰 src/lib.js、知识库有 active FR 覆盖该文件且绑定 test/existing.test.mjs、task-01 卡 allowed
- 场景：无 FR 知识 — Given 知识库无 FR 索引 / When runVerifyProbes / Then 无归属卡 testFiles 仍为空、无注记行（现状一致）。
全文：.sillyspec/changes/archive/2026-10-06-verify-docs-prefill/requirements.md#FR-02
最近确认：e9c01f7cd4f66c5a2fb43bc6775ab9eb3723fad1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-docs-prefill:flow:测试绑定FR-02
  tests: test/probe7-fr-prefill.test.mjs「P1 无归属卡 + FR 命中：既有用例进 testFiles 且渲染注记行」 | test/probe7-fr-prefill.test.mjs「P3 无 FR 知识：行为与现状一致（无注入、无注记）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-docs-prefill
  status: active

## FR-setup-063 local.yaml 配 plan.fill_batch_min_tasks: 3 后 buildCoordinatorStep 文案含「≤3」；未配置时含「≤8」（现状一致）
变更：2026-10-06-verify-docs-prefill
状态：active
摘要：配置生效；缺省与非法回退
场景正文：
- 场景：配置生效 — Given local.yaml 含 plan.fill_batch_min_tasks: 3 / When buildCoordinatorStep / Then 文案含
- 场景：缺省与非法回退 — Given 无 local.yaml 或键值非法 / When buildCoordinatorStep / Then 文案含「≤8」（与现状一致）。
全文：.sillyspec/changes/archive/2026-10-06-verify-docs-prefill/requirements.md#FR-03
最近确认：e9c01f7cd4f66c5a2fb43bc6775ab9eb3723fad1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-docs-prefill:flow:测试绑定FR-03
  tests: test/plan-fill-batch-config.test.mjs「B1 未配置：文案含「≤8」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-docs-prefill
  status: active

## FR-setup-064 backupVerifyResult 传 changeName 时备份文件名含 change 段；parseDesignApiTable 对「非零端点」返回 declared=null；refreshProbeSections 后手写 #### 子节存活
变更：2026-10-06-verify-docs-prefill
状态：active
摘要：三项清偿
场景正文：
- 场景：三项清偿 — 
全文：.sillyspec/changes/archive/2026-10-06-verify-docs-prefill/requirements.md#FR-04
最近确认：e9c01f7cd4f66c5a2fb43bc6775ab9eb3723fad1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-docs-prefill:flow:测试绑定FR-04
  tests: test/verify-probes-refresh-backup.test.mjs「P3-1 清偿：backupVerifyResult 传 changeName 时备份文件名含 change 段」 | test/verify-probes-refresh-backup.test.mjs「P3-2 清偿：「非零端点」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-docs-prefill
  status: active

## FR-setup-065 写新 step guide 后，同步骤旧指纹 guide 文件被清理、仍被任一 state 引用的文件保留
变更：2026-10-06-verify-docs-prefill
状态：active
摘要：白名单清理
场景正文：
- 场景：白名单清理 — Given guideRoot 有同步骤三份不同指纹 + 他步骤一份，state 引用其中一份 / When 清理（keep=新文件）/ Then 未引用旧指纹被删、被引用
全文：.sillyspec/changes/archive/2026-10-06-verify-docs-prefill/requirements.md#FR-05
最近确认：e9c01f7cd4f66c5a2fb43bc6775ab9eb3723fad1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-docs-prefill:flow:测试绑定FR-05
  tests: test/step-guide-prune.test.mjs「G1-G3：旧指纹清理 / state 引用保留 / 他步骤不动」 | test/step-guide-prune.test.mjs「目录缺失：返回 0 不抛（fail-soft）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-docs-prefill
  status: active

## FR-setup-066 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core
变更：2026-10-06-verify-docs-prefill
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更全部实现合入 / When `npm run test:core` 与 `npm run lint` / Then 均零失败退出（CLI 冒烟另证：--d
全文：.sillyspec/changes/archive/2026-10-06-verify-docs-prefill/requirements.md#FR-06
最近确认：e9c01f7cd4f66c5a2fb43bc6775ab9eb3723fad1

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-06-verify-docs-prefill:flow:测试绑定FR-06
  tests: test/step-guide-prune.test.mjs「目录缺失：返回 0 不抛（fail-soft）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-06-verify-docs-prefill
  status: active

## FR-setup-067 plan postcheck：仅 Wave 形态错误（同 Wave 共享/非法 Wave 号/伪并行串行链）时自动重排复验通过（输出含自动重排公告，plan.md/tasks.md W 列已被 adoptPlanWaves 更新）；重排后仍有错则报新错误并说明已自动重排；混有非 Wave 类错误时不自动重排（行为=现状）
变更：2026-10-07-wave-auto-adopt-review-dedup
状态：active
摘要：拓扑可分离的同 Wave 冲突；混合错误不重排
场景正文：
- 场景：拓扑可分离的同 Wave 冲突 — Given task-02 depends_on task-01 且两卡同改 src/shared.js 被手排进同一 Wave / When plan postcheck
- 场景：混合错误不重排 — Given 同 Wave 冲突 + task-02 缺 title_zh / When plan postcheck / Then 不自动重排，两族错误均报出（title_
全文：.sillyspec/changes/archive/2026-10-07-wave-auto-adopt-review-dedup/requirements.md#FR-01
最近确认：87d6b17a841895df9e83a7304e629f07a1cfded8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-wave-auto-adopt-review-dedup:flow:测试绑定FR-01
  tests: test/wave-auto-adopt.test.mjs「WA1 同 Wave 冲突且拓扑可分离 → 自动重排后 postcheck 通过」 | test/wave-auto-adopt.test.mjs「WA2 伪并行碎片（4 独立任务手排四波，≥2 可合并对）→ 自动合并后通过」 | test/wave-auto-adopt.test.mjs「WA4 混有非 Wave 类错误 → 不自动重排」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-wave-auto-adopt-review-dedup
  status: active

## FR-setup-068 plan.auto_adopt_waves: false 时零自动重排（报错现状 + adopt-waves 指路），config-schema 注册该键且 renderExample 含 token
变更：2026-10-07-wave-auto-adopt-review-dedup
状态：active
摘要：关闭档
场景正文：
- 场景：关闭档 — Given local.yaml 配 plan.auto_adopt_waves: false 与拓扑可分离冲突形态 / When plan postcheck / The
全文：.sillyspec/changes/archive/2026-10-07-wave-auto-adopt-review-dedup/requirements.md#FR-02
最近确认：87d6b17a841895df9e83a7304e629f07a1cfded8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-wave-auto-adopt-review-dedup:flow:测试绑定FR-02
  tests: test/config-schema.test.mjs | test/wave-auto-adopt.test.mjs「WA3 auto_adopt_waves: false → 零自动重排（冲突照报）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-wave-auto-adopt-review-dedup
  status: active

## FR-setup-069 renderReviewerTaskbook：changeDir 有既有 review.json 时任务书含前轮 findings 列表（severity+title）与去重引导语；无 review.json 时任务书与现状逐字一致
变更：2026-10-07-wave-auto-adopt-review-dedup
状态：active
摘要：复审注入
场景正文：
- 场景：复审注入 — Given changeDir 有前轮 FAIL 的 review.json（2 条 findings）/ When renderReviewerTaskbook / Th
全文：.sillyspec/changes/archive/2026-10-07-wave-auto-adopt-review-dedup/requirements.md#FR-03
最近确认：87d6b17a841895df9e83a7304e629f07a1cfded8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-wave-auto-adopt-review-dedup:flow:测试绑定FR-03
  tests: test/wave-auto-adopt.test.mjs「RB1 复审任务书含前轮 findings；首评任务书与现状一致」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-wave-auto-adopt-review-dedup
  status: active

## FR-setup-070 Design Grill 步骤 prompt 含前轮发现去重引导（对既有 review 语义无损）
变更：2026-10-07-wave-auto-adopt-review-dedup
状态：active
摘要：既有机制核查
场景正文：
- 场景：既有机制核查 — Given Grill 复审轮 / When prompt 渲染 / When {PRIOR_REVIEW_FACTS} 注入 / Then 前轮事实段照常在场（既有机制零
全文：.sillyspec/changes/archive/2026-10-07-wave-auto-adopt-review-dedup/requirements.md#FR-04
最近确认：87d6b17a841895df9e83a7304e629f07a1cfded8

## FR-setup-071 （并入 FR-01-04 的组合验证）既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core
变更：2026-10-07-wave-auto-adopt-review-dedup
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 本变更全部实现合入 / When npm run test:core 与 npm run lint / Then 均零失败退出（CLI 冒烟另证：4 任务伪并行
全文：.sillyspec/changes/archive/2026-10-07-wave-auto-adopt-review-dedup/requirements.md#FR-05
最近确认：87d6b17a841895df9e83a7304e629f07a1cfded8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-wave-auto-adopt-review-dedup:flow:测试绑定FR-05
  tests: test/wave-auto-adopt.test.mjs「WA1-WA4/RB1 全绿」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-wave-auto-adopt-review-dedup
  status: active

## FR-setup-072 评审档位撤销说明（记录性条目，无代码面）
变更：2026-10-07-wave-auto-adopt-review-dedup
状态：active
摘要：撤销留痕
场景正文：
- 场景：撤销留痕 — Given 收口评审 / When 核对 design 与 requirements / Then 撤销三项与理由在档（设计文档「风险与死路」与本条）。
全文：.sillyspec/changes/archive/2026-10-07-wave-auto-adopt-review-dedup/requirements.md#FR-06
最近确认：87d6b17a841895df9e83a7304e629f07a1cfded8

## FR-setup-073 实测门失败面增量重跑（task-07 追加，方案 1 并入）：前轮失败后下轮只跑「失败批测试文件 ∪ 自失败基线以来变更文件」的三源推断面，未触碰绿面复用；verify: test_rerun: full 恒全子集（现状）
变更：2026-10-07-wave-auto-adopt-review-dedup
状态：active
摘要：修复轮增量；保守档
场景正文：
- 场景：修复轮增量 — Given 全子集首跑 1/4 测试文件失败并落账 / When 修复该文件后重跑 verify --done / Then mode=incremental-rerun、
- 场景：保守档 — Given local.yaml 配 verify: test_rerun: full / When 同场景重跑 / Then 仍全子集模式（dynamic-subset，
全文：.sillyspec/changes/archive/2026-10-07-wave-auto-adopt-review-dedup/requirements.md#FR-07
最近确认：87d6b17a841895df9e83a7304e629f07a1cfded8

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-07-wave-auto-adopt-review-dedup:flow:测试绑定FR-07
  tests: test/test-incremental-rerun.test.mjs「IR1 computeIncrementalFace 纯函数三态」 | test/test-incremental-rerun.test.mjs「IR2 集成主链路：全子集失败→修复→增量绿→ledger 清账」 | test/test-incremental-rerun.test.mjs「IR3 verify: test_rerun: full → 恒全子集（现状行为）」 | test/test-incremental-rerun.test.mjs「IR4 ledger 读写 fail-soft + 首跑前 ledger 读不到」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-07-wave-auto-adopt-review-dedup
  status: active

## FR-setup-074 指引面（根 SKILL.md / README.md / CLAUDE.md / .claude/CLAUDE.md / brainstorm、auto skill）无 sillyspec run quick、/sillyspec:quick 引用及「已退役/存量收尾」注记，小改动指引统一指向 flow start/done
变更：2026-10-10-quick-refs-purge
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 六个指引文件 / When grep 检索 quick（忽略 quicklog）/ Then 零命中；小改动引导语均含 flow start 或 flow do
全文：.sillyspec/changes/archive/2026-10-10-quick-refs-purge/requirements.md#FR-01
最近确认：5fb2a6a94a3822711af676ffcfd0fd010ff6464d

## FR-setup-075 .claude/skills/sillyspec-quick/ 目录与 assets/command-cards/run-quick.md 删除，src/command-cards.js 的 COMMAND_CARD_NAMES 同步移除 run-quick
变更：2026-10-10-quick-refs-purge
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 卡资产目录与枚举 / When `node test/command-cards.test.mjs` / When readCardAssets 读取 / Th
全文：.sillyspec/changes/archive/2026-10-10-quick-refs-purge/requirements.md#FR-02
最近确认：5fb2a6a94a3822711af676ffcfd0fd010ff6464d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-quick-refs-purge:flow:测试绑定FR-02
  tests: test/command-cards.test.mjs「资产齐全 + 双落点 7 卡」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-quick-refs-purge
  status: active

## FR-setup-076 test/command-cards.test.mjs 与 test/input-teach-copyable.test.mjs 同步更新且跑绿
变更：2026-10-10-quick-refs-purge
状态：active
摘要：主路径
场景正文：
- 场景：主路径 — Given 更新后的两测试 / When `node test/command-cards.test.mjs` 与 `node --test test/input-teac
全文：.sillyspec/changes/archive/2026-10-10-quick-refs-purge/requirements.md#FR-03
最近确认：5fb2a6a94a3822711af676ffcfd0fd010ff6464d

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-10-quick-refs-purge:flow:测试绑定FR-03
  tests: test/command-cards.test.mjs「40/40 ALL PASS」 | test/input-teach-copyable.test.mjs「②b 非 src 教学面实例在场」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-10-quick-refs-purge
  status: active
