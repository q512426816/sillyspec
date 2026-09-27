---
author: flow-machine-draft
created_at: 2026-09-26T07:28:26.622Z
---
# 设计记录（Design Record）— 2026-09-26-watcher-timeline-p2

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline-p2 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
2026-09-26-watcher-timeline 评审 P2 清偿（先例 3eb3bfbf 模式）：①inferFlipTimes 语义修正——broken 仅指中段计数不衔接（from≠游标即停），尾部未覆盖是在途变更的自然态不再误标；「已勾任务缺推断时刻」标注移到 renderTimeline 层按事实逐任务标 ? 并单独注记；②墙钟统计真实复用 watcher 的 aggregateStageTiming（主变更 design 原承诺）——逐阶段 first→last 事件差输出；③loadChangeTasks 补 tmpdir 用例钉双路径探测（活跃>归档、归档回退、双缺失 null）——修正主变更 FR-02 豁免理由与代码事实不符。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline-p2 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/timeline.js：inferFlipTimes 返回语义收窄（broken=仅中段断裂）；renderTimeline 输出面新增「阶段墙钟」行（aggregateStageTiming 产物）与已勾缺时刻注记；新增 import { aggregateStageTiming } from './watcher.js'（只读复用，不改 watcher）。CLI 命令面无变化（同命令输出更准）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline-p2 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：语义修正后 broken 判定仍只依赖事件到达序的单向游标（与主变更同机制）；逐阶段墙钟聚合按事件 min/max，不依赖事件间顺序。
2. 并发写：只读命令，渲染瞬间快照；阶段聚合消费同一内存事件清单，无二次读盘无竞争。
3. 切换/生命周期：无状态纯函数修正，无生命周期面（同主变更）。
4. 作用域：aggregateStageTiming 为 watcher.js 既有稳定导出（其测试已在 test:core），import 不引入新作用域；其余同主变更。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-watcher-timeline-p2 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=语义修正引发回归——主变更有用例钉住旧「尾部标 broken」行为，需同步改期望（该用例钉的正是误标行为，改期望即清偿本体）。放弃的方案：inferFlipTimes 直接收 tasks 勾选态做尾部判断——把渲染关注度混进纯计数函数层次更脏；按层分责（计数函数管链、渲染层管已勾缺时刻）更清晰。
