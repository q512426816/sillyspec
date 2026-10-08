---
author: flow-machine-draft
created_at: 2026-10-08T16:24:25.004Z
---
# 提案书（Proposal）— 2026-10-08-explore-knowledge-graph

## 动机

任务原话转写：explore 探索模式接入知识图谱查询能力，让探索结论锚定真实关系面。

动机与背景：
explore 是 1 步只读自由探索阶段（src/stages/explore.js），当前调查手段只有 rg/ls/cat 文本考古——话题涉及影响面/历史决策/需求谱系时，agent 看不到已被否决的方案、FR 取代链、变更交付面这些结构化事实，探索结论靠词面拼凑。本仓已有只读图查询面 sillyspec knowledge graph（impact/neighbors/path/summary/orphans/dangling，全 JSON 出口，2026-10-08-knowledge-graph 落地）——explore 应当把它纳入调查兵器库，让「探索更真实」：影响面问题走 impact 多跳闭包、方案比较先查 rejected 决策防复潮、需求谱系沿 supersedes 链走。技能卡 .claude/skills/sillyspec-explore/SKILL.md（init 拷贝源）同步补该能力段。

成功标准：
- src/stages/explore.js 操作清单含知识图谱查询项：影响面/历史决策/需求谱系类话题优先 graph 命令（impact/neighbors/path/summary 用例与场景各一句），并声明只读姿态不变（graph 命令全只读）
- docs/prompt/_extract.mjs 重跑后 explore.md prompt 正文与 _extracted.json 逐字一致（机械提取保真纪律）
- .claude/skills/sillyspec-explore/SKILL.md 补「知识图谱查询」能力段（何时用/用哪些命令/防复潮提示）
- 全量测试与 lint 零回归（output-step-render 等钉 explore prompt 的测试面核对）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. src/stages/explore.js 操作清单含知识图谱查询项：影响面/历史决策/需求谱系类话题优先 graph 命令（impact/neighbors/path/summary 用例与场景各一句），并声明只读姿态不变（graph 命令全只读）
2. docs/prompt/_extract.mjs 重跑后 explore.md prompt 正文与 _extracted.json 逐字一致（机械提取保真纪律）
3. .claude/skills/sillyspec-explore/SKILL.md 补「知识图谱查询」能力段（何时用/用哪些命令/防复潮提示）
4. 全量测试与 lint 零回归（output-step-render 等钉 explore prompt 的测试面核对）

## 成功标准（可验证）

1. src/stages/explore.js 操作清单含知识图谱查询项：影响面/历史决策/需求谱系类话题优先 graph 命令（impact/neighbors/path/summary 用例与场景各一句），并声明只读姿态不变（graph 命令全只读）
2. docs/prompt/_extract.mjs 重跑后 explore.md prompt 正文与 _extracted.json 逐字一致（机械提取保真纪律）
3. .claude/skills/sillyspec-explore/SKILL.md 补「知识图谱查询」能力段（何时用/用哪些命令/防复潮提示）
4. 全量测试与 lint 零回归（output-step-render 等钉 explore prompt 的测试面核对）
