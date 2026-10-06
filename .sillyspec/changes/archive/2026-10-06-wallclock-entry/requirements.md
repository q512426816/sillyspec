---
author: flow-machine-draft
created_at: 2026-10-06T06:09:49.007Z
---
# 需求规格（Requirements）— 2026-10-06-wallclock-entry

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: datetime.js 新增 toWallClock(input)：接受 Date 实例 / epoch 毫秒数 / 可被 Date 解析的时间字符串三类输入，统一输出本地时区 YYYY-MM-DD HH:mm:ss（与 nowWallClock 同形）；无效输入（NaN 时刻/不可解析字符串）抛 TypeError 且信息含输入的字符串形式

- 必须：`toWallClock(input)` 在 input 为 Date 实例、number（epoch 毫秒）、string（可被 `new Date(string)` 解析）三类时，输出与 `nowWallClock` 同形的本地墙钟串 `YYYY-MM-DD HH:mm:ss`；无效输入（解析后时刻为 NaN，或 input 非 string/number/Date 之外的类型）必须抛 `TypeError`，报错信息必须含输入值的字符串形式。
- 禁止：在输出中引入 toISOString 的 UTC 轴（人读语义按 datetime.js 头注释走本地墙钟）；禁止对字符串输入做特定格式枚举白名单——解析整体委托 Date 构造器（开放世界交给语言规范，不自建清单）。

#### 场景：主路径

- Given 本地时区任意（如 UTC+8）
- When `toWallClock('2026-08-23T01:39:07.000Z')`（ISO 字符串，UTC 轴）
- Then 输出 `2026-08-23 09:39:07`（转本地轴、形状与 nowWallClock 一致——时区偏移即被断言抓出）

#### 场景：无效输入

- Given input 为不可解析字符串（如 `'not-a-time'`）或 NaN 时刻
- When 调用 `toWallClock(input)`
- Then 抛 `TypeError`，message 含 `String(input)` 的内容

### FR-02: scan-facts.js 的 generatedAt 改走 toWallClock，scan facts markdown 头行呈现本地墙钟人读形

- 必须：`collectScanFacts` 的 `generatedAt` 字段值由本地墙钟串产生（`toWallClock(new Date())`），渲染进 scan facts markdown 头行时呈现 `YYYY-MM-DD HH:mm:ss` 本地时区；禁止再出现 `toISOString().replace('T',' ')` 的 UTC 手工拼接。

#### 场景：主路径

- Given 任意本地时区的运行环境
- When `collectScanFacts({ cwd })` 执行
- Then `facts.generatedAt` 匹配 `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$` 且为本地时刻（注入固定时钟比对时与本地轴一致）

### FR-03: 测试覆盖：三类输入正确（含时区不偏移断言）、无效输入抛错、scan-facts generatedAt 新形状回归

- 必须：新增/更新测试文件覆盖 FR-01（三类输入 + 时区不偏移 + 无效输入抛 TypeError）、FR-02（generatedAt 本地墙钟形）；测试全绿后方可收口。

#### 场景：主路径

- Given 测试运行环境
- When 执行 datetime 与 scan-facts 相关测试
- Then 全部断言通过（含本地轴一致性与抛错类型/message 断言）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/datetime-wallclock.test.mjs「toWallClock 三类输入与无效输入」
FR-02: test/scan-facts.test.mjs「generatedAt 本地墙钟形回归」
FR-03: test/datetime-wallclock.test.mjs「toWallClock 三类输入与无效输入」＋test/scan-facts.test.mjs「generatedAt 本地墙钟形回归」
