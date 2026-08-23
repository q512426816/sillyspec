---
author: qinyi
created_at: 2026-08-23T21:10:00+08:00
---

# 提案（Proposal）— deepseek-harness 实践落地：决策生命周期 + 轻量 postmortem + 证据匹配检查

## 背景与动机

对 deepseek-ai/deepseek-harness（1.3 万提交、1,484 篇带生命周期 Agent Note、编号 postmortem、「本地轻 CI 重」检查哲学）的代码管理做了全量分析。经代码实证比对，sillyspec 存在三个真实缺口：

1. **决策记录「归档即死亡」**：brainstorm 产出的 decisions.md（D-xxx@vN）归档后进 archive/ 冷藏，knowledge/ 无决策维度、无 rejected 留痕——「为什么」的半衰期问题，同一问题换 agent 重新踩坑。
2. **postmortem 无结构**：quicklog 根因是自由文本，无护栏落点、无证据引用；agent-session-log（8 种 harness 会话日志探测）这个证据源无人消费。
3. **检查选择粗粒度**：test_strategy 实际只有 full/module 两值（skip 声明未接线，配置后跑全量），不按变更面选择检查。

## 目标

见 design.md G1-G4：决策提炼进活跃库 + rejected 防复潮 + behind 复核（G1/G2）；quicklog 根因四子字段 + 证据引用 + 护栏回流（G3）；verify 按变更面选检查 + skip 接线 + evidence-auto（G4）。

## 方案概述（方案C-分期混合，用户 2026-08-23 选定）

- **W1 决策生命周期**：decisions.md 记录契约扩展四字段（锚点/模块域/否决理由/复潮条件，决策产生时写入）→ archive 新增纯函数「决策提炼」步骤 → knowledge/decisions/ 活跃库 → knowledge-match 防复潮注入 → docs-check advisory 规则（锚点校验 + behind 复核，复用 docs-debt 口径）。
- **W2 轻量 postmortem**：quicklog 根因块嵌套四子字段（- 现象/根因/护栏/证据，列表行形态不破坏顶层标签边界）+ quick.js 警告文案修正 + verify/doctor 触发提示 + 护栏回流 known-issues。
- **W3 证据匹配检查**：verify 检查选择指引注入 + test_strategy 枚举扩 skip 接线/evidence-auto + _globalGuardrails「不重复已通过检查」原则。

## 非目标（不在范围内）

- `sillyspec decisions` / `sillyspec postmortem` 一等命令（二期，视 dogfood 使用频率再定）
- status 命令的决策待复核展示（二期；doctor 先行）
- 双语文档体系、100% 覆盖率门禁、AGENTS.md 单源（SKILL 体系已等价）
- 分支前缀编码任务来源（另立变更）
- 决策记录进 SQLite（文件即真相，D-002@v1）
- postmortem 编号目录 knowledge/postmortems/（二期命令化时再建）

## 收益

- 归档后的决策知识存活并可被后续 brainstorm 机械命中（防复潮），对标 harness implemented-notes-stay-current。
- agent 失败的结构化复盘闭环（证据→根因→护栏→回流），激活闲置的 agent-session-log 证据链。
- 检查按证据面选择，减少无意义全量测试；skip 声明语义兑现。

## 风险概述

R-01 步骤插入兼容（实证已成立+回归测试）、R-02 决策库冷启动（dogfood 回填种子）、R-03 quicklog 解析冲突（嵌套行形态规避+测试锁定）、R-07 skip 接线行为变化（CHANGELOG/doctor 提示）。详见 design.md 风险登记。
