# 合成时间线快照 — 2026-11-26-unavailable-wording-fix

> 烤制于归档链（2026-11-26T14:40:52.730Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-26-unavailable-wording-fix — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
22:21:28  🁢 变更诞生（工件 frontmatter created_at）
22:21:42  📄 proposal.md 出现
22:21:42  📄 requirements.md 出现
22:21:42  📄 design.md 出现
22:21:42  📄 tasks.md 出现
22:23:37  📝 requirements.md 内容变更
22:23:48  📝 design.md 内容变更
22:24:17  · 本地配置 local.yaml 有变更（内容不上行）
22:31:35  📝 tasks.md 内容变更
22:31:35  ✅ checked 0→4
22:39:37  🔀 fe8f2eb8  docs(config): 订正 unavailable 配置文案与实测语义 (2026-11-26-unav…
22:40:35  · 门实测 passed（29.0s） · 20261126144033

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈22:31:35   .sillyspec/local.yaml 的 commands 段注释改为如实描述（…  fe8f2eb8
task-02  ≈22:31:35   src/stages/archive.js 首步注释与 docs/sillyspec/…  无提交锚⚠️
task-03  ≈22:31:35   全仓 grep 不再出现「unavailable→skip」「关闭亲跑」类失真表述（历…  无提交锚⚠️
task-04  ≈22:31:35   不改任何实测/门禁逻辑，node test/check-syntax.mjs 绿      无提交锚⚠️

墙钟：19min｜事件 11 条｜提交 1｜任务 4/4 勾选
阶段墙钟：proposal 0s｜requirements 1min｜design 2min｜tasks 9min｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。