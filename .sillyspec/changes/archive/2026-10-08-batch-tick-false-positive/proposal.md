---
author: flow-machine-draft
created_at: 2026-10-08T08:12:53.293Z
---
# 提案书（Proposal）— 2026-10-08-batch-tick-false-positive

## 动机

任务原话转写：收口硬门「单拍勾选拒收」误伤修复。

动机与背景：
2026-10-08-knowledge-graph 收口时哨兵报「一拍勾选 checked 0→8」拒收，但事件流实证是六次独立 task tick（source:task-tick，跨 25 分钟逐格 0→1…5→6）。根因两处叠加：
① src/watcher.js:343——任意 STAGE_FILES 文件「首现且含勾选框」即发 task-done 事件 checked 0→N；brainstorm 预段/厚道 plan 段中 design.md 中途物化是常态路径，自审清单天然预勾（8 个 [x] 断言）→ 幻影事件（实测：ts 13:51:48 stage=design checked 0→8）。
② src/sentinel-assertions.js detectBatchCheckCadence 消费事件流不过滤 stage——design 段的 0→8 不在 CLI tick 去重面（cliTargets={1..6}）内 → 判单拍跳 8 格拒收。
本次被迫 --allow-batch-tick 旁路留痕（假旁路面污染平台时间线）。

成功标准：
- watcher.inferEvents：非 tasks 阶段文件（design.md 形态）首现带预勾框不再发 task-done；tasks.md 首现带已勾格仍发（保住「tasks.md 整卡预勾创建」的真实捕捉面）
- detectBatchCheckCadence 只消费 stage='tasks' 事件（纵深防御）；混流（design 0→8 + 六次独立 tick）判无单拍跳；tasks 段无 CLI 覆盖的单拍大跳仍可检出
- 既有 watcher/sentinel 相关测试全绿 + 新增误伤场景回归测试

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. watcher.inferEvents：非 tasks 阶段文件（design.md 形态）首现带预勾框不再发 task-done；tasks.md 首现带已勾格仍发（保住「tasks.md 整卡预勾创建」的真实捕捉面）
2. detectBatchCheckCadence 只消费 stage='tasks' 事件（纵深防御）；混流（design 0→8 + 六次独立 tick）判无单拍跳；tasks 段无 CLI 覆盖的单拍大跳仍可检出
3. 既有 watcher/sentinel 相关测试全绿 + 新增误伤场景回归测试

## 成功标准（可验证）

1. watcher.inferEvents：非 tasks 阶段文件（design.md 形态）首现带预勾框不再发 task-done；tasks.md 首现带已勾格仍发（保住「tasks.md 整卡预勾创建」的真实捕捉面）
2. detectBatchCheckCadence 只消费 stage='tasks' 事件（纵深防御）；混流（design 0→8 + 六次独立 tick）判无单拍跳；tasks 段无 CLI 覆盖的单拍大跳仍可检出
3. 既有 watcher/sentinel 相关测试全绿 + 新增误伤场景回归测试
