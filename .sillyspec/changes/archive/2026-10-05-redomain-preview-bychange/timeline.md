# 合成时间线快照 — 2026-10-05-redomain-preview-bychange

> 烤制于归档链（2026-10-05T13:09:14.196Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-05-redomain-preview-bychange — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
21:03:31  🁢 变更诞生（工件 frontmatter created_at）
21:04:00  📝 design.md 内容变更
21:04:20  📝 requirements.md 内容变更
21:04:26  📝 tasks.md 内容变更
21:04:26  ✅ checked 0→3
21:04:40  🔀 4eedf8e6  fix(tests): --redomain 预览透传 byChange——预览与落盘同口径只列分批子集，计数…
21:05:13  · 门实测 passed（32.7s） · 20261005130511
21:09:13  📄 decisions.md 出现

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈21:04:26   tests --redomain --by-change 预览与落盘同口径：只列该变更…  4eedf8e6
task-02  ≈21:04:26   他变更条目不进预览清单                                   4eedf8e6
task-03  ≈21:04:26   CLI 级单测锁定（execFileSync 走真实 CLI 预览路径断言子集计数与排…  4eedf8e6

墙钟：5min｜事件 7 条｜提交 1｜任务 3/3 勾选
阶段墙钟：design 0s｜requirements 0s｜tasks 0s｜verify 0s｜proposal 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。