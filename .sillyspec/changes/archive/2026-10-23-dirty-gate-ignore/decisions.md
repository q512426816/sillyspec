---
author: flow-machine-draft
created_at: 2026-10-22T23:48:21.539Z
---
# 决策记录（Decisions）— 2026-10-23-dirty-gate-ignore

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：仓主把真交付路径误配进忽略清单 → 真缺口静默漏审。对策：①前缀是显式仓主声明（与 module_gate_ignore 同治理等级）；②ℹ️ 留痕行每轮可见（配了什么、剔了几个可审计）；③文档口径「已知残渣面」写进键语义。放弃方案：①CLI 自动猜残渣（untracked 整目录/运行库模式启发式）——枚举路径内容违反零枚举红线且必误伤真交付，弃；②按「他侧活跃变更声明」自动放行——经查 collectFreezeFiles 的 split.own 切分已实现该语义（他侧声明的 dirty 本就不进 dirtyWarned），无增量可做，留现状。
