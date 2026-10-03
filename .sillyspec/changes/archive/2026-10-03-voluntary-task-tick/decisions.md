---
author: flow-machine-draft
created_at: 2026-10-03T07:13:04.030Z
---
# 决策记录（Decisions）— 2026-10-03-voluntary-task-tick

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：代勾被误读为「机器替 agent 撒谎」（勾了 agent 没勾的格）。边界已钉死：仅镜像未认领面（与机器稿逐字相同=agent 从未认领该任务面）且有交付证据才代勾，时间线/输出显式标注「收口代勾」来源；agent 已覆写任务面（认领过）绝不代勾——那是真漏账，走 advisory。次风险：存量在途变更（本变更之前 start 的）flow-state 无 mirror_autotick 键——重入走原判据（向后兼容零迁移）。 死路（已试弃）：① done 门硬拒收未认领面（用户裁决否——打回重做循环，agent 应对是补票行为而非纪律）；② per-task 时序配对硬门（2026-09-29-flow-task-heartbeat 弃案1 沿用否决——误伤一提交多 token 合法场景）；③ 中途强制心跳协议调用（违 D-007 thin 两调用形状）。
