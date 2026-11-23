# 合成时间线快照 — 2026-11-23-worktree-fallback-consent

> 烤制于归档链（2026-11-23T03:07:48.185Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-23-worktree-fallback-consent — 合成时间线（thick｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
10:35:53  🁢 变更诞生（工件 frontmatter created_at）
10:37:24  🔀 b4552773  chore(docs): docs gate 基线重置 94→105（多仓 scan 产物结构性悬空存量；批 …
10:40:34  📝 requirements.md 内容变更
10:41:11  📝 design.md 内容变更
10:42:37  📝 design.md 内容变更
10:55:53  ✅ checked 0→1
10:55:54  📝 tasks.md 内容变更
10:55:54  ✅ checked 0→1
10:55:57  ✅ checked 1→2
10:56:01  📝 tasks.md 内容变更
10:56:01  ✅ checked 1→2
10:56:07  ✅ checked 2→3
10:56:07  📝 tasks.md 内容变更
10:56:07  ✅ checked 2→3
10:56:11  ✅ checked 3→4
10:56:11  📝 tasks.md 内容变更
10:56:11  ✅ checked 3→4
10:56:28  📄 decisions.md 出现
10:56:45  🔀 70fd589a  feat(worktree): worktree add 失败改同意制 fail-closed——显式出口 -…
10:56:55  🔀 1855b5ac  docs(config): worktree.fallback 键文档化（block|allow 缺省 blo…
10:57:51  · 门实测 failed（11.4s） · 20261123025751
10:59:37  🔀 a259eace  fix(config): renderExample 策展模板补 worktree.fallback 行——防…
11:00:08  · 门实测 passed（10.2s） · 20261123030007

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  10:55:53    git worktree add 失败时 wm.create 不再静默降级：默认 th…  70fd589a
task-02  10:55:57    显式同意（run execute --allow-in-place 或 local.y…  无提交锚⚠️
task-03  10:56:07    worktree-guard 的 isInsideRegisteredWorktree…  无提交锚⚠️
task-04  10:56:11    config-schema 文档化 worktree.fallback（block|a…  1855b5ac

墙钟：24min｜事件 22 条｜提交 4｜任务 4/4 勾选
阶段墙钟：requirements 0s｜design 1min｜tasks 18s｜proposal 0s｜verify 2min
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。