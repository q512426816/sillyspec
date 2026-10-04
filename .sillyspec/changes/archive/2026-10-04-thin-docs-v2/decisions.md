---
author: flow-machine-draft
created_at: 2026-10-04T15:48:16.126Z
---
# 决策记录（Decisions）— 2026-10-04-thin-docs-v2

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：approve 可被同机 agent 自己跑（CLI 无法区分键入者）——门的价值是仪式+留痕（谁/何时批）+评审抽查+平台侧核对，非绝对防伪；实证代批泛滥时的升级路径是把 approve 挂平台人工确认通道。次风险：v2 的 FR 质量从机器兜底退回 agent 撰写+强度词门——占位句/腰斩消失但烂行为句仍可能过门（强度词在句≠语义好），对冲是评审抽查与归档 FR 索引面。试过放弃：①在途 v1 变更全量迁移 v2（否决——改写 agent 正在作答的文档破坏书写面信任，双轨成本更低）；②openspec 式 WHEN/THEN bullet 场景行（否决——fr-index 归档解析认 Given/When/Then 行形态，收敛厚道格式零索引改动）；③断点门做成 advisory（否决——advisory 断点在 0/12 勾选事故已实证无牙，护栏#2 零 prompt 劝说）。
