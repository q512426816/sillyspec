
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

## ql-20260922-004-6353 | 2026-09-22 09:49:00 | verify 填槽制：--init --draft 四节机器预填+指纹，--done 篡改门禁拒收整份重写（r5l 方案3/护栏#2）
状态：已完成
关联变更：（无）
文件：
- src/verify-draft.js（新建（四节机器句子/指纹标记对/sidecar 台账/三态违规判定/amend 重锚审计））
- src/index.js（verify-probes 接 --draft（需 --init）与 --amend-draft 分支+用法文本（draft 材料构建与 verify 门同源））
- src/run/gates.js（verify --done 新增 draft 篡改门禁（探针抽查 rollback 先例同款，fail-soft；判定链零旁路））
- test/verify-draft.test.mjs（新建 3 用例（形态+幂等+槽契约/篡改四态/amend 留痕））
- .sillyspec/docs/sillyspec/modules/_module-map.yaml（src/verify-draft.js 录 core-engine）
- docs/sillyspec/platform-interface-map.md（六处 index.js 行号漂移修复（3988/2678/2954/3909/3861/3674/3771，docs check 对账过——剩余 3 处 command.js 漂移属并行会话在途））
需求：verify 填槽制：--init --draft 四节机器预填+指纹，--done 篡改门禁拒收整份重写（r5l 方案3/护栏#2）
根因：verify-result.md 被读写 14 次、每次 heredoc 整份回填一次全量重发（两次各挂起 7min；R5-L 桶② 实证）——模板 29KB 里 CLI 已能机械预填大部分，agent 手写面应收窄到三槽
方案：src/verify-draft.js（buildDraftSections 四节完整句子/transformSkeletonToDraft 指纹标记+三 AGENT 槽+横幅/applyDraftMode 落盘+sidecar/checkDraftIntegrity 三态违规/amendDraftMarkers 重锚+审计）+CLI --draft（需 --init）/ --amend-draft+gates.js --done 门禁（标记删/哈希失配/手工重锚未审计→阻断回滚；AGENT 槽不受限；无 sidecar 零红；门禁异常 fail-soft）；结论枚举槽行契约逐字不动；零 prompt 劝说（P8）；另修 platform-interface-map.md 六处 index.js 行号漂移（本改动 +110 行所致，docs check 对账过）
结果：verify-draft 3/3（draft 形态四节+三槽+幂等/篡改门禁内容改写-标记整删-手工重锚拒收+AGENT 槽放行+无 sidecar 零红/amend 重锚放行+审计在案+修正内容保留）；verify 族回归全绿；CLI bin 冒烟三态；lint 743 过（module-map 录 core-engine）；全量 582/583（唯一失败 doc-ref-check 剩余 3 处=并行会话 command.js 在途行号漂移，与本改动零交集留痕）；工作流 draft→填槽→复核 读写 ≤3 次结构达成
审计：📎 文档引用失效：3/93 处 file:line 失效（sillyspec docs check 可复现）
审计：   ❌ [docs/sillyspec/platform-interface-map.md:133] command.js:1557 → src/run/command.js: 关键词缺失：期望任一「_write / triggerSync / _getPlatform」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过关键词断言
审计：   ❌ [docs/sillyspec/platform-interface-map.md:134] command.js:1970 → src/run/command.js: 关键词缺失：期望任一「checkApproval」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过关键词断言，层1 行界仍校验——勿删行号）
审计：   ❌ [docs/sillyspec/platform-interface-map.md:135] command.js:875 → src/run/command.js: 关键词缺失：期望任一「SILLYSPEC_AGENT_LOG / recordAgentLogInvocation」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后
审计：🔧 行号漂移已自动重锚 3 处（同口径复跑：3 → 0；剩余 0 处需人工 sillyspec docs check）
审计：[gate] L1（跨 3 模块 · 5 文件：3 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260922-005-0f85 | 2026-09-22 17:47:25 | task-done 四合一 review.head 回填（提交后重锚根治）
状态：已完成
关联变更：（无）
文件：src/task-done.js（+25/-1）, test/task-done.test.mjs（+5/-0）
需求：task-done 四合一 review.head 回填（提交后重锚根治）
根因：task done 的 review 写在 wt-commit 前，head 停在基线 → Task Review Gate base..head 切片空误判零改动伪造（R7 会话 5 份手工重应急，坑 task-done-head-premature）
方案：子步 4 提交成功（HEAD 前移且 review 在场）即回填 review.head=提交全哈希+headBackfilledAt 审计戳+结果行留痕；fail-soft；skipped 提交不触发（幂等复跑 review 逐字节不动）
结果：task-done 4/4（happy 增 head===worktree HEAD 断言+审计戳+留痕行）；task-review 族 8 组零回归；lint 753 文件绿

## ql-20260922-006-8474 | 2026-09-22 17:58:38 | R7 dogfood 复盘行动项落盘（环境一致性测试纪律+设计模板两项自查）
状态：已完成
关联变更：（无）
文件：src/stages/brainstorm.js（+11/-0）
需求：R7 dogfood 复盘行动项落盘（环境一致性测试纪律+设计模板两项自查）
根因：套件阀继承使 env 门控断言套件内红裸跑绿；gitignored 配置中途修改不进快照 overlay；设计死亡面无人审（41 孤儿）；两裁定组合出归档死锁
方案：conventions 新增 env 双模式纪律+INDEX 路由；brainstorm 设计模板增 10b 非功能生命周期节与多裁定组合推演自查
结果：lint 753 绿；brainstorm-plan-contract 零回归；guidance 级不进 gate 硬校验存量零影响
