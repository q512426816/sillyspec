---
author: flow-machine-draft
created_at: 2026-09-24T16:32:39.753Z
---
# 设计记录（Design Record）— 2026-09-25-thin-patch-scope-fix

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-scope-fix 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
patch 子步的文件面改为「本变更可归属」双源：①baseline..HEAD 提交面（.sillyspec/ 前缀只保留本变更目录，其余治理面 WIP 不入）并过 splitOwnVsForeignDiffFiles 他侧声明切分；②本变更目录全量工作树件（readdirSync 递归，未提交的槽位作答/骨架全收），排除 change.patch/change-patch.json 自引用。完成语案「六子步」硬文案改 SUBSTYPES.length 动态（现七子步）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-scope-fix 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow.js patch 子步文件面构造重写 + 完成语案动态化；readdirSync/relative 新增导入。无 CLI 参数变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-scope-fix 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用。2. 并发写：patch 生成是读 git+读目录后一次性写两个文件，与 agent 填槽（同目录）有轻微竞窗——patch 先落、槽后改则差一轮，重入 done 可重冻结（子步已 done 不重跑，接受 done 时点冻结语义）。3. 切换/中断：fail-soft 不标 done，重入重试。4. 作用域：他侧 .sillyspec/ WIP（quicklog/knowledge）与非本变更目录治理面零进入；他侧同窗口的非 .sillyspec 提交无作者级过滤（残余风险，他侧声明切分兜底已尽力）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-scope-fix 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=只冻结提交面会漏 agent 未提交的实现文件——但薄协议工作期增量提交是惯例、未提交实现由测试门 fail-closed 兜住，且治理面（变更目录）全量收入，审计缺口可接受。死路=继续用 attributedChangedFiles 的 dirty 全扫再逐个猜归属——并行会话未声明 WIP 无归属信号可猜，猜错即泄漏（上变更 49 文件实证），不如收窄到确定归属面。
