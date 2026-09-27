---
author: flow-machine-draft
created_at: 2026-09-27T12:57:41.422Z
---
# 设计记录（Design Record）— 2026-09-27-pushgate-green-repair

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-green-repair 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两处修复，均不动运行逻辑：(1) src/config-schema.js 的 renderExample() 模板补 ui_visual_gate / hunk_gate 两条注释态示例行（顶层键，缺省 warn 注释不生效，文案取 schema desc 摘要），满足 config-schema.test 第 96 行起的「每个 live 键首段+末段 token 必现」防漂耦合断言；(2) docs/sillyspec/platform-interface-map.md 的 17 处行号锚按当前 src/run/shared.js 与 src/index.js 实际行号更新（12 处 shared.js 由批量收口提交 a034202e 插入 ~26 行推移、5 处 index.js 为更早提交遗留漂移），满足 doc-ref-check 关键词窗口校验。


## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-green-repair 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
renderExample() 输出的 local.yaml.example 文本新增两行注释（键名 ui_visual_gate / hunk_gate，注释态=复制后仍需解注释才生效，缺省档位不变）；对外无签名变化。platform-interface-map.md 为纯文档，无接口面。


## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-green-repair 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：不适用——静态模板文本与文档行号，无事件序。
2. 并发写：config-schema.js 为共享文件，本变更只加注释行于模板字符串内；若并行会话同时改 renderExample 相邻区域，Edit 前重读最新态可避冲突（行级独立，无逻辑耦合）。
3. 切换/生命周期：不适用——无状态。
4. 作用域：example 行号锚只校验本仓 src；跨仓引用不存在。


## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-green-repair 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：行号锚是「随代码漂移的活契约」，后续提交再动 shared.js/index.js 行布局会再红——本变更只修当前态，不引入锚自愈机制（属另一变更面）。放弃的方案：给全部 17 处加 ? 后缀跳过关键词断言——被否：这批锚是真实代码引用而非纯位置叙事，跳过断言等于降低校验强度掩盖漂移。

