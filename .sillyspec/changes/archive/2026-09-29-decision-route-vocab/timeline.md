# 合成时间线快照 — 2026-09-29-decision-route-vocab

> 烤制于归档链（2026-09-28T17:07:06.272Z）：事件流机本位（.runtime gitignore），本快照随归档包进 git 跨机可读。
> 末尾事件（含「目录已移入 archive」终拍）可能晚于烤制未入快照；勾选时刻为顺序推断（≈）。
> 原始事件副本：本目录 watcher-events.jsonl（时点快照）。
📅 2026-09-29-decision-route-vocab — 合成时间线（thick｜事件流 × tasks.md × git 提交锚）

── 事件时间轴 ──
00:24:44  🁢 变更诞生（工件 frontmatter created_at）
00:35:36  📝 requirements.md 内容变更
00:35:36  📝 design.md 内容变更
00:35:36  📝 tasks.md 内容变更
00:35:36  ✅ checked 0→7
00:35:36  📄 decisions.md 出现
00:35:36  ⚠️ fake-check  tasks 勾选 task-06、task-06 无对应提交（消息不含该 task id）且无 review.json 变更—…
00:36:01  🔀 504050a7  feat(knowledge): 检索词覆盖两件——零命中查询侧词片回退（只测查询自身词片×文件内复现窗口 […
00:36:01  · task task-06 勾选证据补齐（提交 504050a7）——前拍假勾选嫌疑消解
00:37:22  · 门实测 failed（55.9s） · 20260928163722
00:52:26  ⚠️ stall  execute 期已 15 分钟无提交无事件——停滞嫌疑（区分在想/死了，人判）
00:57:13  🔀 f8ad55fa  feat(knowledge): 平台向量召回层——检索三层化（路由→平台向量→本地词片）：CLI 本地零模型…
00:58:46  · 门实测 passed（39.9s） · 20260928165845
01:05:08  🔀 867d6ee2  feat(gates): brainstorm 闭环收口门——六类无主开口接机器收口（全 warning 棘轮…
01:06:20  🔀 a08d81f4  feat(gates): brainstorm 闭环收口门——六类无主开口接机器收口（全 warning 棘轮…
01:07:03  📝 design.md 内容变更
01:07:03  📝 decisions.md 内容变更

── 任务面（勾选时刻 ≈ 顺序推断｜tasks.md 描述行 × 提交锚）──
task-01  ≈00:35:36   syncIndexRoutingLines（decisions 侧）按域从条目标题∪理…  867d6ee2
task-02  ≈00:35:36   真实库 reconcile 后：查询「谓词守卫」「顿号拆分」路由命中（matched …  a08d81f4
task-03  ≈00:35:36   「枚举词表」既有命中不回归                                 a08d81f4
task-04  ≈00:35:36   蒸馏入选条目标题必填：裸号条目（## D-xxx@vN 无标题）needsWait 拦…  a08d81f4
task-05  ≈00:35:36   既有蒸馏/知识测试回归全绿                                 a08d81f4
task-06  ≈00:35:36   test:core 全绿                                  504050a7
task-06  ≈00:35:36   查询侧词片回退（fallbackByQueryShingles）＋蒸馏标题必填＋夹具规…  504050a7

墙钟：42min｜事件 16 条｜提交 4｜任务 7/7 勾选
阶段墙钟：requirements 0s｜design 31min｜tasks 0s｜proposal 31min｜verify 21min
注：观测起点≠诞生时刻（watcher 后拉起/单飞锁盲窗）；勾选时刻为顺序推断（事件不记任务 id）；描述行含机器稿截断。