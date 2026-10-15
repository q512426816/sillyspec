---
author: flow-machine-draft
created_at: 2026-10-15T13:50:01.059Z
---
# 决策记录（Decisions）— 2026-10-15-eval-b-arm-turn-budget

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 风险：B 臂重跑仍可能撞 900s timeout（若流程后段轮均耗时上升）。缓解：timeoutMs 与 maxTurns 解耦，实测信号驱动再调；本轮 B 臂重跑结果无论 pass/fail/error 都是有效测量（不再是环境缺陷）。 - 死路（已废弃话术）：「小任务走 quick 模式」——quick 通道 v3.30.0 退役后该话术即失真，B 臂 agent 可能花轮次对账「quick 不存在」；修正为现行协议表述。 - **重跑实测回填（收口前证据）**：轮帽 120 下 B 臂重跑 PASS——486.6s / 40 轮 / $2.25（对照臂 A：93.5s / 16 轮 / $0.58，双臂 pass、permission_denials 双侧为空）。60 轮掐断点与「产物已就绪、差收口轮」的判断相符（40 轮完成全流程）。900s timeout 未触墙。有效测量成立：本变更与 adapter-permissions 两项配置修复后，评测管道产出首个有效 A/B 对（n=1，双臂 100%，Δ=0±宽 CI——探针区分力需更多样本，见 eval 域 FR）。
