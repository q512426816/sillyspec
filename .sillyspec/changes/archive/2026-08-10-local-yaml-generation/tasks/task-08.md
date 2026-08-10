---
id: task-08
title: sync.js connect 写 platform+mcp 段（同源假设，已有 mcp 段保留）
title_zh: platform connect 统一
author: qinyi
created_at: 2026-08-10 23:00:20
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-006@v1]
allowed_paths:
  - src/sync.js
provides: []
expects_from: {}
---

## goal
SyncManager.connect 写 platform 段（现状）后追加 mcp 段（mcp.url/mcp.token 复用 platform 同源 url/token），已有 mcp 段保留不覆盖（R-09 缓解）。统一 local.yaml 为 platform + mcp 外部连接配置入口（design §7.4 / D-006@v1）。

## implementation
- 改 `SyncManager.connect`（**真实行号 :202-226**；design §6 标注的 :150-167 为 stale——实际 connect 在 resolvePlatformUser 调用 + platform.user 写入后的 :202-226 块；导出便捷函数 `connect` 在 :797；writeLocalYaml 序列化器在 :56-78）
- ping `${url.replace(/\/+$/,'')}/api/health`（:204-205）+ 失败守卫 return（:206-209）现状不变
- platform 段写入（:217-224：config.platform = { url, token, last_connected } + config.platform.user = resolvedUser）现状不变
- **新增 mcp 段写入**（在 :224 user 块后、:225 writeLocalYaml 前插入）：`if (!config.mcp) { config.mcp = { url: url.replace(/\/+$/, ''), token }; }`——mcp.url/mcp.token 复用 platform 同源 url/token（design §7.4 同源假设）
- 已有 `config.mcp`（用户手填，不同源场景）则保留不覆盖（`if (!config.mcp)` 守卫，R-09 缓解）

## 验收标准
对照 FR-07：
- connect ping 成功后写 platform 段（url/token/last_connected[/user]，现状）**+ mcp 段**（mcp.url=归一后 url, mcp.token=token，同源假设）
- connect 时 local.yaml 已有 mcp 段（用户手填，不同源）→ 保留已有 mcp 段不覆盖（`if (!config.mcp)` 守卫）
- mcp 段可由用户手填 local.yaml 覆盖（connect 写后被手改，或 connect 前已手填则被保留）

## verify
- npm test（sync connect 现有测试间接覆盖；手验：无 mcp 段→connect 后 mcp 段出现，已有 mcp 段→connect 后 mcp 段原样保留）
- npm run lint

## constraints
- R-09 同源假设：若 sillyhub 实际部署 platform（/api）与 MCP（/mcp/）不同源或不同 token，connect 统一写会填错 mcp 段——退保守方案（只写 platform 段，mcp 段单独引导手填/设 env），execute 时分支决策
- 仅改 connect 写 mcp 段，不改 disconnect（disconnect 只删 platform 段，mcp 段保留由用户自理）；platform.user 写入（:222-224）由并行变更 platform-progress-sync 已落 main，本 task 其后追加 mcp 段，函数级不冲突（R-03 经 Grill 核验 moot）
