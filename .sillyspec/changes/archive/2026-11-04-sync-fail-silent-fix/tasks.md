---
author: flow-machine-draft
created_at: 2026-11-04T02:06:05.912Z
---
# 任务注册表（Tasks）— 2026-11-04-sync-fail-silent-fix

- [x] task-01: syncSpecTreeOnly ok:false 时 platform sync 输出失败信息（含原因）且退出码非零，不再出现成功横幅
- [x] task-02: 全量清单拉取（无 since 参数态）超时提升至慢链路可完成（≥60s），增量拉取维持 10s 不变
- [x] task-03: POST 422 失败输出含服务端指明的无效 op 路径，不再只报 HTTP 状态码
