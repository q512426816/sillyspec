---
author: flow-machine-draft
created_at: 2026-10-05T12:44:46.600Z
---
# 任务注册表（Tasks）— 2026-10-05-flowdone-lintfail-output

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-flowdone-lintfail-output --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-flowdone-lintfail-output` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: flow done lint 门 FAIL 时输出 lint 件套：命令、输出尾部（后15行）、失败文件（前10）、结果文件路径（与 test 三件套同构）
- [x] task-02: lint 结果持久化：并入 test-result.json（modules 并列 lint 节）；test 无结果文件而 lint 实跑时独立落盘（kind:lint）；skipped 不落
- [x] task-03: quick-audit failed 提升到 try 外，快照 FAIL 回拷（P6b）与 resultPath 重映射真实生效
- [x] task-04: e2e 单测锁定全链路：lint 门 FAIL 输出件套 + test-result.json 含 lint 节（含 persistLintResult 三态单测）
