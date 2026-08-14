---
author: qinyi
created_at: 2026-08-10T23:10:00+08:00
updated_at: 2026-08-11T21:30:00+08:00
related_change:
  - 2026-08-10-platform-progress-sync (sillyspec 仓：客户端侧 push/pull/冲突已落地)
  - sillyhub 后端独立 change（待排期：GET 端点 + 聚合存储 + base_ts 冲突检测）
  - 2026-08-11-change-progress-projection (sillyhub 仓：§14 workspace 隔离——token 派生 + 签发端点 + connect 换发)
status: client-landed-backend-pending
---

# SillyHub 进度同步跨仓契约（SillySpec 客户端 ↔ sillyhub 后端）

> **本文档是「进度同步层」契约**（HTTP REST `/api/changes/.../progress` push/pull，源码 `src/sync.js`）。
> 与 [`sillyhub-path-a-contract.md`](./sillyhub-path-a-contract.md)「任务派发层」（MCP `dispatch_worker` / `create_mission` 路径A，源码 `src/sillyhub-mcp/`）是**两个不同子系统，互不影响**（design D-004 铁律：进度同步不碰派发层）。两份契约可各自独立实现。

> **状态（2026-08-10）：客户端侧已落地，后端待 sillyhub 独立 change。** SillySpec 仓 change `2026-08-10-platform-progress-sync`（已 archive）实现了客户端全链路：`serializeForSync()`/`import()` 六表序列化 + `pull()`/`pullList()` 两级下行 + push 409/pull 脏度双向冲突检测 + `platform resolve` 三选一 + 元字段走 HTTP header（D-015）。本文档声明 sillyhub 后端待实现的端点与算法（design D-014：拆独立 change，不阻塞 SillySpec 侧）。客户端契约固化于 `src/sync.js`，mock server 测试见 `test/platform-sync-conflict.test.mjs`（task-12，33 断言）+ `test/sync-conflict-statemachine.test.mjs`（task-15，38 断言）。

## 0. 背景（一句话）

SillySpec 各用户本地各有进度库 `sillyspec.db`（node:sqlite WAL，gitignored，互不可见），通过 HTTP 把进度序列化成 JSON 投影上行到 sillyhub 聚合、下行 import 重建。**同步对象是进度状态 JSON，不是代码、不是 .db 文件**。sillyhub 是权威聚合点。sillyhub 后端未就绪时客户端 Best Effort 降级保本地可用（不阻断 CLI）。

## 1. 端点总览

| 方法 | 路径 | 状态 | 用途 |
|---|---|---|---|
| `GET` | `/api/health` | ✅ 已有（不动） | connect 连接验证 |
| `POST` | `/api/changes/{name}/progress` | ⚠️ **现有端点需增强**（加 base_ts 冲突检测 + 读 header） | 上行：progress JSON + 元字段 header |
| `GET` | `/api/changes` | ❌ **新增** | 轻量 change 列表（pull 第一级） |
| `GET` | `/api/changes/{name}/progress` | ❌ **新增** | 单 change 完整 JSON（pull 第二级） |
| `POST` | `/api/changes/{name}/documents` | ✅ 已有（不动） | 四件套文档同步 |
| `GET` / `POST` | `/api/changes/{name}/approval` | ✅ 已有（不动） | 审批查询/提交 |

**sillyhub 要做的三件事**：① POST 增强（读 header + 409 冲突检测）② GET 列表 ③ GET 单 change progress。

## 2. 认证

所有端点：`Authorization: Bearer <token>`（token 来自客户端 `.sillyspec/local.yaml` 的 `platform.token`）。

## 3. 数据模型：progress JSON 投影（POST body / GET 返回体）

客户端 `ProgressManager.serializeForSync()` 输出的**裸六表 JSON**（非 `read()` 聚合视图）。结构：

```json
{
  "project": { /* 项目级元数据 */ },
  "changes": [
    {
      "name": "2026-08-10-xxx",
      "current_stage": "execute",
      "status": "in_progress",
      "last_active": "2026-08-10T14:00:00.000Z",
      "last_synced_platform_ts": "2026-08-10T13:00:00.000Z",
      "last_local_modified_ts": "2026-08-10T14:30:00.000Z"
    }
  ],
  "stages":        [ /* 该 change 各 stage 行 */ ],
  "steps":         [ /* 该 change 各 step 行 */ ],
  "batch_progress":[ /* 批量进度行 */ ],
  "approvals":     [ /* 审批行 */ ]
}
```

> **注意**：`changes` 行**只含流程进度列**，**不含** `isolation_*` / `platform_change_id` / `workspace_id` / `sync_enabled` / `created_at`（本地强相关列，不跨用户同步，design B2）。sillyhub 存储时按裸 JSON 存即可，无需理解六表内部结构。

## 4. `POST /api/changes/{name}/progress`（上行 + 冲突检测）⭐核心

### 4.1 请求

```http
POST /api/changes/{name}/progress HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json
X-SillySpec-User: zhangsan                       # 推送者身份（未配置 user 时客户端【不设】此 header）
X-SillySpec-Base-Ts: 2026-08-10T13:00:00.000Z    # base_ts 乐观锁；首次同步/无基准时【整条 header 缺失】
X-SillySpec-Pushed-At: 2026-08-10T14:30:00.000Z  # 推送时刻（客户端时钟）

<serializeForSync 裸六表 JSON 作为 body>
```

**关键（D-015）**：三个元字段走 **HTTP header**，body 保持裸 JSON。这是为了**零回归**——sillyhub 老版不读 header 也能正常解析 body，新版读 header 启用冲突检测。

### 4.2 base_ts 冲突检测算法（sillyhub 必须实现）

平台每 change 需持久化三项：`latest_progress`（最新 JSON）+ `last_pushed_at`（上次接受的 Pushed-At）+ `last_pusher`（上次 User）。POST 处理逻辑：

```
baseTs   = header['X-SillySpec-Base-Ts']    # 可能为 null/缺失
pushedAt = header['X-SillySpec-Pushed-At']
user     = header['X-SillySpec-User']

if baseTs 为空 or 缺失:
    # 首次同步 / 客户端无基准 → 无条件接受
    存 latest_progress = body
    存 last_pushed_at  = pushedAt
    存 last_pusher     = user
    return 200

stored = 该 change 已存的 last_pushed_at
if stored 存在 AND stored > baseTs:    # 字符串字典序比较（ISO 8601 UTC，见 §7）
    # base_ts 过期：别的用户在我之后推过 → 冲突
    return 409 { conflict:true, platform_progress: latest_progress, last_pushed_at: stored }

# base_ts 有效 → 接受
存 latest_progress = body
存 last_pushed_at  = pushedAt
存 last_pusher     = user
return 200
```

### 4.3 成功响应（200）

任意 2xx 即可，body 客户端不读（可空）。客户端据此更新本地 `platform_last_sync`。

### 4.4 冲突响应（409）⭐

```json
{
  "conflict": true,
  "platform_progress": { /* 平台当前 latest_progress（裸六表） */ },
  "last_pushed_at": "2026-08-10T13:45:00.000Z"
}
```

> 客户端 `fetchJsonWithStatus` 读 `res.body.platform_progress`（fallback 到裸 body）+ `res.body.last_pushed_at`，写入本地冲突文件供 `platform resolve` 三选一。**`platform_progress` 必须是完整的 serializeForSync 六表 JSON**，否则 `resolve --take-platform` 无法 import。

## 5. `GET /api/changes`（轻量列表）

```http
GET /api/changes
Authorization: Bearer <token>
```

**响应**（客户端兼容两种形态，二选一即可）：

```json
// 形态 A：裸数组
[
  { "name": "2026-08-10-xxx", "current_stage": "execute", "last_pushed_at": "...", "last_pusher": "zhangsan" }
]

// 形态 B：包裹
{ "changes": [ { ...同上 } ] }
```

**字段**：`name`（必需）、`current_stage`、`last_pushed_at`、`last_pusher`。客户端 `collectStatus` 用 `last_pushed_at`（fallback `last_active`）比对本地 `last_synced_platform_ts` 判"落后"。每项也允许是裸 string（仅 name，但不推荐）。

> **用途**：pull 第一级，控制性能——不拉全量 JSON 就能知道哪些 change 落后，再按需 GET 单 change。

## 6. `GET /api/changes/{name}/progress`（完整 JSON）

```http
GET /api/changes/{name}/progress
Authorization: Bearer <token>
```

**响应**（客户端兼容两种形态）：

```json
// 形态 A：裸六表 + 顶层 last_pushed_at
{
  "project": {...}, "changes": [...], "stages": [...], "steps": [...],
  "batch_progress": [...], "approvals": [...],
  "last_pushed_at": "2026-08-10T13:45:00.000Z"
}

// 形态 B：包裹
{ "progress": { /* 裸六表 */ }, "last_pushed_at": "..." }
```

> **用途**：pull 第二级，客户端拿到后 `import()` 重建本地 DB 行。`last_pushed_at` 用于本地脏度冲突检测（pull 路径）。

## 7. 时间戳比对规则（必须对齐）

- **格式**：ISO 8601 UTC，如 `2026-08-10T14:30:00.000Z`（客户端 `new Date().toISOString()`）。
- **比对**：**字符串字典序比较**（客户端 `>` 运算符）。ISO 8601 UTC 字典序 == 时间序，sillyhub 后端比对 `last_pushed_at > base_ts` 必须用相同语义（不要转 Date 对象再比，时区/精度差异会误判）。

## 8. 向后兼容（零回归硬要求）

| 场景 | 要求 |
|---|---|
| sillyhub 老版（不读 header） | POST body 是裸 JSON，老版继续按原逻辑存，不崩 |
| 客户端老版（不发 header） | sillyhub 新版读不到 header → base_ts 视为空 → 接受（等同首次同步），不误判冲突 |
| GET 端点不存在（sillyhub 未升级） | 客户端 `pull` 收到 404/超时 → `fetchJson` 返回 null → `console.warn` 降级，**本地继续运行不阻断** |
| 首次同步 | `X-SillySpec-Base-Ts` header **缺失**（不是空字符串）→ 平台必须当"无基准"接受 |

## 9. 不做的事（sillyhub 侧克制清单，design §3）

- ❌ **不做字段级 auto-merge**（D-002）：冲突就是冲突，返回 409 让客户端 human-in-loop，绝不尝试合并 JSON 字段。
- ❌ 不做实时推送（WebSocket/SSE）。
- ❌ 不做分布式锁。
- ❌ 不连客户端的 SQLite（不换 libsql/rqlite/LiteFS）。
- ❌ 不碰 mission 派发层（`create_mission` / `dispatch_worker` / `converge_mission` 铁律 D-004，属 path-a 契约范畴）。

## 10. 客户端容错行为（sillyhub 必须知道）

客户端是 **Best Effort**：所有网络失败 / 非 2xx（除 POST 409 特殊处理）/ 超时（10s）/ 非 JSON 响应 → `console.warn` 不抛、不阻断 CLI。所以 sillyhub 即使暂时没实现，SillySpec 也不会崩——但**多用户同步功能不工作**。

显式用户动作（`approve`/`reject`）例外：失败会 `console.error` + `process.exitCode=1`（但那是审批端点，本清单不涉及）。

## 11. 实现优先级建议

| 优先级 | 端点 | 理由 |
|---|---|---|
| **P0** | POST 409 冲突检测（§4.2） | 多用户冲突检测核心，否则 last-writer-wins 丢更新 |
| **P0** | GET /api/changes/{name}/progress（§6） | pull 第二级，import 重建必需 |
| **P1** | GET /api/changes 轻量列表（§5） | pull 第一级性能优化；没有它客户端 `platform pull` 无 `--change` 时无法批量发现落后，但带 `--change` 的单 change pull 仍可用 |
| **P2** | 聚合存储落盘灾备（design §5 提到"JSON 落盘文本灾备/审计"） | 非功能必需，DB 损坏时可恢复 |

## 12. 验证方法

客户端已有 mock server 集成测试（`test/platform-sync-conflict.test.mjs` task-12、`test/sync-conflict-statemachine.test.mjs` task-15，共 71 断言覆盖 push 409 / pull 脏 / resolve 三向状态机）。sillyhub 实现后，把这些测试的 mock 换成真实 sillyhub 端点即可联调——mock server 的响应形态就是上面 §4.4 / §5 / §6 的契约。

## 13. 校验清单（sillyhub 侧落地后）

- [ ] POST `/api/changes/{name}/progress` 读 `X-SillySpec-User` / `X-SillySpec-Base-Ts` / `X-SillySpec-Pushed-At` 三个 header
- [ ] base_ts 冲突检测算法（§4.2）：缺 header / baseTs 空 → 接受；`stored > baseTs` → 409
- [ ] 409 响应体含 `{conflict:true, platform_progress:<完整六表>, last_pushed_at}`，`platform_progress` 可被 `resolve --take-platform` 直接 import
- [ ] GET `/api/changes` 返回轻量列表（裸数组 or `{changes:[...]}`），每项含 `name`/`current_stage`/`last_pushed_at`/`last_pusher`
- [ ] GET `/api/changes/{name}/progress` 返回完整六表 + 顶层 `last_pushed_at`（裸 or `{progress:{...}}` 包裹）
- [ ] 时间戳比对用 ISO 8601 UTC 字符串字典序（§7）
- [ ] 老 body（裸 JSON 无 header）继续可解析（零回归）
- [ ] 不实现字段级 auto-merge（§9）

## 14. workspace 隔离（2026-08-11-change-progress-projection）

> 本章为后续追加，编号接续 §13。**§3 serializeForSync 六表 body 结构不变**（workspace
> 不进 body），隔离走 workspace-scoped token 派生。§1–§13 内容零删改。

### 14.1 workspace 归属 = workspace-scoped token 派生（D-001@v1）

收件箱按 workspace 隔离同名 change，归属**只**由 workspace-scoped 同步 token 派生
（前缀 `shpsync_`，参照 McpToken `shmcp_` 模式）：工具上行 `Authorization: Bearer shpsync_...`
→ 后端按 `token_hash`（sha256）查 `platform_sync_tokens` 表 → 派生
`(user=created_by, workspace_id=token 绑定工作区)`。workspace_id **不进** serializeForSync
body（§3 六表保持），也不从 body/header 取（唯一通道是 token 派生）。

`platform_change_progress` 加 `workspace_id` 列 + 复合唯一约束
`(workspace_id, change_name)`：同一 workspace 内 change_name 唯一，不同 workspace 各占
一行，多 workspace 同名 change 不串值。`workspace_id` nullable——`shk_live_` 过渡期
（connect 换发铺开前）上行的行 workspace_id=NULL，投影 join 不命中走 fallback（§14.4）。

### 14.2 两新签发端点（sillyhub 侧）

```
# workspace 成员签发同步 token（明文仅 201 一次返回）
POST /api/workspaces/{workspace_id}/platform-sync-tokens
  鉴权: require_permission(WORKSPACE_WRITE)（owner/developer 可签，viewer → 403）
  body: { name: str }
  → 201 { id, workspace_id, key_prefix, token: "shpsync_...", name, created_at }
  # 库存 sha256(token)，明文不入库不入日志（R-06）；created_by=调用者

# connect 换发（带 workspace 权限校验，D-006@v1 安全闭环）
POST /api/workspaces/resolve-by-root-path
  鉴权: Bearer shk_live_ (ApiKeyService) 或 JWT（不接受 shpsync_——换发是 user 级操作）
  body: { root_path: str }   # connect 的 cwd，与平台 Workspace.root_path 绑定值等值匹配
  流程: ① _find_active_by_root_path 反查活跃 workspace → 反查不到 404
        ② 手动 has_permission(WORKSPACE_WRITE)（非 require_permission——workspace_id 是
          body 反查出来的，不在路径）→ 无权限 403
        ③ 签发 shpsync_ token（created_by=调用者, workspace_id=反查到的 wid）
  → 200 { workspace_id, token: "shpsync_..." }
```

### 14.3 connect 换发（sillyspec 客户端侧，task-09）

`sillyspec platform connect <url> <user级 token>` 扩展：健康检查通过后，用传入 token
作 Bearer + 本地 `root_path`（= connect 的 cwd）调 `resolve-by-root-path` 换发
`shpsync_` token，成功则用 `replaceTopLevelSection` 文本级写入 local.yaml `platform` 段
（覆盖原 user 级 token，保留注释/其他段/CRLF 字节级）。换发失败（404 root_path 未绑 /
403 无 WORKSPACE_WRITE / 断网）**降级沿用原 token 继续**，不阻断 connect（best-effort）。

mcp 段同源假设坑（connect 把 `shk_live_` 复用进 mcp 段，但真 McpToken 是 `shmcp_` 前缀）
不在本章范围，留单独 change（NG-4）。

### 14.4 收件箱 3 端点鉴权升级（§4/§5/§6 端点，签名不变）

`require_platform_sync` 返回 `(User, workspace_id|None)` 三路分流：
- `shpsync_` → PlatformSyncTokenService.authenticate 派生 `(created_by 用户, 绑定 workspace_id)`
- `shk_live_` → ApiKeyService 返 `(user, None)`（过渡期 R-02，workspace_id=None）
- JWT → `get_current_user` 返 `(user, None)`

3 端点（POST/GET progress、GET changes）从鉴权取 workspace_id 透传 service，service 按
workspace_id 过滤（`None` 用 `is_(None)`，等价旧版全局聚合）。端点 URL / 请求 / 响应形态
**不变**，仅作用域按 workspace 收窄。

### 14.5 变更中心实时投影（read-only，仅 current_stage）

变更中心 `GET /api/workspaces/{wid}/changes` 的 `ChangeService.enrich_summaries` /
`enrich_with_workspace_ids` 实时 read-only join `platform_change_progress`，取工具上行
权威 `current_stage` 覆盖 `changes` 表的文件扫描猜值（join 不命中 fallback 现有值，D-003）。
**不投 status**（sillyspec status 仅 active/archived，archived 由 current_stage==archive 派生，
D-004@v2）。不写 changes 表（D-002 read-only）。list 用批量 IN join（禁 N+1，R-03）。
