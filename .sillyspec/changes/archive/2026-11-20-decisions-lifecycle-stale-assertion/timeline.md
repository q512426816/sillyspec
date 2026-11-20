# 合成时间线快照 — 2026-11-20-decisions-lifecycle-stale-assertion

> 烤制于归档链（2026-11-20T00:17:04.028Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-20-decisions-lifecycle-stale-assertion — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
08:13:11  🁢 变更诞生（工件 frontmatter created_at）
08:13:49  📝 requirements.md 内容变更
08:14:04  📝 design.md 内容变更
08:16:04  · 本地配置 local.yaml 有变更（内容不上行）
08:16:28  📝 tasks.md 内容变更
08:16:28  ✅ checked 0→4
08:16:48  🔀 172fdd86  test(knowledge): decisions-lifecycle 跨域迁移用例对齐域稳定语义——断言过…
08:17:02  · 门实测 passed（5.4s） · 20261120001700

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈08:16:28   原「@v2 跨域迁移」用例按域稳定语义重写并通过（v2 声明新模块域时仍在存量域就地升…  无提交锚⚠️
task-02  ≈08:16:28   新增断言显式锁定存量域优先语义（redomain 治理形态：存量段在 docs-con…  无提交锚⚠️
task-03  ≈08:16:28   test/decisions-lifecycle.test.mjs 31 用例全绿（原…  无提交锚⚠️
task-04  ≈08:16:28   .sillyspec/local.yaml known_failures 中该用例豁免…  无提交锚⚠️

墙钟：3min｜事件 7 条｜提交 1｜任务 4/4 勾选
阶段墙钟：requirements 0s｜design 0s｜tasks 0s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。