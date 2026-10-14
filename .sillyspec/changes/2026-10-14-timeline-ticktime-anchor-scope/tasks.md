---
author: flow-machine-draft
created_at: 2026-10-14T08:05:40.487Z
---
# 任务注册表（Tasks）— 2026-10-14-timeline-ticktime-anchor-scope

- [x] task-01: task-tick 侧车写面——runTaskTick 翻格成功分支追加 task-ticks.jsonl（{ts,task,source:'task-tick'}，appendFileSync；already 零追加；写失败仅告警不阻断）+ test/task-tick.test.mjs 三用例（留痕/幂等零追加/写失败不阻断）跑绿
- [ ] task-02: timeline 读面与接线——loadChangeTasks 读侧车 tickLog（坏行跳过/同任务取最早/缺失空数组）；renderTimeline/renderBakedTimeline 新 tickLog 参三级时刻（侧车精确无 ≈ > 推断 ≈ > ?）+ 表头脚注诚实注同步；index.js watcher timeline 与 complete-handlers bakeArchiveTimeline 透传 + watcher-timeline/archive-timeline-bake 用例跑绿
- [ ] task-03: 提交锚按变更名收敛——resolveCommitAnchors 增可选 change 参算 sameChange（全消息含变更名，缺省 true 向后兼容）；renderTimeline 任务锚定只取 sameChange；事件轴 commit 行不变 + watcher-timeline 跨变更误锚回归用例（litellm 案例形态）跑绿
