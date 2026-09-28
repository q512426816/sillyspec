---
author: flow-machine-draft
created_at: 2026-09-28T14:49:45.180Z
---
# 决策记录（Decisions）— 2026-09-28-sentinel-mirror-waiver

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：风险：①agent 故意不覆写任务面借镜像豁免绕 per-task 证据——镜像任务即成功标准镜像，其交付由实测门/patch/review 整体背书，绕的是重复记账不是交付门（守卫语义不弱化：覆写任务仍拒收无证据勾选，Drill 2 实证）；②基线快照缺失（旧变更/快照失败）→ fail-safe 全量从严（旧行为）；③比对经行分割与 trim 归一——行尾/首尾空白漂移仍判镜像（宽松面有界：任何内容改写即判非镜像从严）。死路=给镜像任务也造 per-task 证据仪式（改写任务+amend token——本会话三连 workaround 实证是纯仪式）。退役判据=镜像豁免面出现真实假勾选逃逸案例（实测门绿但成功标准未兑现且无 review 拦截）。
