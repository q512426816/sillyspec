---
author: flow-machine-draft
created_at: 2026-10-16T16:30:30.520Z
---
# 设计记录（Design Record）— 2026-10-17-tick-timing-source

## 做法概述

判据换源：勾选时点判定从「tasks.md git 首次提交 == 收口最后提交」（git 历史形态判据——官方允许的 reset --soft 压扁会无声摧毁它，边干边勾被压扁后警告照出，即 tick-timing-squash-blindspot 坑的结构性误报）整体退役，改为 task-ticks.jsonl 侧车的逐格墙钟时戳（CLI task tick 事实源，随归档进 git，压扁/rebase 不可改写），与「审计真相锚 change.patch sha256、不依赖 git 形态」口径对齐。新增 detectTickTiming 纯函数（src/sentinel-assertions.js，与 detectTickBurst 并排）：时戳跨度 ≤120s 且变更存活 ≥10×跨度 → concentrated（末尾集中勾选 advisory）；跨度 >120s → spread（边干边勾确认行）；no-ticks/single/no-anchor 各自静默或一行教学。

flow.js 收口哨兵段前置共享观测采集 _tickObs（watcher 事件流 + 侧车一次读取），时点判定与勾选节奏门同源消费（节奏门检出单拍跳/突发时判定让位，防双报）。反馈前移：task tick 翻格成功后回显现成提交命令模板（pathspec 含 tasks.md 与侧车、消息占位带 task-NN）+「已勾 ≥2 格且 tasks.md 零 git 提交」当场提醒——把「勾选随交付同一提交入库」从需要领悟的纪律变成可抄的命令，断掉坑根因 1/3 的复现链。三处教学文案（flow start 横幅、brainstorm 收编教学、任务未全勾拒收）消歧「对应提交」双判据。

## 接口契约

- 新增 `detectTickTiming({ ticks, lifespanMs, clusterWindowMs = 120_000, ratio = 10 })` → `{ status: 'spread'|'concentrated'|'single'|'no-ticks'|'no-anchor', count, spanMs }`（src/sentinel-assertions.js 导出，纯函数零 IO）。
- flow.js 收口路径（handleFlowDone 内部，非导出面）：新增 _tickObs 共享观测常量；勾选时点判定块输出变化——旧「一把勾/untracked」两条 warn 退役，新 concentrated warn / spread 确认 / no-ticks 教学；勾选节奏门数据获取改消费 _tickObs（读取仅前移，检测逻辑与判定行为不变）。
- src/task-tick.js `runTaskTick`：ticked 分支回显新增提交命令模板与未入库提醒两行（best-effort try/catch 包裹），函数签名与 exit code 不变。
- 文案面：flow start 横幅两行（勾选证据行、交付纪律行）、brainstorm 收编教学一行、任务未全勾拒收一行措辞更新。
- 无 CLI 参数、文件格式、导出签名（除上述新增）变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：侧车 JSONL 行序不保证——detectTickTiming 对 ts 排序后取首尾算跨度，乱序写入无影响；parseTickLog 同任务取最早时戳（幂等重勾防御既有语义）。旧判据对提交顺序的依赖（--reverse 首提）随换源消失。
2. 并发写：task-ticks.jsonl 为 change 目录内单 writer 追加（task tick 命令），多会话各自变更目录隔离；flow done 读取与 tick 追加并发时读到前缀完整行集（JSONL 行原子追加，坏行 parseTickLog 跳过）。共享观测采集只是把既有两次读取合并为一次，无新写面。
3. 切换/生命周期：观测采集 fail-open（事件流/侧车任一缺失按空）；baseline_commit 缺失或 git show 失败 → no-anchor 静默不判（fail-open 防短变更误报）；判定全程 advisory 不阻断、纯读无状态残留，中断重入安全。
4. 作用域：侧车随 change 目录归档进 git 跨机可读；事件流 .runtime 机本位。两源分工维持既有边界——节奏门判单拍跳（事件流权威+侧车突发回退），时点判定只读侧车（watcher 3s 采样的部分观测会把「只有尾部两跳被采样」误判集中，不作时点判据）；不新增跨实例串台面。

## 风险与死路

最大风险：阈值启发式误报——120s 簇窗与 10× 存活比是经验值。缓解：快变更短跨度形态由存活比守卫放行（lifespan < 10×span → spread）；误报仅 advisory 一行不阻断。已知盲区（如实留痕）：agent 全程直接 Edit 的末尾逐格集中（无侧车、watcher 采样出多个单格跳）两类门都不报——时点判据只认侧车是防采样误报的刻意取舍，教学行引导走 task tick 后盲区自然收窄。

试过但放弃的方案：①判据换到「提交时戳与 tick 时戳交错分析」——提交时戳同为压扁受害者（reset --soft 后 recommit 改写 committer date），换汤不换药；②watcher 事件作时点判据兜底（侧车缺失时）——3s 采样的部分观测会把分散勾选采样成「尾窗两跳」，与采样合并跳系列坑同源，误报风险大于收益，弃；③保留 git 判据作双轨——双判据只要一条被压扁摧毁就复现误报，且「untracked 直至归档」在 tasks.md 不进交付 pathspec 的纪律下恒复现，整体退役。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/sentinel-assertions.js | 新增 detectTickTiming 纯函数（判定序 no-ticks/single/no-anchor/spread/concentrated） |
| 修改 | src/flow.js | 哨兵段前置 _tickObs 共享观测；时点判定块换源；节奏门消费共享观测；三处文案 |
| 修改 | src/task-tick.js | ticked 回显提交命令模板+未入库提醒（best-effort） |
| 新增 | test/tick-timing-source.test.mjs | 纯函数判定序 + flow done e2e 压扁回归 + 文案断言 |
| 修改 | test/task-tick.test.mjs | 回显命令模板与未入库提醒断言 |
