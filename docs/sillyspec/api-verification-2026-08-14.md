# SillyHub 全接口验证报告（2026-08-14）

> updated_at: 2026-08-14
> author: qinyi
> 性质：一次性全量实测快照 + 当日修复记录。改源码 / 新增接口后请重测并更新，或标记本报告过期。
> 配套文档：`platform-interface-map.md`（接口操作地图，本文的接口清单来源）、`sillyhub-progress-sync-contract.md`（同步协议契约）。

## 0. 结论

**全部接口实测可用**：MCP 12 tool（成功 + 错误路径）、REST 平台同步 8 端点（含当日新实现的 2 个）、CLI 平台命令全链路（含 resolve 参数修复）。当日共修复 4 处缺陷（详见 §4）。

验证环境：本机 Docker 栈（backend :8001，镜像含当日全部修复），CLI sillyspec 3.26.6（含 client.js session 修复 + resolve 参数修复），token：MCP `shmcp_`（真实用户签发）/ 同步 `shpsync_`（workspace-scoped）。

## 1. MCP 12 tool（链路 B，直连 `/mcp/`，streamable HTTP 2025-11-25）

握手前提：先 `initialize` 拿 `Mcp-Session-Id`（header 或 body `_meta.sessionId`），后续请求带 header，`clientInfo` 必含 `name` + `version`——三任一缺失见 §4 修复②。

| tool | 结果 | 说明 |
|---|---|---|
| create_mission（external）| ✅ | status=planning，main_run=null，workers=[]（路径A 形态） |
| create_mission（team）| ✅ | 建 orchestrator 主 run + daemon lease |
| list_workers | ✅ | external 空 / team 返 orchestrator |
| dispatch_worker | ✅ | worker 建成功（read_only 测试任务；lease_id=null 时 daemon 未接管，属离线场景非错误） |
| get_worker_result | ✅ | 返 status+artifacts；fake worker → `worker run not found`（404 语义正确） |
| report_progress | ✅ | 真实写 AgentRunLog；fake run → `run not found in mission` |
| get_run_logs | ✅ | 返 content_redacted（脱敏），含 channel/tool_kind |
| converge_mission | ✅ | external mission → `orchestrator run not found`（external 无主 run，语义正确；SillySpec 侧本就不调它，D-004） |
| list_agent_profiles | ✅ | 返 workspace 可见 profiles（须真实用户签发的 token，见 §4 修复①） |
| get_change_stage | ✅ | 返 current_stage/stages/pending_review；跨 workspace / 假 uuid → `Change not found` |
| advance_change_stage | ✅ | 状态机守卫正确：源阶段未完成拒推进（缺完成度数据）；非法 target 拒绝 |
| submit_stage_review | ✅ | bogus stage → `unsupported review stage`；状态不符 → `期望 pending_review=xx 实际=None` |
| run_verify_gate | ✅ | 三态语义正确（gate_result/gate_cmd/unavailable）；无真实 spec 的 change 走 gate_cmd 返 exit_code=2 + 解析错误（不伪造 verdict） |

## 2. REST 平台同步（链路 A，`shpsync_` token，`require_platform_sync`）

| 端点 | 结果 | 说明 |
|---|---|---|
| GET `/api/health` | ✅ | db/redis ok |
| GET `/api/changes` | ✅ | 轻量列表（占位行被守卫过滤，见 §4 修复④附带语义） |
| POST `/api/changes/{name}/progress` | ✅ | 六表 JSON upsert；base_ts 乐观锁 409 冲突检测实测有效 |
| GET `/api/changes/{name}/progress` | ✅ | 拉回 + CLI `pull` import 重建本地库实测通 |
| POST `/api/changes/{name}/documents` | ✅ **当日新实现** | 四件套**裸**扁平 map（顶层即文件名，非 `{documents:...}` 包装）；键限白名单、空 map/值非 str → 422 |
| GET `/api/changes/{name}/approval` | ✅ | 读库三态：无记录/占位行 → 默认 `approved` 放行（兼容 ql-20260812-001-6eb8）；有记录 → 真实 status+reason |
| POST `/api/changes/{name}/approval` | ✅ **当日新实现** | body `{decision: "approved"\|"rejected"（过去式）, reason?}`（approved 分支不带 reason 键）；`decided_by` = 权威 `User.username`；重复提交后写赢 |
| POST `/api/workspaces/resolve-by-root-path` | ⚠️ 预期行为 | 需 **user 级** token（`shk_live_`/JWT），`shpsync_` 401——connect 换发专用，非缺陷 |

## 3. CLI 命令全链路（生产 :8001 实测）

| 命令 | 结果 |
|---|---|
| `sillyspec dispatch probe` | ✅ SillyHub 可用（MCP 探测走 session 握手） |
| `sillyspec platform status` / `sync` / `pull` | ✅ |
| `sillyspec platform sync-docs --change <name>` | ✅ 已同步 4 文档 |
| `sillyspec platform approve / reject <name> [--reason]` | ✅ 200 + GET 回读 rejected（reject 后 CLI execute 启动会被真正阻断，`run/command.js:1113-1129` 门控生效） |
| `sillyspec platform resolve <name> --keep-local` | ✅（§4 修复③后 flag-first / `--change` 写法均正确解析） |

## 4. 当日修复记录（4 处）

1. **配置**：`local.yaml` `mcp.url` 必须为**平台根**（不带 `/mcp`，client 自己拼 `/mcp/`，写全成 `/mcp/mcp/` → 404）；McpToken 须**真实用户**签发（creator user 决定 dispatch actor，system 签发报 `MCP token has no creator user`）。
2. **client.js MCP 握手**（sillyspec 仓，commit `3755a46` 含）：此前无 `initialize`/session、initialize 后不消费 body、`clientInfo` 缺 `version`，三层叠加致 CLI 探测必失败——修复后惰性 `_ensureSession` + 读 body + 带 version。
3. **`platform resolve` 参数解析**（sillyspec 仓工作区，2026-08-14）：旧实现盲取 `platformArgs[0]` 当变更名，flag 放前面时把 `--keep-local` 当变更名报"无 sync-conflict 文件"。修为三层：`--change <name>` → 第一个非 flag 参数 → 唯一未决冲突自动选中。
4. **后端两契约端点**（主仓 change `2026-08-14-platform-sync-docs-approval`，已归档）：补 `POST documents`（原 404）+ `POST approval`（原 405）+ GET approval 改读库完整闭环；`platform_change_progress` 加 documents/approval 两 JSON 列（migration `20260814220000`），三写入方定向列单写者互不覆盖，占位行守卫防 CLI pull 空态清本地库。

附带：backend `bootstrap_admin_and_seed_rbac` 查重改 email OR username 双键（ql-20260814-005-5e84，修同 username 不同 email 场景启动阻断）。

## 5. 已知边界（非缺陷）

- `dispatch_worker` 的 `lease_id=null`：daemon 未接管时 worker 停在 pending/running 不真跑——离线部署形态预期行为。
- CLI 侧 `_submitApproval` 的本地 approvals 表回写在 pull import 后执行，属 best-effort。
- MCP 业务 tool（create_mission/dispatch_worker 等）由 agent 调用（CLI 只做探测），见接口地图 §3「关键边界」。
- 409 冲突文件 `.runtime/sync-conflict-<change>.json` 由 CLI 写，`resolve` 消费——修复③后三选一均可用。
