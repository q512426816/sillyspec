# 合成时间线快照 — 2026-11-16-cross-exclude-dogfood-guard

> 烤制于归档链（2026-11-15T17:49:57.570Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-16-cross-exclude-dogfood-guard — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
01:47:10  🁢 变更诞生（工件 frontmatter created_at）
01:47:40  📝 requirements.md 内容变更
01:48:00  📝 design.md 内容变更
01:48:19  📝 design.md 内容变更
01:49:18  ✅ checked 0→1
01:49:19  📝 tasks.md 内容变更
01:49:19  ✅ checked 0→1
01:49:21  ✅ checked 1→2
01:49:22  📝 tasks.md 内容变更
01:49:22  ✅ checked 1→2
01:49:25  ✅ checked 2→3
01:49:26  📝 tasks.md 内容变更
01:49:26  ✅ checked 2→3
01:49:42  🔀 03e871bf  fix(worktree-cross): 跨仓 exclude 追加补 dogfood 仓豁免——目标仓跟踪 …
01:49:56  · 门实测 passed（9.0s） · 20261115174955

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  01:49:18    跨仓目标仓跟踪 .sillyspec 内容时（dogfood 形态），ensureCr…  无提交锚⚠️
task-02  01:49:21    宿主仓形态（.sillyspec 无跟踪内容）行为不变：默认仓内落位仍幂等追加 exc…  无提交锚⚠️
task-03  01:49:25    新增回归测试覆盖 dogfood 豁免分支与宿主仓不变分支                 无提交锚⚠️

墙钟：2min｜事件 14 条｜提交 1｜任务 3/3 勾选
阶段墙钟：requirements 0s｜design 20s｜tasks 8s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。