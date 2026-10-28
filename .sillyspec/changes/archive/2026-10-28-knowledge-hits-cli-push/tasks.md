---
author: flow-machine-draft
created_at: 2026-10-27T21:23:00.522Z
---
# 任务注册表（Tasks）— 2026-10-28-knowledge-hits-cli-push

- [x] task-01: appendKnowledgeHit 落盘成功后 fire 直报：local.yaml platform.url/token 在场（或 env 同名先例）→ POST {url}/api/changes/-/hits-sync（Bearer token，body 单行 lines 数组 + daemon_local_id=cli-<platform.user|cli>），照 pushAgentLogToPlatform 先例 AbortController 超时 + best-effort（网络/非 2xx warn 一行不抛，本地已落盘+daemon 兜底）
- [x] task-02: 直报不得阻塞注入主流程（void fire 不 await 不抛）；进程退出拖住由 fetch 活跃 socket 自然语义+超时兜底
- [x] task-03: env SILLYSPEC_HITS_PUSH=0 显式关闭直报（agent-log PUSH 先例同款）
- [x] task-04: 未配置 platform（未连接平台）静默跳过零日志
- [x] task-05: 单测覆盖：写后触发上报（有配置）/未配置跳过/开关关闭跳过/端点失败静默不抛且本地行不受影响
- [x] task-06: 跨平台兼容（Windows/Linux/macOS 路径与编码）
