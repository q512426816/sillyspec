---
author: flow-machine-draft
created_at: 2026-10-20T02:58:34.269Z
---
# 设计记录（Design Record）— 2026-10-20-distill-abnormal-upgrade-fix

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

decision-distill.js 新增导出纯函数 `isDistillAbnormal(res)`（判定 `Boolean(res && res.needsWait)`），与 needsWait 的产出单一源同处一个模块——判定函数紧挨着产出 needsWait 的 distillIntoKnowledge，返回值契约变化时两处同文件可见，不会再漂移。src/flow.js:2568 内联表达式 `res && (res.rejected > 0 || res.needsWait > 0)` 换成调用该函数；upgrade_reason 文案去掉 res.rejected 引用改为只报 needsWait；flow.js:2534 头注「rejected/needsWait 异态」同步收敛为 needsWait 异态。

幽灵引用的由来与修法：原条件两个分支都错——rejected 分支引用返回值里不存在的字段（distillIntoKnowledge 只返回 written/skipped/needsWait；rejected 条目字段齐备时正常写盘入库不算异态，缺字段已折叠进 needsWait），needsWait 分支把字符串与 > 0 比较（非空串恒 false）。修复只改判定来源不改任何控制流形态：仍走同一 if 块的 tier=thick 落盘 + resetThinStageRowOnUpgrade + console.warn，升厚后的厚档语义（剩余流程 run <stage>、归档不跳 plan 校验）原样保留。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增导出 src/decision-distill.js `isDistillAbnormal(res)`；src/flow.js 内部调用点替换，无 CLI 签名变化。行为变化一处：rejected 条目缺否决理由/复潮条件（needsWait 非空）时，flow done 的 distill 子步从「静默吞掉」变为「真实升厚 tier=thick + 警告行」——这是协议注释里早已声明却从未生效的承诺（flow.js:2534「异态 → 升厚留人工裁决，不静默吞」），本变更让实现追上声明。正常路径（needsWait=null）行为逐字节不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。判定只消费 distillIntoKnowledge 的同步返回值，无跨时序状态；断点续跑时 distill 子步已标 done 则整块跳过（含判定），不会对历史蒸馏结果补触发升厚。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

升厚写盘走既有 writeFlowState 原子写，与收口链其他子步的 flow-state 写入同通道零新竞态面；升厚后 resetThinStageRowOnUpgrade 的平台行重置是既有 1632 行同款调用，并发语义不变。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。升厚是幂等声明（tier=thick + upgrade_reason 重复写同值零漂移）；中断在升厚后重入，distill 子步按 flow-state 标记幂等跳过，tier 保持 thick 不回弹。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。needsWait 来自本变更目录 decisions.md 的蒸馏结果，isDistillAbnormal 是纯函数（无 IO 无全局），跨仓/跨实例各自判定各自变更，零共享态。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险=存量行为翻转让在途变更意外升厚：needsWait 场景此前静默、现在真升厚，若有在途变更恰好带缺字段 rejected 条目，收口会突然走厚档仪式。自限：needsWait 场景本身是决策质量缺陷（字段必填契约早有），升厚留人工裁决正是协议声明过的意图；且本仓当前在途变更（仅本条）无该形态。放弃的方案：a) 只删 rejected 幽灵分支、needsWait 判定改为 `typeof === 'string'` 内联不提取——判定逻辑与返回值契约耦合，留在 flow.js 下次契约变化还会漂移，提取到产出方单一源同文件才闭环；b) needsWait 时阻断收口（exit 非零）——把「留人工裁决」做成硬阻断违背原设计语义（升厚后厚档流程本身就是人工裁决通道，archive 子步仍执行），且在途半态会卡死在 distill。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/decision-distill.js | 新增导出 isDistillAbnormal 纯函数（needsWait 单一异态信号） |
| 修改 | src/flow.js | 2568 判定改调用导出函数；upgrade_reason 去 rejected 引用；2534 头注同步 |
| 新增 | test/distill-abnormal-upgrade.test.mjs | 三态判定 + 调用点钉 + 零回归锚 |
