---
author: flow-machine-draft
created_at: 2026-10-05T23:27:56.476Z
---
# 决策记录（Decisions）— 2026-10-06-review-anchor-and-negation

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：① reviewedAgainst 伪造（评审员乱填 sha 绕过隔离）——信任层级与 verdict 同级（评审产物本就信任子代理如实填写，schema 校验形态不校验真伪；且填错 sha 的后果是多留一份过期评审，后续 review 子步 validate/P1 判定仍在，防线不单点依赖锚定）。② HEAD 短 sha 前缀碰撞（7 位起）——理论存在但与 git 自身缩写语义一致，碰撞后果同①不致命。 试过放弃：把裸「不」加进 NEGATED_CROSSTALK_RE 前缀词表——「不[0-8字]串台」会把「不排除串台」「不可能没有串台」等风险自认/双重否定误消解（⑥ 用例即反向锁定），放弃，取三字整词精确匹配。
