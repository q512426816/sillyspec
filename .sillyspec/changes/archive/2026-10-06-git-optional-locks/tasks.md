---
author: flow-machine-draft
created_at: 2026-10-06T09:36:18.550Z
---
# 任务注册表（Tasks）— 2026-10-06-git-optional-locks

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-git-optional-locks --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-git-optional-locks` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: git-helper.js 的 safeGit 与 git 两个 exec 点统一注入 GIT_OPTIONAL_LOCKS=0（env 合并语义：与调用方传入 env 展开合并，不裸替换丢 Windows 系统变量）——CLI 自建的全部 git 子进程不再机会性抢 index.lock；写命令（add/commit 等）行为不变
- [x] task-02: watcher 等常驻/后台轮询进程经公共入口自动获得该行为（gitQuiet 委托 git），无需逐调用点改造
- [x] task-03: 测试覆盖：①经 git-helper 的 status 读调用在 stat 缓存脏场景下不改写 .git/index 字节（锁窗口消失的代理断言）；②带注入 env 的 add 照常暂存成功；③调用方自定义 env（如 baseline checkpoint 的 GIT identity 注入）仍生效不被覆盖
