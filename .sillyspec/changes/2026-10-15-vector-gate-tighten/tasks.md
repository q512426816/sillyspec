---
author: flow-machine-draft
created_at: 2026-10-15T01:55:40.179Z
---
# 任务注册表（Tasks）— 2026-10-15-vector-gate-tighten

- [x] task-01: 平台已配置但未显式开启时 matchKnowledgeHybrid 对平台零网络调用、本地回退无 vector 标记
- [x] task-02: 显式 on 时既有命中/降级/超时行为逐字段不变（测试 ①~⑦ 零回归）
- [x] task-03: 404 后同平台 URL 本进程后续调用零网络请求（死信短路）
- [x] task-04: scope 遍历层不受开关门影响（第三层照常工作）
