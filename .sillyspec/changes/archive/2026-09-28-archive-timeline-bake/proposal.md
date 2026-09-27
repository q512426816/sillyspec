---
author: flow-machine-draft
created_at: 2026-09-27T16:20:57.120Z
---
# 提案书（Proposal）— 2026-09-28-archive-timeline-bake

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:9f980c09b1376d559b9075501b711b5b22a29cc5592cafe07e5427a2027b1462:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-archive-timeline-bake 留痕重锚 -->
任务原话转写：watcher 事件流是合成时间线（每任务时刻/阶段墙钟）的唯一细粒度数据源，但落在 gitignore 的 .runtime 且机本位——实证：归档变更的事件文件在归档后即从本机消失（2026-09-27-change-birth-stage-brainstorm 的 jsonl 今日实测蒸发），跨机 clone 更无从合成。动机：归档时把合成时间线与原始事件副本烤进归档目录（归档目录提交进 git，天然跨机），让归档变更的时间线不再依赖 .runtime 存活。
成功标准：
- 归档链（runArchiveChain，flow done 与 run archive 双入口共用）在目录搬移成功后、窄化 git add 前，写 archive/<变更名>/timeline.md（合成时间线）与 archive/<变更名>/watcher-events.jsonl（原始事件副本）；烤制失败 fail-open（一行警告，不阻断归档）
- 本机 .runtime 无事件流时，sillyspec watcher timeline --change <已归档变更> 自动回退读归档包内 watcher-events.jsonl 副本，输出完整时间线并标注事件来源
- 事件副本带尺寸帽（超帽跳过副本只烤 timeline.md 并在文件头留注记），防巨型事件流污染 git
- 新增测试覆盖烤制渲染、烤制编排（fixture 目录）、回退读取（坏行容忍）、无事件跳过态；全量 npm test 与 npm run lint 绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:d6a9d846e1ef20927bbbda7472d07c43105489c874410b5bd73ccaa1abaf2d0a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-archive-timeline-bake 留痕重锚 -->
按成功标准机械推导，共 6 条验收面：
1. 归档链（runArchiveChain，flow done 与 run archive 双入口共用）在目录搬移成功后、窄化 git add 前，写 archive/<变更名>/timeline.md（合成时间线）与 archive/<变更名>/watcher-events.jsonl（原始事件副本）
2. 烤制失败 fail-open（一行警告，不阻断归档）
3. 本机 .runtime 无事件流时，sillyspec watcher timeline --change <已归档变更> 自动回退读归档包内 watcher-events.jsonl 副本，输出完整时间线并标注事件来源
4. 事件副本带尺寸帽（超帽跳过副本只烤 timeline.md 并在文件头留注记），防巨型事件流污染 git
5. 新增测试覆盖烤制渲染、烤制编排（fixture 目录）、回退读取（坏行容忍）、无事件跳过态
6. 全量 npm test 与 npm run lint 绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:65d7aa214bfcae4dbfeb725ae23b12fa4eb86af8ece41b3f3aa1a1d64b9b76b1:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-archive-timeline-bake 留痕重锚 -->
1. 归档链（runArchiveChain，flow done 与 run archive 双入口共用）在目录搬移成功后、窄化 git add 前，写 archive/<变更名>/timeline.md（合成时间线）与 archive/<变更名>/watcher-events.jsonl（原始事件副本）
2. 烤制失败 fail-open（一行警告，不阻断归档）
3. 本机 .runtime 无事件流时，sillyspec watcher timeline --change <已归档变更> 自动回退读归档包内 watcher-events.jsonl 副本，输出完整时间线并标注事件来源
4. 事件副本带尺寸帽（超帽跳过副本只烤 timeline.md 并在文件头留注记），防巨型事件流污染 git
5. 新增测试覆盖烤制渲染、烤制编排（fixture 目录）、回退读取（坏行容忍）、无事件跳过态
6. 全量 npm test 与 npm run lint 绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
