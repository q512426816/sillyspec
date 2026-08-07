---
schema_version: 1
doc_type: module-card
module_id: sillyhub-mcp
author: qinyi
created_at: 2026-08-07T14:50:00+08:00
---
# sillyhub-mcp

## 定位

SillyHub MCP streamable HTTP 客户端。封装与 SillyHub daemon 的 MCP tool 调用（mission/worker 生命周期），供 `src/dispatch/probe.js`（探测连通性）消费。**best-effort**：网络失败/非2xx/异常一律降级返回，绝不抛穿到 execute（仿 `src/sync.js` 风格）。

非必须依赖（D-005）：未配置 `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN` 时所有方法降级（probeDaemon 返回 false 不发网络），dispatch 全程走 Local，零回归。

## 契约摘要

- **src/sillyhub-mcp/client.js** — `export class SillyHubMcpClient`，构造 `new SillyHubMcpClient({url?, token?, timeoutMs?}={})`（缺省读 env，timeoutMs 默认 10000）。
  - `async probeDaemon(): Promise<boolean>` — 调 `list_agent_profiles` 验连通 + token。未配置/异常/非2xx → false（不抛）。
  - `async createMission({objective, changeId, budgetUsd?}): Promise<{missionId}>` — 调 `create_mission`。未配置/失败 → `{missionId:null}`。
  - `async dispatchWorker({missionId, objective, worktreePath?, branch?, readOnly?, model?, agentProfileId?, workerPrompt?}): Promise<{workerId, status}>` — 调 `dispatch_worker`（路径A 入参含 worktree_path/branch/worker_prompt）。未配置/失败 → `{workerId:null, status:'unavailable'}`。
  - `async listWorkers(missionId): Promise<Array>` — 调 `list_workers`。未配置/失败 → `[]`。
  - `async killLease(workerId): Promise<{killed, reason?}>` — 超时 fallback 防双写（UB-6）。路径A stub：best-effort 调 `report_progress` 带 kill 标记，**保守 `killed=false`**（无专用 kill tool），reason 标明路径A 未落地。

## 关键逻辑

```
SillyHubMcpClient
  构造：url/token 读 env（缺任一 → _configured=false，所有方法降级不发网络）；endpoint = `${url}/mcp/`（尾斜杠必需）
  _callTool(toolName, args, {quiet})
    → _configured? 否：返回 null（不发网络）
    → fetch POST endpoint, JSON-RPC 2.0 tools/call, Bearer token, AbortController 超时
    → 响应：application/json 直接 parse / text/event-stream 取 data: 行拼装（_parseSseResponse，id 匹配）
    → rpc.error / 非2xx / 异常 → 返回 null（best-effort，quiet 抑制 warn）
  _parseToolReturnValue(result) → result.content[0].text 再 JSON.parse（MCP tool 结果惯例）
  对外方法均 _configured 门控 + _callTool + _parseToolReturnValue，返回结构化降级值
```

probeSillyHub（dispatch/probe.js）消费 `probeDaemon`：env 缺 → no-config（同步）；env 齐 → probeDaemon 验连通 → false 缓存 daemon-unreachable。

## 注意事项

- **配置**：env `SILLYHUB_MCP_URL` / `SILLYHUB_MCP_TOKEN`（缺任一 → 未配置）。端点 `/mcp/` 尾斜杠必需（MCP streamable HTTP 协议 2025-11-25）。
- **`converge_mission` 不封装不调用**（D-004）：SillySpec 自己 apply worktree，不用 SillyHub converge。
- **`worktree_path` 仅作 dispatchWorker 入参**，不持久化为 DB 新列（SillySpec 侧无 DB schema 变更）。
- **killLease 路径A stub**：SillyHub 当前 8 tool 无显式 kill，保守 `killed=false` + reason；待跨仓路径A 落地专用 kill tool 后升级。详见 `docs/sillyspec/sillyhub-path-a-contract.md`。
- **仅用 Node 原生 fetch**（engine>=18），不引入新依赖。
- 字段 snake/camel 双取（`mission_id`/`missionId` 等）：design 未给 SillyHub tool 响应精确 schema，双兜底；schema 定型后可收紧。

## 变更索引

- 2026-08-07-sillyhub-mcp-dispatch | 新建 SillyHubMcpClient（MCP streamable HTTP best-effort，5 方法）。被 dispatch/probe.js 消费 probeDaemon。无配置降级零回归。

## 人工备注
<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES_END -->
