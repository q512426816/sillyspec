# 合成时间线快照 — 2026-10-16-ci-linux-residual-fix

> 烤制于归档链（2026-10-16T10:20:19.955Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-16-ci-linux-residual-fix — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
16:28:38  🁢 变更诞生（工件 frontmatter created_at）
16:29:48  ✅ checked 0→1
16:29:48  ✅ checked 1→2
17:11:40  ✅ checked 2→3
17:11:41  ✅ checked 3→4
17:15:11  ✅ checked 4→5
17:15:11  ✅ checked 5→6
17:21:30  ✅ checked 6→7

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
（已勾任务缺推断时刻——观测盲窗/水位丢失，标 ?）
task-01  16:29:48    test/backlog-batch-a.test.mjs 在 linux 与 win…  无提交锚⚠️
task-02  16:29:48    test/feedback-batch2-hardening.test.mjs 双端退…  无提交锚⚠️
task-03  17:15:11    本地 Linux 容器内全量 npm test 零失败（818 文件）           无提交锚⚠️
task-04  17:21:30    推送后 CI test job 转绿（lint/docs-gate 维持绿）        无提交锚⚠️
task-05  17:15:11    零回归：两文件其余断言、src 实现（quicklog.js/verify-postc…  无提交锚⚠️
task-06  17:11:40    src/verify-postcheck.js 裸 NUL 字节替换为 \u0000 …  无提交锚⚠️
task-07  17:11:41    src/run/shared.js EOL 假 M 探测改 --numstat（git…  无提交锚⚠️
task-08  ?           收口评审 P2 整改——根因叙述改四象限实测口径（分叉轴=node 版本）+ EOL …  无提交锚⚠️

墙钟：52min｜事件 7 条｜提交 0｜任务 8/8 勾选
阶段墙钟：tasks 51min
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。