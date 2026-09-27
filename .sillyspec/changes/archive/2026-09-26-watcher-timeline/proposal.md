---
author: flow-machine-draft
created_at: 2026-09-26T07:13:30.151Z
---
# 提案书（Proposal）— 2026-09-26-watcher-timeline

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:367e1ae70f7c98c8bd3b0ae5b0c9e259a94b0fca24f227a0157652b1f0565b0c:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline 留痕重锚 -->
任务原话转写：动机/背景：轻量变更无阶段时间线（平台 UI 的步骤时间线只覆盖完整流程的 --done 步骤面）；watcher 事件流 + tasks.md 描述行 + git 提交锚三源真实留痕已齐，缺一个只读合成出口。前序姊妹变更 thin-check-cadence 已落勾选节奏 advisory（行为矫正面），本变更补渲染面：把留痕合成人类可读时间线。用户已在会话中看过并认可目标渲染形态（事件时间轴 + 任务面表格 + 墙钟统计）。
成功标准：
- sillyspec watcher timeline --change <名> 输出合成时间线：事件时间轴（工件/勾选/提交/告警/归档）+ 任务面表格（task-NN × tasks.md 描述行 × 提交锚）+ 墙钟统计
- 归档变更与活跃变更都能渲染（change 目录双路径探测 active/archive）
- 事件流缺失/任务面缺失时降级渲染不抛错（fail-open，缺哪块标注哪块）
- 任务勾选时刻按翻格顺序推断并显式标注推断语义（事件流只记计数不记 id——诚实面）
- 合成逻辑为纯函数（解析/推断/锚定/渲染）并有单元测试；npm run test:core 与 npm run lint 实测全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:a7814bfc32b3475bc9bfc3fd96d1eb01fcbc121973e473141deea3cc50a8e8dc:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. sillyspec watcher timeline --change <名> 输出合成时间线：事件时间轴（工件/勾选/提交/告警/归档）+ 任务面表格（task-NN × tasks.md 描述行 × 提交锚）+ 墙钟统计
2. 归档变更与活跃变更都能渲染（change 目录双路径探测 active
3. archive）
4. 事件流缺失
5. 任务面缺失时降级渲染不抛错（fail-open，缺哪块标注哪块）
6. 任务勾选时刻按翻格顺序推断并显式标注推断语义（事件流只记计数不记 id——诚实面）
7. 合成逻辑为纯函数（解析/推断/锚定/渲染）并有单元测试
8. npm run test:core 与 npm run lint 实测全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:c906399f2e3cc12394de81e970f672fffca8daca1e4aff2a65e612e91517e967:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline 留痕重锚 -->
1. sillyspec watcher timeline --change <名> 输出合成时间线：事件时间轴（工件/勾选/提交/告警/归档）+ 任务面表格（task-NN × tasks.md 描述行 × 提交锚）+ 墙钟统计
2. 归档变更与活跃变更都能渲染（change 目录双路径探测 active
3. archive）
4. 事件流缺失
5. 任务面缺失时降级渲染不抛错（fail-open，缺哪块标注哪块）
6. 任务勾选时刻按翻格顺序推断并显式标注推断语义（事件流只记计数不记 id——诚实面）
7. 合成逻辑为纯函数（解析/推断/锚定/渲染）并有单元测试
8. npm run test:core 与 npm run lint 实测全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
