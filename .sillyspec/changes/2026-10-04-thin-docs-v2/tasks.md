---
author: flow-machine-draft
created_at: 2026-10-04T14:42:22.748Z
---
# 任务注册表（Tasks）— 2026-10-04-thin-docs-v2

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge + 2026-09-29 心跳指针 + 2026-10-03-voluntary-task-tick tick 动词）：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾 `[x]`（sillyspec task tick --change 2026-10-04-thin-docs-v2 --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（勾选是进度锚与哨兵证据面，watcher 实时上平台）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口证据只读 tasks.md。📌 任务面在 ①spec 阶段定稿：覆写为真实实现步骤（全 `- [ ]`）后再动代码；执行循环：Working on task N/M → 做一件 → 勾一格 → 下一个——收口硬门拒单拍多格勾选（--allow-batch-tick 可显式旁路留痕）。`flow status --change <名>` 为自愿查看/恢复面（恢复时给下一任务指针与进度，非协议必需——D-007）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: flow start 起草的四件文档为纯 markdown 零 MACHINE-DRAFT 指纹标记零 AGENT 槽注释
- [x] task-02: requirements FR 骨架改为 SHALL 正文加 Scenario WHEN THEN 句式且不再机器预填 GWT 场景体
- [x] task-03: 成功标准摘录不再做复合拆分与编号劫持与 80 字截断变形
- [x] task-04: design 四问文本与 flow done 门禁判据由单一源常量同源供给
- [x] task-05: 起草锚点存入 draft ledger 机器态且 flow done 做文档与锚对比输出漂移 advisory
- [x] task-06: flow start 支持 autopilot 声明且新增 flow approve 子命令记录 spec 断点用户批准
- [x] task-07: 未声明 autopilot 的变更在 flow done 因缺批准证据拒收
- [x] task-08: tasks.md 保留成功标准镜像任务锚并显式允许 agent 追加细化行
- [x] task-09: 存量指纹 ledger 在途变更走旧校验双轨不受影响
- [x] task-10: 新增聚焦测试覆盖上述行为且既有测试回归绿
