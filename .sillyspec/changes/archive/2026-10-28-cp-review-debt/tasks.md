---
author: flow-machine-draft
created_at: 2026-10-28T05:46:49.189Z
---
# 任务注册表（Tasks）— 2026-10-28-cp-review-debt

- [x] task-01: RESET_SPECS 目录名改 :(glob)**/<dir> 任意深度形态 + 用例（packages/x/node_modules、apps/web/dist 小护栏阈值下 created 且树不含嵌套路径）——跑绿
- [x] task-02: change-delete 失败臂用例（.git/refs/sillyspec/checkpoints/<cn>.lock 占位 → ok:true + warnings 含 ref 删除失败 + 目录照常移除）——跑绿
- [x] task-03: isCheckpointInChain 无上限校验 + restoreCheckpoint 接线 + CLI 尾行 200 帽注明；用例（链内档通过/主历史普通提交仍拒）——跑绿
- [x] task-04: 全套回归（shadow-checkpoint 全量 + change-delete 8 用例）+ lint 绿
