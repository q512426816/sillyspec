---
author: flow-machine-draft
created_at: 2026-09-27T00:40:47.845Z
---
# 决策记录（Decisions）— 2026-09-27-gate-face-binding-parity

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：faceOverride 旁路了快照 diff 的二次校验——若调用方面过声明（含未真改文件），动态子集可能多跑（宁多勿漏，方向安全）；权威面上游已过 foreign 归因收窄（splitOwnVsForeignDiffFiles），过声明面受双保险。次风险：brainstorm --done 追加槽改变 full 流程 requirements 形态，下游消费者（索引/对账）按 AGENT 槽注释扫描——槽是注释面不进指纹，verifyFlowDrafts 不校验 full 侧。放弃方案：快照锚 baseline commit（改 createGateSnapshot 全局面，波及 verify 门与 quick 通道）——影响面大且 thin 权威面已现成，不值。
