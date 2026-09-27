---
author: flow-machine-draft
created_at: 2026-09-26T07:13:30.152Z
---
# 设计记录（Design Record）— 2026-09-26-watcher-timeline

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
新建 src/timeline.js（纯函数合成器）+ index.js watcher 子命令 `timeline`（与 alerts 同族只读出口）。数据三源：①watcher 事件流 jsonl（readWatcherEvents 既有 API）②change 目录 tasks.md 勾选行（活跃 .sillyspec/changes/<名>/ 与归档 .sillyspec/changes/archive/<名>/ 双路径探测）③git 提交锚（事件流里 kind=commit 的短 hash 逐个 git log 解析出主题+时间+task token）。渲染分三段：事件时间轴（诞生锚取工件 frontmatter created_at，事件按 kind 图标+剪裁 detail）、任务面表格（task-NN × 描述行 × 勾选拍 × 提交锚）、墙钟统计（aggregateStageTiming 复用）。勾选时刻按翻格顺序推断（事件只记计数不记 id）并在表头显式标注「≈ 顺序推断」。选此方案：全部数据源是在场既有留痕，零新落盘、零协议负担；alerts 先例证明 watcher 子命令是低摩擦出口。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新 CLI 子命令 `sillyspec watcher timeline --change <名> [--runtime-root <路径>]`（index.js watcher case 子命令白名单 alerts→{alerts,timeline}）。新模块 src/timeline.js 导出纯函数：parseTaskLines(tasksMd)→[{id,desc,checked}]、inferFlipTimes(events,total)→Map<序号,ts>、resolveCommitAnchors(events,gitLook)→[{hash,ts,subject,tokens}]（gitLook 注入面，测试零真 git）、renderTimeline({...})→string。无文件写入、无 db、无平台推送、不改 watcher.js。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：jsonl append-only 单调；时间轴按 ts 原序渲染不重排；翻格顺序推断以事件到达序为准，跨拍乱序（理论上不发生——单写者）不影响计数守恒校验（from 与上一 to 衔接才入推断，断裂标「推断不可用」）。
2. 并发写：只读命令与 watcher 写侧并发时坏行/半行由 readWatcherEvents 既有容差跳过；渲染瞬间快照语义，无锁无竞争。
3. 切换/生命周期：命令是无状态只读，中断即弃无残留；对已归档变更，事件流与 change 目录（archive 路径）都还在盘上，随时可重渲染；活跃变更渲染时 tasks.md 可能正被勾选——渲染的是当下快照，可重跑。
4. 作用域：--runtime-root 解析与 alerts/spawnWatcher 同源（resolveRuntimeRoot 单点）；change 名经 assertSafeChangeName；事件流按变更名分文件不串台；git 解析锚定当前仓（--runtime-root 指他处时提交锚可能失联——降级为只显 hash 并标注）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=推断面的诚实性：勾选时刻是顺序推断（事件不记 id）、描述行继承机器稿 60 字截断、提交锚依赖仓内 hash 可达（合并重定基后失联降级只显 hash）。对策是显式标注：表头「≈」+ 尾注列数据源与盲区（观测起点≠诞生时刻、单飞锁盲窗）——宁可标注粗糙也不冒充精确。放弃的方案：①改 watcher 事件流带 checkedTasks id 明细——改写入面格式是侵入性变更，且历史流已定格无法回填，收益仅推断精度；②从 DB progress 库取阶段时间——thin 变更状态不落 DB（红线），无数据可取；③agent 干活时自述留痕——协议负担，违背 thin 立身之本（那是完整流程 --output 的能力面）。
