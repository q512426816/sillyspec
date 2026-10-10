---
author: flow-machine-draft
created_at: 2026-10-10T00:43:10.552Z
---
# 设计记录（Design Record）— 2026-10-10-brainstorm-skill-title

## 做法概述

flow skill 已有「变更标题（面板显示用）：总结一句中文概括，≤50 字、建议 ~20 字」指引（.claude/skills/sillyspec-flow/SKILL.md:27），brainstorm skill 未同步。头脑风暴道的面板标题机制与 flow 道不同：CLI（src/quicklog.js deriveTitleFromLinkedChange，run/complete.js 阶段完成/单步 --done 时调用）从变更产物 proposal.md / design.md 的首个 `#` H1 提取——剥「提案书（Proposal）—」「设计文档（Design）—」固定前缀后取简述写入 changes.title。方案：在 brainstorm skill 的铁律段加一条，把字数口径（≤50 字、建议 ~20 字）与提取来源（proposal/design 首行 H1）写明，agent 写四件套时即按口径组织 H1 简述。纯 skill 文档改动，不触 src/test，不改 CLI 行为。

## 接口契约

无代码接口变化。对外可见面仅 .claude/skills/sillyspec-brainstorm/SKILL.md 增加一条指引文案（该目录是 init 的 skills 分发源 src/init.js:488，新项目 init 后拿到新版；存量项目按既有机制不自动覆盖）。CLI 提取标题的现有逻辑（前缀剥除/破折号取段）不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用——纯静态文档，无事件序。
2. 并发写：skill 文件由 git 管理，与本变更并行修改的会话走 git 冲突面；变更面仅此一文件、显式 pathspec 提交，不夹带他会话文件。
3. 切换/生命周期：中断恢复以 tasks.md 勾选为准，文档改动无中间态（要么改要么没改）。
4. 作用域：指引只约束 brainstorm skill 的读者（agent），flow/quick 道各有自己的标题写入点（--input 首行 / --title），互不串台。

## 风险与死路

最大风险：指引与 CLI 实际提取规则不一致（如 agent 误以为另有 --title 参数）。对策：文案锚定真实机制（H1 前缀剥除后取简述），并保留 design.md 固定格式 `# 设计文档（Design）— <简述>` 的既有 CLI 强制要求不重复改写。放弃方案：改 src/stages/brainstorm.js 的 step prompt 同步加字数口径——用户诉求明确限定在 skill 层，CLI prompt 层不在本变更面（后续需要可另起变更）。
