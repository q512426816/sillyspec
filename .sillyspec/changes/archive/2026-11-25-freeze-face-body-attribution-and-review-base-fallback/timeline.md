# 合成时间线快照 — 2026-11-25-freeze-face-body-attribution-and-review-base-fallback

> 烤制于归档链（2026-11-25T09:12:11.549Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-25-freeze-face-body-attribution-and-review-base-fallback — 合成时间线（thick｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
16:44:29  🁢 变更诞生（工件 frontmatter created_at）
16:47:00  📝 requirements.md 内容变更
16:49:26  📝 design.md 内容变更
17:00:58  🔀 a7975ce2  fix(flow): 冻结面归属读提交正文，review 基线回退 flow-state
17:01:36  ✅ checked 0→1
17:01:38  📝 tasks.md 内容变更
17:01:38  ✅ checked 0→1
17:01:43  ✅ checked 1→2
17:01:45  📝 tasks.md 内容变更
17:01:45  ✅ checked 1→2
17:01:48  ✅ checked 2→3
17:01:49  📝 tasks.md 内容变更
17:01:49  ✅ checked 2→3
17:01:53  ✅ checked 3→4
17:01:56  📝 tasks.md 内容变更
17:01:56  ✅ checked 3→4
17:01:59  ✅ checked 4→5
17:02:00  📝 tasks.md 内容变更
17:02:00  ✅ checked 4→5
17:02:46  🔀 f24a8f35  chore(spec): 勾选冻结面正文归属与 review 基线回退任务 (2026-11-25-freez…
17:04:11  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-11-25-freeze-face-body-attr…
17:05:30  · 门实测 failed（63.3s） · 20261125090528
17:07:36  ⚠️ scope-drift  声明面之外的代码文件被改：test/flowdone-disposition-drift.test.mjs——范围漂移嫌疑（并…
17:09:02  🔀 738b0111  test(flow): 漂移夹具剥离平台注入的 git 身份环境 (2026-11-25-freeze-fac…
17:09:50  📝 design.md 内容变更
17:09:54  🔀 5c6285ea  docs(spec): design 清单补记漂移测试夹具修复 (2026-11-25-freeze-face…
17:11:53  · 门实测 passed（63.9s） · 20261125091153

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  17:01:36    提交正文中的变更名与 task token 参与归属解析：标题无名、正文含 (<变更名…  a7975ce2
task-02  17:01:43    新增先红后绿复现测试：同一提交旧实现判 foreign / 新实现判 own（pars…  738b0111
task-03  17:01:48    writeTaskReview 无 worktree meta 时回退 flow-st…  无提交锚⚠️
task-04  17:01:53    仅给 --changed-files 时不再强制 base/head（两者缺省回退 H…  无提交锚⚠️
task-05  17:01:59    变更测试面绿、lint 通过                                无提交锚⚠️

墙钟：27min｜事件 26 条｜提交 4｜任务 5/5 勾选
阶段墙钟：requirements 0s｜design 20min｜tasks 24s｜verify 6min
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。