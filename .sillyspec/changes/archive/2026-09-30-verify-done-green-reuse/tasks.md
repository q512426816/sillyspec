---
author: flow-machine-draft
created_at: 2026-09-30T06:52:12.313Z
---
# 任务注册表（Tasks）— 2026-09-30-verify-done-green-reuse

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 `- [ ]`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。`flow status --change <名>` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 报错文案不再含「用例依据」误导词，直接写明锚点须在证据列（第 5 列）
- [x] task-02: verify --done 的 test 实测在 HEAD+代码脏面+local.yaml 指纹全等且 30min 内有绿记录时复用缓存不真跑…
- [x] task-03: verify --done 的 lint 实测同指纹复用（同上口径）
- [x] task-04: 指纹失配/无记录/环境异常一律回退真跑，门禁语义零变化（fail-open）
- [x] task-05: 全量测试回归绿，含新增的文案断言与复用命中
- [x] task-06: 未命中用例（机器骨架占位条目，无独立动作面）
