---
author: flow-machine-draft
created_at: 2026-10-05T17:20:04.275Z
---
# 任务注册表（Tasks）— 2026-10-06-litest-p1-fixes

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-litest-p1-fixes --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-litest-p1-fixes` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: node --test test/doc-ref-check.test.mjs 全绿（13 处失效清零）
- [x] task-02: doc-ref-check.test.mjs 列入 test:core 且 npm run test:core 含其执行
- [x] task-03: PRIMITIVE_RE 收窄后：含 cursor 纯名词的 patch 文本不再触发评审；DB 游标用法形态（cursor=/next_cursor:/conn.cursor()）仍触发；新增回归测试覆盖两向
- [x] task-04: 归档收尾输出含可执行的一笔到位 git commit 命令（源侧+归档侧+knowledge pathspec 完整）；既有归档测试无回归
- [x] task-05: npm test 改动面无回归 + lint 绿
