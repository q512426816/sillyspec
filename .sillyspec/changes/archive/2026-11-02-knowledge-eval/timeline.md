# 合成时间线快照 — 2026-11-02-knowledge-eval

> 烤制于归档链（2026-11-02T03:20:54.516Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-02-knowledge-eval — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
10:07:32  🁢 变更诞生（工件 frontmatter created_at）
10:08:55  📝 requirements.md 内容变更
10:08:55  📝 design.md 内容变更
10:08:55  📝 tasks.md 内容变更
10:09:15  📝 design.md 内容变更
10:10:56  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/——范围漂移嫌疑（并行会话改动/越界，人判）
10:11:33  ✅ checked 0→1
10:11:36  📝 tasks.md 内容变更
10:11:36  ✅ checked 0→1
10:15:41  ✅ checked 1→2
10:15:43  📝 tasks.md 内容变更
10:15:43  ✅ checked 1→2
10:15:54  ⚠️ scope-drift  声明面之外的代码文件被改：rc/knowledge-match.js——范围漂移嫌疑（并行会话改动/越界，人判）
10:17:26  ✅ checked 2→3
10:17:26  📝 tasks.md 内容变更
10:17:26  ✅ checked 2→3
10:17:30  📄 decisions.md 出现
10:19:46  ⚠️ scope-drift  声明面之外的代码文件被改：ackage.json、src/knowledge-match.js——范围漂移嫌疑（并行会话改动/…
10:20:45  ✅ checked 3→4
10:20:45  📝 tasks.md 内容变更
10:20:45  ✅ checked 3→4
10:20:49  ✅ checked 4→5
10:20:52  📝 tasks.md 内容变更
10:20:52  ✅ checked 4→5
10:22:46  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/fixtures/index.mjs、eval/knowledge/l…
10:22:59  🔀 d5aaaaf3  feat(eval): 知识检索评测面——六类缺陷探针 + 三源数据集 + 分面 runner 双口径 + 冻…
10:23:09  ✅ checked 5→6
10:23:10  📝 tasks.md 内容变更
10:23:10  ✅ checked 5→6
10:23:10  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-11-02-knowledge-eval/task-t…
10:23:14  🔀 8d9d57c3  chore(tasks): task-06 勾选——两仓实跑落基线 + 回归 86 绿 + lint 1098…
10:23:24  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-11-02-knowledge-eval/flow-s…
10:23:37  · 门实测 passed（5.8s） · 20261102022335
10:38:38  ⚠️ stall  execute 期已 15 分钟无提交无事件——停滞嫌疑（区分在想/死了，人判）
10:41:02  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/lib/repos.mjs——范围漂移嫌疑（并行会话改动/越界，人判）
10:43:07  📝 decisions.md 内容变更
10:44:51  📝 decisions.md 内容变更
10:45:01  🔀 f0ae9dda  fix(eval): 评测工具项目中立——--repo 任意仓路径解析取代两仓硬编码，源码级中立断言防回归 (…
10:45:02  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-11-02-knowledge-eval/flow-s…
10:58:34  📝 decisions.md 内容变更
11:12:40  ⚠️ scope-drift  声明面之外的代码文件被改：src/stages/knowledge.js——范围漂移嫌疑（并行会话改动/越界，人判）
11:13:00  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/lib/faces.mjs、eval/knowledge/lib/pr…
11:13:37  ⚠️ stall  execute 期已 15 分钟无提交无事件——停滞嫌疑（区分在想/死了，人判）
11:14:04  📝 design.md 内容变更
11:14:04  ⚠️ scope-drift  声明面之外的代码文件被改：test/eval-knowledge-isolation.test.mjs、test/eval-k…
11:14:14  📝 design.md 内容变更
11:18:41  📝 design.md 内容变更
11:18:51  📝 requirements.md 内容变更
11:20:29  🔀 50c240fc  fix(eval): 评审 1 P1 + 7 P2 全修——search 面走真实 hybrid+生产 bui…
11:20:30  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-11-02-knowledge-eval/flow-s…

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  10:11:33    搭 eval/knowledge 骨架与纯函数——lib/metrics.mjs（To…  无提交锚⚠️
task-02  10:15:41    数据集层——lib/dataset.mjs 三源加载/校验（organic 冻结、se…  无提交锚⚠️
task-03  10:17:26    六类缺陷探针 fixture——fixtures/ 下 score-contract、…  无提交锚⚠️
task-04  10:20:45    引擎适配与分面 runner——lib/engine.mjs 只读适配 matchBy…  无提交锚⚠️
task-05  10:20:49    baseline 与出口——lib/report.mjs diff 输出、baseli…  无提交锚⚠️
task-06  10:23:09    两仓实跑落基线——--repo all 跑通并提交 baseline.json，跑变更…  无提交锚⚠️

墙钟：1h12min｜事件 49 条｜提交 4｜任务 6/6 勾选
阶段墙钟：requirements 1h9min｜design 1h9min｜tasks 14min｜proposal 41min｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。