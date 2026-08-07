---
author: qinyi
created_at: 2026-08-07 11:47:20
change: 2026-08-07-sillyhub-mcp-dispatch
---

# 提案书（Proposal）

## 动机
SillyHub 平台已暴露对外 MCP（8 tool），提供 agent 团队派发 + 治理框架（lease/审计/预算/终态追踪/多 agent 编排）+ 异构模型/agent 能力。SillySpec execute 的子代理派发硬编码本机 Agent tool，用不上这些能力——无法跨模型/agent、无治理审计、execute.js "按复杂度分配模型"意图落空。本次在不破坏现有门控的前提下，按需借用 SillyHub 治理框架 + 异构模型，MCP 非必须、现有功能零影响。

## 关键问题
1. **本机 Agent tool 只有同模型家族几种 subagent_type，无法跨模型/agent**——execute.js "架构→最强 / 常规→中等 / 简单→快速 / 文档→写作" 的模型分配意图落空（本机做不到真分配）
2. **无治理审计**——子代理派发无 lease/预算/终态追踪/多 agent 编排，长任务不可观测、不可控
3. **硬编码绑定单一执行体**——execute buildWavePrompt 写死 "Agent tool 启动子代理"，无法按需切换执行后端

## 变更范围
- 新增派发抽象层 task-dispatcher（probe.js 探测 + strategy.js 策略生成 + 后端指令模板），**定位=探测+策略非执行体**（agent 执行实际 tool 调用，D-007）
- 新增 SillyHub MCP 客户端 + `dispatch` CLI 子命令（probe/hint，agent 调用桥）
- 改 execute buildWavePrompt：派发经 dispatch hint，一 Wave 一 mission（D-008），轮询 list_workers + kill lease 防双写
- 双后端 + 能力探测 + fallback（D-005）：无 MCP 配置→全程 Local 零回归
- 跨仓契约声明（路径 A 改 SillyHub 三处，D-003@v2）：SillyHub 侧独立变更，本次留 stub

## 不在范围内（显式清单）
- execute acceptance（tier=independent）+ verify QA 的 SillyHub 接入（read_only 粒度矛盾，R-03 第二波；第一波 acceptance 强制 tier=self）
- scan 7 文档接入（次要接入点，推后）
- webhook/SSE 实时推送（R-02，默认轮询，webhook 留长任务优化）
- SillyHub 侧路径 A 实际代码（跨仓 multi-agent-platform 独立变更）
- _module-map.yaml schema 升级（既有问题，另案）
- 翻转控制权（SillyHub 调 SillySpec，违背控制器定位）

## 成功标准（可验证）
- 无 SILLYHUB_MCP_URL/TOKEN 配置时，execute/verify/scan 行为 100% = 现状（零回归，npm test 全绿）
- 配置 MCP + 本机 daemon 可用 + 路径A 落地后，execute Wave 并行子代理经 SillyHub worker 派发（异构 model/agent），worker 改动在 SillySpec worktree 可 git diff，Review Gate + apply 正常
- 路径A 未落地时，SillyHubMcpBackend stub 检测→fallback Local，不破坏
- probe/strategy/dispatcher 有单测覆盖（探测/fallback/策略生成/kill lease）
