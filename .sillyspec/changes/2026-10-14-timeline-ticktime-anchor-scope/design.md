---
author: flow-machine-draft
created_at: 2026-10-14T08:05:40.487Z
---
# 设计记录（Design Record）— 2026-10-14-timeline-ticktime-anchor-scope

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两处独立修复，均在既有架构面内做加法（实证背景：2026-10-14-deploy-release-notes@multi-agent-platform 时间线——事件流 0 条 task-done 致勾选时刻全「?」；同流他变更提交的 task-NN token 撞车致 3 处跨变更误锚）。

① 勾选时刻显式留痕：`task tick` 是唯一程序化翻格路径（grep 实证 src 内翻格替换仅 task-tick.js 一处），已有两处留痕先例——watcher 事件流直写（.runtime 机本位、gitignored）与 task-evidence.jsonl（change 目录内、随归档进 git）。本变更加第三处：change 目录内 `task-ticks.jsonl` 侧车（行=`{ts,task,source:'task-tick'}`），完全复用 task-evidence 的 appendFileSync + 幂等 already 零追加 + best-effort 写失败告警模式。timeline.js 的 `loadChangeTasks` 双路径（活跃＞归档）顺带读侧车，`renderTimeline` 任务行时刻改三级降级：侧车精确（无 ≈）＞事件流计数链推断（≈）＞「?」。选 change 目录内而非 .runtime：随归档包进 git 跨机可读，不依赖事件流存活与烤制时机——正是本次盲窗事故（watcher 11:25 才拉起、勾选在上午、.runtime 流无 task-done）暴露的缺口。

② 提交锚按变更名收敛：`resolveCommitAnchors` 增可选第三参 change，逐 anchor 算 `sameChange = 提交全消息（%B 含正文）includes(change)`（change 缺省恒 true 向后兼容）；`renderTimeline` 任务锚定只取 sameChange 的 anchor——他变更提交消息里的 task-NN token 不再撞车。放弃「commit diff 触及 changes/<名>/ 路径也算同变更」的补强信号：需把 gitLook 注入面从 {message} 扩为含 files，两处接线与全部测试替身同改，收益边际（消息含变更名是 commit-suggest 既有约定），留作后续独立变更。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/task-tick.js` `runTaskTick`：翻格成功分支新增侧车追加（`join(changesRoot, changeName, 'task-ticks.jsonl')`，行=`{ts:Date.now(), task:<归一id>, source:'task-tick'}`）；CLI 对外行为不变（exit 码/回显格式不动，侧车写失败仅 console.warn）。
- `src/timeline.js`：
  - `resolveCommitAnchors(events, gitLook, change?)`——第三参可选；anchor 产物增 `sameChange` 布尔（缺省 true）；subject/token 提取口径不变。
  - `loadChangeTasks(specBase, change)` 返回增 `tickLog: Array<{ts,task}>`（坏行跳过、同任务取最早 ts、文件缺失=空数组）；changeDir/tasksMd 语义不变。
  - `renderTimeline`/`renderBakedTimeline` 新可选参 `tickLog`；任务行 when 三级降级；任务面表头与脚注诚实注同步（精确=侧车留痕｜≈=顺序推断）。
- `src/index.js` watcher timeline 接线、`src/run/complete-handlers.js` `bakeArchiveTimeline`：透传 tickLog 与 changeName。
- 新文件格式：`task-ticks.jsonl`（change 目录内，每行一 JSON 对象）；CLI 无新命令、无参数变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   侧车行乱序（时钟回拨/跨机恢复）不影响正确性——渲染取每任务最早 ts（早于事实的留痕优先，晚到的重复行被忽略）；事件流计数链推断路径一字不动，其乱序语义（断裂标 ?）维持现状。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   appendFileSync 单行 JSON 一次 write，O_APPEND 语义下行级原子；两会话同时 tick 同一任务——先到者翻格留痕，后到者走 already 分支零追加；同任务多行留痕无害（最早 ts 语义稳定）。tasks.md 翻格仍走 writeAtomicSync（既有并发面不变）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   侧车随 tasks.md 同生命周期：活跃期可追加，归档后目录只读——task tick 对已归档变更 exit 2（既有拒收），loadChangeTasks 归档路径只读侧车；烤制在归档 rename 后进行，destDir 内侧车已随包，烤制面读 destDir/task-ticks.jsonl（与 tasks.md 同源同路径形态）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   侧车按变更目录物理隔离（changes/<名>/task-ticks.jsonl），无跨变更串台；锚收敛 sameChange 按变更名全文匹配，他变更 token 不再跨名锚定（本变更修复点即此项）；跨仓（平台 worktree/主仓双份 .sillyspec）各归各的 change 目录，与 tasks.md 同隔离粒度。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：显示形态变化破坏既有测试断言——侧车在场才去 ≈ 前缀，纯推断路径保持 ≈ 原形态，既有断言（≈HH:MM:SS、?、未勾）零改动；侧车时刻与推断时刻同时在场时必须显侧车（测试钉住优先级）。
- 死路（放弃）：tasks.md frontmatter 落 ticked 映射——tasks.md 被 machine-draft 生成/agent 手工编辑多方覆写，frontmatter 键易在重生成时丢失，且把时间戳塞进人读文档加剧本复杂度；侧车 append-only 不参与覆写竞争。
- 死路（放弃）：watcher 快照存 per-task 行状态以捕获直接 Edit 翻格的任务 id——需改快照/水位格式并顾跨版本兼容，且对观测盲窗（本次事故主因）无效；CLI 留痕是零盲窗的事实源，Edit 翻格仍走推断降级（诚实面不编时间）。
- 死路（放弃）：按 commit diff 路径补强 sameChange——见做法概述②，注入面波及过大，边际收益。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/task-tick.js | 翻格成功追加 task-ticks.jsonl 侧车（best-effort，幂等零追加） |
| 改 | src/timeline.js | loadChangeTasks 读侧车；resolveCommitAnchors 收敛；renderTimeline/renderBakedTimeline 三级时刻 |
| 改 | src/index.js | watcher timeline 接线透传 tickLog + changeName |
| 改 | src/run/complete-handlers.js | bakeArchiveTimeline 接线透传 tickLog + changeName |
| 改 | test/task-tick.test.mjs | 侧车留痕/幂等零追加/写失败不阻断用例 |
| 改 | test/watcher-timeline.test.mjs | 精确时刻三级降级 + 跨变更误锚回归用例 |
| 改 | test/archive-timeline-bake.test.mjs | 烤制面侧车透传用例 |
