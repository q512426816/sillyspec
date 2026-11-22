---
author: flow-machine-draft
created_at: 2026-11-22T16:37:40.035Z
---
# 设计记录（Design Record）— 2026-11-22-tasks-blocked-by

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

把 mattpocock 链路里 to-tickets/implement-spec 的阻塞边思想做进 SillySpec 轻量道的 tasks.md，形态刻意最轻：标注是任务行描述段尾的可选方括号段（`[blocked-by: task-MM/task-KK]`），collectRows 解析挂 blockedBy 数组，tickTasksMd 在返回值上多给 blockedWarning（软门）与 frontier 化 next 指针，runTaskTick 回显 warn 与注记。不引入任务状态机/不阻断任何勾选（轻量哲学：提示词纪律+机器识别，不做机器硬门）；无标注路径零变化。选纯函数增量方案因为全部行为都在 tickTasksMd 一个纯函数接缝上可测，IO 层只加回显。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- collectRows（task-tick.js 内部函数）：行对象新增 `blockedBy: string[]`（无标注=空数组）；desc 剥出标注
- tickTasksMd：返回值新增 `blockedWarning: string|null`（tick 目标被未勾任务阻塞时的提示文案，无阻塞=null）；`next` 对象新增可选 `blockedBy` 字段（全阻塞回退时携带）；既有字段（kind/tasksMd/checked/total/next/unclosedFence*）零变化
- runTaskTick：回显新增 blockedWarning 的 console.warn 与 next 的「（等 task-XX…）」注记；翻格/exit code 语义零变化
- CLI 命令面：无新增命令；tasks.md 文件格式新增可选标注语法（向后兼容）

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立。解析与指针计算都是基于翻格后 tasks.md 全量重算的纯函数——乱序勾选（先勾被阻塞者）只产生警告不改数据形态，任何顺序到达的最终态一致。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   沿用既有 writeAtomicSync 原子写盘语义，本变更不新增写点；blockedBy 解析只读。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全。标注活在 tasks.md 文本里（随文件持久），无进程内状态；软门警告是一次性回显不落状态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会。blockedBy 是变更各自 tasks.md 内的局部引用，解析不跨文件；引用不存在的任务 id（如 [blocked-by: task-99]）按「永不满足」处理——指针跳过它但警告提示引用悬空（解析层 warn 留痕）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：标注语法被误写成行内正文（无方括号包裹）导致静默不解析——缓解：不合法/悬空引用均 warn 留痕；格式文档写进 tasks.md 生成横幅（flow start 任务面横幅补一句可选标注语法）。
- 死路：①做机器硬门（阻塞未解锁时 tick 拒绝 exit≠0）——放弃：轻量道哲学是软纪律，硬门会打断「agent 判断顺序」的合法场景（如前置实际已完成但勾选滞后）；②blocked-by 用独立 YAML frontmatter 段——放弃：tasks.md 的真相源是 checkbox 行本身，把依赖搬进 frontmatter 会造成行与依赖两处需同步。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/task-tick.js | collectRows 解析 blockedBy + tickTasksMd 返回 blockedWarning/frontier next + runTaskTick 回显 |
| 修改 | src/flow.js | flow start 任务面横幅补一句可选标注语法说明（一行） |
| 新增 | test/task-tick-blocked-by.test.mjs | 标注解析/软门警告/frontier 指针三面 |
