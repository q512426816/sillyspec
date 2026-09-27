---
author: flow-machine-draft
created_at: 2026-09-26T07:28:26.621Z
---
# 提案书（Proposal）— 2026-09-26-watcher-timeline-p2

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:7da485401eb380411880f575b7757f51da5e843e0c5fc4189d31bd5fda49dbf6:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline-p2 留痕重锚 -->
任务原话转写：动机/背景：watcher-timeline 独立评审 PASS 但留 3 条 P2 未清偿：一、inferFlipTimes 尾部规则把「部分勾选的正常在途变更」误标计数链断裂——broken 语义应为中段断裂，尾部未覆盖只是未勾任务的自然态，渲染层按已勾任务缺时刻单独标注；二、design 承诺墙钟统计复用 aggregateStageTiming 但实现直接首尾相减——补真实复用并输出逐阶段墙钟；三、FR-02 测试绑定豁免理由与代码事实不符——loadChangeTasks 是独立可测函数，补 tmpdir 双路径探测用例。本变更为 2026-09-26-watcher-timeline 的评审清偿件（先例 3eb3bfbf 模式）。
成功标准：
- inferFlipTimes 仅在中段计数不衔接时标 broken，尾部未覆盖不再误标，配套用例更新
- renderTimeline 输出逐阶段墙钟（复用 watcher 的 aggregateStageTiming），已勾任务缺推断时刻时单独标注而非笼统断裂注
- loadChangeTasks 获 tmpdir 用例：活跃优先于归档、归档回退、双缺失返回 null
- npm run test:core 与 npm run lint 实测全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:5882b9d6460ceb9531e8b29722b5ef9fbeca93203893fbcaa38f4d2d4362bd4e:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline-p2 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. inferFlipTimes 仅在中段计数不衔接时标 broken，尾部未覆盖不再误标，配套用例更新
2. renderTimeline 输出逐阶段墙钟（复用 watcher 的 aggregateStageTiming），已勾任务缺推断时刻时单独标注而非笼统断裂注
3. loadChangeTasks 获 tmpdir 用例：活跃优先于归档、归档回退、双缺失返回 null
4. npm run test:core 与 npm run lint 实测全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:3adc17e2d5cb68ced3f9b94d3c68f20fb31d1f99e1370a7f2f6e04bc6c18a833:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline-p2 留痕重锚 -->
1. inferFlipTimes 仅在中段计数不衔接时标 broken，尾部未覆盖不再误标，配套用例更新
2. renderTimeline 输出逐阶段墙钟（复用 watcher 的 aggregateStageTiming），已勾任务缺推断时刻时单独标注而非笼统断裂注
3. loadChangeTasks 获 tmpdir 用例：活跃优先于归档、归档回退、双缺失返回 null
4. npm run test:core 与 npm run lint 实测全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
