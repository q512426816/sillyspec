# 合成时间线快照 — 2026-10-20-scoped-verify-policy

> 烤制于归档链（2026-10-20T15:50:38.663Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-20-scoped-verify-policy — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
23:00:00  🁢 变更诞生（工件 frontmatter created_at）
23:30:24  📝 requirements.md 内容变更
23:30:24  📝 design.md 内容变更
23:34:35  ✅ checked 0→1
23:34:36  📝 tasks.md 内容变更
23:34:36  ✅ checked 0→1
23:34:49  ✅ checked 1→2
23:34:50  ✅ checked 2→3
23:34:50  📝 tasks.md 内容变更
23:34:50  ✅ checked 1→3
23:35:05  ✅ checked 3→4
23:35:07  📝 tasks.md 内容变更
23:35:07  ✅ checked 3→4
23:35:07  🔀 ea11d359  feat(runner): 自验口径钉进工具——AGENTS 模板+本仓规则4增自验口径句（变更测试面+lin…
23:36:23  · 门实测 passed（49.4s） · 20261020153622
23:47:27  🔀 fe6d8321  fix(runner): 评审 P2/P3 清偿——filterToFailedFace 匹配双形态（清单落盘…

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  23:35:05    AGENTS.md 与 templates/agents-instruction.md…  ea11d359
task-02  23:34:49    run-tests.mjs：--failed 读清单过滤（缺失项 warn、空交集 N…  ea11d359
task-03  23:34:50    过滤/落盘逻辑提为 test/runner-failure-face.mjs 纯函数模…  ea11d359
task-04  23:34:35    本变更按新口径自验（变更测试面+lint，不跑全量）；lint 绿             ea11d359

墙钟：47min｜事件 15 条｜提交 2｜任务 4/4 勾选
阶段墙钟：requirements 0s｜design 0s｜tasks 33s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。