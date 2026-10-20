---
author: flow-machine-draft
created_at: 2026-10-20T03:12:50.264Z
---
# 决策记录（Decisions）— 2026-10-20-distill-abnormal-upgrade-fix

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险=存量行为翻转让在途变更意外升厚：needsWait 场景此前静默、现在真升厚，若有在途变更恰好带缺字段 rejected 条目，收口会突然走厚档仪式。自限：needsWait 场景本身是决策质量缺陷（字段必填契约早有），升厚留人工裁决正是协议声明过的意图；且本仓当前在途变更（仅本条）无该形态。放弃的方案：a) 只删 rejected 幽灵分支、needsWait 判定改为 `typeof === 'string'` 内联不提取——判定逻辑与返回值契约耦合，留在 flow.js 下次契约变化还会漂移，提取到产出方单一源同文件才闭环；b) needsWait 时阻断收口（exit 非零）——把「留人工裁决」做成硬阻断违背原设计语义（升厚后厚档流程本身就是人工裁决通道，archive 子步仍执行），且在途半态会卡死在 distill。
