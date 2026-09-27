---
author: flow-machine-draft
created_at: 2026-09-26T06:24:50.288Z
---
# 需求规格（Requirements）— 2026-09-26-thin-check-cadence

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 勾选节奏 advisory 输出
Given 本变更收口（flow done ledger 子步）时 watcher 事件流存在 task-done 事件单拍跳 ≥2 格
When 收口执行到 ledger 子步「任务勾选缺失」advisory 之后
Then console.warn 输出勾选节奏 advisory（引用跳格 detail 与事件时刻、规范动作指引），不阻断收口

### FR-02: 观测旁路缺席静默
Given watcher 事件流文件缺失、无 task-done 事件、或读取过程抛异常
When 收口执行同一位置
Then 静默跳过（无输出、异常不外泄、收口照常推进）

### FR-03: 逐格勾选不告警
Given 事件流中全部 task-done 单拍跳格均 <2（含单任务变更 0→1）
When 收口执行同一位置
Then 不输出勾选节奏 advisory

### FR-04: 跳格检测纯函数与单测
Given detectBatchCheckCadence(events) 为无副作用纯函数
When 输入多格跳/逐格/无事件/坏 detail 的事件清单
Then 返回最大跳格记录（含 from/to/detail/ts）或 null，行为由 test/sentinel-rules.test.mjs 新增用例钉住

### FR-05: 套件实测全绿
Given 本变更触及 src/ 与 test/
When 运行 npm run test:core 与 npm run lint
Then 全部通过
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: flow done 收口时，watcher 事件流存在 task-done 单拍跳 ≥2 格记录则输出勾选节奏 advisory（引用跳格证据与时刻，不阻断收口）
FR-02: 事件流文件缺失/无 task-done 事件/读取异常时静默跳过（best-effort fail-open，watcher 是观测旁路非真相源）
FR-03: 单拍跳格 <2（单任务变更或逐格勾选）不告警
FR-04: 跳格检测为纯函数并有单元测试（多格跳取最大、逐格不告警、无事件、坏 detail 容错）
FR-05: npm run test:core 与 npm run lint 实测全绿
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/sentinel-rules.test.mjs「detectBatchCheckCadence」用例组：多格跳（0→8）返回证据记录（FR-01 判定面）；advisory 渲染是接线层 console.warn，循「任务勾选缺失」advisory 先例不测终端输出

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/sentinel-rules.test.mjs：空事件清单/无 task-done 事件返回 null（判定面）；文件缺失路径走 readWatcherEvents 既有 exists:false 语义（test/watcher-alerts.test.mjs 已钉，不重复）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/sentinel-rules.test.mjs：0→1 单任务与 0→1、1→2、2→3 逐格序列均返回 null

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/sentinel-rules.test.mjs「detectBatchCheckCadence」用例组全组（坏 detail 容错/最大跳格选取/字段完整性）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：套件本身即验证——commands.test/lint 亲测是收口门执行动作，无独立用例可写
