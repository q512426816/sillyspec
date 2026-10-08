---
author: flow-machine-draft
created_at: 2026-10-08T17:28:02.254Z
---
# 决策记录（Decisions）— 2026-10-09-brainstorm-impact-antirevival

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：impact 闭包比 scopeRecall 宽（深度 2 + 传递例外 + change-modules 反查），模块域键在热区模块（如 core-engine）上可达条目多——回显前 5 条封顶沿用，但"无关 rejected 挤占席位"的噪音面变大。缓解：已回应不重弹过滤沿用（evidence 回应过即静默）；真实仓实测 9 条可达属合理密度；若实测噪音超标，收窄方向是把 impact 深度对 gate 场景降为 1 或按 impactKey 分组限额——留运行时证据再动。放弃的方案：拓 scopeRecall 吃模块键（模块→文件→决策两跳，丢失 change-modules/supersedes 可达面且要改检索器签名）；解析 --output 提取路径入键（违 D-004 自由文本纪律，弃）。
