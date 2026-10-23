# 合成时间线快照 — 2026-10-23-fr-regress-default-off

> 烤制于归档链（2026-10-23T01:26:54.985Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻：精确=task tick 侧车留痕，≈=事件流顺序推断。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-23-fr-regress-default-off — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
08:57:47  🁢 变更诞生（工件 frontmatter created_at）
08:57:58  📄 proposal.md 出现
08:57:58  📄 requirements.md 出现
08:57:58  📄 design.md 出现
08:57:58  📄 tasks.md 出现
08:59:32  📝 requirements.md 内容变更
08:59:32  📝 design.md 内容变更
08:59:32  📝 tasks.md 内容变更
08:59:59  ⚠️ scope-drift  声明面之外的代码文件被改：src/verify-postcheck.js.tmp.26192.67606a98a97e——范围…
09:03:16  · 本地配置 local.yaml 有变更（内容不上行）
09:06:18  ⚠️ scope-drift  声明面之外的代码文件被改：test/dynamic-test-inference.test.mjs——范围漂移嫌疑（并行会话改…
09:11:09  ✅ checked 0→1
09:11:10  ✅ checked 1→2
09:11:10  ✅ checked 2→3
09:11:10  ✅ checked 3→4
09:11:11  📝 tasks.md 内容变更
09:11:11  ✅ checked 0→4
09:11:15  🔀 ad5c2d49  feat(verify): FR 回归层缺省关闭（用户裁决「默认就不跑，配置可以开启」）——readFrReg…
09:12:51  · 门实测 passed（29.9s） · 20261023011251
09:20:24  📝 requirements.md 内容变更
09:20:24  📝 design.md 内容变更
09:20:37  🔀 068688c8  fix(verify): 评审 P1 清偿——dynamic-empty 路径披露与 reason 如实化（绑…
09:21:10  📝 requirements.md 内容变更
09:21:39  🔀 5949a4e4  docs(change): FR-04 绑定行序号对齐（②③⑤→①②③＋两相 E2E——评审 P3 清偿余项）…

── 任务面（勾选时刻：精确=task tick 侧车留痕｜≈=事件流顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  09:11:09    readFrRegressCap v2（缺省/坏值/不可读→0；off→0；N→N；a…  ad5c2d49
task-02  09:11:10    披露行开启指引+动态子集信息行按实际组面描述+flow start 横幅文案同步——验…  无提交锚⚠️
task-03  09:11:10    本仓 local.yaml 移除键留痕；fr-priority-overlap 夹具显…  无提交锚⚠️
task-04  09:11:10    既有面回归批跑（verify 族+本会话新增六套件抽验）全绿——验证：node --t…  无提交锚⚠️

墙钟：23min｜事件 23 条｜提交 3｜任务 4/4 勾选
阶段墙钟：proposal 0s｜requirements 23min｜design 22min｜tasks 13min｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻精确值=task tick 侧车留痕（task-ticks.jsonl），≈=事件流顺序推断（事件不记任务 id）；描述行含机器稿截断。