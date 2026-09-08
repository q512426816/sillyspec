# Agent 会话活性状态推导（agent liveness derivation）— 设计草案

> updated_at: 2026-09-07
> 状态：**pre-brainstorm 设计草案**（未进流程。采纳后建议以变更 `2026-09-07-agent-liveness-states` 立项，走 brainstorm → plan → execute；本文为 brainstorm 输入材料，非最终 design.md）
> 范围：为 agent 会话增加**活性状态**的周期推导与消费。模式 A 为 **SillyHub 平台原生能力**（daemon 自发现 + tail 推导，不以 SillySpec 为前提，D-011），既有登记链路（`src/agent-session-log.js` + `POST /api/agent-logs`）降为其 ctx 增强源；CLI 侧 `sillyspec agents status` 本地按需推导为辅路径。消费方两类：**人**（视图徽章 / blocked 通知 / 本地 status 命令）与 **agent**（编排轮询知情决策 / 兄弟会话状态查询 / 多会话冲突守卫，见 §4.4）。
> 配套文档：[`platform-agent-log-protocol.md`](./platform-agent-log-protocol.md)（本提案是其 §1.3「可选增强：daemon 增量 tail」从"内容展示"推进到"状态推导"的延伸）、[`sillyspec/platform-interface-map.md`](./sillyspec/platform-interface-map.md)
> 涉及仓库：sillyspec（CLI，本文档所在仓）+ multi-agent-platform（backend / sillyhub-daemon / frontend）

## 0. 背景与动机

### 0.1 痛点：感知是登记式的，不是流式的

现状链路里，平台对本地 agent 会话的感知止步于**登记**：CLI 在 `run` 入口探测 harness、上报日志路径 + 元信息（`POST /api/agent-logs`），平台落库后在会话视图展示，daemon 按需 `host_fs.read_agent_log_messages` 拉取解析做对话化渲染。整条链路回答的是"**有哪些会话、日志在哪、聊了什么**"，回答不了"**这个 agent 此刻是活的还是死的、在干活还是在等我**"：

- 进度同步只在 `--done` 时推进——agent 卡住 20 分钟，平台进度纹丝不动，用户无从分辨"还在跑"和"已经死了"；
- agent 卡在 CLI 自身的权限确认 / 覆盖提示上等人时，没有任何信号离开本机——这正是多会话并行场景下"切来切去找哪个卡住了"的痛点，在 SillyHub 多会话视图下同样存在；
- 登记**时机还有盲区**：它只发生在 agent 调 `sillyspec run` 的入口——卡在首次调用之前的会话、未接 SillySpec 流程的裸 agent 会话，永远不上册，落在感知范围之外（§4.1 自发现通道消除此盲区）。

### 0.2 竞品参照：Herdr

[Herdr](https://herdr.dev/)（终端工作区管理器，Rust，35k★）验证了这个需求的真实性：它对每个 pane 实时标注 working / blocked / idle / done，核心用户价值是"一眼看出哪个 agent 卡住在等人"。但其技术路线是**正则扫描终端屏幕缓冲区**（TOML manifest 匹配 "esc to interrupt" 这类 UI 文案）——不侵入 agent 的代价是极度脆弱（agent CLI 改一句提示文案规则即失效，需远程热更新 manifest 补救）。

SillySpec 生态不需要抄这条路线：我们的感知层锚在**结构化会话日志**（完整 model I/O、工具调用、事件流，格式见协议 §4），数据源严格优于屏幕正则。**吸收其目标（实时活性状态 + blocked 提醒），不抄其手段（PTY 常驻 / 终端复用 / 屏幕扫描）**，分层依据见 D-001。

Herdr 的另一条能力同样值得对齐：`agent wait --until idle/blocked` 让**编排 agent 程序化感知 worker 状态**而非盲等盲杀。SillySpec 生态对应的缺口在 dispatch 轮询——`list_workers` 只暴露 `pending → running → completed/failed`，running 期间是黑盒（在干活 / 卡在权限确认等人 / 挂了，编排 agent 分不清），现行手段只有"per-worker 超时 → kill lease"。本提案的推导态同时服务人与 agent 两类消费方（§4.4）。

### 0.3 现状资产盘点（本提案的地基，全部已验证存在）

| 层 | 已有资产 | 位置 | 本提案增量 |
|---|---|---|---|
| 登记层 | 8 类 harness 探测 + 路径/元信息上报 + 本地留底 | sillyspec `src/agent-session-log.js`；协议文档 | 零变更（D-005） |
| 落库层 | `platform_agent_logs` 表，`(workspace_id, log_path)` upsert，ctx（change_key/quick_id/hub_session_id） | backend `app/modules/platform_sync/` | 增状态列 + 状态上报端点 |
| 解析层 | format → parser 注册表（MVP 仅 `zcode-model-io-jsonl`，已预留扩展点）+ `host_fs.read_agent_log_messages` RPC 按需拉取 | daemon `src/agent-log/registry.ts`、`parse-zcode-model-io.ts` | 新增 format → deriver 注册表（周期 tail 推导状态） |
| 托管事实 | daemon spawn 全部平台会话（`_startInteractiveSession` + `buildSpawnEnv`）：知 harness / cwd，`SILLYHUB_SESSION_ID` 为其注入的 env；interactive 会话持久化 `sessions.json`（`PersistedSessionRecord` 含 provider / cwd / agentSessionId / lastActiveAt，重启可恢复；batch worker 不落盘，FR-09） | daemon `src/daemon.ts`、`src/interactive/types.ts` | 自发现通道的地基（§4.1，D-011） |
| 权限事件 | 第一方权限管线：canUseTool 回调 → `PERMISSION_REQUEST`（`daemon:permission_request`）事件 → backend 待审记录 + SSE 广播 + dialog 持久化 + 5min timer；协议模式 worker 的 `control_request` 由适配器自动批准回写 | daemon `src/protocol.ts`、`src/hub-client.ts`、adapters `stream-json.ts` | blocked 状态的第一优先源（D-012 汇聚，不重复造路） |
| 通知层 | `Notification` 模型（接收人扇出 / dedupe_key / Redis `NOTIFICATIONS_CHANNEL` 实时推） | backend `app/modules/notification/` | 新增 `agent_blocked` 通知类型 |
| 编排层 | dispatch 双后端（Local / SillyHub）+ `list_workers` 终态轮询（15s）+ kill lease | sillyspec `src/dispatch/` | 轮询返回值并入 liveness，kill 决策升级为知情决策（P1e） |
| 前端 | 会话视图 agent 日志面板、对话化渲染 | multi-agent-platform frontend | 状态徽章 + 多会话状态聚合 |

即：**各层地基都在，缺的只是"周期 tail + 状态推导"这一环**——自发现所需的托管事实（daemon spawn 记录）与日志布局规则（协议 §3，SillySpec 侧已有 JS 实现）也已具备——以及把推导结果接到通知和徽章上。

## 1. 目标与非目标

### 目标

1. **G-1 实时活性状态**：平台会话/变更视图能展示每个**托管** agent 会话（daemon 自发现，含未跑 SillySpec 流程的裸会话）的活性状态（working / blocked / idle / ended / unknown），状态变化在秒级（≤10s）可见。
2. **G-2 blocked 主动通知**：agent 进入"等人"状态且超阈值未消解时，平台向会话相关人发站内通知（复用既有 Notification 体系）；blocked 判定按状态源优先级与既有第一方权限事件管线汇聚，不造第二套语义（D-012）。
3. **G-3 本地按需可见**：`sillyspec agents status` 在无平台的裸终端环境一屏展示本机全部活跃 agent 会话及状态。
4. **G-4 一套规则三处消费**：daemon 自发现（日志布局定位）、daemon 推导、CLI 探测/推导共用同一事实源（协议文档 + fixture 对拍），不允许语义漂移。
5. **G-5 编排 agent 知情决策**：dispatch 轮询在 worker running 期间可见推导态——blocked 超阈值升级给人（替代无脑超时 kill），working 无进展再等；本地任意 agent 可经 `agents status --json` 查兄弟会话状态（§4.4）。

### 非目标

1. **不做 PTY 常驻 server / 终端复用 / detach-reattach**——终端运行时层是 Herdr 的核心资产，与 SillySpec"流程层"定位正交，重造投入产出比极差（D-001）。
2. **不做屏幕缓冲区正则检测**——有结构化日志数据源，不降级去抄屏幕扫描（D-001）。
3. **不改日志上报主契约**——CLI 仍只上报路径与元信息，不上报日志内容、不新增 CLI 侧常驻进程（D-005）。
4. **不做 pane 粒度编排**——agent 编排维持在任务粒度（dispatch 层既有能力），不加终端 pane 粒度控制。

## 2. 状态模型

### 2.1 状态枚举（5 态）

| 状态 | 语义 | 进入条件（概要） |
|---|---|---|
| `working` | agent 正在干活（模型请求进行中 / 工具在执行） | 日志新鲜，或末事件为"发起工具调用未见结果"（L1） |
| `blocked` | agent 在等人（权限确认 / 覆盖提示等），**必须有正向证据**（R-01） | 日志出现等待人类的事件模式且未消解（L1，per format） |
| `idle` | 会话活着但安静：一轮已完成、等下一条指令 | 末事件为完整回合结束（L1）或日志静默超新鲜窗口（L0） |
| `ended` | 会话结束 | 日志静默超结束窗口（15min，对齐协议既有"mtime 停滞超 15min = 会话结束"口径） |
| `unknown` | 已发现（登记或自发现）但无法推导 | format 未注册 deriver / 推导异常（fail-open 到 unknown，不猜） |

与 Herdr 五态对照：其 `done`（idle 但用户未看过）**不设独立状态**——"未读"是 UI 层从 `working/blocked → idle` 转移边 + 视图已读状态派生的徽章语义，进状态枚举会让 CLI/daemon/前端三处都要维护"已读"这个本就属于视图的概念（D-006）。

### 2.2 与 SillySpec 任务态的关系（正交）

任务态（stage / step，SQLite 进度库）回答"**流程走到哪一步**"，权威方是 SillySpec 状态机；会话活性态回答"**执行流程的那个 agent 此刻死活**"，权威方是推导器。两者在平台视图里是同一会话的两个维度（进度条 + 状态点），互不替代：进度停在 execute 不代表卡住（可能在长时间跑测试），进度推进也不代表现在活着（可能刚 `--done` 完人就走了）。

```
                ┌─────────（新事件）──────────┐
                ▼                            │
started ──> working ──（等待人类事件）──> blocked
              │  ▲                            │（消解：人类响应，新事件到来）
              │  └──────（工具结果/新请求）────┘
              │
              ├──（回合完整结束 / 静默>2min）──> idle
              │                                │（新事件）
              └────────────────────────────────┘
   idle ──（静默>15min / 文件消失）──> ended（终态，移出 watch）
   任意 ──（format 无 deriver / 推导异常）──> unknown（保持登记，不再推导）
```

## 3. 推导规则（分层，L0 兜底 + L1 精化）

推导规则是跨仓契约，**单一事实源 = 协议文档新增 §8**（D-004），daemon 推导（TypeScript）与 CLI 推导（Node）以文档为准，共享 fixture 对拍；协议 §3 的日志布局定位规则同理被三处消费（daemon 自发现 / daemon tail / CLI 探测），同属"改文档先于改代码"的约束范围。

### 3.1 L0：mtime 活性（全 format 通用兜底）

只依赖文件 mtime，任何已发现会话（登记或自发现）都可推导：

- `mtime 距今 ≤ QUIET_MS（默认 120s）` → 活跃（working/idle 无法区分时报 `working`）
- `QUIET_MS < mtime 距今 ≤ ENDED_MS（15min）` → `idle`
- `mtime 距今 > ENDED_MS` → `ended`（对齐协议 §1.3 既有"15min = 会话结束"口径与 CLI 探测器 `ACTIVE_WINDOW_MS` 同值）
- 文件不存在 → `ended`

L0 的已知缺陷（L1 存在的意义）：长时间工具执行（如 5 分钟测试跑）期间日志无写入，L0 会把 working 误判为 idle——所以 QUIET_MS 取 120s 而非更短，且凡有 L1 的 format 一律以 L1 为准。

### 3.2 L1：事件级精化（per format）

对日志**尾部增量**做事件级判定，覆盖三类问题：把"工具在执行"识别为 working（不受 mtime 静默影响）、把"回合已结束"立即识别为 idle（不等 2min）、识别 blocked。

| format | working 证据 | blocked 证据 | 状态 |
|---|---|---|---|
| `claude-code-jsonl` | 末行 `type:"assistant"` 含 `tool_use` 且其后无 `tool_result`（user 行）→ 工具执行中；末行 assistant 纯文本 → 回合结束 → `idle` | permission 等待是否落 transcript **待实证 E-01**；实证通过前该 format 不承诺 blocked | 规则草案，E-01 后定稿。**价值注记（E-08/E-02/E-03 收敛后更新）**：托管 Claude 会话被第一方管线覆盖（D-012），此处推导仅服务**裸 claude CLI**——且 E-01 已成为日志推导 blocked 的唯一剩余候选 |
| `codex-rollout-jsonl` | 末 `response_item` 为函数调用未配对结果 → working；`event_msg` 出现回合完成类事件 → idle | **E-02 已实证（2026-09-07）**：本机 136 文件 / 13822 条 `event_msg` 全清单（18 型）无 approval 类；根因＝本机 `approval_policy="never"`（config.toml 与 `turn_context` 每轮均带该字段证实）——本机会话结构性不等人；policy≠never 时是否落 rollout 未验证，价值低（托管 codex 有第一方桥，E-08）→ **不承诺 blocked** | working/idle 规则可定稿：`task_complete`＝回合完成、`function_call`/`function_call_output` 配对差分、`token_count` 高频心跳均已实证；词汇表跨 0.121→0.147 十八版本稳定 |
| `zcode-model-io-jsonl` | 末行 `completedAt` 距今 ≤ QUIET_MS → working；末行 `response.toolCalls` 非空且无后续行 → 工具执行中（mtime 静默也算 working） | **E-03 已证伪定稿（2026-09-07）**：记录 `type` 仅 `model_io` 一种（跨 3 活跃会话抽样 + 461 行解析器佐证），每行＝一次完整模型请求/响应对，无任何 CLI 交互层记录类型；permission/dialog 关键词命中全部来自对话载荷（无关会话因系统提示词工具 schema 亦命中，佐证归因）→ **不承诺 blocked，永久 L0+working/idle** | 可先行（解析层已有 461 行实证代码可参照）。**注记**：zcode 不在 daemon interactive 3 provider（claude/codex/pi）也不在批量 12 provider 名单——非托管 harness，第一方管线结构上不可及；活性感知（working/idle/ended）走日志推导是其唯一路径，blocked 天花板已由 E-03 定死 |
| `pi-session-jsonl` | 同 claude-code 族行式事件 | 待实证 | P2 批次 |
| `dsh-session-jsonl-zstd` | zstd 解压成本高，周期 tail 不经济 → **L0 only**（或仅会话结束时全量读一次） | 不承诺 | 裁决：L0 only |
| `cursor-chat-sqlite` / `opencode-session-json-tree` / `jsonl` / `unknown` | L0 only | 不承诺 | 裁决：L0 only |

**铁律 R-01（blocked 正向证据）**：`blocked` 必须由日志中的显式等待人类事件判定；缺乏证据时只能落 `working`/`idle`/`unknown`，**绝不以"长时间没动静"推断 blocked**。误报的 blocked 通知对信任的侵蚀远大于漏报（用户被喊来却发现 agent 只是在跑长测试，三次之后就会关掉通知）。

**铁律 R-02（fail-open）**：deriver 抛错 / 行解析失败 → 该会话本轮落 `unknown` 并保留登记，下一轮重试；推导故障绝不影响日志登记与对话视图等既有链路（与协议 §0 best-effort 口径一致）。

### 3.3 推导输入的另一心跳源（辅助，不进本提案实现）

CLI 每次 `run` 上报时 `invocations`/`last_seen_at` 递增，本身是心跳；但粒度太粗（只在 agent 调 CLI 时跳），仅作 daemon 不可达时的兜底参考，P1 不实现。

## 4. 架构与数据流

### 4.1 模式 A：平台模式（主路径）— daemon liveness tailer（平台原生能力）

先立定位（D-011）：**推导器是 harness 耦合、SillyHub 平台原生的能力，不以 SillySpec 为前提**。daemon 本来就是 spawn agent 的那一方（`daemon.ts` `_startInteractiveSession` + `buildSpawnEnv`）——每个托管会话的 harness、cwd、`SILLYHUB_SESSION_ID`（它自己注入的 env）全都知道；把协议 §3 的日志布局定位规则移植到 daemon TS（SillySpec 侧已有 JS 实现，近乎 1:1）即可自发现会话日志。SillySpec 登记不缺席但降位：从"watch list 唯一来源"降为 **ctx 增强**。

**发现通道双源（D-011）**：

- **daemon 自发现（主）**：三层数据源——运行期 spawn 记录（harness + cwd + 会话归属）、重启恢复 `sessions.json`（`PersistedSessionRecord` 自带 provider / cwd / lastActiveAt，interactive 会话全覆盖）、兜底窗口重扫（sessions.json 缺失/损坏或 batch worker 未落盘时，按"mtime 15min 内有更新"重扫布局目录，即 CLI 探测器 `ACTIVE_WINDOW_MS` 同原理）。日志定位按 harness 分两档：claude-code / pi 目录名由 cwd 确定性编码 → **直算路径**；codex（文件名含 uuid）/ zcode（rollout 目录全局共享）→ **窄扫 + 首行/标记匹配**（P1a 分两步，直算先行）。覆盖全部托管会话，含两类登记够不着的盲区——卡在首次 `sillyspec run` 之前的会话、未接 SillySpec 流程的裸 agent 会话；
- **SillySpec 登记（增强）**：`POST /api/agent-logs` 照旧，贡献 change_key / quick_id 业务关联——自发现知道"哪个会话活着"，登记补充"它在跑哪个变更"。两源发现的同一文件按 `(workspace, log_path)` 汇聚去重。

daemon 与 agent 同机（既有 `host_fs.read_agent_log_messages` 已验证此信任域），在 daemon 内新增周期推导器：

```
发现通道（双源，D-011）
  ├── daemon 自发现：spawn 记录 → 协议 §3 布局规则 → log_path        ← 主，覆盖盲区
  └── SillySpec 登记：POST /api/agent-logs（change_key/quick_id）    ← 增强，业务关联
        │ (workspace, log_path) 汇聚去重 → watch list
        ▼
daemon liveness tailer（Node，周期 10s）
        │ ① 每路径 stat size → 与上次 offset 差量续读（协议 §1.3 既有口径）
        │ ② 尾部增量 → format → deriver 注册表（新增，仿既有 parser 注册表模式）
        │ ③ 推导状态 + 证据摘要
        ▼
backend POST /api/agent-logs/states（批量，daemon 鉴权通道）
        │ ④ upsert（键沿用 (workspace_id, log_path)）+ 状态转移检测
        ├──> 会话/变更视图状态徽章（frontend 轮询或既有实时通道）
        └──> 进入 blocked 且超阈值未消解 → Notification（type=agent_blocked，站内 + Redis 推送）
        ⑤ ended → daemon 移出 watch list（行保留，状态定格 ended）
```

设计要点：

- **watch list 来源 = 双源并集**（如上）；`ended` 行 daemon 侧移出 watch（落库行与历史状态保留）。
- **deriver 注册表**：`agent-log/` 下新增 `liveness/` 子层，签名 `(tailContent, prevState, now) => { state, evidence }` 纯函数，与既有 parser 注册表（`registry.ts` 的 D-002 扩展点模式）同构；每 deriver 带 fixture 单测。
- **offset 增量读**：单周期单文件只读上次 offset 之后的新增字节；日志轮转/截断（size 变小）→ 重置 offset 全量重读一次并标记证据 `reset`。
- **并发上限**：watch 数默认 16（超出按 `last_seen_at` 新者优先），单轮总读取字节预算（如 4MB）防极端日志拖垮周期。
- **worker 的旁路捷径（E-08，代码级已核实 + 覆盖面现场核验完成 2026-09-07）**：daemon 已有第一方权限事件管线——canUseTool 回调 → `PERMISSION_REQUEST`（`daemon:permission_request`）事件 → backend 待审记录 + SSE 广播 + dialog + 5min timer（AskUserQuestion 同管线）；协议模式 worker 的 `control_request` 由 stream-json 适配器**自动批准回写**，基本不会卡在权限上。由此确立**状态源优先级（D-012）：第一方权限事件 > 日志推导**——`agent_blocked` 通知与既有待审/5min timer 同源汇聚，不并行造第二套 blocked 语义。覆盖面核验结论（`providers.ts` 能力矩阵 + `session-manager.ts` 接线实读）：**托管会话不存在"第一方管线外的等人"**——scan 型（`enableApproval=true`）claude 经 canUseTool+onUserDialog、codex 经 sessionPermission hooks（providers.ts 注明"两桥等价"，两者 `permission_dialog` 均 true）真阻塞等人；chat 型（`enableApproval=false`）canUseTool＝写校验＋直接放行、批量 worker `control_request` 自动批准、pi（`permission_dialog=false`）extension_ui_request 自动 cancel——三者不经人审、不会等人（AskUserQuestion 人审仅 scan 型注入）。zcode 不在 interactive 3 provider / 批量 12 provider 任一名单，非托管 harness。日志推导 blocked 的价值区因此收敛为：**裸 CLI**——其中裸 codex 本机 `approval_policy=never` 无场景（E-02）、裸 zcode 已被 E-03 证伪，**唯一剩余候选＝裸 claude CLI（E-01）**。

### 4.2 模式 B：本地模式 — `sillyspec agents status`

无平台场景的本地按需命令，**不驻留、不新增守护进程**（D-005）：

- 复用 `agent-session-log.js` 的 `HARNESS_DETECTORS` 现场探测（即既有 `agent-log --detect` 代码路径，活跃窗口扫描 + cwd 归属判定全照旧）；
- 对探测命中的每个日志文件，跑**同一套 L0/L1 推导**（规则实现放独立模块，daemon 侧规则文档对拍）；
- 输出一屏表格：harness / session 短 id / 状态 / 静默时长 / 关联 change_key|quick_id（读本地产物 ctx）；`--json` 机器可读输出供 agent 消费（§4.4-2）。
- 与 `agent-log --detect` 的关系：`--detect` 只列登记事实；`agents status` = 探测 + 状态推导 + 人类可读聚合。命令名 brainstorm 定夺（备选 `agent-log --status`，避免顶层命令膨胀）。

### 4.3 模式 B'：本地模式 + 远程 SillyHub（P3 可选，暂不立项）

CLI 侧周期推导并把**状态枚举值**上行远程平台（不含日志内容，延续协议 §7 克制口径）。需要 CLI 常驻或定时器，与"CLI 不是执行体"的既有定位（D-007@task-dispatcher）有张力，待 P1/P2 落地后按真实需求裁决。

### 4.4 状态消费方：人与 agent（两条通道的分层）

推导态的消费方不止人，但先立分层：SillySpec 生态里 **agent 相互理解的主通道是契约，感知推导是契约黑盒期的旁路信号**（D-009）：

| | 契约通道（既有，主通道） | 感知通道（本提案推导，旁路） |
|---|---|---|
| 原理 | agent 显式声明状态：`--done` 推进、review.json 回收、mission 终态轮询 | 从日志 mtime / 事件推导 |
| 可靠性 | 确定性（worker 说完成就是完成） | 启发式、best-effort（R-01 宁漏勿误） |
| 粒度 | 任务级 | 会话级 |
| 失效场景 | agent 说不出话时（卡死 / 挂起 / 卡在 CLI 弹窗） | 永远不比契约准 |

健康流程下契约通道已够用，**不让 agent 之间靠"互相观察"替代显式契约**——那是把确定性协作降级成启发式协作。感知通道的独有价值是契约原理上覆盖不了的角落：worker 卡死说不出话、卡在权限弹窗任务态不动、未接流程的异构 / 裸 agent。三个 agent 消费端：

1. **dispatch 轮询并入 liveness（P1e，价值最大）**：worker running 期间，`list_workers` 返回值附上 daemon 推导的 working/blocked，编排 agent 的决策规则从"per-worker 超时 → kill lease"（`src/dispatch/backends/sillyhub-mcp.js`「终态轮询 + 超时 kill lease」段）升级为：
   - `blocked` 超阈值未消解 → **升级给人**（通知 + 平台待办），不直接 kill——自动批准权限提示是安全敏感操作，P1 默认只升级不自动批（D-010 / E-07）；
   - `working` 但久无终态 → 按既有超时逻辑再等，不抢跑 kill（区分"在干活的长任务"与"死了"正是现行黑盒做不到的）；
   - 涉及两仓：backend `list_workers` 返回值加 liveness 字段（daemon 推导结果经既有 mission 状态链路汇入）+ sillyspec 侧轮询指令模板同步改写决策规则。
2. **`agents status --json`（P2，随命令自带）**：机器可读输出（照 `agent-log --json` 既有模式，stdout 纯 JSON），本地任意 agent 一条命令查兄弟会话状态——Herdr `agent wait / read` 的本地等价物。是否加 `--wait-until <state>` 阻塞语义由 brainstorm 定（查询命令阻塞等待不违反 D-007@task-dispatcher 的"CLI 非执行体"定位，但先验证真实需求再加）。
3. **多会话冲突守卫（P2c）**：agent 动手前查"这个变更 / worktree 是否已有活跃会话在干活"。既有 quick 会话 guard（`.runtime/quick-sessions/<sessionId>/guard.json`，run↔`--done` 续接的身份记录）只有占用事实、没有"占用者仍活跃吗"的判据；推导态补上这一维（活跃会话 + 状态，与 `agents status --json` 同源数据），CLAUDE.md"多 agent 同时操作代码"的既定约束由此获得状态依据。

## 5. 契约与存储增量

| 位置 | 增量 | 说明 |
|---|---|---|
| 协议文档 | 新增 §8「活性状态推导」 | 状态枚举 / L0 阈值 / L1 per-format 规则表 / R-01 R-02 铁律——双端实现的单一事实源（D-004） |
| CLI 上报契约 | **零变更** | 状态是派生数据，不进 `POST /api/agent-logs`（D-005）；登记链路照旧，但降为发现通道的增强源之一（D-011） |
| backend | `platform_agent_logs` 增列：`state` / `state_derived_at` / `state_evidence`（短摘要） | upsert 键不变；alembic 迁移；是否拆独立表由 brainstorm 裁决 |
| backend | 新端点 `POST /api/agent-logs/states`（批量） | daemon 鉴权通道；body 仅 `(log_path, state, evidence, derived_at)` 枚举级数据 |
| backend / MCP | `list_workers` 返回值增 liveness 字段（worker running 期间附 state + evidence） | 编排 agent 消费（§4.4-1）；daemon 推导结果经既有 mission 状态链路汇入 |
| backend | Notification 新 type `agent_blocked` | 复用接收人扇出 / dedupe_key（去抖：同一 `(session, blocked 段)` 只发一次）/ `NOTIFICATIONS_CHANNEL` 实时推 |
| frontend | 会话/变更视图 agent 日志面板加状态徽章；工作台多会话状态聚合 | `idle` 且有未读转移边 → 小红点（D-006） |
| daemon | `agent-log/liveness/` deriver 注册表 + tailer 循环 | §4.1 |
| CLI | `agents status` 命令 + 推导模块（含 `--json` 机器可读输出） | §4.2 / §4.4-2 |
| sillyspec 派发模板 | SillyHub 后端「终态轮询 + 超时 kill lease」指令段改写 | blocked→升级给人、working→再等（§4.4-1） |

**blocked 通知阈值**：进入 blocked 后持续未消解 ≥ `BLOCKED_ALERT_MS`（默认 120s）触发；消解（状态离开 blocked）后再次进入视为新段，可再触发。阈值平台侧常量起步，workspace 级配置后续再加。与既有 `PERMISSION_REQUEST` 待审 5min timer 的关系（同源汇聚后阈值对齐还是分级提示）由 brainstorm 裁决（D-012）。

## 6. 两仓任务拆分与顺序

**顺序建议：P1 平台侧先行**（价值最大——多会话管理是平台场景；且模式 A 本体（P1a–P1d）不依赖 CLI 任何改动——连登记链路都只读不依赖，零回归面；P1e 的 sillyspec 侧仅为派发指令模板文本改写，非代码逻辑，回归面极小），P2 CLI 侧跟进。

| 期 | 仓库 | 内容 | 依赖 |
|---|---|---|---|
| P1a | multi-agent-platform daemon | liveness tailer + **自发现通道最小版**（数据源：spawn 记录 + sessions.json 重启恢复 + 窗口重扫兜底；定位分两步——claude/pi 直算路径先行，codex/zcode 窄扫匹配随后；布局规则自 SillySpec JS 移植）+ `zcode-model-io-jsonl` deriver（解析事实最全，先行）+ offset 增量读 | — |
| P1b | multi-agent-platform backend | 状态列迁移 + `/api/agent-logs/states` + Notification type | P1a |
| P1c | multi-agent-platform frontend | 状态徽章 + blocked 通知消费 + 聚合视图 | P1b |
| P1d | multi-agent-platform daemon | `claude-code` / `codex` deriver（working/idle 规则已实证可用——E-02 词汇表在手；blocked 承诺视 E-01，仅裸 claude CLI 场景） | 实证项 |
| P1e | multi-agent-platform backend + sillyspec | `list_workers` 返回值并入 liveness（blocked 源按 D-012 优先级：第一方权限事件 > 日志推导）+ SillyHub 轮询指令模板决策规则升级（blocked→升级给人、working→再等，§4.4-1） | P1a/P1b |
| P2a | sillyspec | 协议文档 §8 定稿（P1 实现反哺实证结论） | P1 |
| P2b | sillyspec | 推导模块 + `agents status` 命令（含 `--json`）+ fixture 测试 | P2a |
| P2c | sillyspec | 多会话冲突守卫接入推导态（与 `agents status --json` 同源数据） | P2b |
| P3 | 视需求 | Herdr interop（读 herdr socket 状态作额外感知源）/ 模式 B' 状态上行 / pi deriver / `--wait-until` 阻塞语义 | 缓议（D-008） |

**验收标准（草案，brainstorm 细化）：**

- P1：派发一个 zcode 会话后，平台视图 10s 内出现状态；**daemon 托管的裸 agent 会话（全程不调 sillyspec）同样 10s 内出状态**（自发现盲区覆盖回归项，D-011）；人为制造确认等待（可 blocked 的 format）→ 通知在阈值 + 10s 内到达；空闲会话**不得**产生 blocked 通知（R-01 回归项）；tailer 崩溃不影响既有 `read_agent_log_messages` 与登记链路（R-02 回归项）。
- P1e：派发的 worker 卡在确认等待时，编排 agent 轮询 `list_workers` 可见 blocked 并触发升级而非直接 kill；worker 在跑长任务（日志持续增长）时不被抢跑 kill（现行"超时即杀"与"知情等待"的区分回归项）。
- P2：裸终端双 harness 并发（一 working 一 idle）`agents status` 正确区分；`--json` 输出为 stdout 纯 JSON 可被脚本消费；与 daemon 侧对同一 fixture 推导结果一致（双端对拍测试）；Windows 路径 / 中文 cwd 下探测与推导不回归。

## 7. 性能与安全

- **读取成本**：offset 增量读，稳态单周期每文件只读新增字节；watch ≤16、单轮字节预算、ended 回收三重上限，tailer 不构成 daemon 负担。
- **内容边界不变**：推导在本机（daemon / CLI）完成，跨进程/上报的只有状态枚举 + 短证据摘要（如 `last_event=tool_use`），**日志内容依然不出本机**——协议 §7"上报只含路径与元信息"的克制口径延伸至此（D-005）。
- **Windows**：daemon 增量读的文件锁行为需实证（E-04，既有 read RPC 已有同机读实践，风险低）；CLI 侧探测本就三平台兼容。

## 8. 决策记录

- **D-001 不纳入终端层（PTY / 复用 / 屏幕正则）**：终端运行时是 Herdr 的专项目（21MB Rust、独立维护的 21 套屏幕 manifest），与 SillySpec 流程层定位正交；屏幕扫描是所有感知手段中最脆的一环（UI 文案即契约），而生态内已有结构化日志数据源，严格占优。用户完全可以"Herdr 管终端 + SillySpec 管流程"，互补不竞争。
- **D-002 daemon 为推导主体**：平台模式 daemon 与日志同机（`read_agent_log_messages` 已验证信任域与读取实践），且是唯一常驻方；CLI 非常驻（run 即走），只能做按需推导（模式 B）。
- **D-003 blocked 正向证据铁律（=R-01）**：误报通知对信任的侵蚀不可逆，宁漏勿误；"长时间无动静"只能推出 idle/ended，推不出 blocked。
- **D-004 推导规则锚定协议文档**：daemon（TS）与 CLI（Node）双实现 + fixture 对拍，规则变更先改文档再改代码，防语义漂移。
- **D-005 状态是派生数据，CLI 上报契约零变更**：不给 CLI 加常驻、不加上报字段、不搬内容；旧 CLI / 旧落库行天然兼容（无状态列时视图显示 unknown）。
- **D-006 "未读"不入状态枚举**：Herdr 的 done 态拆解为 UI 层转移边 + 已读状态，状态机保持纯客观可推导。
- **D-007 任务态与会话活性态正交**：不合并、不互相推导；视图层并列展示。
- **D-008 Herdr interop 缓议**：读 herdr Socket API 作额外感知源技术上可行，但引入外部依赖与排障面，待 P1/P2 价值验证后再评估。
- **D-009 契约为主、感知为旁路**：agent 相互理解的主通道保持显式契约（任务态 / review.json / 终态轮询），推导态只作 running 黑盒期的旁路信号（卡死 / 卡弹窗 / 异构裸 agent）——不替代契约、不另起一套协作语义，防止把确定性协作降级成启发式协作。
- **D-010 blocked 只升级不自动批（P1 默认）**：自动批准 agent 的权限提示等于代人做安全决策，P1e 仅做"升级给人"；自动批若做，需 workspace 级开关 + 审计留痕，单独评估（E-07）。
- **D-011 发现通道双源，daemon 自发现为主（模式 A 平台原生）**：推导器是 harness 耦合的平台原生能力，不以 SillySpec 为前提——daemon 自发现（spawn 记录 + 协议 §3 布局规则）覆盖全部托管会话（含登记时机盲区与裸 agent 会话），SillySpec 登记降为 ctx 增强（变更/quick 关联）；`hub_session_id` 本就是 daemon 注入的 env，自发现天然携带会话归属，无需经 CLI 上报绕行。
- **D-012 状态源优先级：第一方权限事件 > 日志推导**：daemon 既有 canUseTool → `PERMISSION_REQUEST` → 待审 + 5min timer 管线覆盖的会话（scan 型——claude canUseTool/onUserDialog 与 codex sessionPermission **双桥等价**，E-08 核验），blocked 直接取第一方事件，`agent_blocked` 通知与其同源汇聚去重；管线外的托管会话（chat 型 / 批量 worker / pi）不等人（写校验放行 / 自动批准 / 自动取消），无可推导的 blocked。**禁止两套 blocked 语义并行**——日志推导 blocked 的适用面经 E-01/E-02/E-03/E-08 实证收敛为**非托管的裸 CLI**（唯一候选＝裸 claude CLI，E-01；zcode 已证伪、本机裸 codex 无场景）。blocked 的实现重心＝第一方事件汇聚，日志推导为边缘补充。

## 9. 风险与开放问题（实证清单）

| # | 问题 | 影响 | 处置 |
|---|---|---|---|
| E-01 | ~~claude-code transcript 是否记录 permission 等待~~ **已证伪定稿（2026-09-07 扫描 160 个最近 transcript）**：顶层记录类型清单（assistant/user/attachment/queue-operation/last-prompt/mode/ai-title/file-history-snapshot/system/permission-mode/file-history-delta）无"等待审批"事件类型——`permission-mode` 仅模式切换；零审批结果/拒绝记录，关键词命中均为对话内容 | 裸 claude 不承诺日志推导 blocked；日志推导侧 blocked 全线定稿关闭（仅存第一方 PERMISSION_REQUEST 源，D-012） | 已关闭（主仓变更 2026-09-07-agent-liveness-states spike-02 回写） |
| E-02 | ~~codex rollout 中 approval/等待类 `event_msg` 的具体类型值~~ **已实证（2026-09-07）**：本机 136 文件 / 13822 条 `event_msg` 全清单（18 型：`token_count`/`agent_message`/`exec_command_end`/`patch_apply_end`/`task_started`/`user_message`/`task_complete`/`sub_agent_activity`/`mcp_tool_call_end`/`thread_goal_updated`/`web_search_end`/`context_compacted`/`turn_aborted`/`thread_settings_applied`/`error`/`agent_reasoning`/`thread_rolled_back`/`image_generation_end`）无 approval 类；根因＝本机 `approval_policy="never"`（config.toml + `turn_context` 每轮带此字段证实）——本机会话结构性不等人 | codex 日志推导 blocked 无本地场景 → 不承诺；working/idle 规则实证可用（`task_complete`、`function_call`/`function_call_output` 配对差分、`token_count` 高频心跳）；词汇表跨 0.121→0.147 十八版本稳定 | 残留：policy≠never 时审批是否落 rollout 未验证（价值低——托管 codex 有第一方桥），缓议；P1d codex deriver 的 working/idle 部分不再被本项阻塞 |
| E-03 | ~~zcode model-io 是否含 CLI 交互层事件~~ **已证伪定稿（2026-09-07）**：记录 `type` 仅 `model_io` 一种（跨 3 活跃会话抽样 + 461 行解析器佐证），每行＝一次完整模型请求/响应对（`startedAt`/`completedAt`/`request`/`response{finishReason,toolCalls,usage}`）；无任何 CLI 交互层记录类型；permission/dialog 关键词命中全部来自对话载荷（无关会话因系统提示词工具 schema 亦命中，佐证归因）；"等人"仅表现为记录间间接时间间隙，与长工具执行不可区分 | zcode 永久 L0+working/idle，不承诺 blocked | 已关闭。附带实证两则：① 会话文件中途轮转/消失（上下文压缩即换新文件）——E-06 处置必要性的活样本，tailer 的"文件消失→ended"与 offset 重置规则必须覆盖；② subagent 独立文件（`model-io-sess_subagent_agent_*` 前缀），tailer 需按前缀识别从属 |
| E-04 | Windows 下 daemon 周期增量读的共享冲突（agent 进程写 / daemon 读） | tailer 稳定性 | 实证；必要时读失败本轮跳过（fail-open R-02） |
| E-05 | blocked 通知的接收人集合 | 通知发错人 = 打扰 | 沿用会话 ctx（hub_session_id 参与者 / workspace 成员），brainstorm 定 |
| E-06 | 日志轮转 / 同 path 复用（新会话覆盖旧文件名） | 状态串台 | size 变小 → offset 重置 + 证据标记；session_id 变化 → 视为新会话。**E-03 附带实证（2026-09-07）**：zcode 会话文件会在会话存活期间因上下文压缩被替换为新文件——"文件消失"非罕见路径，`文件不存在→ended` 与重扫兜底为必须项 |
| E-07 | blocked 的自动化处置边界（自动批准权限提示 = 代人做安全决策） | 越权风险 | P1e 默认只升级不自动批（D-010）；自动批若做，需 workspace 级开关 + 审计留痕，单独评估 |
| E-08 | ~~协议模式 worker 的 stdout 事件流能否直接推导状态；chat 型会话与各 harness 的管线覆盖面~~ **代码级核实 + 覆盖面现场核验完成（2026-09-07）**：第一方权限管线＝canUseTool → `PERMISSION_REQUEST` → 待审 + 5min timer；scan 型 claude（canUseTool+onUserDialog）/ codex（sessionPermission，"两桥等价"）真阻塞等人；chat 型写校验+直接放行、批量 worker `control_request` 自动批准、pi extension_ui_request 自动 cancel——**托管会话不存在管线外的等人**；zcode 非托管（不在 interactive 3 / 批量 12 provider 名单，`providers.ts` + `adapters/index.ts` 实读） | D-012 成立且覆盖比草案初版预期更宽（含 codex 双桥）；日志推导 blocked 收敛为裸 CLI（唯一候选 E-01） | 已关闭；结论已回写 §3.2 规则表 / §4.1 / D-012 |

## 10. 参考

- Herdr：<https://herdr.dev/> · <https://github.com/herdrdev/herdr>（状态感知目标与 `agent wait` 编排参照系）
- 既有链路：`src/agent-session-log.js`（登记）、`docs/platform-agent-log-protocol.md`（协议，§3 布局规则为自发现与探测共用）、daemon `src/agent-log/registry.ts` + `parse-zcode-model-io.ts`（解析层与注册表模式）、daemon `src/daemon.ts`（`_startInteractiveSession` spawn 托管事实）+ `src/interactive/types.ts`（`PersistedSessionRecord` / sessions.json）、daemon `src/protocol.ts` + `src/hub-client.ts`（第一方权限事件管线，D-012）、backend `app/modules/platform_sync/`（落库）、`app/modules/notification/`（通知）、`src/dispatch/backends/sillyhub-mcp.js`（终态轮询 + kill lease，P1e 改写对象）
