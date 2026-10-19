---
author: flow-machine-draft
created_at: 2026-10-19T08:09:39.076Z
---
# 决策记录（Decisions）— 2026-10-19-approve-gate-tick-nudge

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险是 approve 硬拒的误伤面：存量进行中变更（P1 之前建的）文档可能是旧骨架形态，被新门拒批会打断在途工作。对策：v1 轨走 verifyDesignRecordFilled 同口径、ledger 缺失 fail-open、brainstorm 豁免——三重降级保底；且拒批输出给全修复指引（一次给全，不靠二跑）。 - 放弃方案①：approve 校验加时序证据（spec_approved_at vs 首个 src 提交）——放弃理由：四路调查实证批量收口模式下 git 时间戳系统性说谎（批准恰在单提交前 12 秒 12/12「合规」假象），检查恒放行且 CLI 记录面无 src 编辑事件；完整时序只有 harness 层 PreToolUse 埋点可做，属独立决策的新工程。 - 放弃方案②：tick 硬拒（spec 面未齐禁止勾选）——放弃理由：B 模式（码先于 flow start 的倒推收尾）与既有「先勾后补文档」习惯会被误伤，且勾选证据链（token 提交）已由收口哨兵承担；advisory 达到提醒效果且零误伤。 - 放弃方案③：新写一套 approve 校验逻辑——放弃理由：done 门已有 verifyFlowDrafts 双轨校验与豁免口径（brainstorm/ledger），复用保证两面判定永远同源，新写必然漂移。
