---
author: flow-machine-draft
created_at: 2026-09-26T00:55:08.577Z
---
# 设计记录（Design Record）— 2026-09-26-thin-agent-tasks

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-agent-tasks 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
方向修正（用户否决 thin-workunits 的域关键词聚类）：开放世界的任务形态不可穷举——WORK_UNIT_BUCKETS 四桶枚举在数据管道/CLI 工具/重构/基础设施任务上全落 misc（变相退回逐条），枚举分类表是错误方向。正确定位：任务是 agent 的实现计划（OS/厚道流程均 agent 自拆，实证贴合实际、边干边勾自然），机器稿的正确边界是验收面（proposal/requirements 标准受指纹锚定）而非计划面；tasks.md 去年已去指纹化，机器预填只是零冷启动兜底。修法：回退聚类器（draftTasks 恢复逐条标准预填）+ 简报/advisory/tasks 头注释三处改为「预填草稿可覆写」语义（agent 按实际实现路径重写，保持 task-NN 行形态）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-agent-tasks 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-draft.js：删 groupCriteriaToUnits/WORK_UNIT_BUCKETS（整体回退，不留死码），draftTasks 恢复逐条渲染，tasks 头注释声明计划面归 agent；flow.js：fresh/adopt 简报+done advisory 三处文案更新为覆写语义。行为变化：>5 条标准的 tasks.md 回到逐条镜像（不再是单元行）；agent 获得明示覆写权。哨兵/指纹/requirements 零改动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-agent-tasks 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：预填是 start 时点快照，覆写是 agent 自由文件操作（无协议交互），收口哨兵按最终 tasks.md 形态判（兼容逐条与任意覆写形态——哨兵只认 - [ ]/- [x] task-NN 行）。2. 并发：纯文本面无共享。3. 切换：覆写无中间态风险（文件级操作）；在途变更不受影响（幂等补起草不重写已存在文件）。4. 作用域：thick 任务卡面不动（本就 agent 写）；测试绑定/FR 面不动。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-agent-tasks 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
决策记录（本会话第三次同款错误，升格为显式教训防再犯）：用枚举/关键词表穷举开放世界是错误方向——①R17 评审否决「完整标点收尾自检」（标点形态枚举不全）；②复合拆分劈碎「；」分隔的枚举词表（狗粮实证）；③本变更回退 WORK_UNIT_BUCKETS 域分类表（用户指出：任务单元形态不可穷举）。正确模式：开放世界的分类/计划归 agent（人有上下文），机器只锚定可枚举的封闭面（验收标准文本、字段格式契约）。风险=假勾退化（自写自勾可写巨型任务骗进度）——接受：哨兵证据重心本在提交面+测试门（任务面降级为进度信号）；追溯锚在 requirements FR 区不依赖任务面。死路：枚举更多桶/更多关键词——穷举错误不因规模变小而变对，弃。
