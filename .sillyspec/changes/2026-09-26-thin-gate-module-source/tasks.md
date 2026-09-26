---
author: flow-machine-draft
created_at: 2026-09-26T00:21:43.802Z
---
# 任务注册表（Tasks）— 2026-09-26-thin-gate-module-source

> 机器稿（成功标准机械推导）；轻量跑直写=零任务卡（任务即 checkbox 行）；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。

- [x] task-01: 全部已提交的仓 + test_strategy: module + restrictFiles 含 src 文件 → 命中配置模块并实测子集（status=pa…
- [x] task-02: 同仓不带 restrictFiles → 维持 0 命中 skip 语义与诊断文案（回归保护）
- [x] task-03: 未配置 test_strategy 的仓 + restrictFiles 含测试文件 → deps-auto 子集实测（非 skip）
- [x] task-04: 全量 npm test 与 npm run lint 绿
