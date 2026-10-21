---
author: flow-machine-draft
created_at: 2026-10-21T00:58:07.825Z
---
# 决策记录（Decisions）— 2026-10-21-overview-thin-stage

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险：`STAGE_LABELS` 新增 thin 键被未发现的消费方当阶段清单遍历，产生幽灵阶段——已全源码核查无 `Object.keys/entries/values(STAGE_LABELS)` 用法，且 `VALID_STAGES`（阶段表 INSERT/迭代唯一源）不动，级联与 validate 零影响；既有测试面（收口实测）兜底。 - 放弃①daemon 侧后处理（SillyHub daemon 读 flow-state 覆写 current_stage）：把 CLI 的 flow-state 格式知识复制进 daemon 仓，且 conflictSnapshot progress 条目（比对弹窗本地侧）同样源自 CLI envelope，daemon 后处理要修两处——CLI 单点修一处收全链，弃。 - 放弃②overview 对 thin 省略 steps/stages 键：daemon asCount 把缺省强转 0/0，省略对下游显示是 no-op，纯增 envelope 契约噪音（steps 从必有变可有，backend schema 跟动），弃。 - 放弃③把 'thin' 加入 VALID_STAGES/阶段表：thin 不走阶段机（sync 侧注释明示口径），建空阶段行会扰动 completeStage 级联与 consistency 校验，弃。
