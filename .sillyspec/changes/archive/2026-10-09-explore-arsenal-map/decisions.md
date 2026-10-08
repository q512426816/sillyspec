---
author: flow-machine-draft
created_at: 2026-10-08T17:34:57.049Z
---
# 决策记录（Decisions）— 2026-10-09-explore-arsenal-map

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：映射行内塞多命令（关系面一行含 impact/neighbors/path/summary 四命令）信息密度高——单行过长可能被 agent 扫读跳过。缓解：行内用顿号分层（主命令 impact 打头、推理链与健康度退居从句）；钉子测试锚串保证四命令不丢。旧版 CLI（<3.33）项目跑新兵器命令报 unknown subcommand 自然回退 rg（fail-soft，与 graph 兵器同款既裁边界）。放弃的方案：兵器逐条加操作项（search/status 各一项）——弃，清单会回到 9 项且场景与兵器割裂；CLI 侧预取注入（{ARSENAL_FACTS} 类占位符）——弃，探索话题不可预知，全量预取浪费且复刻知识注入面。
