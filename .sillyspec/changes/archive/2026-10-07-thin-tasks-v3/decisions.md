---
author: flow-machine-draft
created_at: 2026-10-07T07:33:39.689Z
---
# 决策记录（Decisions）— 2026-10-07-thin-tasks-v3

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：移除镜像豁免后，存量在途变更（tasks.md=镜像面、agent 已一把勾、区间提交无 token）在升级后收口会从放行变拒收——属预期收紧（假完成主张本就该拦），出口是补 token 提交或 --allow-batch-tick。次风险：agentic 行为对文案变化的适应性——横幅契约若仍埋在长输出里，逐格勾依旧靠自愿；本变更不动 D-007（中间零必需交互），接受该边界（节奏门+哨兵统一判据已把「一把勾」的账算清）。试过放弃：watcher 轮询间隔调小/开 fs.watch——治标（合并概率下降不归零）且 watcher 进程面改动大；放弃。另试过：tasks.md 由 agent 在 spec 断点必写（机器不再预填）——违反「工件回填轮=0」哲学且断点无机器门可验「写没写」，放弃，保留机器种子+自由改写。
