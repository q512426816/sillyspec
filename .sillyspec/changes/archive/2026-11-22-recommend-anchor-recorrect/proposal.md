---
author: flow-machine-draft
created_at: 2026-11-22T15:45:33.582Z
---
# 提案书（Proposal）— 2026-11-22-recommend-anchor-recorrect

## 动机

任务原话转写：提问推荐带依据锚与中途纠正协议

动机与背景：mattpocock 链路实测沉淀（retro-report.md 感知 1/3）：推荐答案机制放大调研深度也放大浅度——无一手依据的推荐会被用户识破（Q1 实证）；用户中途纠正语义时缺低成本重对齐协议（两次纠偏实证，wait-what 形态）。另有 mechanical 小修随带：_extract.mjs 把 demo 目录绝对路径写进金档（票 04/05 各撞一次路径噪音）。

成功标准：
- brainstorm 提问分型协议（brainstorm.js:114 段）新增纪律：决策类问题的推荐必须附一手依据锚（file:line/文档路径/盘点产出），无依据时不给推荐降级为开放问
- 全局交互询问指引段（run/prompt.js waitOptions 注入处）新增中途纠正协议：用户表达没听懂/纠正方向时，停当前动作，用词汇基准与简化语言复述理解的目标，确认后再继续
- _extract.mjs demo 变更目录路径锚定为仓相对路径，任意目录再生产出零路径噪音 diff
- 金档再生一致（brainstorm.md/_extracted.json 同步），prompt-golden 与既有提示词测试零回归

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. brainstorm 提问分型协议（brainstorm.js:114 段）新增纪律：决策类问题的推荐必须附一手依据锚（file:line/文档路径/盘点产出），无依据时不给推荐降级为开放问
2. 全局交互询问指引段（run/prompt.js waitOptions 注入处）新增中途纠正协议：用户表达没听懂/纠正方向时，停当前动作，用词汇基准与简化语言复述理解的目标，确认后再继续
3. _extract.mjs demo 变更目录路径锚定为仓相对路径，任意目录再生产出零路径噪音 diff
4. 金档再生一致（brainstorm.md/_extracted.json 同步），prompt-golden 与既有提示词测试零回归

## 成功标准（可验证）

1. brainstorm 提问分型协议（brainstorm.js:114 段）新增纪律：决策类问题的推荐必须附一手依据锚（file:line/文档路径/盘点产出），无依据时不给推荐降级为开放问
2. 全局交互询问指引段（run/prompt.js waitOptions 注入处）新增中途纠正协议：用户表达没听懂/纠正方向时，停当前动作，用词汇基准与简化语言复述理解的目标，确认后再继续
3. _extract.mjs demo 变更目录路径锚定为仓相对路径，任意目录再生产出零路径噪音 diff
4. 金档再生一致（brainstorm.md/_extracted.json 同步），prompt-golden 与既有提示词测试零回归
