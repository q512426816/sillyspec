---
author: flow-machine-draft
created_at: 2026-10-06T13:13:33.950Z
---
# 任务注册表（Tasks）— 2026-10-06-resume-domain-flip

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-resume-domain-flip --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-resume-domain-flip` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: resume 路由面 = 过滤后的基线以来文件面 ∪ --input 路径语料路由面（重入知识面 ⊇ fresh 知识面）
- [x] task-02: 未跟踪条目「变更出生时刻之前从未写过」（最新 mtime 早于变更出生时刻；目录递归取成员最大 mtime，walk 带安全帽；stat 失败/超帽/无出生时戳保守保留）时不再进入路由面——判据是时间不是路径形态，不建路径白名单
- [x] task-03: 变更出生时刻取进度库 changes.created_at（best-effort：无 DB/无行不过滤，行为同现状）
- [x] task-04: fr-rot-precision ⑥ 的源码级钉（resume 复用 changedFilesSinceBaseline）保持绿
- [x] task-05: 新增回归测试覆盖：过滤判据各分支 + 重入简报端到端（垃圾未跟踪目录不再劫持触达域、input 域恢复注入）
- [x] task-06: npm run test:core 全绿
