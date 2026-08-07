---
author: qinyi
created_at: 2026-08-07 11:47:20
change: 2026-08-07-sillyhub-mcp-dispatch
---

# 任务清单（Tasks）

> 细节在 plan 阶段展开（Wave 分组 + 依赖）。按 Phase 分组列任务名。

## 派发抽象层（Phase 1）
- [x] task-01: 新建 src/dispatch/probe.js（probeSillyHub 能力探测 + 负面缓存 TTL）
- [x] task-02: 新建 src/dispatch/strategy.js（renderDispatchInstruction 策略生成，注入 prompt）
- [x] task-03: 新建 src/dispatch/backends/local-agent.js（Local 派发指令模板 + 回收约定）
- [x] task-04: 新建 src/dispatch/backends/sillyhub-mcp.js（SillyHub 指令模板 + 路径A stub + 参数检测 fallback）

## MCP 客户端 + CLI 子命令（Phase 2）
- [x] task-05: 新建 src/sillyhub-mcp/client.js（MCP streamable HTTP 客户端 + probeDaemon + killLease）
- [x] task-06: src/index.js 新增 dispatch CLI 子命令（probe / hint，agent 调用桥）

## execute 接入（Phase 3）
- [x] task-07: 改 src/stages/execute.js buildWavePrompt（派发经 dispatch hint + 一 Wave 一 mission + 轮询 list_workers + kill lease 防双写）

## 测试
- [x] task-08: 新建 test/dispatch/strategy.test.mjs（probe/策略生成/fallback/kill lease 单测，mock MCP/daemon）
- [x] task-09: execute 集成测试（Local/SillyHub 两路径 + 无 MCP 配置零回归验证）

## 文档同步（规则19）
- [x] task-10: 更新 docs/sillyspec/file-lifecycle.md（新增 dispatch/.sillyhub-mcp 运行时文件）
- [x] task-11: 新增 docs/sillyspec/modules/dispatch.md + sillyhub-mcp.md
- [x] task-12: 更新 .claude/skills/sillyspec-execute.md（派发说明同步）

## 跨仓契约（Phase 5，声明 only）
- [x] task-13: SillyHubMcpBackend stub 契约声明文档（路径A 三处期望 + daemon root_path 约束，供 multi-agent-platform 独立变更对齐）
