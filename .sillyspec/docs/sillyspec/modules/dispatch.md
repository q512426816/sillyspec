---
schema_version: 1
doc_type: module-card
module_id: dispatch
author: qinyi
created_at: 2026-08-07T14:50:00+08:00
---
# dispatch

## 定位

子代理派发抽象层（task-dispatcher）。统一 execute（及未来 verify/scan）的子代理派发入口，**双后端 + 能力探测**（D-005）：默认/降级 = 本机 Agent tool（现状零回归），探测到 SillyHub MCP 可用且路径A 落地时用 SillyHub worker。

**关键定位（D-007）：dispatcher 不是 JS 执行体**。本机 Agent tool 与 SillyHub MCP tool 都只有 agent 能调，CLI（Node）进程调不了。所以本模块 = **探测（probe.js）+ 派发策略生成（strategy.js）+ 后端指令模板（backends/）**，生成注入 execute prompt 的「派发指令文本」，实际 tool 调用由 agent 执行。

## 契约摘要

- **src/dispatch/probe.js** — `probeSillyHub({client?, worktreePath?, rootPath?, ttlMs?})` → `Promise<{available, reason?}>`；`clearProbeCache()`；`DEFAULT_PROBE_TTL_MS`。env 缺 → `{available:false, reason:'no-config'}` 不发网络（零回归关键）；负面缓存 TTL（daemon 抖动免反复探测，R-06）；root_path 越界校验（R-08）。
- **src/dispatch/strategy.js** — `renderDispatchInstruction(contract, probe)` → `{instruction, backend}`。backend 由 `probe.available` 驱动（sillyhub/local）；sillyhub 分支始终附 Local 兜底；路径A 未支持时附降级提示（不改 backend 标签）。
- **src/dispatch/backends/local-agent.js** — `renderLocalInstruction(contract)` + `LOCAL_RECYCLE_RULE`。Local 后端指令模板（workdir=worktreePath、回收走既有 review.json、忽略 modelHint/agentProfileHint）。
- **src/dispatch/backends/sillyhub-mcp.js** — `renderSillyHubInstruction(contract)` + `isPathASupported()`（stub 恒 false）+ `SILLYHUB_RECYCLE_RULE` + `PATH_A_DOWNGRADE_REASON`。SillyHub 后端指令模板（一 Wave 一 mission、dispatch_worker 含 worktree_path、轮询 list_workers + 超时 kill lease、worker 不 commit 留工作区）。
- **DispatchContract** typedef（定义在 local-agent.js，strategy/sillyhub-mcp 复用）：`{brief, worktreePath, branch, allowedPaths, readOnly, modelHint?, agentProfileHint?, runId, missionId?}`。

## 关键逻辑

```
execute buildWavePrompt(worktreePath, options)
  → getDispatchMode()  同步：env 配置 + isPathASupported()  → 'local' | 'sillyhub' | 'local-fallback'
     · local（无 env）→ 不注入派发段 → 输出与改前字节一致（零回归）
     · sillyhub（env + 路径A 落地）→ 注入完整 SillyHub 指令
     · local-fallback（env + 路径A stub）→ 注入短提示，派发走 Local
  → renderDispatchInstruction(contract, probe)  仅 sillyhub 分支调
     → backend = probe.available ? 'sillyhub' : 'local'
     → sillyhub: renderSillyHubInstruction + (路径A 降级提示 if !isPathASupported) + Local 兜底
     → local: renderLocalInstruction（与现状逐字相等）
  → agent 按注入指令执行实际 tool 调用（Agent tool / MCP dispatch_worker）
```

CLI 桥（agent 调用）：`sillyspec dispatch probe` → ProbeResult；`sillyspec dispatch hint --contract <json>` → `{instruction, backend}`。

## 注意事项

- **零回归（D-005）**：无 `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN` 时 `getDispatchMode()='local'`，execute buildWavePrompt 不注入派发段，输出与改前字节一致。
- **路径A stub（D-003@v2 / R-01）**：SillyHub 侧三处改动（dispatch_worker 加 worktree_path/branch/worker_prompt、execution.py 跳自建、render_worker_prompt 不 commit）跨仓未落地 → `isPathASupported()=false` → SillyHub 指令附降级提示 + Local 兜底。详见跨仓契约 `docs/sillyspec/sillyhub-path-a-contract.md`。
- **不调 converge_mission**（D-004）：SillySpec 自己对 worktree 工作区 git diff + apply，回收统一走既有 review.json 契约（屏蔽后端差异，R-07）。
- **一 Wave 一 mission（D-008）**：SillyHub 后端每个 Wave 创建独立 mission（change_id + per-Wave budget），Wave 内 task→worker 并行，Wave 间 mission 串行。
- **轮询 + kill lease（UB-6）**：SillyHub 后端 agent 轮询 `list_workers`（间隔默认 15s），per-worker 超时 → kill lease 防双写 + fallback Local 重派。
- TTL/轮询间隔可配 `.sillyspec/local.yaml` 的 `dispatch:` 段（`probe_ttl_ms` / `poll_interval_ms` / `worker_timeout_ms`），不硬编码。
- 测试：`test/dispatch/strategy.test.mjs`（probe/strategy/fallback 单测，DI mock）+ `test/dispatch/execute-dispatch-integration.test.mjs`（Local/SillyHub 两路径 + 零回归）。

## 变更索引

- 2026-08-07-sillyhub-mcp-dispatch | 新建派发抽象层（probe/strategy/backends×2）+ dispatch CLI 子命令 + execute buildWavePrompt 接入。双后端 fallback，无 MCP 配置零回归。SillyHub 后端为路径A stub。
- ql-20260812-006-d70c | execute 测试用例设计引导注入：新增 `templates/prompts/testcase-design.md` 单一源（6 条检查 + FIRST/金字塔/AAA 一行带过），经 `{{include: testcase-design}}` 注入 renderLocalInstruction「子代理 prompt 要点」+ renderSillyHubInstruction worker_prompt 覆写（SillyHub worker 不见 wave prompt，必须自包含）。复用 P2.2.3 include 机制（resolvePromptIncludes 运行时解析）防双写漂移。

## 人工备注
<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES_END -->
