---
author: flow-machine-draft
created_at: 2026-10-27T21:23:00.522Z
---
# 提案书（Proposal）— 2026-10-28-knowledge-hits-cli-push

## 动机

任务原话转写：CLI 直报主通道收尾（用户拍板：本地必写+有平台配置即增量直报）：appendKnowledgeHit 是全部遥测类型（inject/fr-inject/classify/…）的唯一写入口，落盘成功后 fire 直报——所有调用方零改动自动获得直报。接收端点 POST /api/changes/-/hits-sync 已在平台仓上线（2026-10-28-knowledge-hits-cli-direct，shpsync_ 令牌派生工作区、行 hash 幂等）。

成功标准：
- appendKnowledgeHit 落盘成功后 fire 直报：local.yaml platform.url/token 在场（或 env 同名先例）→ POST {url}/api/changes/-/hits-sync（Bearer token，body 单行 lines 数组 + daemon_local_id=cli-<platform.user|cli>），照 pushAgentLogToPlatform 先例 AbortController 超时 + best-effort（网络/非 2xx warn 一行不抛，本地已落盘+daemon 兜底）
- 直报不得阻塞注入主流程（void fire 不 await 不抛）；进程退出拖住由 fetch 活跃 socket 自然语义+超时兜底
- env SILLYSPEC_HITS_PUSH=0 显式关闭直报（agent-log PUSH 先例同款）
- 未配置 platform（未连接平台）静默跳过零日志
- 单测覆盖：写后触发上报（有配置）/未配置跳过/开关关闭跳过/端点失败静默不抛且本地行不受影响
- 跨平台兼容（Windows/Linux/macOS 路径与编码）

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. appendKnowledgeHit 落盘成功后 fire 直报：local.yaml platform.url/token 在场（或 env 同名先例）→ POST {url}/api/changes/-/hits-sync（Bearer token，body 单行 lines 数组 + daemon_local_id=cli-<platform.user|cli>），照 pushAgentLogToPlatform 先例 AbortController 超时 + best-effort（网络/非 2xx warn 一行不抛，本地已落盘+daemon 兜底）
2. 直报不得阻塞注入主流程（void fire 不 await 不抛）；进程退出拖住由 fetch 活跃 socket 自然语义+超时兜底
3. env SILLYSPEC_HITS_PUSH=0 显式关闭直报（agent-log PUSH 先例同款）
4. 未配置 platform（未连接平台）静默跳过零日志
5. 单测覆盖：写后触发上报（有配置）/未配置跳过/开关关闭跳过/端点失败静默不抛且本地行不受影响
6. 跨平台兼容（Windows/Linux/macOS 路径与编码）

## 成功标准（可验证）

1. appendKnowledgeHit 落盘成功后 fire 直报：local.yaml platform.url/token 在场（或 env 同名先例）→ POST {url}/api/changes/-/hits-sync（Bearer token，body 单行 lines 数组 + daemon_local_id=cli-<platform.user|cli>），照 pushAgentLogToPlatform 先例 AbortController 超时 + best-effort（网络/非 2xx warn 一行不抛，本地已落盘+daemon 兜底）
2. 直报不得阻塞注入主流程（void fire 不 await 不抛）；进程退出拖住由 fetch 活跃 socket 自然语义+超时兜底
3. env SILLYSPEC_HITS_PUSH=0 显式关闭直报（agent-log PUSH 先例同款）
4. 未配置 platform（未连接平台）静默跳过零日志
5. 单测覆盖：写后触发上报（有配置）/未配置跳过/开关关闭跳过/端点失败静默不抛且本地行不受影响
6. 跨平台兼容（Windows/Linux/macOS 路径与编码）
