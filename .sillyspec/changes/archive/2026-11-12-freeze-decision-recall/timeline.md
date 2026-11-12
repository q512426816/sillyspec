# 合成时间线快照 — 2026-11-12-freeze-decision-recall

> 烤制于归档链（2026-11-12T09:16:30.319Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-12-freeze-decision-recall — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
08:00:00  🁢 变更诞生（工件 frontmatter created_at）
16:42:14  ⚠️ stall  brainstorm/plan 期已 20 分钟无事件——停滞嫌疑（区分在想/死了，人判）
16:46:16  📄 decisions.md 出现
16:46:23  📝 decisions.md 内容变更
16:46:33  📝 decisions.md 内容变更
16:46:36  📝 decisions.md 内容变更
16:46:47  📝 decisions.md 内容变更
16:47:06  📝 decisions.md 内容变更
16:48:43  📝 decisions.md 内容变更
16:49:43  📝 decisions.md 内容变更
16:50:40  📝 decisions.md 内容变更
16:53:14  📄 design.md 出现
16:53:51  📝 design.md 内容变更
16:53:51  ✅ checked 0→6
16:55:02  📝 design.md 内容变更
16:55:08  📝 design.md 内容变更
16:55:15  📝 design.md 内容变更
16:56:26  📝 decisions.md 内容变更
16:56:40  📄 proposal.md 出现
16:56:40  📄 requirements.md 出现
16:56:40  📄 tasks.md 出现
16:57:37  📝 requirements.md 内容变更
16:57:37  📝 tasks.md 内容变更
16:58:43  ⚠️ scope-drift  声明面之外的代码文件被改：src/knowledge-match.js——范围漂移嫌疑（并行会话改动/越界，人判）
17:00:42  ⚠️ scope-drift  声明面之外的代码文件被改：test/freeze-decision-recall.test.mjs.tmp.81840.d10…
17:02:21  🔀 8c4a84ee  feat(decision): 复潮条件作为独立入选判据 + 四处防复潮过滤单一源 + distill-bac…
17:02:27  ✅ checked 0→1
17:02:28  📝 tasks.md 内容变更
17:02:28  ✅ checked 0→1
17:02:42  ✅ checked 1→2
17:02:45  📝 tasks.md 内容变更
17:02:45  ✅ checked 1→2
17:02:46  ✅ checked 2→3
17:02:48  📝 tasks.md 内容变更
17:02:48  ✅ checked 2→3
17:10:09  📝 design.md 内容变更
17:10:35  🔀 d15c2e23  fix(decision): 回填保持存量条目域稳定（防 redomain 成果被拉回 unmapped）+ …
17:11:25  ✅ checked 3→4
17:11:26  📝 tasks.md 内容变更
17:11:26  ✅ checked 3→4
17:15:54  · 门实测 passed（60.5s） · 20261112091551

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  17:02:27    `dispositionOf` 增加复潮条件第二判据 + implemented 条目…  无提交锚⚠️
task-02  17:02:42    四处防复潮过滤同步加 `|| h.revisitWhen`（src/flow.js ×…  无提交锚⚠️
task-03  17:02:46    `archive-baseline-replay.js` 加 full 模式 + `k…  无提交锚⚠️
task-04  17:11:25    对本仓执行 distill-backfill：dry-run 核对 → --apply…  无提交锚⚠️

墙钟：9h15min｜事件 40 条｜提交 2｜任务 4/4 勾选
阶段墙钟：proposal 10min｜design 16min｜requirements 57s｜tasks 14min｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。