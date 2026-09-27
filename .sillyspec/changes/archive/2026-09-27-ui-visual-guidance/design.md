---
author: flow-machine-draft
created_at: 2026-09-27T04:26:07.088Z
---
# 设计记录（Design Record）— 2026-09-27-ui-visual-guidance

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-ui-visual-guidance 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
做法：三件套——① flow start 输出的 lines 数组按 `detectUiTouch(input)`（关键词启发式：页面/UI/视觉/样式/前端/tsx/vue 组件等正反例词表）条件插入「UI 变更执行须知」段（仓中立：不点名具体仓路径，指引用原型或黄金页或现有截图做基准、证据落变更目录 visual-evidence.md）；② verify 探针族新增「UI 视觉证据」分级探针（探针编号顺延，advisory 默认）：UI 触达（input 或声明文件面 .tsx/.vue/.html 命中）且缺 visual-evidence.md → ⚠️；local.yaml `ui_visual_gate: warn|error|off`（默认 warn）控制档位；③ 硬规则内嵌同探针：design/requirements 命中「降级 × 视觉族词共现」且无用户裁决留痕 → 恒 error（仅 off 豁免）。证据只验在场性（文件存在非空），不做内容语义判断——收口零新增负担，证据是执行时按须知顺手产生的。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-ui-visual-guidance 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新增导出：src/ui-visual.js（detectUiTouch / buildUiGuidanceLines / runUiVisualProbe / UI_VISUAL_PROBE_HEADING）；flow.js start 输出插入须知段；verify-probes.js 注册新探针段（--init 骨架 + gate 复跑比对走既有探针管线）；config-schema.js 增 ui_visual_gate 枚举键（默认 warn）。无 CLI 命令签名变化；local.yaml 新增可选键向后兼容（缺席=warn）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-ui-visual-guidance 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用——检测为纯函数读既有文件，无到达序。2. 并发写：只读探针（读 design/requirements/visual-evidence.md），与 verify 既有探针同并发模型，零新增写面。3. 切换：visual-evidence.md 由 agent 随手写，中断时探针只报缺证据（fail-soft 警告默认档），不产生半态。4. 作用域：探针仅读本变更目录与 local.yaml（SPEC_ROOT 解析沿用既有 resolveVerifyProbesSpecBase），跨仓零串台；关键词启发式为 advisory 误判面（多警告一次），误漏面由文件面检测兜底。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-ui-visual-guidance 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：关键词启发式误判（非 UI 变更被注入须知/警告——噪音；或 UI 变更漏检——门没响）。对冲：双源检测（input 词表 + 声明文件面扩展名），默认档仅 warn（误判成本一行警告），正反例单测锁定词表。试过放弃：① 收口强制截图对账（用户否决——太麻烦且最后才卡死没意义，改为过程引导+在场性对账）；② CLI 内置浏览器截图（放弃——CLI 保持零浏览器依赖，截图由执行会话浏览器能力承担，CLI 只验痕迹）。
