---
author: flow-machine-draft
created_at: 2026-10-07T15:27:48.775Z
---
# 任务注册表（Tasks）— 2026-10-07-unify-close-trace

- [x] task-01: flow done（thin）收尾后变更目录四件齐备：change.patch/change-patch.json（既有语义不变——files 含治理工件目录、totals 口径不变）+ scope-audit.json/scope-audit.patch（新增：三态行含 verdict、baseAnchor=baseline、closedBy=flow done）
- [x] task-02: execute --done（heavy）收尾后同样四件齐备：scope-audit.json/patch（既有语义不变）+ change-patch.json/change.patch（新增：files=主仓实改行投影、baseline=快照锚、head=当点 HEAD）
- [x] task-03: 同一次收尾的四件 sha256 同锚：change.patch 与 scope-audit.patch 字节一致，两份 json 的 patchSha256 相同
- [x] task-04: 读面双路径验证：新 thin 归档查 scope-audit 走快照记录态（note 标 flow done 时点，不再误标 execute --done）；重跑 flow done（漂移重冻结）不自嵌入（scope-audit.json/patch 进排除面）
- [x] task-05: 全量测试绿（含新增 writer 单测/round-trip/双通道 CLI 夹具）；既有断言零改动（flow-protocol 归档双件断言原样）
