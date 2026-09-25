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
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given 一个未初始化（或重跑）的项目目录；When `sillyspec init --tools zcode` 执行；Then `.zcode/commands/sillyspec/` 下出现 7 张卡（run-brainstorm/plan/execute/verify/archive
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-01
最近确认：61995a32

## FR-setup-002 三态幂等
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given 目标卡已存在；When 重跑 init 且尾部锚行在、剥离锚行重算的落盘正文 sha 与锚行记录一致（完好）；Then 与包内资产正文一致 → 不写（mtime 不动）；不一致（CLI 版本更新）→ 覆盖写新；锚行缺失（外来同名文件）或重算 sha 不符（用户手改正文）→ war
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-02
最近确认：61995a32

## FR-setup-003 claude 双落点
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given init tools 含 claude；Then `.claude/commands/sillyspec/` 下同 7 张卡，语义同 FR-01/02
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-03
最近确认：61995a32

## FR-setup-004 卡内容四段契约
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given 任一张包内卡资产；When 检视其内容
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-04
最近确认：61995a32

## FR-setup-005 zcode 入工具面
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given init 交互菜单或 --tools 校验；When 选择/传入 zcode；Then 被接受（VALID_TOOLS 新增项），且 zcode 工具同时获得 AGENTS.md 注入（跨工具通用标准内容源）+ 命令卡注入
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-05
最近确认：61995a32

## FR-setup-006 不动他者产物
变更：2026-09-21-flow-command-cards
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given 注入执行；When 目标目录存在用户自建文件；Then 仅触碰 sillyspec 命名空间的 7 张卡文件，其余文件零接触
全文：.sillyspec/changes/archive/2026-09-21-flow-command-cards/requirements.md#FR-06
最近确认：61995a32

## FR-setup-007 readFlowConfig 缺省 thin；legacy 拒跑文案与 conf
变更：2026-09-25-thin-default-flip
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
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
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then run quick 渲染入口打一行过渡横幅指路 flow start（--done 收尾不吵），quick 全功能不变
全文：.sillyspec/changes/archive/2026-09-25-thin-default-flip/requirements.md#FR-02
最近确认：ac229db8c4e186754dc15e72d57b336f6c834e2c

## FR-setup-009 flow start 清晰度门通过后跑 classifyChange 预判：mo
变更：2026-09-25-thin-default-flip
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
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
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then agents-instruction 规则 6、9、17 同步：quick 存量过渡、倒推 B 薄道优先、quicklog 存量标注
全文：.sillyspec/changes/archive/2026-09-25-thin-default-flip/requirements.md#FR-04
最近确认：ac229db8c4e186754dc15e72d57b336f6c834e2c

## FR-setup-011 新增测试覆盖缺省 thin 与预判提示；flow 系与 test:core 全绿
变更：2026-09-25-thin-default-flip
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
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
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then src 与 templates/SKILL/config-schema 的全部用户面文案（console 输出、机器稿模板、任务书、简报、横幅、schema 描
全文：.sillyspec/changes/archive/2026-09-25-thin-rename-lightweight/requirements.md#FR-01
最近确认：c0cb9ab6f6c8a924768433a3e3374d55ee461fc2

## FR-setup-013 测试断言与新文案同步全绿
变更：2026-09-25-thin-rename-lightweight
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
场景正文：
- 场景：默认场景 — Given flow 薄跑道在跑；When flow done 裁决执行；Then 测试断言与新文案同步全绿
全文：.sillyspec/changes/archive/2026-09-25-thin-rename-lightweight/requirements.md#FR-02
最近确认：c0cb9ab6f6c8a924768433a3e3374d55ee461fc2

## FR-setup-014 英文 thin 字面与行为零变化
变更：2026-09-25-thin-rename-lightweight
状态：active
摘要：默认场景
待复核：2026-09-25-quick-channel-retire
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
