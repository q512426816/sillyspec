---
author: flow-machine-draft
created_at: 2026-10-06T12:55:39.218Z
---
# 设计记录（Design Record）— 2026-10-06-datetime-timeago

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 `src/datetime.js` 新增 `timeAgo(input[, now])` 纯函数：输入解析面与既有 `toWallClock` 同构（Date / epoch 毫秒 / 时间字符串，委托 Date 构造器，开放解析面归语言规范，不建格式枚举白名单），档位换算逐字复刻 stage-machine `_timeAgo` 现状（刚刚 / N 分钟前 / N 小时前 / N 天前，分钟/小时均 floor，负差与未来时间落入「刚刚」）。第二参数 now 为可注入当前时刻（Date/epoch 毫秒），测试可钉住档位边界。

`src/progress/stage-machine.js` 的 `_timeAgo` 改为：`_parseFlexibleTs` 解析（zh-CN 旧格式回退是对该模块存量 lastActive 数据的既有职责，保留在调用方）得 epoch 后委托 `datetime.timeAgo(ts)`，解析失败回退 `dateStr || '未知'` 逐字不动。选这个切分是因为 datetime 的契约是「合法时刻 → 人读串」（无效即抛），而「容错解析 + 回退原串」是进度面板对脏数据的展示职责——两职分开后双方都无需为对方放宽契约。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增导出：`datetime.timeAgo(input, now?)` → string（对外新 API）。既有 `nowWallClock`/`toWallClock` 签名与行为不变（内部抽私有 `coerceClock` 共用强转与抛错路径，错误 message 形状不变）。
- `stage-machine._timeAgo(dateStr)`：私有方法，对外行为逐字不变（含解析失败回退）。
- `package.json` 的 `test:core` 脚本清单追加 `test/datetime-timeago.test.mjs`（npm script 面）。
- 端点/命令/文件格式：无。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——timeAgo 是无状态纯函数（输入 + now → 输出），各调用独立求值，不存在跨调用的顺序假设；stage-machine 每次渲染对同一 lastActive 重复求值与现状一致。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   不适用：本变更只读输入、返回字符串，无共享可变状态、无文件/DB 写入。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   不适用：无中间状态可残留；flow done 中断重入时函数幂等，无生命周期面。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会：纯函数无实例状态；时区口径沿用本地墙钟（与 nowWallClock 同族语义），跨时区机器渲染同一时刻会得到各自本地口径的相对串——这是现状语义，不在本变更放大。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：档位换算复刻不严导致进度面板展示漂移（如 59 分 59 秒被四舍五入进位）。对策：逐字复刻 floor 链（分钟 floor → 小时 floor(分钟/60) → 天 floor(小时/24)）+ 测试钉住全部档位边界（含 59 分 59 秒 / 23 小时 59 分 / 未来时间）。
试过放弃①：把解析失败回退（返回原串/『未知』）做进 timeAgo 内部——会让「无效输入必须抛 TypeError」的契约失效，且容错回退是 stage-machine 对脏数据的展示职责，塞进通用工具语义含糊，放弃。
试过放弃②：解析也一并迁给 datetime（让 timeAgo 吃 _parseFlexibleTs 的 zh-CN 回退）——回退正则是进度面板对存量 lastActive 的兼容面，迁走等于把调用方私有数据形态泄漏进通用模块，放弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/datetime.js | 新增 timeAgo 导出；内部抽 coerceClock 私有强转（toWallClock 复用，行为不变） |
| 修改 | src/progress/stage-machine.js | _timeAgo 换算委托 datetime.timeAgo，解析与回退留在调用方 |
| 新增 | test/datetime-timeago.test.mjs | 档位边界/三类输入/无效输入/委托回退回归测试 |
| 修改 | package.json | test:core 清单追加新测试文件 |
