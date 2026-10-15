---
author: flow-machine-draft
created_at: 2026-10-15T04:29:32.251Z
---
# 任务注册表（Tasks）— 2026-10-15-vector-switch-discoverability

- [x] task-01: config schema 注册 knowledge.vector_search 且 renderExample 含 knowledge 段（防漂耦合测试绿）
- [x] task-02: vectorSwitchHint 三态：平台未连接空串/已连接未开提示/已开空串
- [x] task-03: search 输出 hint 键（未开+已连接时）；flow 注入零命中时追加提示行（已开或未连接零新增）
- [x] task-04: 新增测试全绿+既有 vector/schema 测试零回归
