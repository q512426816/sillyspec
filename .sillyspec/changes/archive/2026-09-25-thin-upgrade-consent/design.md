---
author: flow-machine-draft
created_at: 2026-09-24T17:41:52.765Z
---
# 设计记录（Design Record）— 2026-09-25-thin-upgrade-consent

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-upgrade-consent 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
升厚同意门三件：①run 族混跑回退写侧（command.js :1362 区）加门——thin change 跑 run <stage> 未带 --upgrade-thick 则拒跑 exit 2 指路（征得用户同意带 flag 重跑 / 未确认回薄道），带 flag 才落 legacy_fallback 且写 upgraded_by_consent 时点留痕；--upgrade-thick 登记进 run 族已知参数表（防未知参数拦截）；②flow start 复杂度预判文案改为用户裁决框架（升厚与否问用户、指明同意门，删照办式表述）；③agents-instruction 规则 5 同步。R16 实测驱动：advisory 被 agent 当指令自行转厚，用户毫不知情。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-upgrade-consent 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/run/command.js（同意门+已知参数登记）、src/flow.js（预判文案）、templates/agents-instruction.md（规则 5）、test/flow-protocol.test.mjs（⑤ 改两态断言+⑭ 文案断言）。无导出面变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-upgrade-consent 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯 CLI 门逻辑无时序面——拒跑路径零写状态直出、同意路径一次性置位可重复执行，变更按目录隔离无跨面读写。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-upgrade-consent 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=agent 谎报同意（带 flag 但没真问用户）——flag 的价值是落痕可审计（upgraded_by_consent 时点进 flow-state，事后可对质）而非密码学保证，与 --force 留痕先例同哲学。死路=靠纯文案劝阻（R16 实证失效——advisory 文案被当指令执行），门必须机械化。
