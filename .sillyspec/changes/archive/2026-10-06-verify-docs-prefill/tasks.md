---
author: flow-machine-draft
created_at: 2026-10-06T14:20:51.352Z
---
# 任务注册表（Tasks）— 2026-10-06-verify-docs-prefill

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-verify-docs-prefill --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-verify-docs-prefill` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: sillyspec gate verify --change <名> --docs-only 输出含 verify-test/verify-lint 的 informational 跳过说明、不执行测试命令、其余检查照跑；--docs-only 与 --full 并存 exit 2
- [x] task-02: 探针 7 对 testFiles 为空的卡注入 FR 关联回归测试候选（渲染「既有用例」注记行，有归属卡的格子不受影响）；无 FR 知识/无命中时行为与现状逐字一致
- [x] task-03: local.yaml 配 plan.fill_batch_min_tasks: 3 后 buildCoordinatorStep 文案含「≤3」；未配置时含「≤8」（现状一致）
- [x] task-04: backupVerifyResult 传 changeName 时备份文件名含 change 段；parseDesignApiTable 对「非零端点」返回 declared=null；refreshProbeSections 后手写 #### 子节存活
- [x] task-05: 写新 step guide 后，同步骤旧指纹 guide 文件被清理、仍被任一 state 引用的文件保留
- [x] task-06: 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core
