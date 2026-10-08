---
author: flow-machine-draft
created_at: 2026-10-08T08:12:53.293Z
---
# 设计记录（Design Record）— 2026-10-08-batch-tick-false-positive

## 做法概述

双层修复单拍勾选门的误伤（2026-10-08-knowledge-graph 收口实证：六次独立 task tick 被「checked 0→8」幻影连坐拒收）：①源头层 watcher.js inferEvents——文件首现的 task-done 事件收敛到任务队列面（stage='tasks'），design.md 自审清单 authored-whole 预勾首现只报 file 不报勾选跳（幻影的生成面直接消除；tasks.md 首现带勾仍发，保住「整卡预勾创建」捕捉面）；②消费层 sentinel-assertions.js detectBatchCheckCadence——节奏检测域过滤 stage（只认 tasks，缺省视同 tasks 兼容 legacy 流），纵深防御任何非任务面的勾选计数混入。选双层而非单层：源头修了新生成面，但历史流/未知发射面仍可能混入，消费层过滤保证门语义只锚任务节奏域。

## 接口契约

- watcher.inferEvents(prev, next) 行为变化：非 tasks 阶段文件首现且 checked>0 时不再产 `task-done` 事件（此前产 `checked 0→N`）；tasks 面不变。事件消费方：sentinel 停滞判活（task-done 作活跃信号——design 首现事件本就不该计活，无回归）、平台展示面。
- detectBatchCheckCadence(events) 行为变化：stage 非 'tasks' 且非空的 task-done 事件出域；返回结构/其余判定（CLI 去重/最大跳选取）零变化。resolveBatchTickAction 四态零变化。
- 无端点/命令/文件格式变更。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：检测按事件流顺序扫最大跳，与既有语义一致；design 首现事件被出域后不存在乱序幻影面。成立。
2. 并发写：inferEvents 是纯函数（快照 diff），多 watcher 竞态由既有快照机制承担；本变更不引入新共享面。
3. 切换/生命周期：事件流按 change 隔离（watcher-events-<change>.jsonl），无跨变更状态；收口重入幂等（子步断点续）不受影响。
4. 作用域：stage 判定来自快照内文件→STAGE_FILES 映射（本地 changeDir 纯盘面），无跨工作区/跨仓串台面。

## 风险与死路

最大风险：消费层 stage 过滤放宽了检测面——若未来有真实「design.md 勾选框被 agent 一把勾」的纪律诉求，本门不再覆盖（须另立信号面）。接受理由：design 自审是 authored-whole 断言面（模板即如此），一把勾/整体写盘不可区分，覆盖它的成本就是本次实证的误伤。试过放弃的方案：仅修 watcher 源头层——放弃，历史流与未知发射面无纵深；仅修消费层——放弃，幻影事件仍进平台展示流污染时间线。
