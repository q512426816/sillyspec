---
author: qinyi
created_at: 2026-08-07 11:47:20
change: 2026-08-07-sillyhub-mcp-dispatch
---

# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| SillySpec CLI | 流程控制器，提供 dispatch probe/hint 子命令 + 渲染派发指令注入 prompt |
| 控制 agent（execute） | 按派发指令执行实际 tool 调用（MCP dispatch_worker 或 Agent tool）+ 轮询 + 回收 |
| SillyHub daemon（本机） | 执行 worker run，管 lease/审计/预算（SillySpec 不直接碰 lease） |
| SillySpec Review Gate | worker 终态后对 worktree 工作区 git diff 写 review.json（机制不变） |

## 功能需求

### FR-01: 能力探测（probe）
覆盖：D-005@v1
Given 未配置 SILLYHUB_MCP_URL/TOKEN 或 daemon 不可达
When execute 启动调 probeSillyHub()
Then 返回 {available:false}，全程走 Local，现有行为零变化

Given 配置了 MCP 且本机 daemon 可达 + token 有效
When probeSillyHub() 调 list_agent_profiles
Then 返回 {available:true}，execute 可用 SillyHub 后端

### FR-02: 双后端 fallback
覆盖：D-005@v1
Given SillyHub 后端派发中单 worker 失败/超时
When dispatcher 检测失败
Then kill worker lease（防双写）+ per-worker fallback Local 重派

Given 路径A 未落地（dispatch_worker 不支持 worktree_path/worker_prompt）
When SillyHubMcpBackend 探测参数
Then 检测不支持→降级提示 + fallback Local

### FR-03: 派发策略生成
覆盖：D-007@v1
Given DispatchContract（brief/worktreePath/branch/allowedPaths/modelHint...）+ probe 结果
When renderDispatchInstruction(contract, probe)
Then 生成注入 execute prompt 的派发指令（用哪个后端/tool 参数/轮询/回收约定），agent 据此执行（dispatcher 非执行体）

### FR-04: execute 接入
覆盖：D-006@v1, D-008@v1, D-004@v1
Given execute Wave step
When buildWavePrompt 渲染
Then 派发指令经 dispatch hint（不再硬编码 Agent tool）；一 Wave 一 mission（create_mission change_id+budget）；Wave 内 task→worker 并行

Given worker 终态（轮询 list_workers）
When SillySpec 回收
Then git diff worktree 工作区（不依赖 worker commit，路径A 第三处）→ Review Gate → apply（SillySpec 自己，不用 converge）

### FR-05: 轮询 + kill lease
覆盖：UB-6
Given worker 跑超 per-worker 超时
When 轮询 list_workers 超时
Then report_progress 标记 + kill worker lease（防双写）+ fallback Local

### FR-06: 跨仓契约声明（stub）
覆盖：D-003@v2
Given SillyHub 侧路径A 未实现
When 本变更交付
Then SillyHubMcpBackend 为 stub（声明契约期望：dispatch_worker 加 worktree_path+branch+worker_prompt；execution.py 跳自建 + 改 render_worker_prompt 不 commit；daemon root_path 约束），探测不支持→fallback

### FR-07: daemon root_path 约束
覆盖：D-002@v1, R-08
Given SillySpec worktree 路径
When probe 时校验
Then worktreePath 须在 daemon ws.root_path 内（推荐 ws.root_path=SillySpec 主仓根）；不在→fallback Local + 提示

## 非功能需求
- 兼容性：无 MCP 配置时 100% 走原路径（brownfield-additive，零回归）
- 可回退：dispatcher 策略始终生成 Local 兜底指令；任何 SillyHub 异常→agent 回退 Agent tool
- 可测试：probe/strategy/fallback 有单测（mock MCP/daemon）；execute 集成测试覆盖 Local/SillyHub 两路径
- 跨仓解耦：SillySpec 侧独立 ship，SillyHub 侧路径A 独立变更，契约对齐
- 不改变：progress.db schema、review.json 契约、worktree 生命周期、stage-contract 门控、machine-interface gate/derive

## 决策覆盖矩阵
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-03, FR-04 | SillySpec 单向调 SillyHub |
| D-002@v1 | FR-04, FR-07 | 本机 + worker 在 SillySpec worktree |
| D-003@v2 | FR-06 | 路径A 改 SillyHub 三处 |
| D-004@v1 | FR-04 | SillySpec 自己 apply 不用 converge |
| D-005@v1 | FR-01, FR-02 | 双后端 + 能力探测 + 现有零影响 |
| D-006@v1 | FR-04 | execute 主接入点 |
| D-007@v1 | FR-03 | dispatcher 探测+策略非执行体 |
| D-008@v1 | FR-04 | 一 Wave 一 mission |

剩余风险：R-03（acceptance/verify QA 的 SillyHub 接入，第二波，待 SillyHub 加细粒度 tool 策略）。
