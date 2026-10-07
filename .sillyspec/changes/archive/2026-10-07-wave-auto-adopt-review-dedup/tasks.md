---
author: flow-machine-draft
created_at: 2026-10-06T23:09:36.897Z
---
# 任务注册表（Tasks）— 2026-10-07-wave-auto-adopt-review-dedup

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-07-wave-auto-adopt-review-dedup --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-07-wave-auto-adopt-review-dedup` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: plan postcheck：仅 Wave 形态错误（同 Wave 共享/非法 Wave 号/伪并行串行链）时自动重排复验通过（输出含自动重排公告，plan.md/tasks.md W 列已被 adoptPlanWaves 更新）；重排后仍有错则报新错误并说明已自动重排；混有非 Wave 类错误时不自动重排（行为=现状）
- [x] task-02: plan.auto_adopt_waves: false 时零自动重排（报错现状 + adopt-waves 指路），config-schema 注册该键且 renderExample 含 token
- [x] task-03: renderReviewerTaskbook：changeDir 有既有 review.json 时任务书含前轮 findings 列表（severity+title）与去重引导语；无 review.json 时任务书与现状逐字一致
- [x] task-04: Design Grill 步骤 prompt 含前轮发现去重引导（对既有 review 语义无损）
- [x] task-05: 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core
- [x] task-07: 实测门失败面增量重跑（方案 1 并入）：ledger（test-rerun-<change>.json 稳定指针：head/failedFiles/inputFiles）+ dynamic-subset 分支增量档（前轮失败后下轮只跑「失败批测试文件 ∪ 自失败基线以来变更文件」，mode=incremental-rerun，未触碰绿面复用）+ 失败文件归因（node --test TAP not ok 块 location 路径 / pytest FAILED 行，归因不出保守全记批文件）+ 失败批文件下发（buildDepsBatches 批带 files）+ verify.test_rerun 配置逃生（缺省 incremental；full=恒全子集现状；env SILLYSPEC_TEST_RERUN 优先；config-schema 注册+example）
