---
id: task-06
title: execute.js getDispatchMode hasConfig 改读源 + 行121/240 兜底
title_zh: execute hasConfig + 兜底
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P0
depends_on: [task-03]
blocks: [task-07]
requirement_ids: [FR-03, FR-06]
decision_ids: [D-004@v1, D-005@v1]
allowed_paths:
  - src/stages/execute.js
provides: []
expects_from:
  task-03:
    - contract: readMcpConfigResult
      needs: [url, token]
---

## 目标

`getDispatchMode(:458)` 的 `hasConfig` 从读 env 改为 `readMcpConfig(cwd)`（含 env fallback，task-03 提供）；`dispatchSection(:602)` 文案改述；行121/240 读 local.yaml 加缺失兜底引导。派发三态语义（local/local-fallback/sillyhub）不变。

## 实现步骤

- 顶部 import `readMcpConfig` from `../sillyhub-mcp/config.js`
- `getDispatchMode`（:457-461）：`hasConfig` 由 `!!(process.env.SILLYHUB_MCP_URL && process.env.SILLYHUB_MCP_TOKEN)` 改为 `!!readMcpConfig(process.cwd())`；`if (!hasConfig) return 'local'` 与 `isPathASupported()` 分支不变（三态判定逻辑不改）
- `dispatchSection`（:602）：「检测到 `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN`」改述为「检测到 local.yaml mcp 段或 env 配置」（不引用 env 变量名）
- 行121（加载上下文「4. 读取 local.yaml」）/ 行240（运行测试「1. 读取 local.yaml」）操作后追加「若 local.yaml 不存在，先 `sillyspec local detect` 生成骨架再读取」

## 验收标准

- 不设 env 且无 mcp 段 → `getDispatchMode()` 返回 `'local'`（与现状字节一致，buildWavePrompt 不注入派发段，零回归，FR-06 / R-08）
- 派发三态语义（local/local-fallback/sillyhub）不变，仅 `hasConfig` 读源 env→readMcpConfig 变（FR-06）
- 行121/240 prompt 含「先 `sillyspec local detect`」兜底引导（FR-03 / D-004@v1）
- `dispatchSection` :602 文案不再引用 `SILLYHUB_MCP_URL`/`SILLYHUB_MCP_TOKEN` 变量名

## 验证方式

- `npm test` 全量通过（dispatch 相关零回归）+ `npm run lint`
- grep 确认行121/240 含兜底措辞、:602 无 env 变量名、:458 改为 readMcpConfig

## 约束

- 只改 `src/stages/execute.js`；`readMcpConfig` 由 task-03 提供，本任务不实现 helper
- 镜像 `docs/prompt/execute.md` 由 task-12 跑 `_extract.mjs` 自动刷新，本步只改源码不手改镜像
