---
id: task-05
title: probe.js configFingerprint/no-config 改读 readMcpConfig
title_zh: probe 改读源
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P0
depends_on: [task-03, task-04]
blocks: [task-07]
requirement_ids: [FR-06]
decision_ids: [D-005@v1]
allowed_paths:
  - src/dispatch/probe.js
provides: []
expects_from:
  task-03:
    - contract: readMcpConfigResult
      needs: [url, token]
---

## 目标

probe.js 三处改用 readMcpConfig(cwd) 读 local.yaml mcp 段（+ env fallback）：configFingerprint 缓存 key、probeSillyHub no-config 快速路径、new client 调用点。零回归关键：no-config 不发网络保证保留（R-07）。

## 实现方案

- 顶部加 `import { readMcpConfig } from '../sillyhub-mcp/config.js';`
- configFingerprint（:63-65，return 在 :64）加 cwd 参数，返回 `readMcpConfig(cwd)?.url || ''` 作负面缓存 key（env fallback 已含）；调用点 :150 改传 `process.cwd()`
- probeSillyHub no-config（:145）改读 `readMcpConfig(process.cwd())`，缺 url/token 任一 → `{available:false, reason:'no-config'}`（不发网络）
- `new SillyHubMcpClient()`（:158）改 `new SillyHubMcpClient({ cwd: process.cwd() })`

## 验收标准

- local.yaml 无 mcp 段 + env 缺 → 返回 no-config，**不发网络**（readMcpConfig 纯 fs+env 读，对照 FR-06 第二条）
- configFingerprint 缓存 key 随 mcp.url 变，token 不入 key（:60-61 现状保密语义不变）；显式传 client 的调用短路 `client || new ...` 零回归
- 真实行号核验：:64（return）/ :145（no-config if）/ :158（new client）

## 验证

npm run lint + 单跑 test/dispatch/path-a-probe.test.mjs（5 处构造零回归核验属 task-07，本步不碰测试）

## 约束

- readMcpConfig 由 task-03 提供（contract readMcpConfigResult = {url,token}|null，best-effort 不抛）；client cwd 构造签名由 task-04 提供（design §7.3）
- probeSillyHub 铁律保留：探测失败保守 fallback、绝不抛穿 execute（:8-9）
