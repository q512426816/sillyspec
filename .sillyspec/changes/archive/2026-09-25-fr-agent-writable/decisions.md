---
author: flow-machine-draft
created_at: 2026-09-25T05:08:19.729Z
---
# 决策记录（Decisions）— 2026-09-25-fr-agent-writable

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：风险=存量在途变更的 requirements.md 是旧格式（机器指纹段）——verifyRequirementBindings 对旧格式仍走原绑定槽检测（FR 区标记不存在时不加 FR 空白项），向后兼容。死路=保留机器指纹段+排除 edit_ratio——绕圈修标不修本（amend 摩擦仍在），agent 直写才是正解。
