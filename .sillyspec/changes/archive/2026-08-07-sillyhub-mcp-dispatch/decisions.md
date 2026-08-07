---
author: qinyi
created_at: 2026-08-07T11:17:23+08:00
updated_at: 2026-08-07T11:41:18+08:00
change: 2026-08-07-sillyhub-mcp-dispatch
---

# 决策记录（Decisions）— SillyHub MCP 派发抽象层接入

## D-001@v1: 集成拓扑 — SillySpec 单向调 SillyHub
- type: architecture
- status: accepted
- source: user
- priority: P0
- question: SillySpec 与 SillyHub 谁是主控？
- answer: SillySpec 作为流程控制器，单向调用 SillyHub MCP 派 worker；不翻转控制权（不接受 SillyHub orchestrator 反向编排 SillySpec）
- normalized_requirement: SillySpec 经 MCP tool 调 SillyHub（create_mission/dispatch_worker/list_workers）；SillyHub 不反向驱动 SillySpec 流程
- impacts: [Phase3 execute 接入, dispatcher 设计]
- evidence: 用户"图治理框架" + SillySpec 控制器定位（memory sillyspec-positioning-not-features / sillyspec-rejects-code-first-mode）

## D-002@v1: 本机约束 — daemon 本机 + worker 在 SillySpec worktree
- type: boundary
- status: accepted
- source: user
- priority: P0
- question: worker 在哪执行？代码落在哪？
- answer: SillyHub daemon 必须本机；worker 在 SillySpec 自建 worktree 干活（代码可控可核验，SillySpec 能 git diff）
- normalized_requirement: worker cwd = SillySpec worktreePath；禁止跨机执行；worker 改动落 SillySpec worktree 工作区，SillySpec 本地 git diff 可见
- impacts: [Phase5 路径A 契约, worktree 模块, Review Gate 回收, R-08 daemon root_path]
- evidence: 用户"必须本机不然代码不知道写哪去"

## D-003@v2: 路径 A — 改 SillyHub 三处（含 render_worker_prompt）
- type: architecture
- status: accepted
- supersedes: D-003@v1
- source: design-grill (UB-1)
- priority: P0
- question: 如何让 worker 进 SillySpec worktree 且不污染分支历史？（D-003@v1 漏了 worker commit prompt）
- answer: SillyHub 须改三处：(1) dispatch_worker 加可选 worktree_path+branch；(2) execution.py:184-236 caller 提供则跳过自建 worktree/分支；(3) **render_worker_prompt（execution.py:105-129）改：worker 不 git commit，留工作区改动交 SillySpec git diff**（或 dispatch_worker 加 worker_prompt 覆写参数让 caller 控制）。不传走原逻辑（向后兼容）
- normalized_requirement: dispatch_worker schema 增 worktree_path/branch（可选）+ worker_prompt 覆写（可选）；execution.py 检测 caller worktree_path 跳自建；render_worker_prompt 路径A分支下不 commit；daemon workspace.ts 分支0 复用
- impacts: [SillyHub 侧独立变更 multi-agent-platform（改三处）, SillySpec 侧 client 调用契约, R-01]
- evidence: agent 调研 execution.py:105-129（render_worker_prompt 硬编码 git add -A && git commit）/ 184-236 / placement.py:419 / workspace.ts:136-154；Grill UB-1 + X-1/X-6（worktree-apply diff vs 工作区仍捕获，非数据丢失故 P1 非 P0）

## D-004@v1: 合并机制 — SillySpec 自己 apply，不用 converge
- type: architecture
- status: accepted
- source: design
- priority: P0
- question: 代码合并回主干谁负责？
- answer: SillySpec 保留 worktree/assess/apply 全套门控；SillyHub converge_mission 不调用
- normalized_requirement: worker 终态后 SillySpec 对自己 worktree 工作区 git diff 走 Review Gate + apply；converge_mission 不在 SillySpec 流程调用
- impacts: [execute 完成步骤, worktree-apply, 生命周期契约表]
- evidence: 两套合并范式重叠分析（SillySpec worktree/apply vs SillyHub converge_mission）

## D-005@v1: 双后端 fallback — MCP 非必须，现有功能零影响
- type: architecture
- status: accepted
- source: user
- priority: P0
- question: MCP 挂了怎么办？影响现有功能吗？
- answer: 派发抽象层双后端+能力探测；默认/降级=本机 Agent tool（现状零改动），探测到本机 daemon 可用才用 SillyHub worker
- normalized_requirement: 派发前 probe daemon；探测失败/无配置 → fallback Local，现有 execute/verify/scan 流程零行为变化
- impacts: [Phase4 能力探测, dispatcher 策略后端选择, 兼容策略]
- evidence: 用户"MCP 非必须，先获取有才用，不然本地 agent，不影响现有功能"；Grill X-确认 D-005 fallback 故事扎实

## D-006@v1: 主接入点 — execute 并行子代理
- type: premise
- status: accepted
- source: user
- priority: P0
- question: 先接哪个步骤？
- answer: execute Wave 并行子代理为主接入点（dispatch_worker 的 model/agent_type/agent_profile_id 异构模型/agent 是本机 Agent tool 给不了的增量）；verify QA/scan 次要
- normalized_requirement: 第一波实现 execute task 的 SillyHub 后端（写模式，acceptance 强制 tier=self 避开 read_only 矛盾）；acceptance/verify QA 接入推后第二波
- impacts: [execute buildWavePrompt 改造, 范围分波, NonGoals R-03]
- evidence: 用户"子代理并行也可以用，MCP 不同模型 agent 可能更适合"

## D-007@v1: dispatcher 定位 — 探测 + 策略（非执行体）
- type: architecture
- status: accepted
- source: design-grill (UB-2)
- priority: P0
- question: task-dispatcher 作为 JS 执行体（dispatchTask→result）可行吗？
- answer: 不可行。Local 后端的 Agent tool、SillyHub 后端的 MCP tool 都只有 agent 能调，CLI（Node）进程调不了。dispatcher = 探测（probe.js）+ 派发策略生成（strategy.js renderDispatchInstruction 注入 prompt），实际 tool 调用由 agent 执行
- normalized_requirement: dispatcher 不实现 dispatchTask 执行体；probe.js（probeSillyHub 可测）+ strategy.js（renderDispatchInstruction 生成指令）+ CLI 子命令（dispatch probe / dispatch hint，agent 调用桥）；agent 按指令调 MCP dispatch_worker 或 Agent tool
- impacts: [Phase1 dispatcher 结构, Phase2 CLI 子命令, 接口定义, 文件清单]
- evidence: Grill UB-2 + X-2（execute step agent-driven，agent 用 Agent tool 启子代理；文件清单原无 CLI 子命令/MCP 暴露）

## D-008@v1: 映射粒度 — 一 Wave 一 mission
- type: architecture
- status: accepted
- source: design-grill (UB-4)
- priority: P1
- question: execute-run ↔ mission 映射粒度（一 execute-run 一 mission vs 一 Wave 一 mission）？
- answer: 一 Wave 一 mission。保 Wave 内并行（多 worker）/ Wave 间串行（mission 顺序）/ 独立 budget（per Wave）/ change_id 绑定（mission.change_id = SillySpec change）
- normalized_requirement: 每个 Wave 创建独立 mission（create_mission change_id+budget_usd）；Wave 内 task→worker 并行 dispatch；Wave 间 mission 串行；不把全 Wave 塞一个 mission（失串行）
- impacts: [Phase3 映射, create_mission 调用, budget 挂载]
- evidence: Grill UB-4 + X-10（一 mission 塞全 Wave 失串行；create_mission 有 change_id + 独立 budget）
