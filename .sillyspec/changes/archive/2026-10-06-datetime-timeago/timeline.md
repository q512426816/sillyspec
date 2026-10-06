# 合成时间线快照 — 2026-10-06-datetime-timeago

> 烤制于归档链（2026-10-06T13:07:06.120Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-06-datetime-timeago — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
20:55:39  🁢 变更诞生（工件 frontmatter created_at）
20:58:00  📝 requirements.md 内容变更
20:58:20  📝 design.md 内容变更
21:00:55  📝 tasks.md 内容变更
21:00:55  ✅ checked 0→2
21:01:05  📝 tasks.md 内容变更
21:01:05  ✅ checked 2→4
21:01:42  🔀 c886ad61  feat(datetime): 人读相对时间单源化——datetime.timeAgo(input[, now…
21:02:01  📝 design.md 内容变更
21:02:24  · 门实测 passed（13.1s） · 20261006130222

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈21:00:55   src/datetime.js 提供 timeAgo(input) 公共导出：接受 D…  c886ad61
task-02  ≈21:00:55   输出形状与 stage-machine 现状逐字一致：刚刚 / N 分钟前 / N 小…  c886ad61
task-03  ≈21:01:05   stage-machine._timeAgo 改为委托 datetime.timeAg…  c886ad61
task-04  ≈21:01:05   新增回归测试覆盖各档位与无效输入，npm run test:core 全绿         c886ad61

墙钟：6min｜事件 9 条｜提交 1｜任务 4/4 勾选
阶段墙钟：requirements 0s｜design 3min｜tasks 10s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。