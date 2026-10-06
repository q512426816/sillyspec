---
author: flow-machine-draft
created_at: 2026-10-06T16:13:04.411Z
---
# 任务注册表（Tasks）— 2026-10-07-flow-friction-batch3

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-07-flow-friction-batch3 --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-07-flow-friction-batch3` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: gate execute/verify 默认档新增 stage-review informational 检查：缺 review.json 时 warning 含 register-stage-review 指引、在场时静默 ok；--full 档 full-stage-review 的 error 语义与 id 均不变（默认档用独立 check id 不碰撞）
- [x] task-02: design_file_ref_invalid 报错：根下存在 basename 相同的既有文件时附「相近既有路径：…」（至多 3 条），无相近时不附建议段（不加噪）；NEW: 前缀提示保留
- [x] task-03: 同 Wave 共享文件 error 文案含 plan-adopt-waves 一键重排指引；伪并行串行链报错（既有）不回归
- [x] task-04: sillyspec module-impact --change <名> --fill-skipped [--reason "..."]：pending/待办行状态改 skipped、--reason 追加进操作列、其余内容逐字不动；无 module-impact.md 或无更新结果表时 exit 2 报错；幂等（重跑零改动）
- [x] task-05: execute 收口对 UI 触达且缺 visual-evidence.md 的变更打前置 advisory（warn 级，含落盘路径与 verify 执法提示）；非 UI 变更零输出零行为变化
- [x] task-06: 既有 test:core 全绿，npm run lint 通过，新增测试收录 test:core
