---
author: flow-machine-draft
created_at: 2026-10-05T15:23:16.287Z
---
# 任务注册表（Tasks）— 2026-10-05-flow-tail-polish

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-flow-tail-polish --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-flow-tail-polish` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: flow done 归档子步补暂存未跟踪的归档新目录（文件级 pathspec，限本变更 archive/<me>/），归档后仍有未暂存的 distill 产物（knowledge 路径）时打印待提交清单提示
- [x] task-02: 实测面对账文案注明「并集去重」语义（子集数=deps+FR 绑定分量并集去重后的值）
- [x] task-03: 重入 flow start 知识 digest 回填 input（flow-state 存 input 优先、proposal 动机转写回退），重入简报保持注入与抽查确认指引可见
- [x] task-04: flow status 查不存在的变更改非零 exit（exit 1）且输出保留「变更不存在」文案，查在场变更仍 exit 0，测试锁定两形态
- [x] task-05: 相关测试全部通过
