# 合成时间线快照 — 2026-10-23-dirty-gate-ignore

> 烤制于归档链（2026-10-22T23:48:22.052Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-23-dirty-gate-ignore — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
07:39:13  🁢 变更诞生（工件 frontmatter created_at）
07:39:16  📄 proposal.md 出现
07:39:16  📄 requirements.md 出现
07:39:16  📄 design.md 出现
07:39:16  📄 tasks.md 出现
07:39:50  📝 requirements.md 内容变更
07:39:50  📝 design.md 内容变更
07:39:50  📝 tasks.md 内容变更
07:40:23  ⚠️ scope-drift  声明面之外的代码文件被改：rc/flow-parity.js——范围漂移嫌疑（并行会话改动/越界，人判）
07:43:28  ✅ checked 0→1
07:43:29  ✅ checked 1→2
07:43:29  ✅ checked 2→3
07:43:31  📝 tasks.md 内容变更
07:43:31  ✅ checked 0→3
07:43:31  🔀 932698f0  feat(flow): dirty_gate_ignore 已知残渣忽略键——collectFreezeFil…
07:44:54  · 门实测 skipped（62.9s） · 20261022234453

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  07:43:28    collectFreezeFiles 内 fail-soft 读 dirty_gate…  932698f0
task-02  07:43:29    patch 子步权威门 ℹ️ 留痕行 + 权威门/预检两处阻断文案增第④条出路（逐字同…  无提交锚⚠️
task-03  07:43:29    新增 test/dirty-gate-ignore.test.mjs 四态矩阵全绿 +…  无提交锚⚠️

墙钟：5min｜事件 15 条｜提交 1｜任务 3/3 勾选
阶段墙钟：proposal 0s｜requirements 34s｜design 34s｜tasks 4min｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。