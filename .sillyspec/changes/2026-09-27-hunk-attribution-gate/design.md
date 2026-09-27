---
author: flow-machine-draft
created_at: 2026-09-27T05:40:53.732Z
---
# 设计记录（Design Record）— 2026-09-27-hunk-attribution-gate

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-hunk-attribution-gate 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：新模块 src/hunk-attribution.js（纯函数 + git 只读调用）——① 声明面归集：复用 parseFileChangeList（change-list.js）与 extractRequirementBindings（flow-draft.js）合并 design 清单与 requirements 测试绑定路径；② 提交面对账：flow done 时 git diff baseline..HEAD --numstat 逐文件 + git diff 解析 hunk 头计 hunk 数，不在声明面的文件进未归因清单；③ 跨变更竞争：扫描 .sillyspec/changes/* 其他活跃变更（排除 archive 与本变更）各自声明面，与提交面相交 → 竞争文件+变更名+hunk 数（同文件无法按行归属，显式暴露代替静默）；④ 在途残留：提交面文件在当前工作树仍有未提交 diff → 活跃并发 WIP 信号。接线点单一：flow.js cmdFlowDone 提交面切分处（既有「提交面夹带嫌疑 advisory」块之后独立调用，不改对方代码）；local.yaml hunk_gate 三档（warn 默认、error、off）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-hunk-attribution-gate 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新增导出：src/hunk-attribution.js（collectDeclaredFace、runHunkAttributionGate、renderHunkAttributionLines）；flow.js 单点接线；config-schema.js 增 hunk_gate 键。无 CLI 命令签名变化；local.yaml 新增可选键向后兼容（缺席=warn）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-hunk-attribution-gate 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用——git 只读快照（baseline..HEAD 与当前 status），无到达序。2. 并发写：探针只读（git diff 与 changes 目录读取）；与其他会话 flow done 并发跑同款对账幂等（同一提交面同结果）。3. 切换：无状态残留（每次全量重算，不落中间态）；异常 fail-soft 降级为一行跳过注记不阻断。4. 作用域：只读本仓 .sillyspec/changes 与 git 对象；跨仓零串台；竞争检测遍历活跃变更目录（排除 archive），多实例并发读一致。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-hunk-attribution-gate 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：竞争检测的假阳/假阴——他变更声明面与提交面相交但实际各行其事（假阳：一行警告可接受）或他会话在途改动根本没立变更/没写清单（假阴：残留信号与既有文件级 advisory 兜底，无法根治——hunk 归属的语义判断终究要人，门的目标是把静默混合变成显式中断）。试过放弃：① 轻量道默认挂会话 worktree（用户否决——合并税过重，仓内 wt-parallel-commit-race 等坑史为证）；② hunk 语义归属（机器无法判定行归属，改为「竞争文件显式暴露+人核」的诚实口径）。
