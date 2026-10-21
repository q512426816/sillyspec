# 合成时间线快照 — 2026-10-21-docref-checkapproval-reanchor

> 烤制于归档链（2026-10-21T17:27:59.653Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-21-docref-checkapproval-reanchor — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
01:30:00  🁢 变更诞生（工件 frontmatter created_at）
01:24:33  ✅ checked 0→1
01:24:35  📝 requirements.md 内容变更
01:24:35  📝 design.md 内容变更
01:24:35  📝 tasks.md 内容变更
01:24:35  ✅ checked 0→1
01:25:18  🔀 5929f3da  docs(anchor): 平台接口图 checkApproval 锚重锚 shared.js:1274→13…
01:25:18  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-10-21-docref-checkapproval-…
01:25:53  · 门实测 skipped（28.0s） · 20261021172550

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  01:24:33    L84 锚 1274→1316 落盘 + doc-ref-check 全绿复跑 + 临…  无提交锚⚠️

墙钟：0s｜事件 8 条｜提交 1｜任务 1/1 勾选
阶段墙钟：tasks 1s｜requirements 0s｜design 0s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。