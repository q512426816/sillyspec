---
author: flow-machine-draft
created_at: 2026-10-05T16:51:28.108Z
---
# 设计记录（Design Record）— 2026-10-06-agent-log-detect-hint

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

问题：cmdAgentLog --detect 空态提示（src/agent-session-log.js）硬编码「Claude Code / Codex / ZCode」3 家，与同文件 HARNESS_DETECTORS 注册表（8 家：另有 pi / deepseek-dsh / cursor-agent / cursor / opencode）漂移，且零测试覆盖。

方案：新增导出纯函数 renderDetectEmptyHint(detectors)——从注册表数组运行时派生提示行（展示名小映射 HARNESS_DISPLAY_NAMES，缺省回退 name 原样），cmdAgentLog 空态分支改调它并传入 HARNESS_DETECTORS；同时导出 HARNESS_DETECTORS 供测试遍历断言。选派生而非更新一遍硬编码：漂移根因是「注册表与文案两处真相」，派生后注册表是唯一真相源，新增 harness（加一个探测器对象）提示自动跟上。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增导出（src/agent-session-log.js）：renderDetectEmptyHint(detectors = HARNESS_DETECTORS) → string（纯函数零副作用，可注入注册表供测试）；HARNESS_DETECTORS（模块私有 const 改导出，只读消费）；HARNESS_DISPLAY_NAMES（name→展示名映射，缺省回退 name）。
- CLI 行为变化：`sillyspec agent-log --detect` 探测为空时的提示行从「支持: Claude Code / Codex / ZCode 自动探测…」变为全注册表 8 家的派生文案；SILLYSPEC_AGENT_LOG 指引保留。--json 输出、探测/登记/上报行为零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：提示是调用时一次性派生的纯字符串，无输入序列、无时序假设；注册表顺序即展示顺序（模块加载期固定）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用：renderDetectEmptyHint 纯函数不写盘不加锁；HARNESS_DETECTORS 是模块级冻结常量，并发只读安全。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用：无状态无半态——空态分支同步渲染一行输出，中断无残留。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用：注册表是本 CLI 模块内常量，与 cwd/项目/平台实例无关；提示内容全局一致（支持的 harness 清单本就是 CLI 能力面，非项目态）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：展示名映射 HARNESS_DISPLAY_NAMES 成为新的次要漂移点（新 harness 忘加映射→展示退化为 name 原样）。已用缺省回退消解——退化形态仍含全部家数，只是不美化，且测试遍历断言按「映射名或 name 原样」命中，两种形态都受覆盖。
试过放弃：① 仅更新硬编码文案为 8 家——不解决根因，注册表再扩仍漂移，放弃；② 提示全部用 name 原样拼接（claude-code / deepseek-dsh）——零映射零漂移但可读性差（品牌大小写混乱），放弃，取映射+回退折中。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/agent-session-log.js | 空态提示改注册表派生：导出 HARNESS_DETECTORS / HARNESS_DISPLAY_NAMES / renderDetectEmptyHint，cmdAgentLog --detect 空态分支改调 |
| 修改 | test/agent-session-log.test.mjs | 新增空态提示派生断言：注册表全项含于提示、注入假注册表项自动跟上、CLI 空态输出走派生提示 |
