# 合成时间线快照 — 2026-10-06-resume-domain-flip

> 烤制于归档链（2026-10-06T13:38:25.775Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-10-06-resume-domain-flip — 合成时间线（thin｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
21:20:05  🁢 变更诞生（工件 frontmatter created_at）
21:14:26  📝 requirements.md 内容变更
21:15:28  📝 design.md 内容变更
21:20:42  📝 tasks.md 内容变更
21:20:42  ✅ checked 0→1
21:20:45  📝 tasks.md 内容变更
21:20:45  ✅ checked 1→5
21:20:52  📝 tasks.md 内容变更
21:20:52  ✅ checked 5→6
21:21:02  🔀 5139f1b8  fix(flow): 重入知识注入域路由防他侧未跟踪遗留劫持——resume 路由面改为「filterPreC…
21:24:23  · 门实测 passed（191.8s） · 20261006132422
21:32:46  📝 requirements.md 内容变更
21:32:50  📝 design.md 内容变更
21:33:59  🔀 0abe8472  fix(flow): 评审 P2/P3 清偿——filterPreChangeUntracked 增 stat…

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈21:20:42   resume 路由面 = 过滤后的基线以来文件面 ∪ --input 路径语料路由面（…  5139f1b8
task-02  ≈21:20:45   未跟踪条目「变更出生时刻之前从未写过」（最新 mtime 早于变更出生时刻；目录递归取…  5139f1b8
task-03  ≈21:20:45   变更出生时刻取进度库 changes.created_at（best-effort：无…  5139f1b8
task-04  ≈21:20:45   fr-rot-precision ⑥ 的源码级钉（resume 复用 changedF…  5139f1b8
task-05  ≈21:20:45   新增回归测试覆盖：过滤判据各分支 + 重入简报端到端（垃圾未跟踪目录不再劫持触达域、i…  5139f1b8
task-06  ≈21:20:52   npm run test:core 全绿                          5139f1b8

墙钟：13min｜事件 13 条｜提交 2｜任务 6/6 勾选
阶段墙钟：requirements 18min｜design 17min｜tasks 10s｜verify 0s
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。