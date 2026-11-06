# 合成时间线快照 — 2026-11-06-knowledge-body-recall

> 烤制于归档链（2026-11-06T16:18:05.081Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-06-knowledge-body-recall — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
08:00:00  🁢 变更诞生（工件 frontmatter created_at）
23:53:00  📄 proposal.md 出现
23:53:00  📄 requirements.md 出现
23:53:00  📄 decisions.md 出现
23:53:28  📝 decisions.md 内容变更
23:55:51  📝 decisions.md 内容变更
23:58:46  📄 design.md 出现
00:00:50  📝 design.md 内容变更
00:00:50  ✅ checked 0→6
00:01:55  📝 design.md 内容变更
00:02:39  📝 design.md 内容变更
00:03:04  📝 requirements.md 内容变更
00:03:20  📄 tasks.md 出现
00:04:04  📝 requirements.md 内容变更
00:04:11  📝 tasks.md 内容变更
00:09:41  📝 requirements.md 内容变更
00:09:44  📝 requirements.md 内容变更
00:09:48  📝 requirements.md 内容变更
00:11:27  📝 tasks.md 内容变更
00:11:27  ✅ checked 0→1
00:11:41  🔀 c5b1d9a5  test(knowledge): body 兜底七组用例先红（主路径锚点级/段落覆盖窗泛在排除/已修复段过滤/…
00:12:28  📝 tasks.md 内容变更
00:12:28  ✅ checked 1→2
00:13:16  📝 tasks.md 内容变更
00:13:16  ✅ checked 2→3
00:14:12  📝 tasks.md 内容变更
00:14:12  ✅ checked 3→4
00:15:19  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/baseline.json——范围漂移嫌疑（并行会话改动/越界，人判）
00:15:33  📝 tasks.md 内容变更
00:15:33  ✅ checked 4→5
00:15:47  🔀 8758175e  feat(knowledge): 普通知识文件正文段落的词片兜底召回——四层检索语料均不含正文的根因修复（双路…
00:17:44  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-11-06-knowledge-body-recall…
00:17:58  · 门实测 passed（5.8s） · 20261106161756

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈00:11:27   新增 test/knowledge-body-recall.test.mjs 七组用例…  c5b1d9a5
task-02  ≈00:12:28   实现 fallbackByBodyShingles（src/knowledge-mat…  8758175e
task-03  ≈00:13:16   matchKnowledgeHybrid 两处接线（src/knowledge-vec…  无提交锚⚠️
task-04  ≈00:14:12   跑受影响既有测试面（import knowledge-match/knowledge-…  无提交锚⚠️
task-05  ≈00:15:33   eval/knowledge 基线重打（snapshot_mismatch 消除，to…  无提交锚⚠️

墙钟：16h17min｜事件 32 条｜提交 2｜任务 5/5 勾选
阶段墙钟：proposal 2min｜requirements 16min｜design 3min｜tasks 12min｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。