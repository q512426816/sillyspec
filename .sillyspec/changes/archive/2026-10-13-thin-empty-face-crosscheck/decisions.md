---
author: flow-machine-draft
created_at: 2026-10-13T03:25:32.638Z
---
# 决策记录（Decisions）— 2026-10-13-thin-empty-face-crosscheck

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：误伤合法空面形态。三处防误伤设计——①剔除 .sillyspec/ 治理条目与 e.repo 已标注条目后才判「声明非空」；②纯跨仓规范标注空面降为 advisory；③签收留痕持久化（重跑不重复拦）。次风险：嫌疑判定放宽（主仓不存在即点名）在非空面分支也生效后，路径笔误（声明了不存在的路径但冻结面非空）会从「快照行计划未动」升级为告警点名——是增益不是回归（计划未动行本来就不可见地躺在快照里）。试过放弃的方案：①空面分支内做完整跨仓冻结+留档（重构 writeCloseTraceArtifacts 对空 ownFiles 的适配）——本变更面膨胀且 close-trace-freeze-integrity 的「空面不落伪完整 patch」设计承诺会被触碰，留纯跨仓空面为 advisory 点名+后续变更；②per-run flag 不落盘（与 --accept-dirty-gap 同款）——评审多轮重跑必重复阻断，选 flow-state 持久化；③把防呆告警同时升格为非空面阻断——非空面已有快照「计划未动」可见对账，告警足矣，阻断面保持最小。均否。
