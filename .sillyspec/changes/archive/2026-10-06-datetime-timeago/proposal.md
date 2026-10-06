---
author: flow-machine-draft
created_at: 2026-10-06T12:55:39.218Z
---
# 提案书（Proposal）— 2026-10-06-datetime-timeago

## 动机

任务原话转写：进度面板（stage-machine._timeAgo）手写了一段人读相对时间逻辑（刚刚/N 分钟前/N 小时前/N 天前），与 datetime.js 人读墙钟工具职责重叠；时间格式化口径应收敛到 datetime.js 单源。

成功标准：
- src/datetime.js 提供 timeAgo(input) 公共导出：接受 Date/epoch 毫秒/时间字符串（解析面与 toWallClock 同构），无效输入抛 TypeError 且 message 含输入字符串形式
- 输出形状与 stage-machine 现状逐字一致：刚刚 / N 分钟前 / N 小时前 / N 天前（负差与未来时间按刚刚处理）
- stage-machine._timeAgo 改为委托 datetime.timeAgo（行为不变），模块内不再手写分钟/小时/天换算
- 新增回归测试覆盖各档位与无效输入，npm run test:core 全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. src/datetime.js 提供 timeAgo(input) 公共导出：接受 Date/epoch 毫秒/时间字符串（解析面与 toWallClock 同构），无效输入抛 TypeError 且 message 含输入字符串形式
2. 输出形状与 stage-machine 现状逐字一致：刚刚 / N 分钟前 / N 小时前 / N 天前（负差与未来时间按刚刚处理）
3. stage-machine._timeAgo 改为委托 datetime.timeAgo（行为不变），模块内不再手写分钟/小时/天换算
4. 新增回归测试覆盖各档位与无效输入，npm run test:core 全绿

## 成功标准（可验证）

1. src/datetime.js 提供 timeAgo(input) 公共导出：接受 Date/epoch 毫秒/时间字符串（解析面与 toWallClock 同构），无效输入抛 TypeError 且 message 含输入字符串形式
2. 输出形状与 stage-machine 现状逐字一致：刚刚 / N 分钟前 / N 小时前 / N 天前（负差与未来时间按刚刚处理）
3. stage-machine._timeAgo 改为委托 datetime.timeAgo（行为不变），模块内不再手写分钟/小时/天换算
4. 新增回归测试覆盖各档位与无效输入，npm run test:core 全绿
