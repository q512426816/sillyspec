---
author: flow-machine-draft
created_at: 2026-10-06T11:43:21.792Z
---
# 任务注册表（Tasks）— 2026-10-06-fr-priority-overlap

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-fr-priority-overlap --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-fr-priority-overlap` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: runModuleSubset 的 priorityFiles 传全量 FR 绑定文件（fr.files），与 deps 重叠的绑定文件不再被帽弃（fixture：绑定文件同时在 import 依赖面内、字母序最末，修复后必入执行批）
- [x] task-02: 并集去重与批计数语义不变（depsAll 构造照旧；披露标签如实反映实跑数）
- [x] task-03: 直测覆盖重叠形态（绑定文件 ∈ deps）：修复后该文件在执行命令中；无 FR 索引/零绑定时行为与现状一致
