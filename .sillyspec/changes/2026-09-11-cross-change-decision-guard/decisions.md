---
author: qinyi
created_at: 2026-09-11T00:00:00+0800
---

# 决策记录

## D-001@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
- 状态：confirmed
- 类型：architecture
- 模块域：stages, runtime, core-engine, docs-consistency, setup
- 问题：治「quick 改断言重定义绿灯、静默删除他者变更的 implemented 决策语义」这类跨变更语义冲突，护栏用什么强制级别——advisory 注入（方案 A）、断言重写缺结构化理由即硬阻断 --done（方案 B）、还是全流程匹配引擎 file-keyed 全面改造（方案 C）？
- 答案：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。
- 否决理由：方案 B（硬阻断+专用 flag）——断言行检测是启发式（expect/assert token 集），v1 无误报校准数据，误报硬挡正常收尾（重构/格式化触碰断言行）比静默漏报更伤信任，且会产生「不声明 --files 绕行」的反向激励；方案 C（全流程 file-keyed 改造）——本次事故缺口在 quick，execute 已有关键词注入，scope 膨胀违反 YAGNI。
- 复潮条件：advisory 运行一段时间后若实测断言检测零误报且此类冲突仍发生，可升 warn→block（配置位留升级空间，不必二次变更基建）。
- normalized_requirement：CLI 能强制「被看见」，不能强制「被理解」——护栏职责是把跨变更语义承诺送到改代码的会话眼前，判断理由是否成立留给审查。
- 影响：src/decision-distill.js、src/knowledge-match.js、src/run/prompt.js、src/stages/quick.js、src/run/quick-audit.js、src/config-schema.js；新增测试。
- source: user
- evidence: 2026-09-11 事故分析评估对话——用户对三条建议落地形态的评估回复「干」批准实施；方案对比见 brainstorm step4。
- priority: P1

## D-002@v1 排查结论：ql-020 任务行是设计内行为；真缺陷是 quick --done 自动归档竞态（防护已落地，热修让位并行会话）
- 状态：confirmed
- 类型：definition
- 模块域：stages
- 问题：并行 quick 会话 ql-020（quick-c802bc83）把本变更登记为关联变更并在 tasks.md 追加任务行——是故障还是设计内？若有真缺陷如何处置？
- 答案：**任务行追加是设计内行为**（quick 启动契约：对每个关联变更 tasks.md 追加 `- [ ] <ql-id> <任务描述>`，stages/quick.js step1；关联本身是协作声明——两变更共享 decision-distill.js，ql-020 allowedFiles 含该文件），保留该行不覆盖，本变更任务追加其下。**真缺陷（quick-done-autoarchive-misfire 缺陷②，ql-20260819-010 只修了缺陷①）**：closeQuickLinkedChanges 阶段闸允许集含 brainstorm，stage_status=completed 闸只堵「brainstorm 完成→plan 开始」空窗——**brainstorm 进行中 + tasks.md 仅含 ql 行**（完整流程 plan 前无自有任务行，「isChangeTasksComplete 全勾」恒真空洞）时，关联 quick --done 勾掉 ql 行即触发在途变更被轻量归档注销。防护（本变更已落地）：写入自有未勾选 task-01..07 行——isChangeTasksComplete 恒 false 直至 execute/verify，彼时阶段不在允许集，竞态窗口关闭。
- 否决理由：立即热修 complete-handlers.js 闸门——该文件正被并行会话（变更名日期门禁批）持有未提交改动，AGENTS 规则 18 显式 pathspec 提交仍会夹带他者 hunk；且闸门重设计需独立信号（区分「僵尸骨架」与「在途变更」），值得专项变更而非热补丁。
- 复潮条件：并行会话提交 complete-handlers.js 后，以独立变更修闸门。候选信号（按侵入性升序）：①tasks.md 存在非 ql 前缀的自有任务行才允许「全勾=完成」判定（堵空洞真值）②stage_status=in_progress 一律不自动归档（僵尸判定收窄到「从未开始」）③归档动作前置 --wait 用户确认。
- normalized_requirement：tasks.md「全勾」对无自有任务行的骨架是空洞真值，不能作为变更完成判定依据。
- 影响：本变更 tasks.md（防护性任务行，兼四件套产物）；无 src 改动（闸门修复属后续独立变更）。
- source: user
- evidence: 2026-09-11 用户指令「先排查这个问题，不对的要先解决了」；guard.json（quick-c802bc83）linkedChanges/allowedFiles 字段；complete-handlers.js:1456-1520 闸门实现与 ql-20260819-010 缺陷①注释；时间线：decisions.md 14:01:23 → ql-020 startedAt 14:01:47.451+08:00（guard.json）。
- priority: P0
