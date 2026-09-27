---
author: flow-machine-draft
created_at: 2026-09-26T06:24:50.286Z
---
# 提案书（Proposal）— 2026-09-26-thin-check-cadence

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:5f0bb9d53f4a66e3362694da6a5c49fb71b8db973e0f2605bf5e3b4b5631d403:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-check-cadence 留痕重锚 -->
任务原话转写：动机/背景：thin-agent-tasks 已把「完成一个工作单元即勾一格」定为明文纪律，但全部 39 条 watcher 事件流零例外仍是收口前一拍 checked 0→N 一把全勾——纪律无收口提醒，per-task 时间戳与进度信号面持续失真。对齐既有「任务勾选缺失」advisory 模式（warn 不阻断，持续施压养成逐单元勾选习惯）。
成功标准：
- flow done 收口时，watcher 事件流存在 task-done 单拍跳 ≥2 格记录则输出勾选节奏 advisory（引用跳格证据与时刻，不阻断收口）
- 事件流文件缺失/无 task-done 事件/读取异常时静默跳过（best-effort fail-open，watcher 是观测旁路非真相源）
- 单拍跳格 <2（单任务变更或逐格勾选）不告警
- 跳格检测为纯函数并有单元测试（多格跳取最大、逐格不告警、无事件、坏 detail 容错）
- npm run test:core 与 npm run lint 实测全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:439a9d68e9c475c57bc6d375e5fe2af5524f349db0918adcf80175f92706f0c2:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-check-cadence 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. flow done 收口时，watcher 事件流存在 task-done 单拍跳 ≥2 格记录则输出勾选节奏 advisory（引用跳格证据与时刻，不阻断收口）
2. 事件流文件缺失/无 task-done 事件/读取异常时静默跳过（best-effort fail-open，watcher 是观测旁路非真相源）
3. 单拍跳格 <2（单任务变更或逐格勾选）不告警
4. 跳格检测为纯函数并有单元测试（多格跳取最大、逐格不告警、无事件、坏 detail 容错）
5. npm run test:core 与 npm run lint 实测全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:684523467821e99e81bb918604a3b8e6b3b227c8aaa28a3b1540233d8b3ab560:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-check-cadence 留痕重锚 -->
1. flow done 收口时，watcher 事件流存在 task-done 单拍跳 ≥2 格记录则输出勾选节奏 advisory（引用跳格证据与时刻，不阻断收口）
2. 事件流文件缺失/无 task-done 事件/读取异常时静默跳过（best-effort fail-open，watcher 是观测旁路非真相源）
3. 单拍跳格 <2（单任务变更或逐格勾选）不告警
4. 跳格检测为纯函数并有单元测试（多格跳取最大、逐格不告警、无事件、坏 detail 容错）
5. npm run test:core 与 npm run lint 实测全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
