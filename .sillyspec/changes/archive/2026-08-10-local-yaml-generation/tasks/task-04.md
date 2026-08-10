---
id: task-04
title: client.js 构造函数加 cwd 参数读 mcp 段
title_zh: client 构造签名
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P0
depends_on: [task-03]
blocks: [task-05]
requirement_ids: [FR-06]
decision_ids: [D-005@v1]
allowed_paths:
  - src/sillyhub-mcp/client.js
provides: []
expects_from:
  task-03:
    - contract: readMcpConfigResult
      needs: [url, token]
---

## goal

src/sillyhub-mcp/client.js 构造函数加 cwd 参数，凭据读源从直读 env 改为经 task-03 的 readMcpConfig(cwd)（local.yaml mcp 段 + env fallback）。建立优先级链：显式 url/token > readMcpConfig(cwd) > 兜底空串，5 处测试显式传参零回归。覆盖 FR-06 / D-005@v1。

## implementation

- 顶部 import：`import { readMcpConfig } from './config.js';`（task-03 提供，本步不实现 helper）
- 构造签名 :33 `constructor({ url, token, timeoutMs } = {})` → `constructor({ cwd, url, token, timeoutMs } = {})`
- cwd 默认 `process.cwd()`（design §7.3，与 CLI 主仓库根惯例一致）
- :34-35 读源改写（优先级链）：先 `const cfg = readMcpConfig(cwd);`（helper 内含 local.yaml mcp 段 + env fallback），再 `u = url !== undefined ? url : (cfg?.url ?? '')` / `t = token !== undefined ? token : (cfg?.token ?? '')`——显式参 > readMcpConfig > 兜底空串
- :37-38 _url 去尾斜杠 / _token 赋值不变；:43 `_configured = Boolean(_url && _token)` 不变（缺则降级不发网络）；:45 _endpoint 拼接不变
- 注释 :8-9 配置来源更新：「显式参数 > local.yaml mcp 段（via readMcpConfig）> 环境变量 SILLYHUB_MCP_URL/TOKEN（fallback）；构造函数可传 { cwd, url, token, timeoutMs }」

## 验收标准

对照 FR-06：
- 显式 url/token 传参覆盖一切（优先级最高 > readMcpConfig > env），5 处测试 `new SillyHubMcpClient({url,token})` 零回归（task-07 细化核验）
- 无显式参 → 经 readMcpConfig(cwd) 读 local.yaml mcp 段（task-03 contract readMcpConfigResult {url, token}）
- local.yaml 无 mcp 段且无显式参 → readMcpConfig env fallback 兼容旧部署（仍可配置）
- 都缺（无显式参 + readMcpConfig 返回 null）→ _configured=false → 所有方法降级不发网络（FR-06「不发网络」保证保留）
- 读源核对 client.js :33-47 真实行号未漂移（构造签名 + _url/_token/_configured/_endpoint 赋值）

## verify

- npm run lint（client.js 语法 / import 解析）
- npm test 不回归（构造签名变不破现有 path-a-probe 断言；5 处构造零回归细化核验属 task-07）
- grep 确认构造函数体（:33-47）内 `process.env.SILLYHUB_MCP_URL/TOKEN` 直读已迁出（env fallback 由 readMcpConfig 内含）

## constraints

- 仅改 src/sillyhub-mcp/client.js（allowed_paths 锁定）
- readMcpConfig 来自 task-03（expects_from），本步不实现 helper
- 仅改凭据读源；网络/fetch/SSE/JSON-RPC 逻辑不动（非目标 design §3）
- _configured/_endpoint 语义不变（缺则降级不发网络，现状契约保留，R-06）
