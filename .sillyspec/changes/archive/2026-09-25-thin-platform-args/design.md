---
author: flow-machine-draft
created_at: 2026-09-24T18:12:42.772Z
---
# 设计记录（Design Record）— 2026-09-25-thin-platform-args

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-platform-args 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
平台侧三子代理核对实证 flow 族零平台参数支持，四路修复：①cmdFlow 的 specBase 统一走 resolvePlatformSpecDir（显式 --spec-dir/--spec-root > .sillyspec-platform.json 指针 fail-closed > 本地），指针失效报错不静默回退防状态分裂；--runtime-root 透传 resolveRuntimeRoot；②cmdFlowStart/Done 全部 ProgressManager 以 specDir=specBase 构造（此前裸构锚 resolveSpecDir(cwd)——DB 行与 change 目录落本地、specBase 侧无目录致 writeFlowState ENOENT，进度与工件分裂同根修）；③平台 writer 预建空变更目录放行为全新 start（非空且无头脑风暴产物仍拒——legacy 拒收面不变）；④start/done/amend-draft 变更名白名单（词字符/点/横线/中文，拒分隔符/点穿越/default/quick-hex 辅助键），清晰度门两选一补过门格式样例（独立节头行+列表行——平台核对实证单行内联恒被拒）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-platform-args 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/flow.js：cmdFlow 入口重写（resolvePlatformSpecDir/validateChangeName/runtimeRootOpt/getFlag --spec-root）、cmdFlowStart/Done 签名加 runtimeRootOpt、两处 PM 锚定、空目录放行分支、清晰度门样例。测试：⑱外置根全链（含嵌套目录 ENOENT 回归）/⑲空目录放行与非空拒收/⑳名称四态/㉑指针恢复+样例。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-platform-args 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯路径解析与目录布局逻辑，无时序与共享可变状态；fail-closed 指针语义复用既有全仓单点（含 temp 残留治理与自指降级），未引入新的回退面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-platform-args 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=外置根场景下 local.yaml（flow 配置/commands/known_failures）不在 spec 根——平台 spec 根由平台生成配置时负责携带，本片只管落点正确；死路=给 flow 单独再造一套指针解析——resolvePlatformSpecDir 是全仓 fail-closed 单点，重造即状态分裂。
