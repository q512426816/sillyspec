---
author: flow-machine-draft
created_at: 2026-11-22T15:45:33.582Z
---
# 设计记录（Design Record）— 2026-11-22-recommend-anchor-recorrect

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三个独立小改共用一单（同属提示词纪律面+机械修复）：①brainstorm.js 第 7 条提问分型协议追加「推荐附一手依据锚」增量句（推荐答案机制的实证弱点——无依据推荐被用户识破，机制解=把调研深度变成推荐的硬前置）；②prompt.js 两处 wait 交互指引输出各追加一句中途纠正协议（wait-what 形态：纠正语义→停→复述目标→确认→再继续；挂两处既注入点最小扰动，autoMeta 分支不注入与既有分支条件一致）；③_extract.mjs 输出前归一化 demo 目录绝对路径（root 由 __dirname 推导，worktree 下跑渗入绝对路径——归一化函数 export 供直测，端到端双环境逐字节一致）。选此方案因为三处均为增量行/纯函数归一，不动任何既有语义，金档再生即可验证。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- brainstorm.js：第 7 条提问分型协议内追加一句纪律（prompt 文本增量，无代码签名变化）
- prompt.js：两处 wait 提问 console.log 指引各追加一句（运行时提示文本增量，autoMeta 分支不注入）
- _extract.mjs：新增 export 归一函数（如 sanitizeDemoPath(text)——正/反斜杠绝对路径→仓相对形），写盘前对输出应用；脚本 CLI 行为面无变化
- CLI 命令/端点：无

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立。三处均为无状态文本增量/纯函数归一：纪律句在 prompt 渲染时静态在场；归一函数对字符串单次变换无顺序依赖。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   _extracted.json 写盘沿脚本既有单次 writeFileSync（提取脚本单进程跑）；金档文件本就只在再生命中——无新增并发面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全。全部无状态：纪律句是静态文本，归一是纯函数，中断重跑幂等。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会。归一只替换「由本脚本 root 推导出的 demo 目录路径」这一确定字符串形态（正/反斜杠两形），不碰用户内容；任意 worktree 跑产出逐字节一致（这正是本变更目标）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：归一化替换过宽误伤用户内容中恰好包含该路径形态的串——缓解：只替换精确的 demoChangeDir 完整路径（及反斜杠形），仓相对形写死，不做前缀模糊匹配。
- 死路：改 buildPlanSteps 让其输出相对路径——放弃：那是 stage 运行时真实行为（绝对路径注入是 prompt 的真实语义），为提取器改运行时行为属本末倒置；归一化只发生在提取镜像层。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/brainstorm.js | 第 7 条提问分型追加依据锚纪律句 |
| 修改 | src/run/prompt.js | 两处 wait 指引追加中途纠正协议句 |
| 修改 | docs/prompt/_extract.mjs | 新增 export 归一函数+写盘前应用 |
| 新增 | test/prompt-extract-portable.test.mjs | 归一函数直测+双环境一致 |
| 修改 | test/brainstorm-prompt-discipline.test.mjs | 分型段依据锚断言 |
| 修改 | test/prompt-injection-gaps.test.mjs | 交互指引纠正协议断言 |
| 再生 | docs/prompt/_extracted.json、docs/prompt/brainstorm.md | 金档同步（提取器产出） |
