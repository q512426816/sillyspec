# 合成时间线快照 — 2026-10-06-fr-regress-cap-drop

> 烤制于归档链（2026-10-06T11:31:28.160Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-06-fr-regress-cap-drop — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
19:20:52  🁢 变更诞生（工件 frontmatter created_at）
19:21:41  📝 requirements.md 内容变更
19:22:04  📝 design.md 内容变更
19:26:01  📝 tasks.md 内容变更
19:26:01  ✅ checked 0→2
19:26:04  📝 tasks.md 内容变更
19:26:04  ✅ checked 2→4
19:26:21  🔀 dee59107  fix(verify): 优先面豁免 deps 组卷帽——FR 钦定回归不再被 30 帽静默丢弃（2026-1…
19:27:21  · 门实测 passed（47.6s） · 20261006112718

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈19:26:01   priorityFiles ∪ 变更自身测试文件不再被 CAP 弃置：优先面整跑（组内…  dee59107
task-02  ≈19:26:01   批对象披露计数分列：count=实跑总数、dropped 只计普通依赖弃置、新增优先面…  dee59107
task-03  ≈19:26:04   既有分组/运行器推断行为不变：.py/tsx/jsx 组、pytest/vitest …  dee59107
task-04  ≈19:26:04   直测覆盖三种配额形态：优先面超帽（普通依赖零席位）、优先面未满帽（普通填余）、py/j…  dee59107

墙钟：6min｜事件 8 条｜提交 1｜任务 4/4 勾选
阶段墙钟：requirements 0s｜design 0s｜tasks 4s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。