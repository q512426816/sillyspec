---
id: task-07
title: path-a-probe.test.mjs 5 处构造零回归核验
title_zh: path-a-probe 零回归
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P0
depends_on: [task-03, task-04, task-05, task-06]
blocks: []
requirement_ids: [FR-06]
decision_ids: [D-005@v1]
allowed_paths:
  - test/dispatch/path-a-probe.test.mjs
provides: []
expects_from: {}
---

## 目标

client.js 构造签名加 cwd（task-04）+ probe.js no-config 改读源（task-05）后，核验 test/dispatch/path-a-probe.test.mjs 5 处 `new SillyHubMcpClient({url,token})` 显式传参零回归（design §7.3 优先级链：显式 > readMcpConfig(cwd) > env > 空串），并补 no-config probe 零回归 case。

## 实现步骤

- 核验 5 处显式构造仍 `_configured=true`、monkey-patch `_sendRpc` 捕获正常：:274 用例4a createMission external / :290 用例4b 不传 orchestrationMode / :305 用例4c null / :319 用例5a dispatchWorker 全透传 / :341 用例5b 不传 branch（5 处均不传 cwd → 默认 process.cwd()，对显式 url/token 无影响）
- 补 probe no-config 零回归 case：`setEnv(undefined,undefined,undefined)` + 无 local.yaml mcp 段 → `probeSillyHub({client:mock})` 返回 `{available:false, reason:'no-config'}` 不发网络（现有用例2a/3a-3d/6a-6e 均设 env 走 configured 路径，无显式 no-config 用例）
- （可选）补 cwd 读源 case：构造传 cwd 指向含 mcp 段的 local.yaml 临时目录 → 核验 `_url/_token` 取自 mcp 段；若 task-03 helper 单测已覆盖 readMcpConfig 读源则跳过

## 验收标准

对照 FR-06：
- 5 处 `new SillyHubMcpClient({url,token})`（:274/290/305/319/341）构造成功 `_configured=true`，用例4a/4b/4c/5a/5b 既有断言全过（显式传参不受 cwd 默认影响，R-06 零回归）
- 不设 env 且无 local.yaml mcp 段 → `probeSillyHub` 返回 `{available:false, reason:'no-config'}` 不发网络（R-07 零回归关键保留）
- 新增 local.yaml mcp 段读取 case（如有）：构造传 cwd 指向含 mcp 段临时目录 → 凭据取自 mcp 段（task-03 readMcpConfig 间接集成验证）
- `npm test` 全量通过（含本文件）+ `npm run lint`

## 验证方式

- `npm test`（path-a-probe.test.mjs 用例4/5 零回归 + 新增 no-config / cwd case）+ `npm run lint`
- grep `new SillyHubMcpClient` 确认 5 处行号 :274/290/305/319/341 显式 `{url,token}` 传参未变

## 约束

- 测试契约变更对应 client 构造签名变更（task-04 加 cwd），非改测试通过错误逻辑——只核验显式传参优先级 + 补 readMcpConfig 读源 case，不改 createMission/dispatchWorker 既有断言
- client 构造签名（task-04）/ readMcpConfig（task-03）/ probe 改读源（task-05）/ execute getDispatchMode（task-06）由上游 task 提供，本任务只动 test/dispatch/path-a-probe.test.mjs
