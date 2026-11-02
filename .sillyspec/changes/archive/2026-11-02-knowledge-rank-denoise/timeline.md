# 合成时间线快照 — 2026-11-02-knowledge-rank-denoise

> 烤制于归档链（2026-11-02T04:55:32.214Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-02-knowledge-rank-denoise — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
12:02:08  🁢 变更诞生（工件 frontmatter created_at）
12:03:53  📝 requirements.md 内容变更
12:03:53  📝 design.md 内容变更
12:03:53  📝 tasks.md 内容变更
12:04:30  ⚠️ scope-drift  声明面之外的代码文件被改：val/knowledge/lib/engine.mjs——范围漂移嫌疑（并行会话改动/越界，人判）
12:05:46  ✅ checked 0→1
12:05:48  📝 tasks.md 内容变更
12:05:48  ✅ checked 0→1
12:05:51  ✅ checked 1→2
12:05:52  📝 tasks.md 内容变更
12:05:52  ✅ checked 1→2
12:07:27  ✅ checked 2→3
12:07:30  📝 tasks.md 内容变更
12:07:30  ✅ checked 2→3
12:10:24  ⚠️ scope-drift  声明面之外的代码文件被改：test/knowledge-inject.test.mjs——范围漂移嫌疑（并行会话改动/越界，人…
12:10:34  ⚠️ scope-drift  声明面之外的代码文件被改：test/knowledge-tier-denoise.test.mjs——范围漂移嫌疑（并行会话改…
12:12:22  ⚠️ scope-drift  声明面之外的代码文件被改：test/thin-fr-inject-parity.test.mjs——范围漂移嫌疑（并行会话改动…
12:12:43  ✅ checked 3→4
12:12:46  📝 tasks.md 内容变更
12:12:46  ✅ checked 3→4
12:14:20  ✅ checked 4→5
12:14:21  📝 tasks.md 内容变更
12:14:21  ✅ checked 4→5
12:14:48  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/lib/engine.mjs、val/knowledge/baseli…
12:19:00  ✅ checked 5→6
12:19:03  📝 tasks.md 内容变更
12:19:03  ✅ checked 5→6
12:19:06  📄 decisions.md 出现
12:19:19  📝 decisions.md 内容变更
12:19:47  🔀 9bfaa74f  feat(knowledge): 检索排序与降噪——score 契约修复、词边界统一(_ 词字符/- 边界)、…
12:19:57  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-11-02-knowledge-rank-denois…
12:20:23  · 门实测 passed（9.6s） · 20261102042022
12:21:19  ⚠️ scope-drift  声明面之外的代码文件被改：src/index.js——范围漂移嫌疑（并行会话改动/越界，人判）
12:26:20  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/lib/engine.mjs、eval/knowledge/lib/f…
12:26:40  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/lib/dataset.mjs、eval/knowledge/run.…
12:26:57  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/datasets/organic.jsonl、eval/knowled…
12:28:36  ⚠️ scope-drift  声明面之外的代码文件被改：test/eval-knowledge-isolation.test.mjs——范围漂移嫌疑（并行会…
12:28:46  ⚠️ scope-drift  声明面之外的代码文件被改：test/eval-knowledge-dataset.test.mjs、test/eval-kno…
12:31:08  🔀 22db72eb  fix(eval): 评测面复核 P1 修正——数据集面归位/fr 面/标签自检/hybrid 同源 (tas…
12:46:10  ⚠️ stall  execute 期已 15 分钟无提交无事件——停滞嫌疑（区分在想/死了，人判）
12:55:12  🔀 18ab28b6  fix(knowledge): 评审 P1+P2 修复——cmdSearch 保留 routeHits 载荷、…

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  12:05:46    score 契约——buildSearchMatches 加 query 参数、sco…  无提交锚⚠️
task-02  12:05:51    词边界——keywordMatchesContext 与 asciiWordHit 统…  无提交锚⚠️
task-03  12:07:27    已修复过滤——known-issues 分类+display/anchor 显式词 f…  无提交锚⚠️
task-04  12:12:43    routeHits 分离——entries 只留手工条目、条件式 routeHits、…  无提交锚⚠️
task-05  12:14:20    DF 排序——entries 可展示语料分母、命中数优先+Σ(1/DF) 破平+IND…  无提交锚⚠️
task-06  12:19:00    回归与基线——knowledge 面 20 个测试文件全绿、四类探针 GREEN 且 …  无提交锚⚠️

墙钟：53min｜事件 40 条｜提交 3｜任务 6/6 勾选
阶段墙钟：requirements 0s｜design 0s｜tasks 15min｜proposal 13s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。