---
author: flow-machine-draft
created_at: 2026-09-29T01:15:37.997Z
---
# 设计记录（Design Record）— 2026-09-29-title-and-agents-slim

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-title-and-agents-slim 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
标题三段链路：① 新增 deriveChangeTitle（quicklog.js，--input 首行推导 ≤50 字：剥「需求：/动机：」标签、「成功标准：」引导行止、超长截断）；② flow start 四路接线（fresh 写入并打横幅 / resume 带 --title 可改、空 title 由 input 补写 / adopt 从头脑风暴 proposal H1 提取并补注册 changes 行）；③ serializeForSync SELECT 补 title 列（此前上行恒无标题是「英文 key」病灶的同步链一侧）。
指引归位：AGENTS.md 只留稳定规则与路由——轻量变更整节并入选道表细胞（细节指向 /sillyspec:flow skill 与 CLI 运行时输出）、速查压缩为「恢复与查看」三行；模板 templates/agents-instruction.md 同源同步（防下版本 init 重新生成肥版）；标题约定与 commands.test 退役修正落 sillyspec-flow skill。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-title-and-agents-slim 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新增导出：deriveChangeTitle(input, max=50)（src/quicklog.js）。CLI 新 flag：flow start --title <标题>。行为变化：flow start 横幅多一行 🏷️ 变更标题；changes.title 由恒 null/名兜底变为中文概括；serializeForSync 载荷 changes[] 增 title 字段（平台 _ensure_change_row 既有消费兼容，另有平台侧收养配套在他仓在途）。AGENTS.md/templates/skill 为纯文档面，无接口。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-title-and-agents-slim 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：title 写入在 initChange（建行即写）与 resume 补写（仅库内空时），迟到重跑幂等——值相同不重写；--title 显式值恒生效。
2. 并发写：title 是 changes 表单列，updateChangeMeta 走既有 SQLite 事务；两会话并发 start 同名变更被既有唯一约束与 claim 门拦，无新并发面。
3. 切换/生命周期：resume/adopt 补写 fail-open（try/catch best-effort），标题失败不阻断协议面；归档/rename 沿用既有 title 保留语义（change-title-backfill 既有用例锚定）。
4. 作用域：title 每仓每变更一行，随 serializeForSync 定向单变更上行，无跨工作区串台面；模板只影响新 init 的仓（本仓 AGENTS.md 独立维护，版本感知幂等不回写）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-title-and-agents-slim 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：AGENTS.md 瘦身后，无 skill 环境（如 codex 只读 AGENTS.md）的 agent 拿不到 --input 格式——已评估：flow start 清晰度门失败时 CLI 自己打印过门格式（运行时教学兜底），可接受。试过放弃：把标题写进 proposal 骨架 H1（# 提案书 — <中文>）——平台 normalize_display_title 把「类型词—任意后缀」全判模板回退英文 key，H1 通道不可靠，改走 body title 通道（SELECT 补列 + 平台侧收养）。已归档变更判无法回填标题（无后续推送面），留待需要时一次性脚本。
