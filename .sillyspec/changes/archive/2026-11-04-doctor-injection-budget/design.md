---
author: flow-machine-draft
created_at: 2026-11-04T07:29:28.378Z
---
# 设计记录（Design Record）— 2026-11-04-doctor-injection-budget

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
src/doctor-diagnostics.js 新增 detectInjectionBudget(cwd) 探测器（detectDocBloat 同款形态：软限→WARNING 不 FAIL、fail-soft 跳过），挂入 runDoctorDiagnostics 的 dimensions 数组，renderDoctorSummary/formatDoctorJson 走既有通用渲染零改动。扫描面：仓根 AGENTS.md/CLAUDE.md/SKILL.md、templates/agents-instruction.md（模板源，sillyspec 本仓开发面）、.claude/skills/*/SKILL.md 逐文件 statSync 字节量，预算 20000 字节——对齐 Claude Code 系 harness 压缩截断线（superpowers #2481：截断后超线内容对 agent 不可见，SDD 技能丢五轮修复上限跑 18 轮）。选 WARN 制而非测试硬门：① silyspec-execute SKILL.md 实况 18.9KB 已贴线，硬门上线即红且阈值无事故校准依据；② 阈值待首次真实截断事故校准后再考虑升格（doctor WARN 即校准数据源）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
新增导出 src/doctor-diagnostics.js：`detectInjectionBudget(cwd)` → detectDocBloat 同构维度对象（{name:'injection_budget', label, findings, pass, severity, safe_actions}）。doctor --json 输出新增一个维度键（结构化消费方前向兼容——未知维度按既有字段渲染）；doctor 人读输出多一段。无破坏性变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用——只读 statSync 扫描静态文件，无时序面。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   纯只读无写面；文件被并行会话写入中时 statSync 读到瞬时字节数，最坏多/少报一次体量，下轮 doctor 自愈。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——探测器无状态，任意时刻重入结果一致；文件缺失/不可读 fail-soft 跳过不抛错。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——扫描面以 cwd 仓根为界；worktree/平台指针模式不改变 doctor 的 cwd 语义。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？
最大风险①＝20000 字节阈值拍脑袋（不同 harness 截断行为各异：Cursor/OpenCode 无同款截断）——承认是粗对齐：Claude Code 系实证线先行，WARN 制不改收口通过性，待事故/实测校准；跨 harness 精细化留待 dispatch backends 按后端分预算（本变更不做）。风险②＝doctor 输出再长一行（本身也是注入面税）——预算内时仅一行摘要，超线才展开清单，税负可控。放弃方案①：测试硬门锁 18000 字节（初版方案）——否决，上线即红（execute 技能 18.9KB）且阈值无校准依据，改 doctor WARN。放弃方案②：给每技能预算随 harness 路由（per-backend budget）——否决，当前无 per-backend doctor 语义，等首个跨 harness 截断事故再立项。
