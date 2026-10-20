# 合成时间线快照 — 2026-10-20-decision-caliber-unify

> 烤制于归档链（2026-10-20T02:52:42.001Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-20-decision-caliber-unify — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
10:28:57  🁢 变更诞生（工件 frontmatter created_at）
10:29:01  📄 tasks.md 出现
10:30:46  📝 requirements.md 内容变更
10:31:16  📝 design.md 内容变更
10:31:23  📝 tasks.md 内容变更
10:32:22  🔀 63b201b5  feat(decision-caliber): 正典值集单一源落地——新增 src/decision-valu…
10:32:26  ✅ checked 0→1
10:32:28  📝 tasks.md 内容变更
10:32:28  ✅ checked 0→1
10:32:59  🔀 e6912277  feat(decision-caliber): 两消费面改正典派生——decisions-io 白名单 Set…
10:33:07  ✅ checked 1→2
10:33:09  📝 tasks.md 内容变更
10:33:09  ✅ checked 1→2
10:34:25  ⚠️ scope-drift  声明面之外的代码文件被改：src/index.js——范围漂移嫌疑（并行会话改动/越界，人判）
10:34:51  ⚠️ scope-drift  声明面之外的代码文件被改：test/worktree-cwd-guard.test.mjs——范围漂移嫌疑（并行会话改动/越界…
10:38:07  🔀 91a622f5  fix(cli): 评审 P2/P3①/P3② 清偿——显式 --spec-dir 指进同一 worktree…
10:38:30  🔀 6cb2f170  docs(spec): 2026-10-20-cli-worktree-cwd-anchor 规格工件入库（r…
10:38:34  🔀 d454842c  feat(decision-caliber): brainstorm 两处决策模板 type/status 清…
10:38:40  ✅ checked 2→3
10:38:40  📝 tasks.md 内容变更
10:38:40  ✅ checked 2→3
10:39:01  ✅ checked 3→4
10:39:01  📝 tasks.md 内容变更
10:39:01  ✅ checked 3→4
10:39:01  🔀 bde4ab74  test(decision-caliber): 既有四套件零回归复跑 14/14 绿（decisions-io…
10:39:01  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-10-20-decision-caliber-unif…
10:39:19  📄 decisions.md 出现
10:39:22  📝 decisions.md 内容变更
10:39:29  🔀 4e1a9d8b  docs(decision-caliber): 变更包 spec 面与决策入册（D-001 正典并集定案 / …
10:39:39  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-10-20-decision-caliber-unif…
10:39:49  · 门实测 skipped（5.9s） · 20261020023947
10:50:17  ⚠️ scope-drift  声明面之外的代码文件被改：sillyspec/changes/2026-10-20-cli-worktree-cwd-anch…
10:50:28  ⚠️ scope-drift  声明面之外的代码文件被改：src/stage-templates.js——范围漂移嫌疑（并行会话改动/越界，人判）
10:52:20  📝 design.md 内容变更
10:52:30  🔀 8227bd0a  fix(decision-caliber): 评审 P2 清偿——stage-templates 四件套 de…

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  10:32:26    新增 src/decision-values.js 正典值集单一源（4 冻结常量）+ …  无提交锚⚠️
task-02  10:33:07    decisions-io.js 白名单改导入派生 + type 扩 8 值；decis…  无提交锚⚠️
task-03  10:38:40    brainstorm.js 两处模板 type/status 清单对齐正典 + doc…  无提交锚⚠️
task-04  10:39:01    复跑既有四套件 decisions-io / decision-distill-fla…  无提交锚⚠️

墙钟：23min｜事件 34 条｜提交 8｜任务 4/4 勾选
阶段墙钟：tasks 10min｜requirements 0s｜design 21min｜proposal 4s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。