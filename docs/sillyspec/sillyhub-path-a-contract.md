---
author: qinyi
created_at: 2026-08-07T14:50:00+08:00
updated_at: 2026-08-08T19:57:01+08:00
related_change:
  - 2026-08-07-sillyhub-mcp-dispatch (sillyspec 仓：抽象层 + 接通)
  - 2026-08-08-dispatch-worker-caller-worktree (multi-agent-platform 仓：路径A 落地)
status: path-A-landed-both-sides
---

# SillyHub 路径 A 跨仓契约（供 multi-agent-platform 独立变更对齐）

> **状态（2026-08-08）：路径 A 双侧落地。** SillySpec 仓 `2026-08-07-sillyhub-mcp-dispatch`（抽象层 + `SillyHubMcpBackend` + client/probe/strategy + isPathASupported 探测）与 SillyHub 仓 `2026-08-08-dispatch-worker-caller-worktree`（路径 A 三处 + mission external 模式 + 两条 MCP 入口 + daemon 透传）均已实现。下方校验清单全勾，并经 spike-01 live 探测验证（见 §落地证据）。本契约原本声明的「期望」现已转为「已落地镜像」，字段名 / external 语义与 design §7.3/§7.1（round-2）一致。

> 本文档声明 SillySpec 侧对 SillyHub（multi-agent-platform 仓库）的**路径 A 期望**。SillySpec 侧已实现派发抽象层 + `SillyHubMcpBackend` + `isPathASupported()` 探测（探测到 dispatch_worker schema 含 `worktree_path`/`worker_prompt` → true）。SillyHub 侧路径 A 落地后，SillySpec 探测自动命中 → SillyHub 后端自动启用。

## 背景

SillySpec 作为流程控制器单向调用 SillyHub MCP 派 worker（D-001）。worker 须在 **SillySpec 自建 worktree** 执行（D-002），SillySpec 自己 apply 不用 converge（D-004）。为此 SillyHub 的 `dispatch_worker` 须支持「caller 提供 worktree」模式（路径 A），否则 worker 进 SillyHub 自建 worktree、代码落点失控、且 worker commit 污染 sillyspec 分支。

## 路径 A：SillyHub 须改三处（D-003@v2）— 已落地

### 1. `dispatch_worker` 增可选参数（向后兼容）— 已落地

`dispatch_worker` schema 增可选参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `worktree_path` | string? | caller（SillySpec）提供的 worktree 绝对路径。worker cwd = 此路径。 |
| `branch` | string? | caller worktree 当前分支（D-009 字段名统一，round-1 漂移 `worktree_branch` 已收敛）。 |
| `worker_prompt` | string? | 覆写 worker 执行 prompt（caller 控制 commit 行为，见下）。 |

**不传** → 走原自建 worktree/分支逻辑（向后兼容，不影响既有 SillyHub 调用方）。

落地位置（multi-agent-platform worktree commit `3351e3f9`）：
- 链路 B（public MCP gateway）：`backend/app/modules/mcp_gateway/tools.py` `dispatch_worker`(:335) 三参 + 透传(:438-440)
- 链路 A（HTTP）：`backend/app/modules/agent/mcp_tools.py` `DispatchWorkerRequest`(:56/:75-77) + HTTP 端点(:354/:435-437)
- 链路 A（daemon stdio）：`sillyhub-daemon/src/mcp-server.ts` inputSchema/handler(:158/:177-200/:215-217) + `hub-client.ts`(:1043/:1053-1066)
- 核心：`backend/app/modules/agent/execution.py` `dispatch_worker`(:153) 签名加三参(:163-166)；caller 提供时跳过 `git_worktree_add` + `root_path=worktree_path`(:203-221)；`prompt = worker_prompt if worker_prompt is not None else render_worker_prompt(run)`(:273)

SillySpec 侧调用（`src/sillyhub-mcp/client.js#dispatchWorker`）已按此契约传参：`worktree_path` / `branch` / `read_only` / `model` / `agent_profile_id` / `worker_prompt`。

### 2. `execution.py` 检测 caller worktree → 跳过自建 — 已落地

`execution.py` `dispatch_worker`（:203-221）检测 caller 是否提供 `worktree_path`：

- caller 提供 → **跳过自建 worktree/分支**，`root_path = caller worktree_path`，分支 = caller `branch`。
- caller 未提供 → 原自建逻辑不变（:217-221 的 `and not worktree_path` 短路）。

⚠️ **路径 A 不写 `run.worktree_branch`**（DB 列保持 None）——该列是 team 模式 converge finalize 查 merge 的触发字段（`finalizer.py:255`）。路径 A 写它会触发 `git merge --no-ff <branch>` 污染 caller 主仓（R-01）。`branch` 入参仅作 lease metadata 记录，**不落 `run.worktree_branch` 列**。已由单测 `test_dispatch_worker_caller_worktree.py` 锁定（断言该列不被写）。

daemon `workspace.ts` 分支 0（目录已存在 → 直接 cwd）已支持；路径 A 复用此分支。

### 3. `render_worker_prompt` 路径 A 下 worker 不 git commit（关键，UB-1）— 已落地

`render_worker_prompt` 仍为 team 模式输出 `git add -A && git commit`（team 行为零回归）。路径 A 走方式 (b)：`dispatch_worker` 的 `worker_prompt` 覆写参数让 caller 直接控制 worker prompt——`execution.py:273` `prompt = worker_prompt if worker_prompt is not None else render_worker_prompt(run)`，SillySpec 侧 `worker_prompt` 已传「不 commit 留工作区」覆写。caller 传 → 完全替代 render（含 commit 指令被消除）。

## mission "external" 模式（D-007，路径 A 配套）— 已落地

> round-2 新增。解 round-1 P0-2（`create_mission` 强制 spawn 僵尸 orchestrator run + 占 lease）+ P0-1 根解（converge external 跳过 finalize merge）。

`create_mission` 增可选参 `orchestration_mode: str = "team"`（默认 team，零回归）：

- `orchestration_mode="external"`（路径 A，SillySpec 外部调度）→ `team_mission_entry`（`orchestrator.py:141`）**跳过 orchestrator run/lease**（:186-193 返回 `(mission, None)`），`AgentMission.constraints = {"orchestration_mode": "external"}`（:165-166）。返回 `{mission_id, status, main_run_id: null, workers: []}`（external 无 main_run）。
- 默认 `"team"` → 走原逻辑（spawn orchestrator），既有调用方零回归。

落地位置：
- 链路 B：`mcp_gateway/tools.py` `create_mission`(:760) :771 参 + :810 透传
- 链路 A：`backend/app/modules/agent/mission_schema.py:23` `orchestration_mode: Literal["team","external"] | None` + `router.py` create_mission 端点(:864/:872/:887)
- 核心：`orchestrator.py` `team_mission_entry` external 分支(:186-193)
- **converge 短路（R-01 根解）**：`finalizer.py` `converge_mission_for_completed_run`(:470) :514 检测 `mission.constraints.orchestration_mode=="external"` → 跳过 `finalize_execute_mission`/`cleanup_mission`（不 merge caller worktree、不清）。双保险：路径 A 不写 `run.worktree_branch`，即使 external 检测失效，finalize 查空也跳过 merge（:255）。
- SillySpec 侧：`src/sillyhub-mcp/client.js` `createMission`(:284) 传 `orchestrationMode="external"`（:292-294 `args.orchestration_mode = mode`）

## daemon root_path 约束（R-08 / UB-3）— 已落地（约定 + 文档）

SillyHub daemon 的 `ws.root_path` / `daemon_instances.allowed_roots`（`assertWithinAllowedRoots` 越界门）**必须 ≥ SillySpec 主仓根**，含所有 SillySpec worktree 路径（`.sillyspec/.runtime/worktrees/` 下的 worktree）。

落地：`docs/integrations/sillyspec-dispatch.md` 集成指引 + `scripts/check-dispatch-allowed-roots.mjs` smoke 前置硬校验脚本（task-10）。当前本机 daemon `allowed_roots=["C:\\Users\\qinyi"]`，已覆盖 multi-agent-platform 仓根及其 worktree。

SillySpec 侧 `probeSillyHub`（`src/dispatch/probe.js:204-218`）已实现 root_path 校验：caller 传 `rootPath` 或 `client.getRootPath()` 拿到时，校验 `worktreePath` 在内，越界 → `{available:false, reason:'worktree-outside-root'}` → fallback Local。

> ⚠️ **限制 ①（已知 gap，暂不阻断生产）**：当前 SillyHub MCP gateway 的 `tools/list` 响应仅返 `{tools:[...]}`，**不在顶层暴露 `root_path`**；daemon 亦无独立 MCP tool 查 `root_path`。故 SillySpec `client.getRootPath()`（`client.js:391-409`，defensively 读 `result.root_path`）**实际返回 null** → `probe.js` 的 worktree 越界校验在真实派发流程里**不触发**（生产不会因这个误判 fallback；但越界保护等于暂未生效）。`task-12 constraints` 已预见此 gap。待 daemon 暴露 `root_path`（如 `tools/list` 顶层增字段或增能力查询 tool）后，该校验自动生效——届时更新本节并补单测。

## SillySpec 侧行为（路径 A 已落地）

- `isPathASupported()`（`src/dispatch/backends/sillyhub-mcp.js:104-109`）改为探测：
  1. `process.env.SILLYHUB_PATH_A === '1'` → 强制 true（spike-01 备选 / 手动启用，最高优先级）；
  2. 否则读 probe 预热的 schema 探测缓存（`_pathAProbe.supported`）：`probe.js` `preheatPathAProbe`(:109-120) 调 `client.listTools()` → `detectPathAFromTools`(:92-99) 查 `dispatch_worker.inputSchema.properties` 含 `worktree_path` **和** `worker_prompt` 全命中 → true，任一缺失/探测失败 → false（保守，R-04 不硬试）。
- `execute buildWavePrompt` 的 `getDispatchMode()`（`src/stages/execute.js:586`）：env 配置（`SILLYHUB_MCP_URL`+`SILLYHUB_MCP_TOKEN`）+ `isPathASupported()` 都满足才 'sillyhub'；否则 'local'（无配置，零回归）或 'local-fallback'（有配置但路径 A 不支持，短提示）。`buildWavePrompt`(:619) **同步读缓存**，不每 Wave 探测。
- `killLease`（`client.js`）：无专用 kill tool，best-effort `report_progress` 带 kill 标记 + 保守 `killed=false`。路径 A 后续建议 SillyHub 增专用 kill/lease-revoke tool。

> ⚠️ **限制 ②（已知 gap，需运行时配置绕过）**：`execute.js` **自身不调 `probeSillyHub`**（grep 确认：execute.js 无 probe import / warming 调用，`getDispatchMode` 是同步读缓存）。`probeSillyHub` 预热只在 `src/index.js` 的 `dispatch-hint` CLI 子命令(:983/:1012)触发。故走 `sillyspec execute` 主流程时，schema 探测缓存**未被预热** → `isPathASupported()` 走分支 2 返回 false → dispatchMode 退 `local-fallback`，路径 A 不会自动启用。**两种启用方式**：(a) 设 env `SILLYHUB_PATH_A=1` 强制 true（推荐，绕过预热）；(b) 先跑一次 `sillyspec dispatch probe`（或 dispatch-hint）预热缓存再 execute。后续应在 execute 启动期接 `probeSillyHub` 预热（一次性）以消除该手动步骤——届时更新本节。

## 落地证据（2026-08-08 spike-01 live + 单测）

- **spike-01 live（worktree backend @ 127.0.0.1:8002，commit 3351e3f9）**：
  - MCP streamable HTTP 握手（initialize → notifications/initialized → tools/list）持 Bearer `shmcp_` token 调通，返回 8 个 tool。
  - `dispatch_worker` inputSchema 确含 `worktree_path` / `branch` / `worker_prompt`（+ mission_id/objective/role/agent_type/model/read_only/agent_profile_id），即可被 `isPathASupported` schema 探测命中。
  - `create_mission` inputSchema 确含 `orchestration_mode`（default `"team"`）。
  - `create_mission(orchestration_mode="external")` 实测返回 `{mission_id, status:"planning", main_run_id:null, workers:[]}`——**R-02 live 证据：external 模式不 spawn orchestrator run**（DB 查该 mission 下 agent_runs 数 = 0）。
- **单测（multi-agent-platform worktree）**：
  - `backend/app/modules/agent/tests/test_dispatch_worker_caller_worktree.py`（task-08）：caller-worktree 分支——断言 `git_worktree_add` 不被调 + `root_path` 透传 + `run.worktree_branch` 不被写（D-008）+ `worker_prompt` 进 prompt。覆盖 R-01 防御层 ② 与 ③。
  - `backend/app/modules/agent/tests/test_mission_external_mode.py`（task-07）：external 模式——`team_mission_entry` external 不 spawn orchestrator（constraints 含 mode）+ team 默认仍 spawn（回归对比）；converge external 短路跳过 finalize。覆盖 R-02 + R-01 防御层 ①。
- **R-01（P0-1 worker 终态不污染主仓）三重防御验证状态**：
  - 防御 ①（external converge 跳过 finalize）：`finalizer.py:514` + task-07 单测 ✅
  - 防御 ②（路径 A 不写 run.worktree_branch）：`execution.py`（worktree_branch 仅 team 分支:260 写）+ task-08 单测 ✅
  - 防御 ③（worker_prompt 覆写不 commit）：`execution.py:273` + SillySpec 侧 worker_prompt 文本 ✅
  - **端到端 smoke（worker 真写码 + 主仓 git log 无 SillyHub merge）**：`cannot_verify`——见下 §端到端 smoke。

## 端到端 smoke（cannot_verify，环境限制）

完整 smoke（隔离临时仓 → SillySpec execute → create_mission(external) → dispatch_worker(worktree_path=caller worktree) → worker 写码不 commit → SillySpec 回收 review.json + apply → 主仓 git log 无 SillyHub merge）**本次未跑**，标 `cannot_verify`。

**环境限制**（不硬搭假环境，铁律 1）：
1. **daemon 绑定不匹配**：本机在线 daemon（`daemon_instances` id `68c63051`，`status=online`）的 `server_url=http://127.0.0.1:8001`，绑的是 **docker backend（main 分支，无路径 A 改动）**。worktree backend（含路径 A，commit 3351e3f9）只能起在 **8002**（8001 已被 docker 占），daemon 未绑 8002 → dispatch_worker 在 worktree backend 上无法把 worker 落到 daemon。
2. **不能为 smoke 强占 8001**：要打通 daemon ↔ 路径 A backend，须停 docker backend（用户在线环境，frontend 依赖）+ 在 8001 起 worktree backend + 重注册 daemon —— 属「硬搭」，铁律禁止；且会影响用户当前在用的 docker 部署。
3. **worker agent 进程**：完整 smoke 还需 daemon host 上有可派的真实 worker agent（API key / 模型配置），非本次可即兴拉起。

**requiredEvidence（R-01 三重防御已由下列验证覆盖，端到端 smoke 留环境就绪补）**：
- 防御 ① ② 各有 task-07 / task-08 单测锁定（见上 §落地证据）。
- 防御 ③ 由 `execution.py:273` prompt 覆写 + SillySpec worker_prompt 文本保证。
- spike-01 live 已证 create_mission(external) → main_run_id null（R-02）+ dispatch_worker schema 含路径 A 三参（探测可命中）。
- **遗留**：待有可即兴拉起的 daemon + worker 环境（或 CI 提供），补完整 smoke 实测主仓 git log 无 SillyHub merge 提交（R-01 端到端），并跑通 SillySpec 回收 review.json + apply 全链路。

## 落地时序（已发生）

1. **SillySpec 侧（`2026-08-07-sillyhub-mcp-dispatch`）**：抽象层 + Local + 探测 + stub 独立交付（零回归）。✅
2. **SillyHub 侧（`2026-08-08-dispatch-worker-caller-worktree`，Wave 1-4 = task-01~10）**：路径 A 三处 + mission external 模式 + 两条 MCP 入口 + daemon 透传 + allowed_roots 文档/校验。✅（commit 3351e3f9）
3. **接通（task-11/12）**：SillySpec `isPathASupported()` 改 schema 探测 + `createMission` 传 external + `dispatchWorker` branch 对齐 + probe rootPath 越界校验。✅（sillyspec 仓 src 改动已落，未 commit——归属本 multi-agent-platform change）
4. **收尾（task-13）**：本契约更新 + spike-01 live + smoke cannot_verify。✅（本次）

## 校验清单（SillyHub 侧落地后）— 全勾

- [x] `dispatch_worker` 接受 `worktree_path`/`branch`/`worker_prompt` 可选参数，不传走原逻辑（链路 A/B + daemon 三入口同构，spike-01 live schema 确认）
- [x] `execution.py` caller 提供 worktree → 跳过自建，root_path/分支用 caller 的（execution.py:203-221，task-08 单测）
- [x] 路径 A 不写 `run.worktree_branch`（execution.py 仅 team 分支:260 写；task-08 单测断言不写，D-008）
- [x] `render_worker_prompt` 路径 A 下 worker 不 commit —— 走 `worker_prompt` 覆写（execution.py:273；SillySpec 侧 worker_prompt 文本「不 commit 留工作区」）
- [x] mission external 模式：`create_mission` `orchestration_mode` 参（team 默认零回归）；external 跳 orchestrator spawn（task-07 单测 + spike-01 live main_run_id=null）；converge external 跳 finalize/cleanup（finalizer.py:514，task-07 单测，R-01 根解）
- [x] daemon `allowed_roots` 含仓根（`["C:\\Users\\qinyi"]` 覆盖 multi-agent-platform 仓根 + worktree；check-dispatch-allowed-roots.mjs 前置校验脚本 + sillyspec-dispatch.md 指引）
- [x] 字段名统一 `branch`（D-009，跨仓契约 / client.js / 三入口一致，round-1 `worktree_branch` 漂移已收敛）
- [x] SillySpec 侧 `isPathASupported()` 改 schema 探测（client.js listTools + probe.js 预热 + detectPathAFromTools；SILLYHUB_PATH_A=1 env 备选）
- [x] SillySpec 侧 `createMission` 传 `orchestration_mode="external"` + `dispatchWorker` 传 `branch`（client.js:492/:292-294/:329）
- [ ] daemon 暴露 `root_path`（限制 ①）：当前 tools/list 不返 root_path，probe 越界校验生产不触发——待后续 daemon 增暴露后补勾
- [ ] execute 启动期接 `probeSillyHub` 预热（限制 ②）：当前需 SILLYHUB_PATH_A=1 或先跑 dispatch probe——待后续 execute 接预热后补勾
- [ ] （建议）专用 kill/lease-revoke tool（替代 `report_progress` kill 标记）
- [ ] 端到端 smoke 实测主仓 git log 无 SillyHub merge（cannot_verify，待 daemon/worker 环境就绪）
