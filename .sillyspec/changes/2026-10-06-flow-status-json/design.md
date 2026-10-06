---
author: flow-machine-draft
created_at: 2026-10-06T05:06:35.656Z
---
# 设计记录（Design Record）— 2026-10-06-flow-status-json

> 四节每节必答——问题行原样保留（勿删勿改勿用答案替换），答案另起一行写在问题行下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——问题行/标题从本模板原样保留或复制，勿删勿改、勿用答案整块替换问题原文、勿手打重写（标点也要逐字：2026-10-05 三度实证——句号手写成问号、答案整块替换问题原文均被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 cmdFlow 的 status 分支把「状态事实计算」与「渲染」分离：先算出唯一一份事实（前置形态判定：不存在/已归档/目录在场无 state；活跃形态的阶段推断、design/FR/绑定槽、任务勾选计数、已完成子步），再按 `--json` 有无选择 JSON.stringify 单行输出或现有人类可读渲染。选这个方案是因为现有渲染与事实计算内联在同一段，程序化消费方只能 fragile 文本匹配；分离后两条渲染路径共享同一份事实变量，天然同源不漂移。

实测发现并一并修复（子进程验真抓到）：index.js 顶层全局解析把 `--json` 剥出 filteredArgs，`case 'flow'` 派发时未透传——flow 族在真实 CLI 入口下永远收不到该 flag（cmdFlowStart 的 json 信封因此是死代码，in-process 直调才生效）。修复按 CLI 既有模式做族级透传：index.js 给 cmdFlow 传第 4 参 `{json}`，cmdFlow 内与 args 残余 `--json`（直调/测试路径）取或，两路同语义不分叉，不做逐子命令特判。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

命令行 `sillyspec flow status --change <名>` 新增可选 `--json`：stdout 输出单个 JSON 对象。活跃形态含 change/status="active"/phase/designFilled/frFilled/bindingsFilled/bindingsTotal/tasksChecked/tasksTotal/substeps（已完成子步名数组）/substepsTotal，升厚遗留时附 legacyFallback:true；三前置形态输出 change/status（"missing"|"archived"|"dir-no-state"）两字段。退出码与人类可读路径同点同值：missing exit 1，其余 exit 0。不带 `--json` 时输出与现状逐字一致。无导出函数签名变化（cmdFlow 内部重构），无文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

status 是只读查询，读的是 flow-state.yaml/tasks.md/design.md/requirements.md 的落盘快照；文件缺失或不完整沿既有 fail-soft 语义（缺=未填/0），不新增到达顺序假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

本命令不写任何业务文件；多执行体同时跑 status 各自独立计算独立输出，无共享可变状态，无锁需求。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

无状态命令，中途中断无残留副作用；退出码在两种渲染路径下出自同一判定点，不存在「JSON 路径 exit 0、人类路径 exit 1」的分叉。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

specBase 解析沿用 resolvePlatformSpecDir（显式 --spec-dir/--spec-root > 平台指针 > 本地，fail-closed），不引入新目录解析路径；JSON 只含本变更事实，跨实例不串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：事实/渲染分离时改坏现有人类可读输出（heartbeat 等测试逐字钉渲染行）。对策：人类可读路径保留原渲染字符串本身，仅把渲染数组里的内联计算换成同语义的预计算变量（正则与语义逐字不变），并用测试钉住不带 --json 的关键行。试过放弃：对渲染文本做「文本→JSON 反解」包装层——放弃，文本是给人看的不是契约，反解正是本变更要消灭的 fragile 匹配。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow.js | status 分支事实/渲染分离 + --json 输出三形态标记与同点退出码；cmdFlow 增第 4 参 opts.json 族级透传 |
| 修改 | src/index.js | case 'flow' 派发传入 {json}——全局 --json 剥离后显式透传（修 flow 族真实入口收不到 --json 的族级缺陷） |
| 新增 | test/flow-status-json.test.mjs | 活跃九字段（in-process + bin 真实入口透传钉）/三前置形态退出码/人类可读回归/test:core 驻留断言 |
| 修改 | package.json | test:core 清单登记 test/flow-status-json.test.mjs |
