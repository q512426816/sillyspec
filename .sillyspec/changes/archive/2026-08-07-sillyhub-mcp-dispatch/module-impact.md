---
author: qinyi
created_at: 2026-08-07 16:35:00
change: 2026-08-07-sillyhub-mcp-dispatch
---

# 模块影响分析（Module Impact）— SillyHub MCP 派发抽象层接入

> 本变更（2026-08-07-sillyhub-mcp-dispatch）为 execute 引入派发抽象层，统一子代理派发入口（双后端 + 能力探测）。数据源：git diff（feat commit 8c98c71，以真实交付物为准）。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| dispatch | 新增 | src/dispatch/probe.js | probeSillyHub 能力探测（env 快速路径 + 负面缓存 TTL + root_path 校验） | false |
| dispatch | 新增 | src/dispatch/strategy.js | renderDispatchInstruction 派发策略生成（探测驱动 backend，注入 prompt） | false |
| dispatch | 新增 | src/dispatch/backends/local-agent.js | Local 后端指令模板 + 回收约定（零回归默认路径） | false |
| dispatch | 新增 | src/dispatch/backends/sillyhub-mcp.js | SillyHub 后端指令模板 + isPathASupported stub + 路径A 降级 | false |
| sillyhub-mcp | 新增 | src/sillyhub-mcp/client.js | MCP streamable HTTP 客户端（probeDaemon + createMission + dispatchWorker + listWorkers + killLease，best-effort） | false |
| cli-entry | 接口变更 | src/index.js | 新增 dispatch CLI 子命令（probe / hint，agent 调用桥） | false |
| stages | 调用关系变更 | src/stages/execute.js | buildWavePrompt 派发接入（getDispatchMode 同步门控 + dispatchSection 条件注入 + 一 Wave 一 mission） | false |
| runtime | 配置变更 | test/run-tests.mjs | 递归发现 .test.mjs（支持 test/dispatch/ 子目录，否则新测试被静默跳过） | false |
| runtime | 文档变更 | docs/sillyspec/file-lifecycle/storage-and-state.md | 新增 dispatch 运行时产物说明（无新 .runtime/ 文件 + 可选 local.yaml dispatch 配置） | false |
| worktree | 文档变更 | .claude/skills/sillyspec-execute/SKILL.md | execute 派发说明同步（双后端 + 零回归 + dispatcher 非执行体） | false |
| dispatch | 数据结构变更 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 注册 dispatch + sillyhub-mcp 两新模块（9 modules） | false |
| dispatch | 文档变更 | .sillyspec/docs/sillyspec/modules/dispatch.md | dispatch 模块卡片 | false |
| sillyhub-mcp | 文档变更 | .sillyspec/docs/sillyspec/modules/sillyhub-mcp.md | sillyhub-mcp 模块卡片 | false |
| sillyhub-mcp | 文档变更 | docs/sillyspec/sillyhub-path-a-contract.md | 跨仓契约声明（路径A 三处期望 + daemon root_path 约束） | false |

## 未匹配文件

以下文件出现在 git diff 范围内（相对 base 536cad9），但**非本 dispatch 变更产物**——属其他并行 session 的 sss 审计修复 / worktree 改进，登记提交于 `1e4944f chore(sss/worktree)` 清场 commit（为本变更 worktree-apply 解锁干净工作区而提交）。归档本变更**不涉及**这些文件的功能：

| 文件 | 归属 | 说明 |
|------|------|------|
| src/change-risk-profile.js | 其他 session（sss） | risk_level 覆盖逻辑（本变更 design 仅引用 frontmatter 声明，未改其代码） |
| src/run/complete.js | 其他 session（sss） | 元数据校验提示（本变更 verify-result 受其校验） |
| src/worktree-apply.js | 其他 session（sss） | apply gate filterDeliverableFiles 逻辑 |
| src/worktree.js | 其他 session（sss） | computeBaselineHash 逻辑 |
| docs/sss.md | 其他 session（sss） | sss 审计文档 |
| docs/sss1.md | 其他 session（sss） | sss 审计文档 |
| test/execute-batch-endtoend-checkbox.test.mjs | 其他 session（sss） | execute 批量完成测试 |
| test/worktree-apply-glob-patch.test.mjs | 其他 session（sss） | apply glob patch 测试 |
| test/worktree-overlay-eisdir.test.mjs | 其他 session（sss） | worktree overlay 测试 |

> 这些文件由对应 session 自行走流程归档，本 dispatch 变更不对其负责。

## 测试覆盖

| 模块 | 测试文件 | 覆盖 |
|------|----------|------|
| dispatch | test/dispatch/strategy.test.mjs（38 断言） | probe 三分支 + 负面缓存 + 策略两分支（local 逐字相等零回归）+ 路径A 降级 + kill lease + 常量 |
| dispatch + stages | test/dispatch/execute-dispatch-integration.test.mjs（30 断言） | Local 零回归（5 不含断言）+ SillyHub 路径 + local-fallback + 一 Wave 一 mission |

## 同步结论

- 新增模块 dispatch + sillyhub-mcp 已注册 _module-map.yaml（status=active, needs_review=false）。
- 模块卡片 dispatch.md / sillyhub-mcp.md 已创建，与实现接口签名一致。
- 受影响模块文档（file-lifecycle/skills/_module-map）已同步。
- 本变更无需 needs_review=true 的不确定影响（双后端零回归 + stub 现实已明确标注）。

## 更新结果

| 目标 | 操作 | 说明 |
|------|------|------|
| `_module-map.yaml: dispatch` | 已存在（Wave6 apply 回主干） | 跳过重复注册 |
| `_module-map.yaml: sillyhub-mcp` | 已存在（Wave6 apply 回主干） | 跳过重复注册 |
| `modules/dispatch.md` | 已存在（Wave6 apply 回主干） | 跳过重复写入 |
| `modules/sillyhub-mcp.md` | 已存在（Wave6 apply 回主干） | 跳过重复写入 |

> dispatch/sillyhub-mcp 是本变更自身新建模块，卡片 + _module-map 注册随 execute 交付物一起 apply 回主干，archive 阶段无需新增同步（用户确认跳过）。受影响的既有模块文档（cli-entry/stages/runtime/worktree）无结构变更，仅经 design 引用，不触发卡片更新。
