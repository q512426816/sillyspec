---
author: flow-machine-draft
created_at: 2026-11-26T01:33:10.490Z
---
# 设计记录（Design Record）— 2026-11-26-flow-help-flag-shortcircuit

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

cmdFlow 此前只按 args[0] 分发，`--help` 留在 rest 里无人消费：start 分支以 `getFlag('--change') || <日期>-flow-<随机>` 生成临时名并一路走到需求清晰度门，其余子命令则报「需 --change <名>」。修法是在 cmdFlow 入口（算出 sub/rest 之后、平台 spec 根解析之前）加一道帮助短路：识别「子命令带 --help / -h」「flow --help / -h」「flow help [子命令]」三种形态，打印用法到 stdout 后正常返回。用法行由新的纯函数生成——八个子命令各一行，旗标按 cmdFlow 实际消费的集合枚举；start 的 `--input` 照抄形态与预段同意门提示抽成共享行组，兜底分支照旧打印同一份，stderr 文本与退出码 2 逐字不变。实现期发现 CLI 入口还有一道更靠前的关卡——未初始化目录门先于命令分发，会让帮助请求在未初始化目录被拦成报错；由于帮助零副作用，给该门加一个由调用方按命令声明的「帮助请求」入参（仅 flow 族声明），放行到命令层打印用法。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/flow.js：新增导出纯函数 `isFlowHelpInvocation(sub, rest)`、`flowHelpTarget(sub, rest)`、`flowHelpLines(target)`；cmdFlow 入口接入帮助短路，命中则逐行 console.log 并 `return { help: true }`。
- 兜底分支改为复用共享的 start 详注行组；未知子命令与空子命令的 stderr 文本、退出码 2 不变。
- src/run/shared.js：`resolveUninitCwdGate` 新增可选入参 `helpRequest`——为真时判 skip（实现期发现：CLI 入口的未初始化目录门先于命令分发，帮助请求在未初始化目录会被拦成「当前目录未初始化」报错，与 FR-01「任意工作目录」场景不符；帮助零副作用，不该被该门拦）。缺省值 false，非帮助请求的判定零变化。
- src/index.js：调用 `resolveUninitCwdGate` 时按命令声明帮助请求——只对 flow 族给出，且判定直接复用 `isFlowHelpInvocation`（与 cmdFlow 入口短路同一谓词：子命令带 --help/-h、flow 自身带、裸词 help 三类形态同口径）。只有 flow 族具备任意位置帮助形态的零副作用短路；其余命令的帮助分支按子命令位判定，放行会让它们在未初始化目录走进真实执行路径。
- 对外可见行为变化仅一处：flow 帮助旗标从「被当普通调用」变为「打印用法并退出 0」。各子命令既有参数、既有分支语义零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

帮助短路是入口处的同步纯判定，无事件、无重试、无状态；`--help` / `-h` 出现在 rest 任意位置都识别，参数顺序不影响结论。裸词 help 只在子命令位（args[0]）或 `flow help <子命令>` 的第二位被认作帮助，参数值位置的 help 不触发。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

帮助路径零写入、零 git 操作，不存在共享写点。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

帮助路径在任何落盘与任何 process.exit 之前返回，中断无残留；被取代的旧路径（生成临时变更名后走需求清晰度门）本就不落盘，修复后连临时名都不再生成。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

帮助旗标只作用于 flow 命令族；其他子命令（task、worktree、dispatch 等）各自既有的帮助分支不动。帮助不读取任何工作区状态，平台模式与本地模式输出一致。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：用法列出的旗标若与代码脱节会误导使用者——用例对「用法列出的旗标集合」与「cmdFlow 实际消费的旗标集合」做双向相等断言，新增旗标而漏改用法会被测试暴露。次风险：既有两套源码文本断言（flow-help-status、input-format-copy）钉着兜底用法行——兜底首行保持原字面量不动，只把其后的照抄形态行抽成共享行组，两套断言零触碰。试过但放弃的方案：① 在 index.js 的 `case 'flow'` 分支拦截帮助旗标——只能拦到 `flow --help`，`flow start --help` 仍会进入 cmdFlow 的 start 分支，治不到坑的主形态；② 裸 `sillyspec flow`（空子命令）也改为 stdout 加退出 0——改变既有兜底契约，依赖退出码 2 的脚本与测试会受影响，不动。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow.js | cmdFlow 帮助旗标短路与用法行纯函数；兜底分支复用共享详注行组 |
| 修改 | src/run/shared.js | resolveUninitCwdGate 新增 helpRequest 入参（帮助请求判 skip，缺省行为不变） |
| 修改 | src/index.js | 未初始化门调用点按命令声明帮助请求（仅 flow 族） |
| 修改 | test/uninit-cwd-gate.test.mjs | helpRequest 单元用例与真实入口端到端用例（带帮助旗标放行、不带照旧硬拦） |
| 新增 | test/flow-help-flag.test.mjs | 帮助旗标形态、用法内容、短路次序、兜底不变用例 |
