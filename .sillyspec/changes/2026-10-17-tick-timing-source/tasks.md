---
author: flow-machine-draft
created_at: 2026-10-16T16:30:30.520Z
---
# 任务注册表（Tasks）— 2026-10-17-tick-timing-source

- [x] task-01: 工件定稿——requirements 四条 FR 行为句+测试绑定、design 四节作答+文件变更清单、tasks 改写为工作分解（本格）
- [x] task-02: detectTickTiming 纯函数落 src/sentinel-assertions.js（判定序 no-ticks/single/no-anchor/spread/concentrated，簇窗 120s、存活比 10，纯函数零 IO）+ test/tick-timing-source.test.mjs 纯函数用例族（含阈值覆写与快变更放行）
- [x] task-03: flow.js 接线——哨兵段前置 _tickObs 共享观测（事件流+侧车一次读取）、旧 git 时点判定块整体退役换 detectTickTiming（节奏门检出时让位；no-ticks 教学行；spread 确认行）、勾选节奏门改消费共享观测（行为等价仅前移）+ e2e：侧车时戳分散+tasks.md git 压扁形态 → 无一把勾警告；侧车集中短窗 → 末尾集中 advisory
- [ ] task-04: task-tick.js ticked 回显——现成提交命令模板（消息占位带 task-NN、pathspec 含 tasks.md 与 task-ticks.jsonl）+ 已勾≥2 格且 tasks.md 零 git 提交时未入库提醒（best-effort：git 不可用只给命令）+ test/task-tick.test.mjs 断言
- [ ] task-05: 三处文案消歧（flow start 横幅勾选证据行+交付纪律行、brainstorm 收编教学行、任务未全勾拒收行——「对应提交」=消息带 task-NN 且 pathspec 含 tasks.md 同一提交入库）+ 受影响既有断言对齐
- [ ] task-06: 全量 npm test 0 失败 + npm run lint 过（含新用例族）
