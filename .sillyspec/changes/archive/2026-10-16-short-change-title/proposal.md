---
author: flow-machine-draft
created_at: 2026-10-16T13:20:04.877Z
---
# 提案书（Proposal）— 2026-10-16-short-change-title

## 动机

任务原话转写：变更标题提炼为 30 字内自然断点短句
动机与背景
变更中心两类烂标题实证：完整变更恒显示变更名兜底（brainstorm proposal H1 是纯模板「提案书（Proposal）」，deriveTitleFromLinkedChange 放弃后无人兜底），轻量变更显示 50 字硬切残句（deriveChangeTitle 对 --input 首行超 50 字硬切加 …，纯靠 agent 自觉写短首行，本地 20 条实证 15 条不合格）。病根在工具侧标题推导，平台只忠实显示。

成功标准：
- 新增提炼函数：目标 20 字上限 30 字，优先在自然标点（。！？；：、，—等）处截断并剥尾部标点，无标点才硬切加 …，ASCII 小数点/千分位不误切
- 轻量道 flow start/resume/adopt 与完整流程 run initChange 的标题推导改走提炼（≤30 字），motiveFromInput 模块摘要 ≤50 口径不变
- deriveTitleFromLinkedChange 遇纯模板 H1 回退读 proposal「## 动机」首句过提炼；既有「无 H1 无动机 → 空串」契约不变
- 提炼被硬切时 flow 启动打一行软提示建议 --title，不阻断
- 既有测试 change-title-flow / motive-from-input / change-title-backfill 全绿，新增提炼函数测试含本次实证坏标题样本

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. 新增提炼函数：目标 20 字上限 30 字，优先在自然标点（。！？；：、，—等）处截断并剥尾部标点，无标点才硬切加 …，ASCII 小数点/千分位不误切
2. 轻量道 flow start/resume/adopt 与完整流程 run initChange 的标题推导改走提炼（≤30 字），motiveFromInput 模块摘要 ≤50 口径不变
3. deriveTitleFromLinkedChange 遇纯模板 H1 回退读 proposal「## 动机」首句过提炼；既有「无 H1 无动机 → 空串」契约不变
4. 提炼被硬切时 flow 启动打一行软提示建议 --title，不阻断
5. 既有测试 change-title-flow / motive-from-input / change-title-backfill 全绿，新增提炼函数测试含本次实证坏标题样本

## 成功标准（可验证）

1. 新增提炼函数：目标 20 字上限 30 字，优先在自然标点（。！？；：、，—等）处截断并剥尾部标点，无标点才硬切加 …，ASCII 小数点/千分位不误切
2. 轻量道 flow start/resume/adopt 与完整流程 run initChange 的标题推导改走提炼（≤30 字），motiveFromInput 模块摘要 ≤50 口径不变
3. deriveTitleFromLinkedChange 遇纯模板 H1 回退读 proposal「## 动机」首句过提炼；既有「无 H1 无动机 → 空串」契约不变
4. 提炼被硬切时 flow 启动打一行软提示建议 --title，不阻断
5. 既有测试 change-title-flow / motive-from-input / change-title-backfill 全绿，新增提炼函数测试含本次实证坏标题样本
