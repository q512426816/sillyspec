# 合成时间线快照 — 2026-11-02-knowledge-scope-recall

> 烤制于归档链（2026-11-02T05:57:21.474Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-11-02-knowledge-scope-recall — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
13:17:16  🁢 变更诞生（工件 frontmatter created_at）
13:19:24  📝 requirements.md 内容变更
13:19:24  📝 design.md 内容变更
13:19:24  📝 tasks.md 内容变更
13:20:08  ⚠️ scope-drift  声明面之外的代码文件被改：rc/knowledge-match.js、src/stages/knowledge.js——范围漂…
13:20:25  ⚠️ scope-drift  声明面之外的代码文件被改：rc/knowledge-graph.js、src/knowledge-match.js——范围漂移…
13:21:41  ✅ checked 0→1
13:21:43  📝 tasks.md 内容变更
13:21:43  ✅ checked 0→1
13:21:47  ✅ checked 1→2
13:21:47  📝 tasks.md 内容变更
13:21:47  ✅ checked 1→2
13:22:37  ⚠️ scope-drift  声明面之外的代码文件被改：val/knowledge/datasets/organic.jsonl——范围漂移嫌疑（并行会话改…
13:23:34  ⚠️ scope-drift  声明面之外的代码文件被改：test/eval-knowledge-dataset.test.mjs、test/eval-kno…
13:24:20  ⚠️ scope-drift  声明面之外的代码文件被改：eval/knowledge/lib/report.mjs——范围漂移嫌疑（并行会话改动/越界，人判）
13:25:23  ⚠️ scope-drift  声明面之外的代码文件被改：val/knowledge/baseline.json——范围漂移嫌疑（并行会话改动/越界，人判）
13:26:36  ✅ checked 2→3
13:26:39  📝 tasks.md 内容变更
13:26:39  ✅ checked 2→3
13:26:40  ✅ checked 3→4
13:26:43  📝 tasks.md 内容变更
13:26:43  ✅ checked 3→4
13:26:44  ✅ checked 4→5
13:26:46  📝 tasks.md 内容变更
13:26:46  ✅ checked 4→5
13:27:01  ✅ checked 5→6
13:27:03  📝 tasks.md 内容变更
13:27:03  ✅ checked 5→6
13:27:20  🔀 efce0baa  feat(knowledge): scope 召回两跳与手工条目可达——section 级 doc-refs、…
13:27:30  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-11-02-knowledge-scope-recal…
13:27:41  · 门实测 passed（5.8s） · 20261102052740
13:42:43  ⚠️ stall  execute 期已 15 分钟无提交无事件——停滞嫌疑（区分在想/死了，人判）
13:52:32  ⚠️ scope-drift  声明面之外的代码文件被改：test/knowledge-graph.test.mjs、test/knowledge-hotpa…
13:56:49  🔀 d6113aa1  fix(knowledge): 评审 P1+P2 修复——图谱契约测试补齐、去重键含 change、数据集达标…

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  13:21:41    A 段——knowledge-graph.js entry 节点补 category/…  无提交锚⚠️
task-02  13:21:47    B 段——反向两跳 deliverables→change→from-change 只…  无提交锚⚠️
task-03  13:26:36    C 段数据——平台 decisions 8~10 条（非 parking reject…  无提交锚⚠️
task-04  13:26:40    探针——scope-manual 增 entries-only 正例与 section…  无提交锚⚠️
task-05  13:26:44    验收口径——scope 面按 frozen/added 子集单列（faces/run.…  无提交锚⚠️
task-06  13:27:01    回归与基线——knowledge 面全绿 + lint 绿 + baseline 更新…  无提交锚⚠️

墙钟：39min｜事件 33 条｜提交 2｜任务 6/6 勾选
阶段墙钟：requirements 0s｜design 0s｜tasks 7min｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。