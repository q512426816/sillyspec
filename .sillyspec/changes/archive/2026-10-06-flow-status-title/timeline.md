# 合成时间线快照 — 2026-10-06-flow-status-title

> 烤制于归档链（2026-10-06T11:14:40.232Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-06-flow-status-title — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
19:05:59  🁢 变更诞生（工件 frontmatter created_at）
19:08:03  📝 requirements.md 内容变更
19:08:23  📝 design.md 内容变更
19:12:26  📝 tasks.md 内容变更
19:12:26  ✅ checked 0→1
19:12:33  📝 tasks.md 内容变更
19:12:33  ✅ checked 1→3
19:12:53  🔀 0d7576c8  feat(flow): flow status 显示变更标题（进度库 changes.title 只读回显）—…
19:13:56  · 门实测 passed（48.4s） · 20261006111353
19:14:39  📄 decisions.md 出现

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈19:12:26   DB 登记过 title 的活跃变更，flow status 人类输出包含「标题：<t…  0d7576c8
task-02  ≈19:12:33   flow status --json 输出增加 title 字段（无记录时为 null）  0d7576c8
task-03  ≈19:12:33   无 DB 或无 title 时输出与现状一致（不新增标题行，json 里 title=…  0d7576c8

墙钟：8min｜事件 9 条｜提交 1｜任务 3/3 勾选
阶段墙钟：requirements 0s｜design 0s｜tasks 7s｜verify 0s｜proposal 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。