---
plan_level: full
author: qinyi
created_at: 2026-08-07 11:52:47
change: 2026-08-07-sillyhub-mcp-dispatch
---

# 实现计划（Plan）— SillyHub MCP 派发抽象层接入

## Spike 前置验证
无。技术方案确定性高（design v2 + Grill 已对照源码/SillyHub 能力核验）。唯一跨仓不确定性（SillyHub 路径A 三处改动）以 stub + fallback 兜底，不需 Spike。

## Wave 1（基础，并行，无依赖）
- [x] task-05: 新建 src/sillyhub-mcp/client.js（MCP HTTP 客户端 + probeDaemon + killLease）（覆盖：FR-01, FR-05）
- [x] task-03: 新建 src/dispatch/backends/local-agent.js（Local 派发指令模板 + 回收约定）（覆盖：FR-02, D-005@v1）

## Wave 2（派发抽象层，依赖 Wave 1）
- [x] task-01: 新建 src/dispatch/probe.js（probeSillyHub 探测 + 负面缓存 TTL）（覆盖：FR-01, FR-07, D-005@v1）
- [x] task-04: 新建 src/dispatch/backends/sillyhub-mcp.js（SillyHub 指令模板 + 路径A stub + 参数检测 fallback）（覆盖：FR-02, FR-06, D-003@v2）

## Wave 3（策略 + CLI 子命令，依赖 Wave 2）
- [x] task-02: 新建 src/dispatch/strategy.js（renderDispatchInstruction 策略生成）（覆盖：FR-03, D-007@v1）
- [x] task-06: src/index.js 新增 dispatch CLI 子命令（probe / hint）（覆盖：FR-03, D-007@v1）

## Wave 4（execute 接入，依赖 Wave 3）
- [x] task-07: 改 src/stages/execute.js buildWavePrompt（派发经 dispatch hint + 一 Wave 一 mission + 轮询 list_workers + kill lease 防双写）（覆盖：FR-04, FR-05, D-004@v1, D-006@v1, D-008@v1）

## Wave 5（测试，依赖 Wave 4）
- [x] task-08: 新建 test/dispatch/strategy.test.mjs（probe/策略/fallback/kill lease 单测，mock MCP/daemon）（覆盖：FR-01~FR-05）
- [x] task-09: execute 集成测试（Local/SillyHub 两路径 + 无 MCP 配置零回归）（覆盖：FR-02, FR-04, D-005@v1）

## Wave 6（文档 + 跨仓契约，依赖 Wave 4）
- [x] task-10: 更新 docs/sillyspec/file-lifecycle.md（dispatch/.sillyhub-mcp 运行时文件，规则19）
- [x] task-11: 新增 docs/sillyspec/modules/dispatch.md + sillyhub-mcp.md
- [x] task-12: 更新 .claude/skills/sillyspec-execute/SKILL.md（派发说明同步，规则19）
- [x] task-13: SillyHubMcpBackend stub 契约声明文档（路径A 三处期望 + daemon root_path 约束，供 multi-agent-platform 独立变更对齐）（覆盖：FR-06, FR-07, D-003@v2）

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | probe.js 探测 | W2 | P0 | task-05 | FR-01, FR-07, D-005@v1 | probeSillyHub + 负面缓存 + root_path 校验 |
| task-02 | strategy.js 策略 | W3 | P0 | task-01 | FR-03, D-007@v1 | renderDispatchInstruction 注入 prompt |
| task-03 | local-agent.js | W1 | P0 | — | FR-02, D-005@v1 | Local 派发指令模板 + 回收约定 |
| task-04 | sillyhub-mcp.js | W2 | P0 | task-05 | FR-02, FR-06, D-003@v2 | SillyHub 指令模板 + 路径A stub |
| task-05 | client.js | W1 | P0 | — | FR-01, FR-05 | MCP HTTP 客户端 + probeDaemon + killLease |
| task-06 | dispatch CLI | W3 | P0 | task-01, task-02 | FR-03, D-007@v1 | sillyspec dispatch probe/hint 子命令 |
| task-07 | execute 接入 | W4 | P0 | task-02, task-06 | FR-04, FR-05, D-004/006/008@v1 | buildWavePrompt 改造 ⚠️撞并行改动 |
| task-08 | strategy 单测 | W5 | P0 | task-02, task-06 | FR-01~05 | mock MCP/daemon |
| task-09 | execute 集成测试 | W5 | P0 | task-07 | FR-02, FR-04, D-005@v1 | Local/SillyHub 两路径 + 零回归 |
| task-10 | file-lifecycle 同步 | W6 | P1 | task-07 | — | 规则19 |
| task-11 | modules 文档 | W6 | P1 | task-07 | — | dispatch/sillyhub-mcp 模块文档 |
| task-12 | skills 同步 | W6 | P1 | task-07 | — | 规则19 |
| task-13 | stub 契约声明 | W6 | P1 | task-04 | FR-06, FR-07, D-003@v2 | 跨仓对齐文档 |

## 关键路径
task-05 → task-01 → task-02 → task-06 → task-07 → task-09（最长路径：client→probe→strategy→CLI→execute→集成测试）

## 全局验收标准
- [ ] 所有单元测试通过（npm test）
- [ ] lint 通过（npm run lint）
- [ ] 无 SILLYHUB_MCP_URL/TOKEN 配置时 execute/verify/scan 行为 100% = 现状（零回归）
- [ ] probe/strategy/fallback/kill lease 单测覆盖（task-08）
- [ ] execute 集成测试覆盖 Local/SillyHub 两路径（task-09）
- [ ] 规则19 文档同步（file-lifecycle/modules/skills，task-10~12）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02, task-06, task-07 | SillySpec 单向调 SillyHub（策略+CLI+execute） |
| D-002@v1 | task-04, task-07, task-13 | 本机 + worker 在 SillySpec worktree |
| D-003@v2 | task-04, task-13 | 路径A 改 SillyHub 三处（stub 声明） |
| D-004@v1 | task-07 | SillySpec 自己 apply 不用 converge |
| D-005@v1 | task-01, task-03, task-04, task-09 | 双后端 + 探测 + 零回归 |
| D-006@v1 | task-07 | execute 主接入点 |
| D-007@v1 | task-02, task-06 | dispatcher 探测+策略非执行体 |
| D-008@v1 | task-07 | 一 Wave 一 mission |
| FR-01 | task-01, task-05 | 能力探测 |
| FR-02 | task-03, task-04, task-09 | 双后端 fallback |
| FR-03 | task-02, task-06 | 派发策略生成 |
| FR-04 | task-07, task-09 | execute 接入 |
| FR-05 | task-05, task-07 | 轮询 kill lease |
| FR-06 | task-04, task-13 | 跨仓契约 stub |
| FR-07 | task-01, task-13 | daemon root_path 约束 |

## 全局风险（plan 级）
- ⚠️ **task-07 改 src/stages/execute.js 撞并行 session 未提交改动**（提示词修复第二批：execute.js/quick.js/scan.js + docs/prompt/*）。execute 实现前必须确认并行改动已 commit/落地，否则冲突。task-07 allowed_paths 含 src/stages/execute.js，子代理实现时以最新 HEAD 为基线。
- R-01 路径A 跨仓未落地 → task-04/13 stub fallback（不阻断本变更 ship，SillySpec 侧可独立交付）
- R-03 acceptance/verify QA 接入第二波（本变更 scope 外，待 SillyHub 加细粒度 tool 策略）
