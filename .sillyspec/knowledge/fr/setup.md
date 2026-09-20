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
