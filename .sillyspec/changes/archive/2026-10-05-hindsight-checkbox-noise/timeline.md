# 合成时间线快照 — 2026-10-05-hindsight-checkbox-noise

> 烤制于归档链（2026-10-05T04:26:41.423Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-05-hindsight-checkbox-noise — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
12:22:10  🁢 变更诞生（工件 frontmatter created_at）
12:22:36  📝 design.md 内容变更
12:22:36  ✅ checked 0→1
12:22:39  📝 design.md 内容变更
12:22:56  📝 requirements.md 内容变更
12:22:56  ✅ checked 0→3
12:24:44  📝 tasks.md 内容变更
12:24:44  ✅ checked 0→1
12:24:54  📝 tasks.md 内容变更
12:24:54  ✅ checked 1→2
12:25:01  📝 tasks.md 内容变更
12:25:01  ✅ checked 2→3
12:25:11  🔀 f689d82f  fix(hindsight): tasksRewriteRatio 勾选框状态归一——v2 镜像任务行翻格（勾…
12:26:01  · 门实测 passed（45.2s） · 20261005042558
12:26:40  📄 decisions.md 出现
12:26:40  ✅ checked 0→1

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈12:24:44   纯勾选翻格（任务行文本零改动）的 tasksRewriteRatio 必须为 0 且不…  f689d82f
task-02  ≈12:24:54   勾选翻格叠加真实任务文本改写时，改写比只按文本改写行计（翻格不稀释不虚增）         f689d82f
task-03  ≈12:25:01   design 比对面不做勾选归一（design 文本含 checkbox 形态差异仍计…  f689d82f

墙钟：4min｜事件 15 条｜提交 1｜任务 3/3 勾选
阶段墙钟：design 4s｜requirements 0s｜tasks 17s｜verify 0s｜proposal 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。