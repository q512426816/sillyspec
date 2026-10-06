---
author: flow-machine-draft
created_at: 2026-10-06T06:09:49.007Z
---
# 设计记录（Design Record）— 2026-10-06-wallclock-entry

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 datetime.js 增加统一入口 `toWallClock(input)`：把 Date 实例 / epoch 毫秒 / 时间字符串三类常见来源归一到 `nowWallClock` 的本地墙钟形输出。字符串解析整体委托 `new Date(input)`（语言规范定义的开放解析面，不建格式枚举白名单）；解析产物为 NaN 时刻时抛 `TypeError` 并把输入的字符串形式放进 message。scan-facts.js 的 `generatedAt` 从 `toISOString().replace('T',' ').slice(0,19)`（UTC 轴冒充人读形，datetime.js 头注释所述坑）改走 `toWallClock(new Date())`。

选这个方案是因为它只加一个纯函数 + 一行替换，输出形状与现行人读约定完全一致，机器可读面（JSON/DB 的 ISO 惯例）不动。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/datetime.js` 新增导出 `toWallClock(input)`：`(Date | number | string) => string`（本地 `YYYY-MM-DD HH:mm:ss`）；无效输入抛 `TypeError`。`nowWallClock` 签名不变（内部改为复用同一格式化路径）。
- `src/scan-facts.js` `collectScanFacts` 返回值中 `generatedAt` 值域变化：UTC 形 `2026-08-23T01:39:07`（截断 ISO）→ 本地墙钟形 `2026-08-23 09:39:07`。该字段仅渲染进 scan facts markdown 头行（`renderScanFactsMd`），无 git `--since` 等机器消费面（verify-postcheck 的 R-06 读的是 verify-facts.json，非本字段）。
- CLI 命令、文件格式 schema：无变化。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/datetime.js | 新增导出 toWallClock（归一化输入后委托 nowWallClock；nowWallClock 本体不变） |
| 修改 | src/scan-facts.js | generatedAt 改走 toWallClock（本地墙钟人读形） |
| 修改 | test/datetime-wallclock.test.mjs | 新增 toWallClock 三类输入/时区不偏移/无效输入断言 |
| 修改 | test/scan-facts.test.mjs | 新增 generatedAt 本地墙钟形回归断言 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用——纯同步格式化函数，无事件流；输入是单个时刻值，不存在到达顺序问题。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   不适用——函数无共享可变状态；scan-facts 调用点本就无锁语义（每次调用独立取 `new Date()`），并发调用互不影响。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——无状态、无持久化；中断后重跑结果一致（除时刻本身前进）。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——不读写任何跨作用域存储；输出只依赖输入值与进程本地时区。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：scan facts markdown 的 `generatedAt` 消费者（人读文档、快照 diff）看到值形状变化（UTC→本地）。已核实仓库内无测试断言 UTC 形、无机器按该字段做时间运算（git --since 消费的是 verify-facts.json），风险面收敛于人读显示。
放弃的方案：让 toWallClock 只接受 ISO 字符串并手写正则解析——放弃，正则白名单就是格式枚举，开放解析面应委托 Date 构造器；再如给 scan-facts 保留 UTC 但加后缀标注——放弃，与 datetime.js 既定的人读=本地墙钟约定冲突，制造两种并存形状。
