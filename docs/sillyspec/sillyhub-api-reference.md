# SillyHub 平台接口参考（API Reference）

> updated_at: 2026-08-14
> author: qinyi
> 范围：SillySpec CLI / 外部调用方接入 SillyHub 平台的全部对外接口——**REST 进度同步 8 端点 + MCP 派发 12 tool**。数据源：`backend/openapi.json`（REST）+ MCP `tools/list` 实抓（MCP），与实现同源。
> 配套文档：`platform-interface-map.md`（哪个 CLI 步骤调哪个接口——触发地图）、`api-verification-2026-08-14.md`（实测验证报告）、`sillyhub-progress-sync-contract.md`（进度同步协议契约）。
> 改接口后必须：① `pnpm gen:types` ② 更新本文 ③ 重跑验证报告。

## 1. 基础约定

- **Base URL**：backend API 根（本机 `http://127.0.0.1:8001`，下文 `<bk>` 代指）。REST 端点带 `/api` 前缀；MCP 端点是 `<bk>/mcp/`（**尾斜杠必需**）。
- **认证**：全部接口走 `Authorization: Bearer <token>`，按 token 前缀分流：

| 前缀 | 类型 | 签发 | 用途 / 权限域 |
|---|---|---|---|
| `shpsync_` | workspace-scoped 同步 token | `POST /api/workspaces/{id}/platform-sync-tokens`（成员，明文仅返一次）或 init 下发 | REST 进度同步 8 端点；绑定单一 workspace（上行自动派生 workspace_id，跨 workspace 隔离） |
| `shk_live_` | user 级 API Key | 界面 settings/api-keys | REST 同步端点**过渡期兼容**（workspace_id=NULL 全局聚合）+ `resolve-by-root-path`（须 user 级） |
| JWT | 登录 access_token | `POST /api/auth/login` | REST 同步端点 fallback |
| `shmcp_` | workspace 级 McpToken | 界面「MCP 管理」或 `POST /api/workspaces/{id}/mcp-tokens`（scope：read/dispatch/converge 多选，明文仅返一次） | MCP 12 tool；**须真实用户签发**（creator user = dispatch actor，system 签发报 `MCP token has no creator user to act as the dispatch actor`） |

- **workspace 隔离**：`shpsync_`/`shmcp_` 的 workspace 由 token 派生（服务端反查，**绝不信任请求 body**）；跨 workspace 访问统一表现为 404。
- **通用错误**：401 token 无效；422 body 校验失败（FastAPI 标准格式 `{detail:[...]}`）；跨 workspace / 资源不存在 → 404。

## 2. REST 进度同步（链路 A）

CLI 侧封装在 `sync.js`（`SyncManager`），除 approve/reject 外 best-effort（失败 warn 不阻断）。

### 2.1 GET `<bk>/api/health`
健康检查（connect 时 ping）。200 返回 `{status:"ok", db:"ok", redis:"ok", version, commit_sha, server_time, environment}`。无需认证。

### 2.2 POST `<bk>/api/workspaces/resolve-by-root-path`
connect 换发：用 **user 级 token**（`shk_live_`/JWT）+ 本地项目根路径换 workspace-scoped token。
```json
// body
{"root_path": "C:/Users/you/project"}   // 宿主机绝对路径，Windows 用正斜杠
// 200
{"workspace_id": "<uuid>", "token": "shpsync_..."}   // 明文仅此一次
```
- 200 前置校验：root_path 能反查到活跃 workspace（查不到 404）；调用者对该 workspace 有 WORKSPACE_WRITE 权限（无 403）。
- `shpsync_` 打此端点 → 401（需 user 级）。

### 2.3 POST `<bk>/api/changes/{name}/progress`
推六表进度 JSON（`serializeForSync` 裸透传，schema 不强校验）。
```
Header: Authorization: Bearer shpsync_...
        X-SillySpec-User: <推送者，选填>
        X-SillySpec-Base-Ts: <本地记录的平台上次 pushed_at，乐观锁，首次不传>
        X-SillySpec-Pushed-At: <本次推送时间 ISO8601 UTC，选填>
Body:   {"project":{...}, "changes":[{name, current_stage, status, ...}],
         "stages":[], "steps":[], "batch_progress":[], "approvals":[]}
```
- **200** `{ok:true}`（接受，客户端更新本地 base_ts）。
- **409** 冲突（平台 `last_pushed_at` > Base-Ts 字典序）body `{conflict:true, platform_progress:<平台当前完整六表>, last_pushed_at}`——客户端写 `.runtime/sync-conflict-<name>.json`，走 resolve 三选一，**绝不 auto-merge**。

### 2.4 GET `<bk>/api/changes`
轻量 change 列表（CLI pullList 比对决定哪些要拉）。200 返回裸数组：
```json
[{"name":"2026-08-06-xxx", "current_stage":"plan", "last_pushed_at":"...", "last_pusher":"qinyi"}]
```
仅含已上推过进度的 change（documents/approval 占位行被守卫过滤）。

### 2.5 GET `<bk>/api/changes/{name}/progress`
拉单 change 完整六表 + 顶层 `last_pushed_at`。客户端 import 重建本地库。不存在 / 占位行 → 404（客户端 fetchJson→null 降级）。

### 2.6 POST `<bk>/api/changes/{name}/documents`
推四件套文档全文（CLI `platform sync-docs`）。**body 是裸扁平 map，顶层即文件名**：
```json
{"proposal.md": "# 全文...", "design.md": "...", "requirements.md": "...", "tasks.md": "..."}
// 200
{"synced": 4, "change_name": "2026-08-06-xxx"}
```
- 键限白名单 `{proposal.md, design.md, requirements.md, tasks.md}`；空 map / 白名单外键 / 值非 str → 422。
- 全量替换语义（整列覆盖）；行不存在则建占位行（不影响 GET progress 404 语义）。与 progress 推送互不覆盖（定向列单写者）。

### 2.7 GET `<bk>/api/changes/{name}/approval`
查审批状态（CLI execute 启动门控 `checkApproval`）。**三态语义**：
```json
// 无记录（行不存在 / approval 列 NULL / 仅 documents 占位行）→ 默认放行
{"status": "approved", "reason": "no approval record; default-approved"}
// 有审批记录
{"status": "rejected", "reason": "<拒绝原因>"}    // 或 {"status": "approved", "reason": null}
```
- CLI 侧：`rejected`/`pending` 阻断 execute（`run/command.js:1113-1129`），`approved` 放行。
- **不因无记录 404**（change 可能尚未上推 progress，404 会让 CLI 误判 pending 卡死）。

### 2.8 POST `<bk>/api/changes/{name}/approval`
提交审批决定（CLI `platform approve/reject`）。
```json
// body —— decision 过去式；approved 分支不带 reason 键
{"decision": "rejected", "reason": "设计有缺口"}
{"decision": "approved"}
// 200
{"status": "ok", "decision": "rejected", "change_name": "..."}
```
- 非法 decision（如 `"approve"` 现在时）→ 422。
- 落 `approval` 列 `{status, reason, decided_at, decided_by}`；`decided_by` 取 token 反查的**权威** `User.username`（不采信可伪造 header）。重复提交覆盖（后写赢）。
- 与 progress/documents 推送互不覆盖。

## 3. MCP 派发接口（链路 B，`<bk>/mcp/`）

### 3.1 协议与握手（streamable HTTP，2025-11-25）

1. **initialize**：
```json
POST <bk>/mcp/
{"jsonrpc":"2.0","id":1,"method":"initialize",
 "params":{"protocolVersion":"2025-11-25","capabilities":{},
           "clientInfo":{"name":"your-client","version":"1.0"}}}
```
Header：`Authorization: Bearer shmcp_...`、`Accept: application/json, text/event-stream`。
响应（SSE 或 JSON）：`result.serverInfo` + **session id**（优先响应 header `mcp-session-id`，缺失查 body `result._meta.sessionId`）。⚠️ `clientInfo` 必含 `name`+`version`（缺 version 直接 -32602）；**必须读完响应 body**（流未消费 session 不就绪，后续请求报 -32602）。
2. **后续请求**带 `Mcp-Session-Id: <id>` header，`tools/call` 调用：`{"jsonrpc":"2.0","id":N,"method":"tools/call","params":{"name":"<tool>","arguments":{...}}}`。
3. 业务错误在 `result.content[0].text`（JSON 字符串，`isError:true` 时为 `Error executing tool <name>: <原因>` 文案）；协议错误在顶层 `error`。

### 3.2 tool 清单（12 个）

参数格式 snake_case；未列出的可选参数不传即可。

| tool | scope | 必填参数 | 关键可选参数 | 返回 / 说明 |
|---|---|---|---|---|
| `list_agent_profiles` | read | — | — | `{profiles:[{id,name,description,provider,model,tools_summary}]}`，workspace 可见档案 |
| `create_mission` | dispatch | `objective` | `orchestration_mode`（`team` 默认：建主 orchestrator run；`external`：路径A 外部调度，无主 run）、`worker_preset`、`main_agent_config`、`budget_usd`、`change_id` | `{mission_id,status,main_run_id,workers}`；daemon 离线时 main_run 标 pending+error_code 不抛 |
| `dispatch_worker` | dispatch | `mission_id`, `objective` | `read_only`、`agent_profile_id`、`worktree_path`/`branch`/`worker_prompt`（路径A caller 自带 worktree）、`role`、`agent_type`、`model` | `{id,role,objective,status,agent_type,lease_id,error_code}`；治理门（取消/并发上限/预算）拒绝标 killed；`read_only` 物化 `--allowedTools Read,Glob,Grep` |
| `list_workers` | read | `mission_id` | — | `{mission_id,workers:[{id,role,status,objective,total_cost_usd}]}` |
| `get_worker_result` | read | `mission_id`, `worker_id` | — | `{worker_id,status,artifacts:[{kind,content_ref,id}]}`；worker 不属该 mission → 404 语义 |
| `report_progress` | dispatch | `mission_id`, `run_id`, `message` | `decision` | `{run_id,log_id}`——主 agent 决策日志（AgentRunLog channel=tool_call） |
| `get_run_logs` | read | `mission_id`, `worker_id` | `limit`（默认100）、`channel`（stdout/stderr/tool_call） | `{logs:[{timestamp,channel,tool_kind,content_redacted}]}`——内容已脱敏 |
| `converge_mission` | converge | `mission_id` | — | `{mission_id,status,converged,artifact_id,merged_branches,conflicts,attempt}`；冲突返 `status=conflict`+conflicts 待主 agent 解决后重入。⚠️ SillySpec 侧不调（D-004 自己 apply），第三方按需 |
| `get_change_stage` | read | `change_id` | — | `{change_id,current_stage,stages,pending_review}` 只读；跨 workspace 视同 not found |
| `advance_change_stage` | dispatch | `change_id`, `target_stage`（brainstorm/plan/execute/verify/archive） | `team_mode`、`worker_preset`、`main_agent_config`、`provider`、`model`、`agent_profile_id` | `{change,current_stage,agent_dispatch}`；源阶段未完成拒推进（状态机守卫） |
| `submit_stage_review` | dispatch | `change_id`, `stage`, `decision` | `comment` | stage∈proposal/plan/human_test/archive_confirm；decision 词表按 stage 路由（proposal: approve/revise/unclear；plan: approve/replan/back_to_propose/back_to_brainstorm；human_test: pass/bug/doc_mismatch）；通过则内部推进，打回则回退。返回 `{change,agent_dispatch}` |
| `run_verify_gate` | read | `change_id` | — | `{change_id,exit_code,errors,source,run_id}`，source∈gate_result（读已跑的库内结果）/gate_cmd（软调 `sillyspec gate verify`）/unavailable（前置解析失败）；**不改 change 状态**，结果交调用方决策 |

## 4. 调用示例

**REST 审批闭环**（shell）：
```bash
TOKEN="shpsync_..."
curl -X POST http://127.0.0.1:8001/api/changes/my-change/approval \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"decision":"rejected","reason":"设计有缺口"}'
curl http://127.0.0.1:8001/api/changes/my-change/approval -H "Authorization: Bearer $TOKEN"
# → {"status":"rejected","reason":"设计有缺口"}  → CLI execute 启动被阻断
```

**MCP 派发最小闭环**（python）：
```python
import json, urllib.request
URL, TOKEN = "http://127.0.0.1:8001/mcp/", "shmcp_..."
def rpc(method, params=None, sid=None, i=1):
    body = {"jsonrpc":"2.0","id":i,"method":method, **({"params":params} if params else {})}
    h = {"Content-Type":"application/json","Accept":"application/json, text/event-stream",
         "Authorization":f"Bearer {TOKEN}"}
    if sid: h["Mcp-Session-Id"] = sid
    resp = urllib.request.urlopen(urllib.request.Request(
        URL, data=json.dumps(body).encode(), headers=h, method="POST"), timeout=15)
    payload = resp.read().decode()          # 必须读完 body
    return payload, resp.headers.get("Mcp-Session-Id")
_, sid = rpc("initialize", {"protocolVersion":"2025-11-25","capabilities":{},
                            "clientInfo":{"name":"demo","version":"1.0"}})
p, _ = rpc("tools/call", {"name":"create_mission",
    "arguments":{"objective":"...","orchestration_mode":"external"}}, sid=sid, i=2)
```

## 5. 错误对照表

| 现象 | 含义 | 处置 |
|---|---|---|
| REST 401 `token_invalid` | token 无效/过期/吊销 | 重签；`shpsync_` 打 resolve-by-root-path 属预期 401（需 user 级） |
| REST 409 progress | base_ts 乐观锁冲突 | 读 body `platform_progress`，resolve 三选一，勿 auto-merge |
| REST 422 documents | 空 map / 白名单外键 / 值非 str | 按四件套白名单修 body |
| MCP 404（HTTP 层） | `/mcp/` 路径拼错（如写成 `/mcp/mcp/`） | url 用平台根，客户端拼 `/mcp/` |
| MCP -32600 Missing session ID | 未 initialize 或请求未带 `Mcp-Session-Id` | 先握手；session 过期重握手 |
| MCP -32602 Invalid request parameters | `clientInfo` 缺 `version` / initialize 流未读完 / tool 参数不合 schema | 补 version；读完 body；对照 §3.2 参数 |
| MCP `MCP token has no creator user...` | token 非 real user 签发 | 界面重签（creator user = dispatch actor） |
| MCP `Change '...' not found` / `worker run not found` | 跨 workspace / 资源不存在 | 检查 token workspace 归属与 id |
