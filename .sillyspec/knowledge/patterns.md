---
author: qinyi
created_at: 2026-06-23 02:00:00
---

# 可复用模式 (Patterns)

## Monorepo 三服务架构

```
frontend (Next.js, 浏览器)
    │  REST / SSE / WebSocket
    ▼
backend (FastAPI)  ◄──── HTTP/WS ────►  sillyhub-daemon (Node, 本地守护进程)
    │                                          │
    ▼                                          ▼
PostgreSQL + Redis                    本地 Claude 进程 (Claude Agent SDK)
```

- **backend**：中心 API 服务，持久化（PG）、消息（Redis Pub/Sub）、对外 REST/SSE/WS
- **sillyhub-daemon**：运行在用户本机，受 backend 调度管理本地 Claude 进程的生命周期（lease/heartbeat/complete），通过 HTTP/WS 与 backend 通信
- **frontend**：纯消费 backend API 的 Web 界面
- 部署：`deploy/docker-compose.yml` 编排三服务（dev 用 `docker-compose.dev.yml`）

## Backend 模块组织

backend 源码分两层（`backend/app/`）：
- `app/core/` — 基础设施：config / database / redis / security / auth / logging / telemetry / errors / audit / paths
- `app/modules/<domain>/` — 业务模块，每个模块内含 `router.py`（FastAPI APIRouter）+ service + model

FastAPI app 在 `app/main.py` 创建，所有 router 以 `prefix="/api"` 挂载（workspace / members / auth / health / qc 等）。

## 子项目间通信

- frontend → backend：REST（`/api/*`）+ SSE（流式日志）+ WebSocket
- backend → daemon：HTTP（下发任务）+ WS（lease 心跳、消息回传）
- daemon → 本地 Claude：Claude Agent SDK（spawn 子进程 + stdio）

## AgentRun + DaemonTaskLease 编排流程

交互式/任务式 agent 执行的统一编排链路：

```
backend 创建 AgentRun（持久化运行记录）
   │  + DaemonTaskLease（领租约：daemon 认领任务、心跳续约、complete 回收）
   ▼
daemon 收到 lease → claude-agent-sdk 的 SessionManager.create()/执行
   │  （interactive session 支持多轮 + persistence/recovery）
   ▼
daemon 执行输出经 adapters/ 协议解析 → WebSocket / hub-client 回传 backend
   │  backend 写 AgentRunLog（三层日志：daemon/backend/前端）
   ▼
backend 标记 AgentRun 完成 / daemon 释放 Lease
```

- backend 是编排中枢（建 run + lease、收消息、写日志），daemon 是执行体（SDK 调 Claude）。
- 改 agent 执行链路（新增 provider、改 lease 心跳、改日志回传）时沿此链路定位各环节，别只改一端。
- 与「三服务架构」互补：前者讲静态拓扑，本条讲运行时编排时序。

## daemon adapters/ 多协议抽象（stream-json / json-rpc / jsonl / ndjson / text）

`sillyhub-daemon/src/adapters/` 用统一 `ProtocolAdapter` 接口抽象 5 种 CLI 进程输出协议：`stream-json`（Claude/Codex 主用）、`json-rpc`、`jsonl`、`ndjson`、`text`（纯文本兜底）。
- 每个 provider 对应一种协议，`ProtocolAdapter` 把字节流解析成统一消息事件喂给上层。
- 新增 agent provider（如新 CLI）：在 `agent-detector.ts` 注册检测 + 在 adapters/ 复用或新增对应协议 adapter，别在调用方散写解析。
- 协议解析与上层编排（AgentRun/Lease）解耦，是 daemon 处理多 provider 输出的扩展点。

## 平台文件中心：对象存储抽象（StorageBackend + factory + MinioBackend）

`backend/app/modules/storage/` 是平台文件中心的存储底座（无 router、无表），把「对象存到哪 / 怎么存 / 怎么读」抽象成一套可替换后端，业务侧（`file` 模块）只依赖接口。新增存储后端（OSS 等非 MinIO）或改文件中心存储链路时沿此抽象走，别在业务代码散写 S3 调用。

- **抽象基类 `StorageBackend`**（`storage/base.py`）定义五个能力：`put_object(key, data, content_type)`、`get_object_stream(key)`（异步迭代器、按块流式、声明为非 `async def` 以兼容异步生成器与 mock 迭代器两种实现）、`delete_object(key)`、`head_object(key) -> ObjectStat(size, content_type)`、`aclose()`。`key` 由上层 `file` 模块生成（格式 `YYYY/MM/{uuid}{.ext}`），storage 层只把它当不透明存储键透传，不假设文件命名 / 业务语义。
- **工厂选后端 `factory.py`**：`init_storage_backend(settings)` 在应用 lifespan startup 调一次，按 `settings.storage_backend` 建实现并缓存为模块级单例（重复调用幂等返回）；`_build(settings)` 是分发器，目前仅 `minio` 分支，**新增 OSS 等后端在此加分支**；`get_storage_backend()` 是 FastAPI Depends 注入点（单例未初始化时按当前 `get_settings()` 兜底建一个，避免 None）。
- **MinIO 实现 `MinioStorage`**（`minio_backend.py`）：基于 **aiobotocore**（S3 兼容异步客户端，对齐 asyncpg/httpx 异步栈），模块级 session 复用、每次 IO 经 `_client()` 上下文管理器创临时 client；首个 `put_object` 前 `_ensure_bucket()` 自动建 bucket（`create_bucket` 失败一律吞掉做幂等，`_bucket_ready` 标志位只执行一次）；流式下载用 `resp["Body"].iter_chunks(1MB)`。
- **测试不碰真实 MinIO**：`file` 模块单测经 `app.dependency_overrides[get_storage_backend]` 注入 `MockStorage`（内存实现 StorageBackend）。新增存储相关测试走同一注入路径，禁止直连真实 MinIO。
- **新增后端清单**：实现 `StorageBackend` 五方法 + 在 `_build` 注册分支 + 对齐 `aclose` / 流式读语义（尤其 OSS 等非完全 S3 兼容实现），业务代码零改动。

**file 模块使用 storage 的一致性顺序约束**（改 `file` 服务或新增同类「DB 元数据 + 外部对象」模块必守）：
- 软删：**先 commit DB 软删标记，再删对象本体**（反序 commit 失败会留下指向已删对象的 active File，下载 404 损坏功能——宁可留孤儿对象不可损坏下载）。删对象失败仅记日志、仍标软删防重复。
- 上传：`storage.put_object` 写对象 → DB commit；commit 失败时 **best-effort 补偿删除已写对象**（失败仅记日志、不掩盖原异常），避免孤儿对象堆积。
- 下载：`Content-Disposition` 用 RFC 5987 `filename*` 承载中文原名 + ASCII `filename` 回退；仅 `image/jpeg|png|gif|webp` 白名单 `inline`，其余（含 svg/html）强制 `attachment`，配合上传白名单排除 `text/html`/`image/svg+xml` 防 XSS。

## 四轨鉴权 token 分轨：JWT / shk_live_ / shpsync_ / shmcp_

平台四条互不复用的鉴权轨，按 token 前缀分流，各有专属通道：

| 轨 | 前缀/形式 | 通道 | 用途 |
|---|---|---|---|
| JWT | Bearer | `/api/*` 浏览器会话 | 登录签发 + refresh 轮换 |
| API Key | `shk_live_`（X-API-Key header） | `/api/*` | daemon 与脚本长期凭证 |
| 同步 token | `shpsync_` | platform_sync 端点 | SillySpec CLI/daemon 进度与 spec 文件回传**唯一写通道**，绑 user+workspace |
| MCP token | `shmcp_` | `/mcp` 子应用（与 /api 鉴权物理隔离） | 第三方 MCP client，scope ∈ read/dispatch/converge |

- **写通道按前缀硬校验**：凭据有效但非 shpsync_ 打 platform_sync 写通道 → 403（无凭据才是 401）；mcp_gateway 只认 shmcp_。跨轨 token 不互认，别为图省事复用。
- workspace_id 从 shpsync_ token 派生（服务层不重复校验），改 platform_sync 端点时不要再手传/手校 workspace_id。
- shmcp_ 的 McpToken 必须由真实用户签发（绑 user）；给 daemon 配 local.yaml 的 mcp 段时用非用户签发的 token，派发时会报错。
- `core/auth_deps.get_current_principal` 只覆盖 JWT/APIKey 双路径，两条专用轨各自独立鉴权。新增服务间通道时按前缀建新轨并配独立鉴权依赖，勿挂在 get_current_principal 下加例外。
- 依据：`.sillyspec/docs/SillyHub/flows/auth.md`（2026-08-18 重扫）。

## platform_sync 两套乐观锁语义：base_ts 字典序与 base_version 整数版本

平台同步层有两套冲突检测协议，**别混用**：

- **进度上行（base_ts，platform_sync.upsert_progress，POST /changes/{name}/progress）**：CLI 带 last_pushed_at 基线上行，平台按 ISO 8601 UTC **字符串字典序**比对（不转 datetime，故该列存 String 而非 DateTime）。`stored > base_ts` 判冲突 → 返回平台侧 latest_progress，**不改任何数据**；base_ts 空/缺失 → 无条件接受（首次同步/无基准）。
- **spec 文件 ops（base_version，spec_workspace.apply_ops）**：整数版本比较；`version != base_version` 且 hash 不同 → 该 op 跳过 + conflict=True + 返回 server_versions。platform_sync 对文件 ops 只透传，冲突逻辑在 spec_workspace。

改任何同步冲突行为前先分清层：进度冲突在 platform_sync、文件冲突在 spec_workspace；两边失败语义也不同（进度=只读返回不写；文件=单 op 跳过其余照落）。依据：`.sillyspec/docs/SillyHub/glossary.md` 乐观锁词条、`.sillyspec/docs/backend/modules/platform_sync.md`。

## Spec 文件增量同步协议：manifest 比对 + FileOp 上行 + apply_ops 单写者

CLI/daemon 与平台之间的 spec 文件树同步是**服务器权威增量**（2026-08 起，替代旧「整树 tar 全量覆盖无冲突检测」），三步：

1. `GET /changes/-/spec-manifest`（Bearer shpsync_）拉服务器全量清单——per-file content_hash + version，**含 exists=False 软删行**（据此识别服务端已删文件并对齐下发 delete）。
2. daemon/CLI 本地扫描 spec 树与清单逐文件 hash diff，算 FileOp ops（add/update/delete/rename，各带 base_version）；hub 404（服务器无清单）→ 首推全量。
3. `POST /changes/-/spec-sync {ops[]}` 单事务全成全败，apply_spec_ops 落盘。

apply_ops（spec_workspace，SpecFileManifest **唯一写者**）关键语义，新增同步行为时勿破坏：

- 预校验全部 op 路径 containment + `.runtime` 排除 → 越界 422 **整体不落盘**。
- `local.yaml` 写 op 静默丢弃（服务器排除项，幂等重推无副作用；delete 放行清存量行）。
- base_version 过期且 hash 不同 → conflict（**HTTP 仍 200**，返 server_versions 交 daemon 侧人工拍板）；**同 hash 豁免**为 no-op，不误报冲突。
- delete = move 到 `spec-backups/{ws}/{ts}/{path}` + exists=False 软删（30 天机会式修剪），不物理删。
- 落盘后事务外 best-effort 触发 change reparse：有 change_dirs 标注 → scoped；含 archive 路径 → 全量；无标注扫 ops 内 changes/ 前缀兜底；零 changes 路径零触发。

依据：`.sillyspec/docs/SillyHub/flows/spec-incremental-sync.md`。

## Daemon 代写队列：占坑 commit + lease-polling claim + GC 回灌

backend 无可达文件系统（daemon-client 唯一模式）时，「远端写盘」任务（建变更目录 / 变更文档在线编辑 / spec 整树回灌）经独立表 `daemon_change_writes` 下发 daemon 代写——**与 DaemonTaskLease 的 agent-run 语义分离**，不启动 agent。三类生产者：change_writer.proxy_create_change、change._enqueue_edit_write、spec_workspace.sync-manual（kind=spec-sync）。

并发正确性关键约定（改此链路勿破坏）：

- **占坑行先 commit 再建 write 行**：Change + ChangeDocument 行先落库钉住双表唯一键，防与 reparse 并发撞键 500。回执是异步跨请求的，**占坑-回滚不能并进单事务**（失败回滚用独立 session，显式删 docs 兼容 SQLite FK 关闭）。
- daemon 侧 lease-polling：GET pending → claim（claim_token 轮转；PG `SELECT ... FOR UPDATE SKIP LOCKED`，SQLite 退化事务内状态校验）→ 宿主写盘（**幂等覆盖写**）→ complete 回执；期间 report progress 刷新 claimed_at，防活跃任务被超时回收。
- **GC 回灌不置 failed**：claimed 超时（create/edit 60s；spec-sync 600s 独立长窗）→ 回灌 pending 自动重 claim 重做（写幂等无死循环）；GC 在 pending 端点顺带触发，无后台调度。
- 生产者轮询回执（周期 ≤1s）：done → 直接返回；failed / 超时 → 回滚占坑行 + 抛 ChangeWriteError（结构化 code 供前端 toast）。

依据：`.sillyspec/docs/SillyHub/flows/daemon-change-write.md`。

## 单类巨石拆 facade+子包的 import 策略（避免 module-level 循环 / 跨域调用 / 测试 patch 跟随）

> 来源：2026-06-22-daemon-service-split（DaemonService 3324 行拆 runtime/lease/run_sync/session/patch 5 子包）。decisions.md D-005/D-006。

- **循环 import 坑**：facade 顶部模块级 `from .subpackage.service import SubService` + 子 service 顶部 `from .service import SomeError`（异常类暂留 facade）= 双向模块级循环，import 即 `ImportError`。
- **解法（D-005）**：facade `__init__` 内**函数级 lazy import** 子 service 类（repo://sillyhub/backend/app/modules/daemon/group/router.py:53 同款模式），子 service 顶层 import facade 异常类。依赖单向（子→facade），循环解除。
- **跨域调用（D-006）**：子 service 调未迁/跨域方法持 `self._facade` 引用——facade `__init__` 构造子 service 后注入 `self._x._facade = self`，方法体 `self._facade.cross_domain_method()`。`TYPE_CHECKING` import facade 类型避免运行时循环。全部子域迁完后 facade 保留委托，引用继续兼容，**不耦合 Wave 顺序**。
- **测试 patch 跟随**：模块级符号（如 `get_redis`）从 facade 迁子 service 后，测试 `patch("...daemon.service.get_redis")` 失效，patch 目标必须跟随到子包模块（`...daemon.run_sync.service.get_redis`）。源码 API 零变化，仅 patch 物理位置变。
- **grep 调用点范围**：迁移方法时 grep 调用点必须搜 `router.py` + 全 `backend/app/` + `tests/`，不能只搜当前文件——router 可能直接调 service 私有方法。
- **异常类最终归位**：收尾阶段把异常类从 facade 迁各子包定义 + facade re-export（显式列出禁 `import *`），此时 facade 可模块级 re-export 子包符号（子包不反向 import facade，单向无循环）。
- **通用**：任何"单类拆子包 + facade 兼容（签名不变/router 零改动）"的重构适用此 import 策略组合。

## Codex Interactive Session：provider-neutral driver 抽象

> 来源：2026-06-23-codex-interactive-session（D-001@v1 ~ D-010@v1）。把单一 provider 的 interactive session 控制层抽象成 provider-neutral driver 的实践。

- **Provider driver 抽象（D-001@v1, D-009@v1）**：把 SessionManager 从「只驱动单一 provider SDK」改为「按 provider 选 driver」。`SessionManagerDeps.drivers: Partial<Record<'claude' | 'codex', InteractiveDriver>>`，driver 契约 provider-neutral（`start`/`consume`/`interrupt`），driver 内部各自做 provider 协议 ↔ provider-neutral `UserTurnInput` 转换。session 生命周期层不依赖具体 SDK 类型；新增 provider 只加 driver，不触碰 SessionManager 控制面。
- **Codex app-server stdio JSON-RPC 长驻 driver（D-002@v1, D-004@v1）**：`codex app-server --listen stdio://` 作为长驻子进程，driver 内做 `initialize` → `notifications/initialized` → `thread/start` → 串行 `turn/start`；`thread/resume(threadId)` 支持 reopen/recovery；消息映射成 flat message 上报 backend。interactive 与 batch 是**两套审批策略隔离点**，别共用审批状态。
- **Fail-closed 审批策略（D-006@v1, D-008@v1）**：provider-neutral server request 默认走 `PermissionResolver`，backend send 失败/超时/session 已结束/driver 被 interrupt 时返回 deny/cancel，**绝不无条件自动 accept**。权限 deny 时返回**空 profile**（不扩权），而非按请求 granted。
- **MCP elicitation 复杂场景如实标注（D-008@v1, D-010@v1）**：可归一化成现有 `AskUserDialogCard` 的简单 form/url 才阻塞等待用户；不支持的复杂 schema fail-closed 并上报 error，**不写成「全面支持 MCP elicitation」**。
- **缺 thread id 的 Codex session 不能伪造（D-007@v1）**：ended/failed Codex session 若缺 threadId，应显示失败且**不伪造新 thread**（避免历史串线）。

## daemon allowed_roots 只管 list_dir RPC，不管 CC 执行 cwd

> 来源：2026-06-26-daemon-root-path-translation execute（design D-002 superseded）。

- daemon `assertWithinAllowedRoots`（`sillyhub-daemon/src/file-rpc.ts`）只被 `listDir` 调用（list_dir RPC），**不用于 CC 执行的 cwd/文件访问**。CC 的 cwd 由 `task-runner.ts` `prepareWorkspace` 分支0 `statSync(rootPath)` 决定，CC 访问文件走 OS 权限（独立进程）。
- 设计 daemon 侧"放行 CC 访问"类功能时，勿误以为 allowed_roots 管 CC 执行——它只管 daemon 自身的 list_dir RPC（前端浏览目录场景）。CC 能否在项目根执行 + 访问源码，取决于 backend 下发的 root_path 是否为 daemon 可 statSync 的宿主机路径。

## Claude Agent SDK task_* 生命周期系统消息可消费

SDK 0.3.181（捆 CLI 2.1.181+）运行时确实发射 `system/task_started`（task_id+tool_use_id+description+subagent_type）、`task_notification`（status:completed|failed|stopped + output_file，~64s 量级延迟）、`task_updated`（patch.status/end_time）与 `background_tasks_changed`；**task_progress 短任务零发射**（"正在做什么"展示需回退 transcript 推导）。消费点：session-manager `_onMessage` system 分支（2026-08-27-background-subagent-progress task-03），持久化方言 `[TASK_*]` stdout 单行 JSON 行带 parent_tool_use_id。（来源：同变更 task-01 spike 静态+动态双实证）

## 会话 token 两套口径：计费量（Σ 跨调用可加）vs 上下文量（瞬时，取最近一次调用）

- **语义勘误**：Anthropic 原生 stream 事件里 `cache_read/cache_creation_input_tokens` 是**本调用**的缓存前缀量（replace 取最新 = 最近一次调用的缓存读取），不是"会话级累计快照"（ql-20260710-001 旧注释误读；batch stream-json.ts 实为 :498-511 逐调用 `+=`，:552/1143-1148 引用有误）。
- **SDK result usage 聚合口径**（7 会话 28 轮 DB 实证，spike-r09.md）：`SDKResultSuccess.usage.input_tokens` = 该 query 内 Σ 逐调用 input；跨轮不累计（与 daemon 会话累计计数器是两个量）。
- **设计教训**：上下文窗口用量（CtxUsageRing 分子）必须是"最近一次调用的 input+cache_read+cache_creation"（`AgentRun.ctx_tokens`，last-write-wins、终态不覆盖）；各轮 input_tokens 求和会跨轮重复计历史（6 轮 394 万 vs 200K 窗口爆表）。实时/终态口径必须同类（本轮计费量），否则轮结束数字跳变。
- 关联变更：2026-08-27-session-token-usage-fix（D-001@v2/D-006）。

## daemon 本机集成验证：WS 鉴权只认 X-API-Key + USERPROFILE 隔离跑第二实例

- daemon 的 WS 升级鉴权（backend `_authenticate_ws_upgrade`）走 `X-API-Key`（或 shk_live_ 前缀 Bearer）；`--token`（JWT）只能过 REST，WS 会 403 `ws_upgrade_auth_rejected`——本机起 daemon↔backend 真实集成时必须 `--api-key`（key 经 POST /api/auth/api-keys 签发）。
- daemon 单实例守卫是全局 `~/.sillyhub/daemon/daemon.pid`（不分 server）；本机已有真实 daemon 时，集成验证进程用 `USERPROFILE=<临时目录>` 启动即可整树隔离（config/locks/pid 全落临时 HOME，Windows 上 os.homedir() 读 USERPROFILE），零副作用跑第二实例，验后删目录。
- 来源：2026-08-31-machine-sillyspec-version verify Runtime Evidence（task: verify 集成验证）

## aiosqlite 不支持 SELECT FOR UPDATE：并发唯一性守卫用部分唯一索引+IntegrityError 捕获

agent 模块测试跑 SQLite（aiosqlite），FOR UPDATE 语法不被支持（直接报错，不是静默忽略），需要并发防重的场景（如懒建 mission 防同 turn 双建）应：DB 层建部分唯一索引（WHERE 业务活跃条件）兜底 + 应用层捕获 IntegrityError 后 rollback 重查复用先到者。本仓先例：uq_agent_missions_session_active（20260822090000 迁移）+ mcp_tools 懒建守卫。来源：2026-08-22-team-session-unify task-05。

## MCP server 子进程不继承 claude.exe 完整环境：env 必须放 mcpServers[*].env

涉及 src/mcp-server.js。

claude.exe（2.1.x）spawn MCP server 子进程时 env 为「白名单基线（PATH/HOME 等 12 个）+ per-server env 覆盖合并」，不继承完整父环境。给 MCP server 注入自定义变量（如 MCP_SESSION_ID）必须放在 options.mcpServers['<server>'].env（daemon mcp-config.ts 的 server config env 字段），放 SDK 顶层 options.env 无效。证据链：repo://sillyhub/sillyhub-daemon/src/interactive/claude-sdk-driver.ts:407 透传 → sdk.d.ts 的 McpStdioServerConfig.env（SDK 类型声明在 node_modules 依赖包内，行号随包版本漂移不入锚）→ sdk.mjs --mcp-config 全量序列化 → claude.exe StdioClientTransport.start spawn env 合并。来源：2026-08-22-team-session-unify spike-01。

## 真实坏数据整卡转测试夹具：原样字节保留 + 行:列锁死断言；硬门禁暴露存量隐性坏数据时修数据不弱化断言

## 问题
①修复「解析器吞坏数据」类缺陷后，如何把 bug 钉死不回归——用构造的迷你样本测不出真实坏法的多样性；②给校验链路新增硬门禁后，存量隐性坏数据（旧门禁宽松漏过、新门禁整体解析后暴露）会浮出，容易诱发改测试断言或放宽门禁来「通过」。

## 模式
- 真实坏数据整卡拷贝为测试夹具（test/fixtures/ 下），不改一个字节——坏卡本身就是夹具，比手工构造的样本更真实；「修工具不修数据」，原仓坏卡归填写侧债务另修，不为本变更顺手改。
- 断言锁死精确坐标：error.line === 20/22/26、error.column 精确值，把行号换算、解析行为一起钉死（防 off-by-one 回归）。
- 新硬门禁暴露存量隐性坏夹具时：修夹具数据、不弱化断言、不放宽门禁。实证：test/plan-adopt-waves.test.mjs §4c 夹具 deps 原写了预引号，经 card() 模板再包引号成双重引号 = 真非法 YAML，旧门禁不整体解析漏过、0b 硬拦后暴露——去预引号修夹具（30/0 全绿），门禁与断言原样保留，该暴露恰是硬门禁的真实战果。

## 证据
- test/fixtures/taskcard-bad-yaml/task-01|02|03.md（三张原卡整卡拷贝）+ test/taskcard-frontmatter-hardgate.test.mjs:39（行:列锁死）
- test/plan-adopt-waves.test.mjs（§4c 夹具修复）
- 变更档案 changes/archive/2026-09-20-taskcard-yaml-hardgate/ 的 tasks/task-04.md（constraints：夹具保持原样字节）、verify-result.md 测试结果节与代码审查节；提交 3f854037

## 适用条件
解析器/门禁/容错类缺陷的回归测试设计；任何「加严校验后存量数据报警」的处置决策——默认修数据侧，校验与断言不动。

## 门禁类校验落点选聚合路径的单点入口，下游门禁保持纯语义——同一信号不双维度重复报

## 问题
给已含多个下游校验步骤的聚合门禁（如 plan postcheck：可行性、契约对账、acceptance 存在性等）新增「数据合法性」类校验（如 frontmatter 非法 YAML）时，若塞进某个下游门禁做预检，会：①同一坏信号被多个维度重复上报刷屏；②下游门禁语义被污染（契约对账门禁兼职报 YAML 语法错）；③拦截覆盖依赖各门禁各自的调用路径，可能漏。

## 模式
- 落点选聚合器中先运行的入口步骤单点拦截：本例放 validatePlanFeasibility 步骤 0b——因 runPlanPostcheck 聚合路径里 1b 可行性先于 1c 契约校验同 pass 运行，入口拦截即全链路覆盖，「空真过门」在聚合路径上不可能发生。同先例：重复键检测（D-004@v1）也终裁在 feasibility 入口单点拦截。
- 下游门禁保持纯语义：validateCrossTaskContracts 不加 YAML 预检，坏卡进对账循环时解析函数返回空集+显式 yamlError，不产生假阳性对账错误，阻断责任由入口独占。
- 双报豁免（配合既有惯例「双维度报同一漂移信号时后加维度须豁免」）：入口新校验遇到与既有入口校验同信号的 case 跳过——0b 遇 message 含 duplicated mapping key 且该卡 dupKeys 非空时跳过（既有重复键检测的键名+行号文案更精确，独占上报）；嵌套重复键（顶格正则够不到）仍由新校验兜底，豁免不豁免掉盲区。

## 证据
- src/stages/plan-postcheck.js:1303-1316（0b 硬校验+双报豁免）；:1741-1760（聚合器 1b/1c 顺序）
- test/taskcard-frontmatter-hardgate.test.mjs:104（顶层双报豁免）/ :136（嵌套重复键 0b 兜底）/ :237（契约门禁对坏卡零假阳性）
- 变更档案 changes/archive/2026-09-20-taskcard-yaml-hardgate/ 的 decisions.md D-001@v2（supersedes v1 的「契约门禁预检」落点）；提交 3f854037

## 适用条件
向多步骤聚合门禁新增数据合法性/格式校验时；前提是聚合器顺序保证入口步骤先于下游同 pass 运行，否则须先调序或承认多处拦截。
