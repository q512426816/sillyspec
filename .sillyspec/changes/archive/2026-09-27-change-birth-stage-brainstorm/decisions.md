---
author: flow-machine-draft
created_at: 2026-09-27T13:23:16.952Z
---
# 决策记录（Decisions）— 2026-09-27-change-birth-stage-brainstorm

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：迁移把「从未进主流程」的存量行改判为 brainstorm 后，滞留提示语义从「停在代码扫描」变「停在需求探索」——展示层措辞变化，用户已裁定接受（起步就是头脑风暴）。放弃的方案：① 从 VALID_STAGES/STAGE_ORDER 里整体移除 scan——放弃，scan 阶段本身（项目级扫描操作）合法存在，牵动 stage-contract/consistency 面太大且非本缺陷根因；② 只改出生默认不做存量迁移——放弃，存量误导行（governance-rpc-actions 类）会一直显示到归档才消失，修复不完整。
