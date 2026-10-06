---
author: flow-machine-draft
created_at: 2026-10-06T14:07:58.424Z
---
# 任务注册表（Tasks）— 2026-10-06-status-multi-active-list

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-status-multi-active-list --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-status-multi-active-list` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 裸 status 在多活跃（≥2）时列出全部活跃变更名并提示 --change 指定查看，不再出现「未找到进度数据」
- [x] task-02: 零活跃或库不存在时维持既有空态引导文案（不回归）
- [x] task-03: 只读短路语义不变：不 initChange、不新建 sillyspec.db（库不在场时）、exit 0
- [x] task-04: 实测问题#2 修复：db.js 全新建库分支标 _freshCreate，孤儿 schema-version 戳不再让空库跳过建表（库丢失后首个写命令 no-such-table 崩溃）
- [x] task-05: 新测试收录 test:core；lint 通过
