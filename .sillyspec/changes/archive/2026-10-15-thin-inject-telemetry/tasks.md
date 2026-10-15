---
author: flow-machine-draft
created_at: 2026-10-15T01:14:51.640Z
---
# 任务注册表（Tasks）— 2026-10-15-thin-inject-telemetry

- [x] task-01: 轻量道 flow start 知识命中时 .runtime/knowledge-hits.jsonl 落 type:inject 事件，change/query 字段与既有事件同形，快道/thick 路径行为零变化
- [x] task-02: 遥测事件带分级字段：injectedFiles（正文实际注入的文件）与 mentionedFiles（仅 Sources 行提及的文件）分离，knowledge stats 命中矩阵口径不回归
- [x] task-03: 未命中（matched:false 且零 quicklog）不落盘（与既有口径一致）；遥测写失败不阻断注入本体（fail-soft 既有契约）
- [x] task-04: 新增测试覆盖 thin 命中落盘/未命中零落盘/fail-soft 三态，全量测试与 lint 绿
