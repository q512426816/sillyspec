---
author: flow-machine-draft
created_at: 2026-09-28T05:35:51.109Z
---
# 设计记录（Design Record）— 2026-09-28-guidance-principles

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-guidance-principles 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三件落地加两条入档：① buildUiGuidanceLines 改写四条原则版（真码定稿、就近发现管线、手绘仅粗选、降级留痕——零生态词零命令零配置）；② brainstorm 方案对比步 prompt 增 {UI_VISUAL_GUIDANCE} 占位符，run/prompt.js 按变更目录 proposal+requirements+变更名做 detectUiTouch 检测命中注入同一须知（DECISION_HITS 同款 fail-soft，占位符入 VOLATILE 掩蔽清单防指纹漂移）；③ 引导输出断言测试（检查点是 agent 看到的输出而非源码文本——源码为探测示教注释引用生态词合法）；④⑤ 两条 FR（语言生态中立、门位原则）随本变更归档入知识索引。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-guidance-principles 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
buildUiGuidanceLines 文案改写（导出面不变）；brainstorm.js 方案对比步 prompt 增占位符；run/prompt.js 增注入块与掩蔽项；test 新增 guidance-output-neutrality（3 用例）+ ui-visual-guidance 增 4 断言。无 CLI 命令签名与 local.yaml 键变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-guidance-principles 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（注入为 prompt 渲染时只读快照）。2. 并发写：共享文件提交前逐 hunk 人工核对。3. 切换：注入无状态（每次 prompt 渲染重算）；fail-soft 异常注入单行说明不留残留占位符。4. 作用域：检测语料仅本变更目录与变更名，跨变更零串台；文案零生态绑定（断言测试锁定）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-guidance-principles 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：brainstorm 语料在 proposal 尚未生成的早期步骤可能只有变更名——变更名含 UI 词（如 apple-style 不含）则漏注入；对冲：方案对比步执行时 proposal 通常已落盘，且 flow start 注入兜底另一入口。放弃方案：①静态红线扫源码（用户指出误伤探测代码、示教 example 与历史注释，改为输出断言）；②local.yaml commands.prototype 配置位（用户指出多前端项目多生态仓不成立，仓自身 modules.*.test 退役史为证——改为就近发现原则文案）。
