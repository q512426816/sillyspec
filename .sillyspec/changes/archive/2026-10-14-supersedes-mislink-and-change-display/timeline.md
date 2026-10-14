# 合成时间线快照 — 2026-10-14-supersedes-mislink-and-change-display

> 烤制于归档链（2026-10-14T11:14:17.578Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-14-supersedes-mislink-and-change-display — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
18:36:52  🁢 变更诞生（工件 frontmatter created_at）
18:36:55  📄 design.md 出现
18:36:55  📄 tasks.md 出现
18:44:25  📝 requirements.md 内容变更
18:44:45  📝 design.md 内容变更
18:44:55  📝 tasks.md 内容变更
18:48:16  ⚠️ scope-drift  声明面之外的代码文件被改：rc/docs-check.js——范围漂移嫌疑（并行会话改动/越界，人判）
18:53:44  ⚠️ scope-drift  声明面之外的代码文件被改：src/.tmp-kg-old.mjs——范围漂移嫌疑（并行会话改动/越界，人判）
18:54:56  📝 design.md 内容变更
18:55:44  ✅ checked 0→1
18:55:44  ✅ checked 1→2
18:55:44  📝 tasks.md 内容变更
18:55:44  ✅ checked 0→2
18:56:24  ⚠️ scope-drift  声明面之外的代码文件被改：src/docs-check.js——范围漂移嫌疑（并行会话改动/越界，人判）
18:57:07  🔀 29935484  fix(graph/display): supersedes 同变更限定 + 决策展示行变更名限定 (2026…
19:01:44  ✅ checked 2→3
19:01:47  📝 tasks.md 内容变更
19:01:47  ✅ checked 2→3
19:02:10  🔀 439316f6  chore(tasks): 三任务全勾——全量回归 778/778 零失败 EXIT=0 + lint 968…
19:02:40  📝 design.md 内容变更
19:03:42  · 门实测 skipped（60.9s） · 20261014110342
19:06:24  📝 design.md 内容变更
19:06:41  🔀 beeb1eba  docs(design): 文件变更清单补 src/docs-check.js 自声明——收口夹带嫌疑清偿（p…

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  18:55:44    supersedes 同变更限定——src/knowledge-graph.js 去掉…  29935484
task-02  18:55:44    变更名限定四处——src/knowledge-match.js 新增 decision…  29935484
task-03  19:01:44    全量回归 + lint + 模块卡索引——验证：npm test 零失败 + npm …  439316f6

墙钟：29min｜事件 22 条｜提交 3｜任务 3/3 勾选
阶段墙钟：design 29min｜tasks 24min｜requirements 0s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。