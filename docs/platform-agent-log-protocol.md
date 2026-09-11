# 平台 Agent 日志上报协议（agent-session-log）

> updated_at: 2026-09-12
> 范围：SillySpec CLI 探测「本地 agent 的完整会话日志」并**主动 REST 上报**到 SillyHub 平台（与进度上报同风格），平台落库后在会话视图展示；日志内容解析由平台/daemon 按路径读本地文件完成。源码 `src/agent-session-log.js`，测试 `test/agent-session-log.test.mjs`。
> 配套文档：[`sillyspec/platform-interface-map.md`](./sillyspec/platform-interface-map.md)（链路总览）、[`platform-scan-protocol.md`](./platform-scan-protocol.md)。

## 0. 背景与目标

平台模式（SillyHub daemon 调本地 agent，agent 跑 SillySpec CLI）下，平台会话只能看到 **CLI 内部阶段信息**（daemon 自有链路回传的阶段状态），看不到 agent 的实际执行过程——完整模型 I/O、工具调用、思考与输出都在各 agent CLI 的**本地会话日志**里（Codex rollout / Claude Code transcript / ZCode model-io）。

本协议让平台会话能展示这些日志：**CLI 只上报日志的本地绝对路径 + 解析所需元信息（推送式，不发日志内容）**；平台/daemon 与日志同机，按路径读文件、按 `format` 解析、在会话视图展示。

```
平台会话 ──派发──> daemon ──spawn──> 本地 agent CLI ──调用──> sillyspec run <stage>
                                                              │ ① 探测 agent 环境
                                                              │ ② 写本地产物留底
                                                              ▼ ③ 主动上报（REST POST）
                        平台 SillyHub <──── POST /api/agent-logs（路径 + 元信息）
                              │ 落库 → 会话视图展示
                              └─ 按需：daemon 按 log_path 读本地日志 → 按 format 解析 → 渲染内容
```

## 1. 上报契约（主通道）：`POST /api/agent-logs`

```http
POST {platform.url}/api/agent-logs HTTP/1.1
Authorization: Bearer <token>            # shpsync_（workspace-scoped，服务端从 token 派生 workspace 归属）
Content-Type: application/json

{
  "schema_version": 1,
  "pushed_at": "2026-08-23T00:53:22.020Z",
  "agent_cwd": "C:/Users/qinyi/IdeaProjects/sillyspec",
  "workspace_id": "ws-xxx",              # CLI 侧拿到的 --workspace-id（缺省 null；权威归属以 token 派生为准）
  "scan_run_id": "scan-xxx",             # CLI 侧拿到的 --scan-run-id（缺省 null）
  "hub_session_id": "9f0c...",           # 可选，body 级：run 所属平台会话 id（daemon 注入 env SILLYHUB_SESSION_ID；非空才带，见下方「会话化上下文」）
  "entries": [
    {
      "harness": "codex",
      "log_path": "C:/Users/qinyi/.codex/sessions/2026/08/22/rollout-2026-08-22T02-32-08-<uuid>.jsonl",
      "format": "codex-rollout-jsonl",
      "detected_via": "codex-session-meta-cwd",
      "agent_cwd": "C:/Users/qinyi/sillyhub_workspaces",
      "session_id": "<uuid>",
      "originator": "sillyhub-daemon",
      "change_key": "2026-09-11-agent-log-attribution-refactor",  # 可选，entry 级：本 run 写入 own 条目的 --change 值（随 entry 持久化；双向互斥，见「会话化上下文」）
      "quick_id": null,                                            # 可选，entry 级：quick 会话 id（quick-<8hex> 原样；与 change_key 双向互斥）
      "exists": true,
      "size_bytes": 123456,
      "mtime_ms": 1787446398096.99,
      "first_seen_at": "2026-08-23T00:50:00.000Z",
      "last_seen_at": "2026-08-23T00:53:22.020Z",
      "invocations": 3,
      "last_command": "scan --done"
    }
  ]
}
```

- **触发时机与推送范围**：agent 调 `sillyspec run <stage>`（含顶层别名）入口，探测到 agent 环境且本 run **own 集合非空**（会话身份锚定成功，见 §3「会话身份锚定」）才上报；探测不到 / own 解析失败（锚定识别失败宁缺毋滥）不发。**`entries` 只含 own 条目**——本 run 所属 agent 会话的日志（锚定主会话 + zcode parent_id 子代理链）；同 cwd 活跃窗口内其他窗口 / 其他 agent 的日志只进本地留底（§2 仍全量），不进任何上报（hub 会话不再把共享留底里别人的条目整批挂走）。每次调用都推（`invocations`/`last_seen_at` 递增即活跃心跳），服务端按 `(workspace, log_path)` upsert 去重即可。
- **认证与 workspace 隔离**：与进度同步端点同规则——`shpsync_` token 服务端派生 `(user, workspace_id)`，**不信任 body 里的 workspace_id**（仅作参考展示）。
- **响应**：任意 2xx 即成功；body 客户端不读。
- **best-effort**：无配置静默跳过；网络失败 / 非 2xx / 超时（5s）→ `console.warn` 一行，**绝不阻断 run 主流程**（本地产物已留底，见 §2）。
- **上报配置来源**（优先级）：env `SILLYHUB_PLATFORM_URL` + `SILLYHUB_PLATFORM_TOKEN`（两键齐全才生效——daemon 注入通道，平台模式 specRoot 无 local.yaml platform 段时靠它）> `local.yaml` platform 段（url + token，与链路 A 进度同步同源）。
- **不受平台模式 sentinel 限制**：链路 A 的上行进度同步自 2026-08-26 起在平台模式也照常发（`triggerSync` 门禁移除，凭据同走 env 通道）；此前被跳过时的理由是 daemon 有自有（拉模式）链路。agent 日志则从始至终没有 daemon 链路，**本上报就是它的主通道**，平台模式照常发。
- **关闭开关**：env `SILLYSPEC_AGENT_LOG_PUSH=0`。

### 会话化上下文（2026-08-23 引入，2026-09-11-agent-log-attribution-refactor 改写，协议纯可选增量）

上报携带两级会话化上下文，供平台做「agent 日志 ↔ 平台会话」关联与聚合（`schema_version` 保持 1，所有字段可选，旧 CLI/旧留底产物不带时服务端按缺省处理，完全向后兼容）：

- **entry 级 ctx（`change_key` / `quick_id`）——只写 own 条目 + 双向互斥**：CLI 上报调用发生在 changeName/quickSessionId 解析之后，ctx **只随本 run own 条目（会话身份锚定命中，见 §3）写入**（本地产物与上报 payload 一致）：
  - quick run：写 `quick_id`（`quick-<8hex>` 完整原样）并**清空 `change_key`**；
  - change run：写 `change_key`（`--change` 值）并**清空 `quick_id`**（双向互斥——单向清会留镜像键，change 日志漏进旧 quick 会话）；
  - 两键皆空的 run（如 status 类命令）：**keep-prev**——own 条目保留既有 ctx 不动；
  - 非 own 条目（同 cwd 其他窗口/其他 agent 的日志）：ctx / 计数 / `last_command` 一律不写，只在留底保留探测事实（size/mtime）；未被触及的存量 entry 保留原 ctx 不追新——变更 B 的 run 不会把变更 A 检出的 entry 改挂到变更 B 名下。
- **body 级 `hub_session_id`（非空才带）**：run 所属平台会话 id。唯一确定性注入通道是 daemon：平台会话 claim 后 spawn agent 子进程时注入 env **`SILLYHUB_SESSION_ID`**（create 与 restore/reload 两条路径的 env 重建都注入；非平台会话派发不含该键），CLI 读该 env 带进 body。服务端校验该会话属于 token 派生 workspace 后，把本批（own）entries 全部挂到该会话（对话流内展示）并登记「hub 会话 ↔ ctx」绑定；未命中/跨 workspace 静默降级（entries 仍入库，best-effort）。
- **平台端归属解析（ctx-owner，无 `hub_session_id` 时）**：按 **`ctx = quick_id or change_key or ''`（quick 优先）** 分组解析归属；同 ctx 跨 harness 挂接（同一变更的 zcode/claude-code/codex 日志挂同一会话，不做 harness 拦截）：
  - 空 ctx 组：维持单桶（`{harness}|` 聚合键 + harness 标题）；
  - 非空 ctx 组两级 find：**第一级 links**——`quick_id` 走 quicklog 会话链接表、`change_key` 走 changes × 变更会话链接表（均 JOIN agent_sessions 取 `last_active_at` 最新，候选天然含平台派发会话与自动会话）；**第二级聚合键兜底**——links 未命中时按 `agent_sessions.aggregation_key = '{ctx}'` 取最新；命中任一级 → 组内 entries 挂该 owner 并刷 `last_active_at`（不改 status，生命周期契约不变）；
  - 两级均未命中 → find-or-create `origin=tool_report` 自动会话（`aggregation_key="{ctx}"`、`title="本地 · {quick 短码或变更名}"`）。
  - 实现见主仓（multi-agent-platform）变更 `2026-08-23-agent-activity-sessions`（引入）与 `2026-09-11-agent-log-attribution-refactor`（ctx-owner 改写）。
- ctx 值均为**标识类**（变更目录名 / quick 会话 id / 平台会话 id），不含 flag 值（协议 §7 克制口径不变）。

### 平台端（sillyhub 仓）要做的

1. 新增端点 `POST /api/agent-logs`：鉴权与 `/api/changes/{name}/progress` 一致（`shpsync_`/`shk_live_`/JWT 分流），落库表建议以 `(workspace_id, log_path)` 为唯一键 upsert，整行存 entries 元信息。
2. 会话/变更视图加「本地 agent 日志」面板：按 `entries`（`last_seen_at` 新→旧）列出 harness / session_id / originator / 大小；`originator="sillyhub-daemon"` + `session_id` 可与 daemon 自己的派发记录对齐，`workspace_id`/`scan_run_id` 辅助归属。
3. 内容展示（可选增强）：日志在本机，daemon 按路径读文件增量 tail（记住上次 offset，用 `size_bytes` 判增量；`mtime_ms` 停滞超 15min = 会话结束），按 `format` 走 §4 解析分支渲染。

## 2. 本地产物（留底/兜底）：`agent-session-log.json`

上报之外，CLI 同步把同一份内容写进本地（上报失败时是唯一记录；也是 `sillyspec agent-log` 查询源）：

| 模式 | 产物路径 |
|---|---|
| 平台模式（daemon 传 `--runtime-root`） | `<runtimeRoot>/agent-session-log.json` |
| 平台模式（仅 `--spec-root`） | `<specRoot>/.runtime/agent-session-log.json` |
| 本地模式 | `<cwd>/.sillyspec/.runtime/agent-session-log.json` |

结构与上报 body 相同（多一层 `generated_at`）。文件锁 + 原子写，多会话并发 run 不互相覆盖；entries 按 `last_seen_at` 新→旧，上限 10 条（超出淘汰最旧）。**留底记全部探测条目**（含非 own——同 cwd 其他窗口的活跃会话，`sillyspec agent-log` 本地可见性不变），但 ctx（`change_key`/`quick_id` 双向互斥语义同 §1）、`invocations`/`last_command` 只写 own 条目，非 own 条目只刷探测事实（exists/size/mtime）；**未被本次 run 触及的存量 entry 保留原 ctx 不追新**，旧版本产物（无 ctx 字段）合并读取完全兼容（缺省按 null）。

## 3. 探测规则（按 harness，全部本机实证）

探测优先级：**env 覆盖 > harness 自动探测**；只登记「活跃窗口」（mtime 距今 ≤15min）内被写过的日志文件，窗口外旧会话一律不登（防平台解析到错误日志）。

探测器分两档（防误报）：
- **precise**（cwd/env 精确归属）：恒参与；
- **loose**（无归属线索）：**仅在 precise 全落空时启用**——防「Cursor IDE 在别的项目聊天 / 其他项目 opencode 会话活跃」被误报进当前登记；同时**不参与会话身份锚定**（own 恒空——不打标、不推送，仅本地留底，见下方「会话身份锚定」）。

| harness | 档位/门控 | 日志布局（实证来源） | cwd 归属判定 |
|---|---|---|---|
| **claude-code** | precise；env `CLAUDECODE=1` / `CLAUDE_CODE_ENTRYPOINT` | `$CLAUDE_CONFIG_DIR｜~/.claude` + `/projects/<slug>/<sessionId>.jsonl`；slug = 绝对路径所有非字母数字字符替换为 `-`（如 `C--Users-qinyi-IdeaProjects-sillyspec`） | slug 目录精确对应 cwd；`CLAUDE_SESSION_ID` 存在时精确匹配该文件 |
| **codex** | precise；无可靠子进程 env 标记，恒扫 | `$CODEX_HOME｜~/.codex` + `/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl`（只扫今天/昨天两个日期目录） | 读首行 `session_meta.cwd` 与 CLI cwd **精确等值**（Windows 大小写/分隔符归一后比较），防并发其他项目串台；同时带出 `originator` |
| **zcode** | precise；env `ZCODE_*`（ZCODE_APP_VERSION/ZCODE_ENV/ZCODE_RUNTIME_ENV 任一） | `~/.zcode/cli/rollout/model-io-sess_<id>.jsonl`（subagent 文件名带 `sess_subagent_agent_` 前缀） | rollout 目录**全局共享**（所有 ZCode 窗口/项目混居），env 门控只证明驱动方是 ZCode、证明不了文件归属。读首块系统提示词工作目录标记与 CLI cwd **精确等值**（Windows 大小写/分隔符归一后比较）：主会话 `Primary working directory:` / subagent `<env>` 块 `Working directory:` 两形态均实证；标记读不出 **fail-closed 不登**（错登比漏登危害大，`SILLYSPEC_AGENT_LOG` 是兜底通道） |
| **pi**（@earendil-works/pi-coding-agent） | precise；无需 env 标记 | `~/.pi/agent/sessions/<safePath>/session.jsonl`；safePath = `--<去首斜杠、[/\\:]→'-' >--`（包源码 migrations.js 实证：`C:\...\multi-agent-platform` → `--C--Users-...-platform--`） | 目录名即 cwd 编码，天然精确归属 |
| **deepseek-dsh**（@deepseek-ai/dsh） | precise；无需 env 标记 | `~/.dsh/sessions/<safePath>/session-<uuid>/session.jsonl.zstd`（**zstd 压缩** jsonl）；safePath 同 pi 构但 `:` 是删除非替换（目录名 + storages/session_projcache.json 的 cwd 字段交叉实证） | 目录名即 cwd 编码，天然精确归属；session_id = 目录名剥 `session-` 前缀 |
| **cursor**（IDE / cursor-agent CLI） | loose | `~/.cursor/chats/<workspaceHash>/<chatUuid>/{meta.json, store.db}`（sqlite，WAL 侧车活跃即算） | 无 cwd 映射（hash 算法未知）无 env 标记 → 仅活跃窗口 + loose 档 |
| **opencode**（opencode-ai v1.17+） | loose | `$XDG_DATA_HOME｜~/.local/share` + `/opencode/storage/session/` 下 JSON 树（`info/<id>.json` 元信息 + `message/` + `part/` 全量；二进制字符串实证布局，log_path 指向 session/ 根） | 读活跃窗口内 `info/*.json` 做 cwd 文本包含匹配（原分隔符/正斜杠/JSON 转义三形态） |
| **其他 CLI** | — | 不猜布局 | daemon/用户用 env `SILLYSPEC_AGENT_LOG=<日志绝对路径>` 显式指定（相对路径忽略）；这是所有未内置 harness 的统一兜底通道 |

CLI 的 cwd 纠正前后两个候选都会参与探测（agent 在子目录启动时，claude-code 的 transcript 挂子目录 slug 下）。

### 会话身份锚定（own 集合，2026-09-11-agent-log-attribution-refactor，D-001/D-008）

探测之上叠 own 集合解析（`resolveOwnLogPaths`）：锚定「本 run 所属 agent 会话」的日志文件（锚定主会话 + 子代理）。**ctx 打标与平台推送只作用于 own 条目**；own 命中的文件**豁免**单 harness 探测上限与 cwd 等值过滤——被裁剪/过滤挤出的 own 文件（主场景：directory=worktree 的 zcode 子代理）定向补收进探测结果（`detected_via` 为锚定通道值）。锚定识别失败**宁缺毋滥**：不打标、不推送，绝不用 cwd 猜测兜底打标。

| harness | own 锚定规则 | 子代理 | 锚定失败回退链 |
|---|---|---|---|
| **env 覆盖** | `SILLYSPEC_AGENT_LOG` 指定文件恒视为 own（显式指定 = 调用方负责正确性） | — | — |
| **claude-code** | env `CLAUDE_SESSION_ID` → `<claudeRoot>/projects/<slug(cwd)>/<sessionId>.jsonl` 精确（cwd 候选逐个试，文件存在才认）；与探测同 env 门控（`CLAUDECODE`/`CLAUDE_CODE_ENTRYPOINT`，不在 claude 会话内不认领） | 无子代理概念 | env 缺席/未命中 → project 目录（slug 直算）窗口内最新 mtime jsonl |
| **zcode** | node:sqlite 只读（`file:...?mode=ro`）开 `~/.zcode/cli/db/db.sqlite`：`session` 表 `directory==cwd AND parent_id IS NULL` 按 `time_updated` 最新主会话（directory 实测存 Windows 反斜杠原样，等值比较按大小写/分隔符归一口径） | `parent_id == 主会话 id` 的全部行，**不比 directory**（worktree TaskCard 子代理 directory=worktree ≠ 仓库根也收录）；文件名映射 `model-io-sess_<id 去 sess_ 前缀>.jsonl`，rollout 已清理的行跳过（缺一个不少链） | node:sqlite 不可用 / 库缺失 / 查询异常 / 无该 cwd 主会话行 → rollout 目录窗口内主文件（排除 subagent 文件名前缀）按 mtime 新→旧逐个过工作目录标记 cwd 校验（标记读不出 fail-closed 跳过），首个匹配为 own；**回退链子代理不打标**（无 db 身份证据，宁缺毋滥）；全不匹配 → own 空 |
| **codex** | rollout 首行 `session_meta.cwd` 匹配的最新主文件（与探测同口径，只取一条） | 无 | — |
| **pi / deepseek-dsh** | safePath 目录直算（目录名即 cwd 编码，天然锚定） | 无 | — |
| **cursor / opencode**（loose） | **不锚定**（无归属线索）——own 恒空：不打标、不推送，仅本地留底探测 | — | — |

## 4. 日志格式解析指南（平台侧）

三种内置 format 的行结构（增量 tail：记住上次读到的 byte offset，按 `size_bytes` 差量续读）：

### `claude-code-jsonl`

每行一个 JSON 对象，会话完整记录：

- `{"type":"user","message":{"role":"user","content":[...]},"timestamp":"...","sessionId":"...","cwd":"...","version":"..."}`
- `{"type":"assistant","message":{"role":"assistant","content":[{"type":"text"|"tool_use",...}]},"timestamp":"..."}`
- 辅助行：`type` ∈ `system` / `summary` / `progress` 等；平台展示关注 `user`（用户/工具结果输入）与 `assistant`（模型输出 + 工具调用）两类。

### `codex-rollout-jsonl`

- **首行**：`{"timestamp":"...","type":"session_meta","payload":{"session_id","cwd","originator","cli_version","source",...}}`
- 后续行：`{"timestamp":"...","type":"response_item","payload":{...}}`（模型/工具交互）与 `{"type":"event_msg","payload":{...}}`（agent 事件流）、`{"type":"turn_context","payload":{...}}`（轮次上下文）。

### `zcode-model-io-jsonl`

每行一次完整模型请求记录（含 subagent 会话）：

- `{"requestId","attempt","model":{"modelId","providerId"},"request":{"body":{"messages":[...],"system":[...]}},...,"completedAt","durationMs"}`
- 请求体 `body.messages` 与响应即全部模型 I/O；平台展示按行渲染即可，无需跨行拼接。

### `jsonl` / `unknown`

env 覆盖但无法识别来源：按行流式展示原始内容，不做结构化解析。

### `pi-session-jsonl`

pi（@earendil-works/pi-coding-agent）每行一个事件对象（消息/工具调用/结果），与 claude-code transcript 同族的行式 JSON，按行渲染即可。

### `dsh-session-jsonl-zstd`

DeepSeek dsh 的 `session.jsonl.zstd`：**zstd 压缩**的行式 JSON。daemon 解压后按行渲染（Node 侧可用 `zlib` zstd 支持 / `fzstd`，Python 侧 `standard zstd`）。增量 tail 时注意压缩流边界——建议整文件解压后按行处理，或只做全量导出展示。

### `cursor-chat-sqlite`

cursor 会话目录（log_path 指向目录）：`meta.json`（schemaVersion/createdAtMs）+ `store.db`（sqlite，含完整对话）。daemon 用 sqlite 只读打开（注意 WAL 模式需同目录读 `-wal` 侧车），消息表结构以实际 schema 为准做适配渲染。

### `opencode-session-json-tree`

opencode 会话内容分散在 `storage/session/` 三棵子树（log_path 指向该根）：`info/<sessionID>.json`（元信息，含 directory=cwd）、`message/`（消息）、`part/`（消息分片/工具调用）。daemon 按 sessionID 关联三棵树拼装完整会话。

## 5. 扩展新 harness

`src/agent-session-log.js` 的 `HARNESS_DETECTORS` 注册表加一个探测器对象（门控 + 布局扫描 + cwd 判定），并在本文 §3/§4 补布局与格式说明即可；探测不到任何 harness 时 env 覆盖通道始终可用。

## 6. 查询与调试

```bash
sillyspec agent-log                # 读本地产物展示（人类可读）
sillyspec agent-log --json        # 产物 JSON（机器消费，stdout 纯 JSON）
sillyspec agent-log --detect      # 现场探测（不落盘不上报；排查「为什么没探测到」）
SILLYSPEC_DEBUG_AGENT_LOG=1 ...   # 探测/上报/own 锚定与回退的 debug 日志（锚定回退原因/非绝对路径/未配置跳过等）
SILLYSPEC_AGENT_LOG_PUSH=0 ...    # 关闭上报（只留底）
```

## 7. 安全与克制

- 上报只含**路径与元信息**，不含日志内容；日志读取与解析在本机完成。
- 全程 best-effort：探测不到不发不写；任何失败只 warn 一行，绝不阻断 run 主流程。
- `last_command` 只记 flag 名不记 flag 值（`--output` 等 flag 值是 agent 工作文本，不进产物/上报）。
