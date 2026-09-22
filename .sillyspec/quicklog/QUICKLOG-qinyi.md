
## ql-20260922-003-ad68 | 2026-09-22 09:32:04 | task done 四合一：review write+勾选→finish→可选 wt-commit 单命令串行，子步幂等断点重入（r5l 方案1/护栏#3）
状态：已完成
关联变更：（无）
文件：
- src/task-done.js（新建 runTaskDone 编排器（四子步幂等/断点续/拒改写继承））
- src/index.js（task case 新增 done 分支（--verdict/--notes/--evidence/--commit -m/--pathspec-from-file/--透传/用法文本））
- test/task-done.test.mjs（新建 4 用例（happy 四段/重入幂等/改判拒+force/中段失败断点续））
- .sillyspec/docs/sillyspec/modules/_module-map.yaml（src/task-done.js 录 core-engine）
需求：task done 四合一：review write+勾选→finish→可选 wt-commit 单命令串行，子步幂等断点重入（r5l 方案1/护栏#3）
根因：13 任务×4 连收尾往返（review write/finish/wt-commit）≈52 次 CLI 调用纯属可合并——每次往返按当时全量上下文计费，合并后每任务省 3 次 ~300K 重发（R5-L 桶① 实证）
方案：src/task-done.js runTaskDone 编排器+index.js done 分支：①writeTaskReview 同源落 review.json（幂等=同 runId 同 task 同双 verdict 跳过；改判默认拒改写继承拒覆盖，--force 越过；--base/--head/--changed-files 透传对齐 review write）②autoCheckPlanFromReviews 勾选（fail-soft）③finish 标记清除（不在即跳）④可选 runWtCommit（显式 pathspec 纪律/无变更自然 skip/锁与 worktree 判定继承）；四段结果行合并输出；失败精确报告已完成子步+重入指引
结果：task-done 4/4（含中断半态重入幂等用例：全跳零副作用 review 逐字节不动 HEAD 不动；wt-commit 中段失败点名+断点续）；review-write/backfill/wt-commit/task-review-schema 单独通道回归全绿；CLI bin 冒烟退出码正确；lint 741 过（module-map 录 core-engine）；全量 581/582（唯一失败 doc-ref-check=并行会话 command.js 在途行号漂移，零交集留痕）
审计：[gate] L1（跨 2 模块 · 3 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含
