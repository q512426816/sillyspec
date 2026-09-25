---
author: flow-machine-draft
created_at: 2026-09-25T12:36:53.021Z
---
# 决策记录（Decisions）— 2026-09-25-fr-governance-sweep

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：最大风险=承接翻链失败（承接 id typo/解析形态不符）→ distill warnings 收集不阻断归档，旧条目保持 active（知识漂移持续）——收口输出可观测，失败则按 warning 提示修正后重跑。次风险=null 分径收紧后，历史上依赖「patch 失败→豁免」路径的变更将进评审（成本上升、方向正确——fail-closed）。死路：手改 knowledge/fr/runtime.md 翻状态——机器契约文件（勿手改），弃；必须走承接行→distill 翻链的正规通道。
