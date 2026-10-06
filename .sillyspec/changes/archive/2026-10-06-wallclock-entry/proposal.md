---
author: flow-machine-draft
created_at: 2026-10-06T06:09:49.007Z
---
# 提案书（Proposal）— 2026-10-06-wallclock-entry

## 动机

任务原话转写：动机：datetime.js 的人读墙钟函数 nowWallClock 只接受 Date 实例，而调用方手里常是 ISO 字符串或 epoch 毫秒（git/DB/JSON 来源），没有统一入口导致各处手工拼接。实证一处：scan-facts.js generatedAt 用 toISOString().replace('T',' ').slice(0,19) 手工拼——落 UTC 却长着人读形状，正是 datetime.js 头注释所述坑（人读时间字段应本地墙钟）。

成功标准：
- datetime.js 新增 toWallClock(input)：接受 Date 实例 / epoch 毫秒数 / 可被 Date 解析的时间字符串三类输入，统一输出本地时区 YYYY-MM-DD HH:mm:ss（与 nowWallClock 同形）；无效输入（NaN 时刻/不可解析字符串）抛 TypeError 且信息含输入的字符串形式
- scan-facts.js 的 generatedAt 改走 toWallClock，scan facts markdown 头行呈现本地墙钟人读形
- 测试覆盖：三类输入正确（含时区不偏移断言）、无效输入抛错、scan-facts generatedAt 新形状回归

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. datetime.js 新增 toWallClock(input)：接受 Date 实例 / epoch 毫秒数 / 可被 Date 解析的时间字符串三类输入，统一输出本地时区 YYYY-MM-DD HH:mm:ss（与 nowWallClock 同形）；无效输入（NaN 时刻/不可解析字符串）抛 TypeError 且信息含输入的字符串形式
2. scan-facts.js 的 generatedAt 改走 toWallClock，scan facts markdown 头行呈现本地墙钟人读形
3. 测试覆盖：三类输入正确（含时区不偏移断言）、无效输入抛错、scan-facts generatedAt 新形状回归

## 成功标准（可验证）

1. datetime.js 新增 toWallClock(input)：接受 Date 实例 / epoch 毫秒数 / 可被 Date 解析的时间字符串三类输入，统一输出本地时区 YYYY-MM-DD HH:mm:ss（与 nowWallClock 同形）；无效输入（NaN 时刻/不可解析字符串）抛 TypeError 且信息含输入的字符串形式
2. scan-facts.js 的 generatedAt 改走 toWallClock，scan facts markdown 头行呈现本地墙钟人读形
3. 测试覆盖：三类输入正确（含时区不偏移断言）、无效输入抛错、scan-facts generatedAt 新形状回归
