---
author: qinyi
created_at: 2026-08-07T11:17:23+08:00
updated_at: 2026-08-07T11:41:18+08:00
change: 2026-08-07-sillyhub-mcp-dispatch
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— SillyHub MCP 派发抽象层接入

> 本版吸收 Design Grill（brainstorm-review-2026-08-07-112117）7 条 P1/P2 修正：dispatcher 定位（UB-2）、路径A 第三处 render_worker_prompt（UB-1）、daemon root_path 约束（UB-3）、一 Wave 一 mission（UB-4）、R-03 scope 扩 execute acceptance（UB-5）、轮询参数化（UB-6）、allowedPaths 文案（UB-7）。

## 背景

SillyHub 平台暴露了对外 MCP 服务（8 个 tool：create_mission / dispatch_worker / list_workers / get_worker_result / get_run_logs / converge_mission / report_progress / list_agent_profiles），提供 agent 团队派发 + 治理框架（lease / 审计 / 预算 / 终态追踪 / 多 agent 编排）。SillySpec 当前 execute 阶段的子代理派发硬编码本机 Claude Code Agent tool（`src/stages/execute.js` buildWavePrompt），无法跨模型 / agent，无治理审计，且 execute.js 已有的"按复杂度分配模型"意图落空（本机 Agent tool 做不到真分配）。

目标：在不破坏现有门控的前提下，按需借用 SillyHub 的治理框架 + 异构模型/agent 能力。SillyHub MCP 非必须——双后端 + 能力探测，MCP 不可用时 100% 走原路径，现有功能零影响。

## 设计目标

- 引入派发抽象层 `task-dispatcher`，统一 execute（及未来 verify/scan）的子代理派发入口
- 双后端策略：`LocalAgentBackend`（现有本机 Agent tool，默认/降级，行为不变）+ `SillyHubMcpBackend`（探测可用时用）
- 能力探测 + fallback：MCP 不可用 → 全程 Local，现有 execute/verify/scan 零回归（D-005）
- execute Wave 并行子代理为主接入点，用上 SillyHub 异构 model/agent_profile（D-006）
- worker 在 SillySpec 自建 worktree（D-002），SillySpec 自己 apply 不用 converge（D-004），全门控（Review Gate/allowed_paths/assess/apply）保留
- 跨仓契约声明（路径 A）：SillyHub dispatch_worker 加 worktree_path+branch + 改 render_worker_prompt（D-003@v2），SillySpec 侧先做 + stub，SillyHub 侧独立变更

## 非目标

- read_only 粒度矛盾影响 **execute acceptance（tier=independent）+ verify QA**（都派只读 QA 写 review.json，但 SillyHub 只有 plan/acceptEdits 两档，无"写 .runtime/ 不写 src/"细粒度）。第一波 execute 实现 task 时 **acceptance 强制 tier=self**（避免撞矛盾）；acceptance/verify QA 的 SillyHub 接入推后第二波（待 SillyHub 加细粒度 tool 策略）（R-03，UB-5）
- scan 7 文档的 SillyHub 接入（次要接入点，推后）
- webhook / SSE 实时推送（R-02，默认轮询 list_workers，webhook 留长任务优化）
- SillyHub 侧路径 A 的实际代码实现（跨仓 multi-agent-platform 独立变更）
- _module-map.yaml schema_version 升级（既有问题，另案）
- 翻转控制权（拓扑 2 SillyHub 调 SillySpec，违背 SillySpec 流程控制器定位）

## 拆分判断

单变更 + 跨仓契约。SillySpec 侧实现 + 契约声明在本变更；SillyHub 侧路径 A（dispatch_worker 加参数 + 改 render_worker_prompt）是 multi-agent-platform 仓库独立变更。不走批量（非模板×数据）。

## 总体方案

### Phase 1 — 派发抽象层 task-dispatcher（探测 + 策略，非执行体）

> 定位修正（UB-2 / D-007）：dispatcher **不是 JS 执行体**。Local 后端的 Agent tool、SillyHub 后端的 MCP tool，**都只有 agent 能调**，CLI 进程（Node）调不了。所以 dispatcher = 探测 + 派发策略生成（注入 prompt 的指令），**实际 tool 调用由 agent 执行**。

新建 `src/dispatch/`：
- `probe.js`：`probeSillyHub() → {available, reason}`（JS 可测，缓存负面结果）；被 CLI 子命令 + 策略调用
- `strategy.js`：`renderDispatchInstruction(contract, probeResult) → string`——生成注入 execute prompt 的派发指令（告诉 agent：用哪个后端、调什么 tool、传什么参数、怎么轮询/回收）
- `backends/local-agent.js`：Local 后端的**派发指令模板 + 结果回收约定**（不是执行体）
- `backends/sillyhub-mcp.js`：SillyHub 后端的派发指令模板 + 回收约定 + 路径 A 落地检测（未落地 → 指令回退 Local）

回收侧不变：worker 在 SillySpec worktree 干活（工作区改动，不 commit——见 Phase5 UB-1），SillySpec 主体对 worktree git diff 写 review.json（复用既有 task-review/stage-review 契约）。

### Phase 2 — SillyHub MCP 客户端 + dispatch CLI 子命令

新建 `src/sillyhub-mcp/client.js`：
- MCP streamable HTTP 连接（Bearer token，端点 `/mcp/` 带尾斜杠，协议 2025-11-25）
- 封装 create_mission / dispatch_worker / list_workers / get_worker_result / report_progress（converge 不调，D-004）
- `probeDaemon()`：调 list_agent_profiles 验连通 + token 有效
- 配置：env `SILLYHUB_MCP_URL` / `SILLYHUB_MCP_TOKEN`（缺省 → probe unavailable → fallback Local）

新增 CLI 子命令（agent 调用桥，UB-2）：
- `sillyspec dispatch probe` → `{available, reason}`（agent 探测）
- `sillyspec dispatch hint --contract <json>` → 派发指令文本（agent 拿指令后执行实际 tool 调用）

### Phase 3 — execute 接入（主接入点）

改 `src/stages/execute.js` buildWavePrompt：
- 派发指令从硬编码"Agent tool 启动子代理"改为"经 `sillyspec dispatch hint` 拿派发指令后执行"（CLI 渲染 prompt 时调 strategy 生成指令注入；agent 按指令调 MCP dispatch_worker 或 Agent tool）
- 映射（D-008 / UB-4）：**一 Wave 一 mission**（`create_mission(change_id=<SillySpec change>, budget_usd per Wave)`）；Wave 内 task→worker 并行，Wave 间 mission 串行
- worker 在 SillySpec worktree：派发指令含 `worktree_path=<SillySpec worktreePath>, branch=<worktree 分支>`（路径 A）
- 终态轮询（UB-6）：agent 在 step 内轮询 `list_workers`（间隔默认 15s，per-worker 超时默认可配 local.yaml，超时 → `report_progress` 标记 + **kill worker lease 防双写** + fallback Local 重派）
- model/profile：读 tasks.md `[model:xxx]` 标签 + dispatch 配置，映射到 SillyHub `model` / `agent_profile_id`
- 回收：worker 终态后 SillySpec git diff worktree（工作区，不依赖 worker commit）→ Review Gate（复用不变）→ apply（SillySpec 自己，converge 不调）

### Phase 4 — 能力探测 + fallback（D-005 现有零影响）

- execute 启动时 `probeSillyHub()` 一次，缓存负面结果（TTL 免反复试）
- 探测失败 / 无配置 → 全程 Local（=现状，零回归）
- 探测成功 → SillyHub 后端；单 worker 派发/轮询失败 per-worker 降级回 Local（kill lease 后重派）
- 现有 execute/verify/scan 在无 MCP 配置时 100% 走原路径

### Phase 5 — 跨仓契约（SillyHub 侧路径 A，独立变更，改三处）

> Grill 修正（UB-1/UB-3）：路径 A 不是改两处，是**三处**；且须约束 daemon root_path。

本变更只**声明契约期望**（design 文档 + stub），不实现 SillyHub 侧代码：
1. `dispatch_worker` 增可选 `worktree_path` + `branch` 参数（向后兼容，不传走原自建逻辑）
2. `execution.py:184-236` 检测 caller 提供 → 跳过自建 worktree/分支，`root_path = caller worktree`，分支 = caller branch
3. **`render_worker_prompt`（execution.py:105-129）改**（UB-1）：现硬编码 worker 跑 `git add -A && git commit` + "主 agent merge"。路径 A 下 worker 进 SillySpec worktree，须改为**worker 不 git commit，留工作区改动交 SillySpec git diff**（或 dispatch_worker 加 `worker_prompt` 覆写参数让 caller 控制 commit 行为）。否则 worker 会 commit 到 sillyspec/<change> 分支污染历史 + 撞 D-004。
4. daemon `workspace.ts` 分支 0（目录已存在 → 直接 cwd）已支持；但**分支 0 ≠ `assertWithinAllowedRoots` 越界门**（UB-3）——SillySpec worktree 必须在 daemon `ws.root_path` 内，配置约束：**daemon ws.root_path 必须 ≥ SillySpec 主仓根**（含 `.claude/worktrees/` 等所有 worktree 路径）
- converge 不调用（D-004，SillySpec 自己 apply）

SillyHub 侧实际代码是 multi-agent-platform 仓库独立变更；本变更的 `SillyHubMcpBackend` 在路径 A 未落地时为 stub（探测到 worktree_path 参数 / worker_prompt 覆写不支持 → 降级提示 + fallback Local）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/dispatch/probe.js | probeSillyHub 能力探测（JS 可测） |
| 新增 | src/dispatch/strategy.js | renderDispatchInstruction 派发策略生成（注入 prompt） |
| 新增 | src/dispatch/backends/local-agent.js | Local 后端派发指令模板 + 回收约定（非执行体） |
| 新增 | src/dispatch/backends/sillyhub-mcp.js | SillyHub 后端指令模板 + 路径A stub |
| 新增 | src/sillyhub-mcp/client.js | MCP HTTP 客户端 + probeDaemon |
| 修改 | src/index.js | 新增 `dispatch` CLI 子命令（probe / hint） |
| 修改 | src/stages/execute.js | buildWavePrompt 派发指令改经 dispatch hint；Wave→mission 映射；轮询+kill lease |
| 新增 | test/dispatch/strategy.test.mjs | 策略生成 + probe + fallback 测试 |
| 新增 | test/dispatch/execute-dispatch-integration.test.mjs | execute 集成测试（Local/SillyHub 两路径 + 无 MCP 配置零回归） |
| 修改 | test/run-tests.mjs | 递归发现 .test.mjs（支持 test/dispatch/ 子目录，否则新测试被静默跳过） |
| 修改 | docs/sillyspec/file-lifecycle/storage-and-state.md | 新增 dispatch 运行时产物说明（规则19） |
| 新增 | .sillyspec/docs/sillyspec/modules/dispatch.md | dispatch 模块文档 |
| 新增 | .sillyspec/docs/sillyspec/modules/sillyhub-mcp.md | mcp-client 模块文档 |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 注册 dispatch + sillyhub-mcp 模块（9 modules） |
| 新增 | docs/sillyspec/sillyhub-path-a-contract.md | 跨仓契约声明（路径A 三处期望 + daemon root_path，供 multi-agent-platform 对齐） |
| 修改 | .claude/skills/sillyspec-execute/SKILL.md | execute 派发说明同步（规则19） |

## 字段数据流标注
- `worktreePath`/`branch`：producer=`execute.js` buildWavePrompt（worktreePath from worktree.js meta）→ `strategy.renderDispatchInstruction` 生成指令 → agent 调 `dispatch_worker(worktree_path, branch)` → consumer=SillyHub daemon（路径A 落地后）；路径A 未落地 stub 检测 → 指令回退 Local
- `modelHint`：producer=tasks.md `[model:xxx]` → execute → strategy 指令 → agent 调 dispatch_worker(model) → SillyHub worker（Local 后端忽略此字段）
- worker 终态：producer=SillyHub worker run(status) → agent 轮询 list_workers → SillySpec Review Gate → review.json（屏蔽后端差异）
- 配置键 `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN`：producer=环境变量 → client.js 读取 → probeDaemon 消费；缺省 → probe unavailable
- `allowedPaths`：**SillySpec 侧 assess/apply 校验**（worker 终态后 SillySpec git diff 检查改动 ∈ allowed_paths）；**SillyHub 侧不物化**（dispatch_worker 无 allowed_paths 参数，read_only 是工具白名单非路径白名单）（UB-7）

## 接口定义

```ts
// src/dispatch/probe.js（JS 可测，被 CLI 子命令 + 策略调）
probeSillyHub(): Promise<{ available: boolean; reason?: string }>

// src/dispatch/strategy.js（生成注入 prompt 的派发指令，agent 据此执行）
renderDispatchInstruction(contract: DispatchContract, probe: ProbeResult): { instruction: string, backend: 'sillyhub' | 'local' }

interface DispatchContract {
  brief: string              // 任务目标 + 蓝图路径
  worktreePath: string       // SillySpec worktree 绝对路径（worker cwd）
  branch: string             // worktree 当前分支
  allowedPaths: string[]     // task 边界（SillySpec 侧 assess/apply 校验，SillyHub 不物化）
  readOnly: boolean          // execute 写模式=false
  modelHint?: string         // tasks.md [model:xxx] → SillyHub model
  agentProfileHint?: string  // → SillyHub agent_profile_id
  runId: string              // SillySpec execute-run id（关联）
  missionId?: string         // Wave 级 mission id（D-008 一 Wave 一 mission）
}

// CLI 子命令（agent 调用桥）
// sillyspec dispatch probe → ProbeResult
// sillyspec dispatch hint --contract <json> → 派发指令文本（含用哪个后端/tool 参数/轮询/回收）

// src/sillyhub-mcp/client.js
class SillyHubMcpClient {
  probeDaemon(): Promise<boolean>
  createMission({objective, changeId, budgetUsd}): Promise<{missionId}>
  dispatchWorker({missionId, objective, worktreePath, branch, readOnly, model, agentProfileId, workerPrompt?}): Promise<{workerId, status}>
  listWorkers(missionId): Promise<Worker[]>
  killLease(workerId): Promise<void>   // 超时 fallback 防双写（UB-6）
}
```

## 生命周期契约表

本变更涉及 SillyHub worker run 生命周期感知（SillySpec 侧轮询，不直接管 lease/daemon）。SillySpec 与 SillyHub 的生命周期边界（命中 lease/agent_run/daemon/lifecycle）：

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| create mission | SillySpec(execute, 一 Wave 一) | SillyHub | objective, change_id, budget_usd | mission active |
| dispatch worker | SillySpec(agent 经指令) | SillyHub | mission_id, objective, worktree_path, branch, model, read_only | worker pending→running |
| claim lease | SillyHub daemon | SillyHub backend | leaseId, claimToken, agentRunId | worker pending→running（SillySpec 不直接参与，仅轮询感知） |
| worker turn result | SillyHub daemon | SillyHub backend | runId, status, output | worker running→completed/failed（SillySpec 轮询 list_workers 感知） |
| kill lease（超时 fallback） | SillySpec(dispatcher) | SillyHub | workerId | worker running→killed（防双写，UB-6） |
| SillySpec Review Gate | SillySpec | （本地） | worker 终态后 worktree 工作区 git diff（不依赖 worker commit）, review.json | execute task 未审→已审 |
| apply | SillySpec | （本地 git） | worktree diff, assess decision | worktree→main（SillySpec 自己，不用 converge） |

> lease/claim/heartbeat 由 SillyHub daemon 内部管理（execution.py / finalizer.py），SillySpec 不直接发起/接收，仅通过 list_workers 轮询感知 worker run 状态。converge_mission 不调用（D-004）。agent_run 状态机：pending→running→completed/failed/killed。worker 不 git commit（路径A 第三处 UB-1），改动留工作区交 SillySpec diff。

## 数据模型

SillySpec 侧无 DB schema 变更（progress.db 不动）。SillyHub 侧 AgentRun 已有 `worktree_branch` 列（路径A 复用，不新增列）；`worktree_path` 是 dispatch_worker 入参（非持久化新列）。SillySpec 新增运行时文件：无（dispatch 走内存 + 既有 .runtime/execute-runs）。

## 兼容策略（brownfield 必填）

- **未配置 MCP**（无 `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN`）→ `probeSillyHub()` 返回 unavailable → 全程 Local，execute/verify/scan 行为 100% = 现状，零回归
- **路径 A 未落地**（SillyHub dispatch_worker 不支持 worktree_path / worker_prompt 覆写）→ SillyHubMcpBackend stub 检测到 → 降级提示 + per-call fallback Local
- **回退路径**：dispatcher 策略始终生成 Local 兜底指令，任何 SillyHub 路径异常 → agent 回退 Agent tool
- **不改变**：progress.db schema、review.json 契约、worktree 生命周期、stage-contract 门控、machine-interface gate/derive、scan/verify 现有流程

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 路径A 跨仓依赖：SillyHub 须改三处（dispatch_worker schema + execution.py 跳自建 + render_worker_prompt 不 commit），任一未落地 SillyHub 后端接不通 | P0 | SillySpec 侧先做抽象层+Local+探测+stub；SillyHub 侧路径A独立变更改三处后接通；接通前 stub fallback Local |
| R-02 | worker 终态轮询延迟/超时（CLI 同步语义等待） | P1 | list_workers 轮询间隔 15s + per-worker 超时可配；超时 kill lease 防双写 + fallback Local；长任务优化留 webhook |
| R-03 | read_only 粒度矛盾影响 execute acceptance + verify QA | P1 | 第一波 execute task 用写模式 + acceptance 强制 tier=self；acceptance/verify QA 接入推后第二波（待 SillyHub 加细粒度 tool 策略） |
| R-04 | model/agent_profile 映射规则 | P1 | tasks.md [model:xxx] + dispatch 配置映射到 SillyHub model/profile |
| R-05 | daemon 发现/token 配置 | P2 | env 变量 SILLYHUB_MCP_URL/TOKEN（缺省 fallback） |
| R-06 | 能力探测误判（daemon 临时抖动） | P2 | 负面结果缓存 TTL + 重试；探测失败保守 fallback |
| R-07 | 双后端行为不一致（Local vs SillyHub 产出形态） | P1 | 回收统一走 review.json（SillySpec 对 worktree 工作区 git diff 写），屏蔽后端差异 |
| R-08 | daemon ws.root_path 不含 SillySpec worktree → assertWithinAllowedRoots 拒（UB-3） | P1 | 配置约束 daemon ws.root_path ≥ SillySpec 主仓根；probe 时校验 worktreePath 在 root_path 内，不在 → fallback Local + 提示 |
| R-09 | dispatcher 策略说用 SillyHub 但 agent 误执行 Local（或反之） | P2 | 派发指令明确单后端；回收时 DispatchResult.backend 字段校验与策略一致 |

## 决策追踪

当前版本决策（详见 `decisions.md`）：
- D-001@v1 集成拓扑 SillySpec 单向调 SillyHub → §总体方案 Phase3 / §兼容策略
- D-002@v1 本机 + worker 在 SillySpec worktree → §Phase3 / §生命周期契约表
- D-003@v2 路径A 改 SillyHub **三处**（dispatch_worker schema + execution.py 跳自建 + render_worker_prompt 不 commit）→ §Phase5 / §文件变更清单字段流（supersedes D-003@v1，UB-1）
- D-004@v1 SillySpec 自己 apply 不用 converge → §Phase3 / §生命周期契约表
- D-005@v1 双后端 + 能力探测 + 现有零影响 → §Phase4 / §兼容策略
- D-006@v1 execute 主接入点 → §Phase3
- D-007@v1 dispatcher = 探测+策略（非执行体），agent 执行派发 → §Phase1（UB-2）
- D-008@v1 一 Wave 一 mission 映射 → §Phase3（UB-4）

未解决：R-03 第二波（acceptance/verify QA 的 SillyHub 接入，待 SillyHub 加细粒度 tool 策略）。

## 自审

- [x] 必填章节齐全（背景/目标/非目标/方案/文件清单/接口/兼容/风险/决策/自审）
- [x] 命中 lifecycle 关键词（lease/agent_run/daemon）→ 含生命周期契约表 ✓
- [x] 文件变更清单含字段数据流标注（worktreePath/branch / modelHint / 终态 / 配置键 / allowedPaths）✓
- [x] 兼容策略明确（无配置→现状零回归；路径A未落地→fallback）✓
- [x] 决策 D-001~D-008 均有章节覆盖 ✓
- [x] Design Grill 7 条 P1/P2 已修正：UB-1（路径A第三处 render_worker_prompt）/UB-2（dispatcher 探测+策略非执行体）/UB-3（daemon root_path 约束 R-08）/UB-4（一 Wave 一 mission D-008）/UB-5（R-03 scope 扩 acceptance）/UB-6（轮询参数化+kill lease）/UB-7（allowedPaths 文案）✓
- ⚠️ 自审存疑：probeSillyHub 缓存 TTL / 轮询间隔/超时具体值待 plan 定（local.yaml 可配）
- ⚠️ 自审存疑：路径A 跨仓落地时序（SillySpec stub vs SillyHub 三处改动版本协调）plan 阶段定 milestone
