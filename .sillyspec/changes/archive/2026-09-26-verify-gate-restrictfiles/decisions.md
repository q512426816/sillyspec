---
author: flow-machine-draft
created_at: 2026-09-26T01:19:54.275Z
---
# 决策记录（Decisions）— 2026-09-26-verify-gate-restrictfiles

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=restrictFiles 收窄后模块选择漏测（文件面解析错变更文件→选错模块子集）——与 quick 门同函数同风险面，quick 侧长期实证可接受；空清单防御分支保住「宁全量不假 skip」的 fail-closed 底线。死路：空清单也传（restrict []）——正是本变更要修的假 skip 形态的反面制造，弃。
