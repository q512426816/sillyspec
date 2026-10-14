---
author: flow-machine-draft
created_at: 2026-10-14T03:08:20.158Z
---
# 设计记录（Design Record）— 2026-10-14-brainstorm-auto-retire

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

删除自动道整体（用户裁决）。根因面：brainstorm-auto 的 4 步 artifact-first 表无原型分级/生成要求/真码口径（Step2 自审为自由格式占位，不含 design-facts 清单项），交互道三轮修复（登记复用/真码五要素/尾部锚）全部不覆盖它——自动道是原型规则链的原生盲区，且双轨步骤表机制曾出 E2E 互踩 bug（2026-09-08，getStageStepsAutoAware 的存在理由）。删法：删 src/stages/brainstorm-auto.js；command.js runAutoMode 摘 getAutoSteps/ensureAutoStage 的 brainstorm 特判（回退通用 ensureStageSteps 种主模式 8 步表）；complete.js getStageStepsAutoAware 改为退役检测——识别 4 步 auto 表形态（首名「进度确认与上下文加载」，与主模式首步「进度确认」可区分）时 console.error 退役说明+reset/doctor 指引并 exit 2（实现期实测 --reopen 对非空表按名保留旧表不重种，resetStage 内联重种才是恢复出路——评审 P2 清偿），防 ensureStageSteps 把 auto 表判「漂移」静默重种清零存量进度。检测逻辑两处共用（command.js 种表前 + complete.js 推进前），提取为 shared.js 导出的纯检测函数。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 删除 export：stages/brainstorm-auto.js 的 definition（无 src 消费者残留在删后代码；decisions-header-backfill/proto-reuse-register 测试同步摘除 import）。
- shared.js 新增导出 `isRetiredAutoBrainstormTable(steps)`（纯函数，形态判定：Array.isArray && length===4 && steps[0]?.name==='进度确认与上下文加载'）。
- `run auto` 在 brainstorm 的行为变化：4 步 auto 表 → 主模式 8 步表（wait 步照常渲染，SS-META requiresUser 标记由调用方处理——auto 驱动方拿主模式表自行推进）。
- 存量 auto 表变更：run brainstorm/run auto 触达 → exit 2 + 指引文案（行为变化，退役语义）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：删除是静态代码面；存量进度库读取时序不变；不适用。
2. 并发写：并行会话在途变更若恰为 auto 表形态，触达时收到退役报错（明确优于静默重种）；检测为纯读判定无共享状态。
3. 切换/生命周期：存量 auto 表进度不被修改（报错不写盘）；用户按指引 --reset 重种或 doctor 处置，处置权在用户。
4. 作用域：检测按步骤表形态而非仓/路径，平台模式 specRoot 下同一判定；退役文案含变更名与命令模板，仓中立。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 风险1：存量 auto 表在途变更被硬拦收不了口。对策：报错给两条出路（--reset 重种主模式 8 步表 / doctor 诊断）；auto 道为机器接口模式，存量面极小，明确报错优于数据丢失。
- 风险2：删测试文件（auto-dualtrack 等）被误读为「删测试保绿」。对策：删除的是被删功能的专属测试（测的就是 auto 表机制本身）；退役行为有新测试补位（FR-04），全量其余零失败。
- 死路：考虑过保留 4 步表定义仅为存量变更服务（不删文件只摘路由）——放弃：自动道盲区仍在、双轨机制仍在，删除不彻底等于没删；存量面用退役检测+指引承接足够。
