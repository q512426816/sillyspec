---
author: flow-machine-draft
created_at: 2026-10-15T02:26:13.257Z
---
# 任务注册表（Tasks）— 2026-10-15-classify-surface

- [x] task-01: 收件箱 1~20 条时 digest 出 info 级 inbox 信号且带 classify 命令建议，healthy 保持 true
- [x] task-02: 收件箱 >20 时仍 warn 级且 healthy=false（既有阈值语义不变）；空收件箱零信号
- [x] task-03: 渲染面 warn/info 分区，既有 digest 测试零回归+新增断言全绿
