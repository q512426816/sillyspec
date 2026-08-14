# SillySpec 平台接口操作地图

> updated_at: 2026-08-14（doc-ref-check 校验版：77 处 file:line 引用经 test/doc-ref-check.test.mjs 自动校验）
> 范围：SillySpec CLI 在使用过程中**操作 SillyHub 平台接口**的全部触发点 —— 哪个步骤会发请求、打哪个端点、做什么事。
> 数据源：本文由源码（`src/sync.js` / `src/sillyhub-mcp/` / `src/dispatch/` / `src/run/`）实证归纳。改源码后同步本文。
> 配套文档：`sillyhub-progress-sync-contract.md`（同步协议契约）、`sillyhub-path-a-contract.md`（派发路径A）、`file-lifecycle.md`（运行时文件）、`interface-contract.md`。

---

## 0. 总览：三条到平台的路

SillySpec 与 SillyHub 平台交互有**三条独立链路**，分别由两套配置驱动、在不同步骤触发：

| 链路 | 接口协议 | 配置段 | 触发场景 | 实现文件 |
|---|---|---|---|---|
| **A. REST 进度同步** | HTTP `/api/...` | `platform:` | 每步完成 / 阶段启动 / 审批 / 拉取 | `src/sync.js`（`SyncManager`） |
| **B. MCP 任务派发** | JSON-RPC `/mcp/` | `mcp:` | execute 派 worker | `src/sillyhub-mcp/client.js` + `src/dispatch/` |
| **C. scan 指针握手** | 文件 + 退出码 | 平台模式 opts | scan 阶段完成（平台模式） | `src/run/complete-handlers.js` |

**最高频是 A（进度同步）**；**B 是把活外包给平台 worker**；**C 不发请求**，靠落盘指针文件 + 非零退出码让 daemon 感知。

---

## 1. 配置层（两套 URL/token 源）

所有平台请求打到哪里，由 `.sillyspec/local.yaml` 两段配置决定。`config-schema.js:90-91` 登记 reader 与生命周期。

### `platform:` 段 —— 驱动链路 A（REST 同步）
```yaml
platform:
  url: https://your-sillyhub.example.com
  token: shpsync_xxx            # connect 时换发的 workspace-scoped token
  user: qinyi                   # 推送者身份（可选，回退 git user.name / env）
  last_connected: 2026-08-14T...
```
- 读取者：`SyncManager._getPlatform()`（`sync.js:570`）→ 返回 `{url, token, ...}` 或 `null`（未连接）。
- 缺段 → `_getPlatform()` 返回 `null` → 所有 REST 方法降级静默跳过（本地独立用户的合法默认状态）。

### `mcp:` 段 —— 驱动链路 B（MCP 派发）
```yaml
mcp:
  url: https://your-sillyhub.example.com
  token: shk_live_xxx
```
- 读取者：`readMcpConfig()`（`sillyhub-mcp/config.js:31`）→ 供 ① `client.js` 构造函数 ② `probe.js` configFingerprint + no-config 快速路径 ③ `execute.js` `getDispatchMode`。
- 优先级：`local.yaml` mcp 段（两键齐全）> env `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN` > `null`。
- 两键缺一即回退 env；env 也缺 → `null` → `client._configured=false` → 所有 MCP 方法降级不发网络。

### connect 写入规则（`sync.js:299-312`）
`platform connect <url> <token>` 同时写两段（若 mcp 段已存在则保留不覆盖，R-09）。**两段共享 url，但 token 不同**：
- **platform 段** token = 换发的 `shpsync_` workspace-scoped token（`effectiveToken`，`sync.js:284`）——用于 REST 进度同步（最小权限）；
- **mcp 段** token = 原始 user 级 token（`token`，`sync.js:311`）——用于 MCP 派发（create_mission/dispatch_worker 需 user 级权限）。

换发失败（404/403/断网）则 `effectiveToken` 回退原 token，两段此时相同。⚠️ 源码注释 `sync.js:309` 称"复用 platform 的 url/token"，与 token 实际双写不一致（注释过时/误导，已在本文修正）。

---

## 2. 链路 A：REST 进度同步接口（`SyncManager`）

**铁律：全程 best-effort** —— 网络失败 / 非 2xx / 超时一律 `console.warn` 不抛、不阻断主流程（`sync.js:1-9`）。唯一例外是 `approve`/`reject`（见下表脚注）。

### 端点清单
| 方法 | HTTP | 端点 | 做什么 | 源码 |
|---|---|---|---|---|
| `connect` | GET | `/api/health` | ping 验活平台可达 | `sync.js:263` |
| `connect` | POST | `/api/workspaces/resolve-by-root-path` | 用 user 级 token（shk_live_/JWT）+ 本地 `root_path` 换发 `shpsync_` workspace-scoped token | `sync.js:277` |
| `sync` | POST | `/api/changes/{name}/progress` | **推六表进度 JSON**（serializeForSync）；元字段走 header：`Authorization`/`X-SillySpec-User`/`X-SillySpec-Base-Ts`(乐观锁)/`X-SillySpec-Pushed-At`；**409** = base_ts 冲突 → 写 `.runtime/sync-conflict-<change>.json` | `sync.js:396-400` |
| `syncDocuments` | POST | `/api/changes/{name}/documents` | 推四件套（proposal/design/requirements/tasks.md）全量同步。**⚠️ 后端未实现（404，2026-08-14 实测）**——CLI 预留契约（`_submitApproval` 内 TBD-hub-api 注释），best-effort warn 静默失败 | `sync.js:452` |
| `checkApproval` | GET | `/api/changes/{name}/approval` | 读审批状态 `pending/approved/rejected`，回写本地 approvals 表 | `sync.js:513` |
| `pullList` | GET | `/api/changes` | 轻量 change 列表（name/stage/last_pushed_at），CLI 比对本地决定哪些需更新 | `sync.js:638` |
| `pull` | GET | `/api/changes/{name}/progress` | 拉平台权威 JSON → import 重建本地 DB 行；本地脏且平台更新 → 冲突写文件 | `sync.js:670` |
| `approve`/`reject` | POST | `/api/changes/{name}/approval` | 提交审批决定；**非 best-effort** —— 失败置 `process.exitCode=1`（`sync.js:954` `_submitApproval`，D-006@v1「显式用户动作失败必须可见」）。**⚠️ 后端未实现（405，只有 GET，2026-08-14 实测）**——CLI 预留契约（TBD-hub-api 注释在 `_submitApproval` 内），当前 `platform approve` 必失败 | `sync.js:954` |
| `resolve` | —（本地） | 读 sync-conflict 文件 | 三选一（keep-local/take-platform/abort），不发网络 | `sync.js:746` |

### CLI 便捷封装（`sync.js:886-925`）
`connect` / `disconnect` / `sync` / `syncDocuments` / `checkApproval` / `pull` / `pullList` / `resolve` / `collectStatus` / `approve` / `reject` 均 export 为顶层函数，`new SyncManager(cwd)` 包装。

### run 流程里的三个触发器（`src/run/shared.js`）
- **`triggerSync(cwd, changeName, platformOpts)`**（`shared.js:333`）：包 `sync()` + **8s 总超时熔断**。这是最常用的上推入口。
- **`triggerPull(cwd, changeName, platformOpts)`**（`shared.js:364`）：包 `pull()`，8s 熔断。仅低频边界点触发，**不每步 pull**（避免高频写入/网络压力）。
- **`checkApproval(cwd, changeName, platformOpts)`**（`shared.js:434`）：包 `syncMod.checkApproval`。
- **`triggerPullActiveChange`**（`shared.js:392`）：`triggerPull` 便捷封装，未传 changeName 时自动推导单活跃变更（多/无活跃则跳过）。

---

## 3. 链路 B：MCP 任务派发接口（`SillyHubMcpClient`）

**关键边界**：SillyHub 的 MCP tool（create_mission/dispatch_worker/list_workers/report_progress）**只有 agent 能调**，CLI（Node）进程调不了。所以：
- **CLI（Node）只在探测时**调 `probeDaemon`/`listTools`/`getRootPath`；探测前先做 MCP `initialize` 握手建 session（2026-08-14 修复：此前直接发 tools/call 无 session 必 400，且 clientInfo 缺 version 连 initialize 都 -32602）；
- **业务 tool 调用由 agent 执行** —— CLI 生成「派发指令文本」注入 execute prompt，agent 据此调 MCP tool（`dispatch/backends/sillyhub-mcp.js:5-8`）。

### `client.js` 方法表（best-effort 不抛）
| 方法 | MCP tool / RPC | 用途 | 谁调 |
|---|---|---|---|
| `probeDaemon` | `list_agent_profiles` | 探连通性 + token 有效性 | `probe.js:163` |
| `listTools` | `tools/list` | 列 tool schema；**探路径A**（dispatch_worker 是否含 `worktree_path`+`worker_prompt`） | `probe.js:113` |
| `getRootPath` | `tools/list`(复用) | best-effort 拿 workspace root_path（越界校验用，当前 gateway 不暴露 → null） | `probe.js:189` |
| `createMission` | `create_mission` | 一 Wave 一 mission | agent（指令注入） |
| `dispatchWorker` | `dispatch_worker` | 派 worker（含 worktree_path/branch/worker_prompt 覆写） | agent（指令注入） |
| `listWorkers` | `list_workers` | 轮询 worker 终态 | agent（指令注入） |
| `killLease` | `report_progress`(kill 标记) | 超时防双写（当前无专用 kill tool，保守报 killed=false） | agent（指令注入） |

### 派发决策链
1. **`probeSillyHub()`**（`dispatch/probe.js:144`）：no-config 同步快返回 → 负面缓存(TTL) → `probeDaemon` → `listTools` 预热路径A → root_path 越界校验 → `{available}`。
2. **`renderDispatchInstruction(contract, probe)`**（`dispatch/strategy.js:69`）：`probe.available` → backend=`sillyhub`（注入 SillyHub 指令，含一 Wave 一 mission + dispatch_worker 参数 + 轮询 + kill lease + 回收约定）；否则 backend=`local`。**始终附 Local 兜底指令全文**。
   - **两条消费路径**：① `sillyspec dispatch probe/hint` 命令——agent 主动探测/取指令，probe 结果直接传 `renderDispatchInstruction`；② **execute Wave prompt 注入**——`getDispatchMode()`（`execute.js:497`）同步三态判定（不发网络），`sillyhub` 态下以 `{available:true}` 硬编码调 `renderDispatchInstruction`（`execute.js:810`），probe 不参与。
3. **路径A 降级**（`backends/sillyhub-mcp.js:104` `isPathASupported`）：env `SILLYHUB_PATH_A=1` 强开 > probe 预热缓存；未支持则指令追加降级提示，per-worker 回退 Local，**绝不硬试 MCP**（R-04）。
4. **回收**（D-004）：worker **绝不 git commit**，SillySpec 自己 diff worktree 写 review.json，**不调 SillyHub 合并 tool**（`backends/sillyhub-mcp.js:47` `SILLYHUB_RECYCLE_RULE`）。

---

## 4. 链路 C：scan 指针握手（平台模式专用）

scan 阶段在**平台模式**（`platformOpts.specRoot/runtimeRoot`）完成时，**不发任何 HTTP**，而是落盘供 daemon 轮询消费（`complete-handlers.js:985-1102` `handleScanStageCompleted`）：

1. 写 `manifest.json`（workspace_id/scan_run_id/source_commit/spec_root/scan_profile/postcheck…）到 `specRoot`。
2. 跑 `scan-postcheck` → 写 `postcheck-result.json`（结构化结果）。
3. 更新平台指针 `.sillyspec-platform.json`：状态 `ACTIVE` → `SCAN_COMPLETED`，记 `completedAt`/`scanStatus`。
4. **`failed_post_check` 时 `process.exit(1)`** —— 用非零退出码通知 SillyHub scan 失败（manifest 已落盘不撤销）。

---

## 5. 流程触发点矩阵（核心）

> 按「用户敲的命令 / 流程步骤」组织。这是回答「哪些步骤操作平台接口」的直接索引。

| 步骤 / 命令 | 链路 | 具体动作 | 源码触发点 |
|---|---|---|---|
| `platform connect <url> <token>` | A | GET health ping → POST resolve-by-root-path 换 shpsync_ token → 写 platform/mcp 段 | `sync.js:260` |
| **每个进度落盘点**（step `--done` 完成、阶段启动/切换、stale 步骤重置、gate 拦截回滚等 `_write` 后） | A | `triggerSync` → POST `…/progress` 推六表进度（8s 熔断） | complete.js:340/400/646/749/889（--done）；stage.js:113/127/149（启动/切换/stale 重置）；gates.js:179；command.js:826/984/1034/1042/1209 |
| **execute 阶段启动前**（runStage / auto 流程，非平台模式，`--skip-approval` 可跳过） | A | `checkApproval` → GET `…/approval`：**rejected → `exit(1)` 硬阻断**；pending → 提示待审批；unknown → 放行 | stage.js:47-58；command.js:1113-1129 |
| `platform sync-docs`（手动命令，**唯一触发点**） | A | POST `…/documents` 推四件套全量；run 流程**不**自动推文档（sync.js:30 头注释称由 run 流程触发，已过时） | sync.js:439；index.js:1255 |
| `platform approve/reject <change>` | A | **先** `triggerPull`（拉最新防基于旧态决策）→ POST `…/approval`；失败 exitCode=1 | index.js:1368-1369；shared.js:364 |
| **stage 命令启动时**（scan/status/quick/explore/brainstorm/plan/execute/verify/archive） | A | `triggerPullActiveChange`：单活跃变更下行 pull（8s 熔断，未连接静默跳过；低频边界点，**不每步 pull**） | index.js:693；shared.js:392 |
| `platform pull [--change <名>]` | A | 有 `--change` → 单变更完整 pull；无 → `pullList` 轻量列表 + 逐个按需 pull；未连接 `exit(1)` | index.js:1285-1325；sync.js:638/663 |
| `platform status` | A | `collectStatus` 只读展示（连接信息 + 落后标记 + 未决冲突列表），**不 pull** | index.js:1258-1284；sync.js:844 |
| `platform resolve --keep-local/--take-platform/--abort` | 本地 | 读 sync-conflict 三选一，不网络 | sync.js:746 |
| `sillyspec dispatch probe` / `dispatch hint --contract <json>` | B | `probeSillyHub`：probeDaemon + listTools(路径A schema) + getRootPath；hint 再经 `renderDispatchInstruction` 出指令 | index.js:1093-1133；probe.js:144 |
| **execute Wave prompt 注入** | B | `getDispatchMode()` **同步三态判定**（读 MCP 配置 + 路径A 探测缓存，不发网络）：`sillyhub` → 注入完整派发指令（`{available:true}`）；`local-fallback`（配置但路径A 未落地）→ 短提示走 Local；`local` → 不注入 | execute.js:497/798-816 |
| **execute Wave 步骤** | B | 指令文本驱动 agent 调 create_mission/dispatch_worker/list_workers/report_progress | backends/sillyhub-mcp.js:136 |
| **scan 完成（平台模式）** | C | 落盘 manifest/postcheck + 指针 SCAN_COMPLETED；失败 exit(1) | complete-handlers.js:985 |

---

## 6. 平台模式如何激活（`specRoot`/`runtimeRoot` 怎么才会存在）

> 这是理解全文的前置概念：`platformOpts.specRoot` / `runtimeRoot` 是否存在，决定 SillySpec 走「本地模式」还是「平台模式」。

### 本质
平台模式是 **SillyHub daemon 调用 SillySpec CLI 时的模式**。它把默认落在 `cwd/.sillyspec/` 的产物目录（`specRoot`）和运行时目录（`runtimeRoot`）拆到别的位置，让 daemon 能多项目隔离管理。**人类本地用户默认不进平台模式。**

`specRoot` 是实际开关（平台模式判定只看 `specRoot || runtimeRoot` 任一存在）；`runtimeRoot` **可缺省**——缺省时经 `resolveRuntimeRoot` 回落 `<specBase>/.runtime`（`shared.js:280-284`：runtimeRoot > specDriftAnchor/.runtime > specBase/.runtime），即"只拆 specRoot、runtime 跟着走"也是合法平台模式。

### 置位的两条路径（`command.js:245-317`）

**路径 1 —— daemon 显式传 flag**（命令行 argv）：
- `--spec-root <path>`（或别名 `--spec-dir`）→ `specRoot`
- `--runtime-root <path>` → `runtimeRoot`
- `--workspace-id <id>` / `--scan-run-id <id>` → 配套元信息

**收这些 flag 的入口不止 `run scan`**：
- **任何 `sillyspec run <stage>`**（scan/plan/execute/verify/archive/quick/brainstorm…）—— 都走 `runCommand`（`command.js:131`）公共入口，flag 在 `command.js:247`（`resolvedSpecDir`）起统一解析。scan 只是 daemon 流程的**第一个阶段**，所以是"典型首次激活点"，不是唯一入口。
- **`sillyspec init <dir> --spec-dir <path>`** —— 外部 specDir 安装（`init.js:216` `doInstall(specDir)`，含源码目录旧 `.sillyspec` 残留清理）。⚠️ init **只认 `--spec-dir`**（顶层 `index.js:179` 解析后经 `case 'init'` 透传 `specDir`）；传 `--spec-root` 会被**静默忽略**（init 分支不读 filteredArgs）。
- **`backfill-reviews` / `register-stage-review` / worktree apply / assess 等子命令** —— 顶层 `--spec-dir` 透传为 `platformOpts.specRoot`（index.js:468（backfill-reviews）/ 509（register-stage-review）/ 805/868（worktree apply/assess））。
- **gate / derive**（machine-interface）—— 只读查询接受 specBase，**不写指针**。

⚠️ **`--spec-dir` 与平台模式共用开关**：`command.js:247` 把 `--spec-dir` 与 `--spec-root` 同等置位 `specRoot`。本地用户为消歧 monorepo 传 `--spec-dir`（`command.js:328-331` 的提醒就是这么引导的）也会点亮平台语义：跳过链路 A 的 REST 同步 + 写粘性指针文件 + 触发下方"首次接入清理"。设计上"外部 specDir = 平台模式"是合并处理，但与"本地只是换个目录"的直觉有偏差，易踩。

### 激活的副作用：首次接入清理（`command.js:335-369`）
`platformOpts.specRoot` 存在且 cwd 无 `.sillyspec-platform-cleaned` 标记时，CLI 会清理源码目录旧 `cwd/.sillyspec/`：
- 含真实资产（`changes/` / `projects/` / `sillyspec.db`）→ 只清运行时残留（白名单保留 worktrees/进度），**不整删**；
- 无任何真实资产 → **整删目录**。

每个 cwd 只执行一次（cleaned 标记，之后不再提示）。误传 `--spec-dir` 触发平台模式会连带此副作用——`--spec-dir` 混叠最实际的代价。

**路径 2 —— 指针文件自动恢复**（`command.js:265-291`）：
命令行没传 flag 时，CLI 按优先级读持久化文件补回 `platformOpts`：
1. `cwd/.sillyspec-platform.json`（轻量指针，首选，不污染 `.sillyspec` 结构）
2. `<specRoot>/.runtime/platform-scan.json`（首次 scan 写入的主文件）

文件存在但缺 `specRoot`/`runtimeRoot` → **fail-fast `exit(2)`**（环境错，提示重跑首次 scan 传 `--spec-root`）。

### 自举循环（一次激活，后续自动续命）
1. daemon 首次调 `sillyspec run scan --spec-root <X> --runtime-root <Y> --workspace-id <W> --scan-run-id <S>`
2. CLI 落盘两个文件：`<specRoot>/.runtime/platform-scan.json` + `cwd/.sillyspec-platform.json`（`command.js:294-313`）
3. scan 完成时清理 `platform-scan.json` 临时文件（`complete-handlers.js:1029`），指针保留负责续命
4. 后续 daemon 调 `sillyspec run <stage> --done`（**不带任何 flag**）→ CLI 读指针文件自动恢复 `platformOpts` → 仍是平台模式

### 谁进、谁不进
- **人类本地用户**：跑 `sillyspec run <stage>` 不带上述 flag，且 cwd 无 `.sillyspec-platform.json` → `platformOpts` 全 `null` → **本地模式**，走链路 A 的 REST `/api`（前提是 `platform connect` 过）。
- **SillyHub daemon**：传 flag 或借指针文件 → 平台模式 → 链路 A 全跳过（进度回传走 daemon 自有链路），链路 C（scan 指针握手）生效。

> pointer 状态机见 `constants.js:18` `POINTER_STATUS`（ACTIVE / SCAN_COMPLETED / STALE / CORRUPTED）；`doctor` 与 `platform status` 会读 `cwd/.sillyspec-platform.json` 展示（`pointerPath` 解析在 `doctor-diagnostics.js:38`、枚举消费在 `index.js:1189`）。

## 7. 关键开关与铁律

- **平台模式总开关**：`platformOpts.specRoot` 或 `platformOpts.runtimeRoot` 存在 → `triggerSync`/`triggerPull`/`checkApproval` **全部 early-return**（`shared.js:335/366/436`）。平台模式下进度回传走 SillyHub daemon 自有链路，CLI 不直接打 `/api`。**§5 表中链路 A 的触发点仅非平台模式真正发请求。** 置位机制见上节 §6。
- **未连接是合法默认**：`_getPlatform()`/`readMcpConfig()` 返回 null → 链路 A/B 静默跳过，不每步催连平台制造噪音。排查同步行为设 `SILLYSPEC_DEBUG_SYNC=1`（`debugLog` 在 `sync.js:34`）。
- **best-effort 边界**：除 `approve`/`reject`（显式用户动作，失败必须可见 exitCode=1），其余平台调用失败一律 warn 不阻断。
- **8s 熔断**：`triggerSync`/`triggerPull` 总超时 8s（`shared.js:331`），防 `--done` 在 sync 慢时体感 hang。
- **MCP 不硬试**：路径A 未落地保守回退 Local（R-04）；CLI 不碰 DB 持久化 worktree_path（D-004 / client.js:18）。
- **派发不双写**：worker 不 commit，SillySpec 自己 apply（D-004），不调 SillyHub 合并 tool。

---

## 8. 源码索引

| 模块 | 文件 | 职责 |
|---|---|---|
| REST 同步 | `src/sync.js` | `SyncManager` + CLI 便捷封装 + `_submitApproval` |
| run 同步触发器 | `src/run/shared.js` | `triggerSync`/`triggerPull`/`triggerPullActiveChange`/`checkApproval` |
| MCP 客户端 | `src/sillyhub-mcp/client.js` | `SillyHubMcpClient`（probe + 业务 tool 封装） |
| MCP 配置 | `src/sillyhub-mcp/config.js` | `readMcpConfig` |
| 派发探测 | `src/dispatch/probe.js` | `probeSillyHub` + `detectPathAFromTools` |
| 派发策略 | `src/dispatch/strategy.js` | `renderDispatchInstruction`（backend 选择 + 兜底） |
| 派发指令模板 | `src/dispatch/backends/sillyhub-mcp.js` | `renderSillyHubInstruction` + 路径A/回收约定 |
| execute 注入 | `src/stages/execute.js` | `getDispatchMode`（:497）+ 指令注入（:798） |
| scan 平台握手 | `src/run/complete-handlers.js` | `handleScanStageCompleted`（:985） |
| 配置 schema | `src/config-schema.js` | platform/mcp 键生命周期登记（:90） |
