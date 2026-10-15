# 合成时间线快照 — 2026-10-15-supersedes-ghost-nodes

> 烤制于归档链（2026-10-15T02:10:36.334Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-15-supersedes-ghost-nodes — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
10:08:32  🁢 变更诞生（工件 frontmatter created_at）
10:08:38  ✅ checked 0→1
10:08:38  ✅ checked 1→2
10:08:38  ✅ checked 2→3
10:08:38  📝 tasks.md 内容变更
10:08:38  ✅ checked 0→2
10:08:39  ✅ checked 3→4
10:08:42  📝 tasks.md 内容变更
10:08:42  ✅ checked 2→4
10:08:59  📝 requirements.md 内容变更
10:09:22  📝 design.md 内容变更
10:09:32  🔀 74f5700a  feat(knowledge-graph): supersedes 幽灵版本节点——同号版本取代就地替换致目标…
10:09:45  📝 design.md 内容变更
10:09:49  · 门实测 skipped（1.4s） · 20261015020947

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  10:08:38    同号自链缺失目标合成幽灵节点（ghost/status=superseded/supe…  74f5700a
task-02  10:08:38    在场目标走真实边零变化；跨号缺失引用零铸造（误连防护测试②既有断言零回归）         74f5700a
task-03  10:08:38    幽灵有入边非孤儿；真图 supersedes 1→37 且 nodes 只增幽灵（知识…  74f5700a
task-04  10:08:39    全图测试 13 文件零回归 + 新增 ghost 测试 3 组全绿             74f5700a

墙钟：1min｜事件 13 条｜提交 1｜任务 4/4 勾选
阶段墙钟：tasks 4s｜requirements 0s｜design 23s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。