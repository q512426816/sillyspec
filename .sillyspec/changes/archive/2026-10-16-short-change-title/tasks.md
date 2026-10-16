---
author: flow-machine-draft
created_at: 2026-10-16T13:20:04.877Z
---
# 任务注册表（Tasks）— 2026-10-16-short-change-title

- [x] task-01: 新增提炼函数：目标 20 字上限 30 字，优先在自然标点（。！？；：、，—等）处截断并剥尾部标点，无标点才硬切加 …，ASCII 小数点/千分位不误切
- [x] task-02: 轻量道 flow start/resume/adopt 与完整流程 run initChange 的标题推导改走提炼（≤30 字），motiveFromInput 模块摘要 ≤50 口径不变
- [x] task-03: deriveTitleFromLinkedChange 遇纯模板 H1 回退读 proposal「## 动机」首句过提炼；既有「无 H1 无动机 → 空串」契约不变
- [x] task-04: 提炼被硬切时 flow 启动打一行软提示建议 --title，不阻断
- [x] task-05: 既有测试 change-title-flow / motive-from-input / change-title-backfill 全绿，新增提炼函数测试含本次实证坏标题样本
