# 合成时间线快照 — 2026-09-30-snapshot-symlink-store-subdir

> 烤制于归档链（2026-09-30T08:36:52.414Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-09-30-snapshot-symlink-store-subdir — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
16:22:34  🁢 变更诞生（工件 frontmatter created_at）
16:28:24  📝 requirements.md 内容变更
16:28:24  📝 design.md 内容变更
16:28:24  📝 tasks.md 内容变更
16:28:24  ✅ checked 0→5
16:33:38  🔀 2d8dcccd  perf(gate-snapshot): symlink-store 布局探测扩展子目录 lockfile——…
16:34:01  · 门实测 passed（21.9s） · 20260930083400
16:36:50  📝 requirements.md 内容变更

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈16:28:24   子目录（一层）存在 pnpm/bun/lerna lockfile 而根目录无任何 l…  2d8dcccd
task-02  ≈16:28:24   根目录判据行为零变化（根命中优先，标签不带 subdir）                 2d8dcccd
task-03  ≈16:28:24   createVerifyGateSnapshot 对子目录布局命中时打印跳快照警告并返…  2d8dcccd
task-04  ≈16:28:24   非仓目录/无子目录/子目录全空的行为零变化（null）                   2d8dcccd
task-05  ≈16:28:24   全量测试回归绿 + lint 绿                              2d8dcccd

墙钟：14min｜事件 7 条｜提交 1｜任务 5/5 勾选
阶段墙钟：requirements 8min｜design 0s｜tasks 0s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。