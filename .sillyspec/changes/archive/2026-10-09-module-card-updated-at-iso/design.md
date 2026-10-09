---
author: flow-machine-draft
created_at: 2026-10-09T04:24:04.313Z
---
# 设计记录（Design Record）— 2026-10-09-module-card-updated-at-iso

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

`src/module-impact.js:158` 盖戳表达式从 `new Date().toISOString().slice(0, 19) + '+08:00'` 改为 `new Date().toISOString()`——旧式是 UTC 数字标称 +08:00 时区，`Date.parse` 瞬间恒早真实时刻 8 小时（机器无关：数字取自 UTC、偏移写死 +08，任何时区的机器上解析结果都是 digit−8h）；且 +08:00 硬编码不随机器。选全量 ISO 而非 nowWallClock 裸形状：`updated_at` 是机器可比时间戳（worktree-guard parseTimestamp 以 Date.parse 吃同名字段比瞬间，scan 文档同字段口径即全量 toISOString——scan-postcheck.js:548,603），datetime.js 头注「机器可读处继续用 toISOString()」；本字段与 frontmatter 人读 created_at（本地墙钟口径）语义不同。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

`syncModuleDocSidecars`（src/module-impact.js）盖戳值格式变化：`YYYY-MM-DDTHH:mm:ss+08:00`（坏瞬间）→ `YYYY-MM-DDTHH:mm:ss.sssZ`（真瞬间）。CLI 命令 `module-docs-sync` 输出零变化；无函数签名变化。存量卡上的旧式值不迁移（Date.parse 两种形态都可解析，仅旧值瞬间失真 8h，属历史数据）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   不适用——单次同步调用内同步计算戳并写盘，无事件流。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   卡写入是整文件替换（read → replace → write），并发盖戳为既有最后写者胜语义；本次只改写入的值来源，不新增竞态面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   无状态；中断最坏留下未盖戳的卡，sidecar 幂等（已含变更行则跳过）属既有语义，不受影响。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   全量 ISO 是绝对时刻（Z 时区），跨时区机器读写同一卡不再有解释歧义——旧式硬编码 +08:00 恰是跨机器歧义源，本修消除而非引入。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：存量卡旧式戳（+08:00 标称、瞬间失真 8h）不迁移，基于 updated_at 做瞬间比较的下游（如 worktree-guard 对 scan 文档的手工编辑检测——它读的是 scan 文档不是模块卡）对旧卡仍是失真值——接受：worktree-guard 不消费模块卡 updated_at；模块卡 updated_at 当前无瞬间比较消费方，纯展示/溯源。试过放弃：①nowWallClock 本地墙钟裸形状——与人读 created_at 口径混同，且丢机器可比性（Date.parse 按本地解释，跨机歧义）；②本地时刻 + 真实机器偏移（如 +08:00 动态计算）——格式正确但需偏移计算逻辑，收益仅显示本地化，全量 Z + 展示端本地化是更简约定。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/module-impact.js | 盖戳表达式改全量 `toISOString()`（约 158 行） |
| 修改 | test/knife-batch2.test.mjs | 既有卡戳用例补时刻窗断言（Date.parse 落窗，旧实现恒偏 8h 出窗） |
