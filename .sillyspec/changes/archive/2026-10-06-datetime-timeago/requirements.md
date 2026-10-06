---
author: flow-machine-draft
created_at: 2026-10-06T12:55:39.218Z
---
# 需求规格（Requirements）— 2026-10-06-datetime-timeago

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: src/datetime.js 提供 timeAgo(input) 公共导出：接受 Date/epoch 毫秒/时间字符串（解析面与 toWallClock 同构），无效输入抛 TypeError 且 message 含输入字符串形式

必须：`timeAgo(input[, now])` 接受 Date 实例 / epoch 毫秒数 / 时间字符串三类输入并输出人读相对时间串；解析面与 toWallClock 同构（委托 Date 构造器，开放解析面归语言规范，禁止建格式枚举白名单）；无效输入（非三类之一或解析产物为 NaN 时刻）必须抛 TypeError 且 message 含输入的字符串形式；第二参数 now 为可注入「当前时刻」（Date 或 epoch 毫秒，测试用），缺省当前时间，非法 now 同样抛 TypeError。

#### 场景：无效输入

- Given 任意非 Date/number/string 输入，或不可解析为时刻的字符串/NaN 数值
- When 调用 `timeAgo(input)`
- Then 抛 TypeError，message 含 `String(input)` 形式

### FR-02: 输出形状与 stage-machine 现状逐字一致：刚刚 / N 分钟前 / N 小时前 / N 天前（负差与未来时间按刚刚处理）

必须：输出档位与 `src/progress/stage-machine.js` 既有 `_timeAgo` 逐字一致——差值折算分钟 floor 后 <1（含负差/未来时间）→ `刚刚`；<60 → `N 分钟前`；折算小时后 <24 → `N 小时前`；否则 `N 天前`（天 = floor(小时/24)）。禁止引入 locale/ICU 依赖（与 nowWallClock 同理：Node small-icu 构建下 toLocaleString 不可靠）。

#### 场景：档位边界

- Given 注入固定 now，输入时刻分别距 now 0、30 分钟、59 分 59 秒、60 分钟、23 小时 59 分、24 小时、3 天、未来 5 分钟
- When 逐个调用 `timeAgo(input, now)`
- Then 输出依次为 刚刚 / 30 分钟前 / 59 分钟前 / 1 小时前 / 23 小时前 / 1 天前 / 3 天前 / 刚刚

### FR-03: stage-machine._timeAgo 改为委托 datetime.timeAgo（行为不变），模块内不再手写分钟/小时/天换算

必须：`_timeAgo` 的档位换算委托 `datetime.timeAgo`（解析面继续走 `_parseFlexibleTs`——zh-CN 旧格式回退是该模块对存量数据的既有职责）；解析失败回退原样返回 `dateStr || '未知'` 的行为必须逐字保持；模块内禁止再保留手写的分钟/小时/天换算表达式。

#### 场景：解析失败回退

- Given lastActive 为空串或不可解析字符串
- When 调用 `stageMachine._timeAgo(dateStr)`
- Then 返回 `dateStr || '未知'`（空输入 → 未知，乱串 → 原样返回），不抛错

### FR-04: 新增回归测试覆盖各档位与无效输入，npm run test:core 全绿

必须：新增回归测试覆盖 FR-01/02/03 全部场景（三类输入、档位边界含未来时间、无效输入抛错、委托后回退行为），并收录进 `npm run test:core`；跑 `npm run test:core` 全绿。

#### 场景：主路径

- Given 本变更落地
- When 运行 `npm run test:core`
- Then 全部测试通过（exit 0）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/datetime-timeago.test.mjs「三类输入面（Date / epoch 毫秒 / 时间字符串）与注入时钟」「无效输入抛 TypeError 且 message 含输入字符串形式」
FR-02: test/datetime-timeago.test.mjs「timeAgo 档位形状与 stage-machine 现状逐字一致」
FR-03: test/datetime-timeago.test.mjs「stage-machine._timeAgo 委托 datetime.timeAgo 且解析失败回退原串」
FR-04: test/datetime-timeago.test.mjs「收录 test:core 全绿」（npm run test:core 亲测，package.json test:core 清单含本文件）
