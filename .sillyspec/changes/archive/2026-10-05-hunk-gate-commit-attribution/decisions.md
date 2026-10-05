---
author: flow-machine-draft
created_at: 2026-10-05T14:59:52.908Z
---
# 决策记录（Decisions）— 2026-10-05-hunk-gate-commit-attribution

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：提交 message 后缀被伪造（本变更交付冒他侧名）→ 误判他侧归因放过未声明文件——但该伪造同时会骗过 patch 冻结的同一口径（filterCommittedFace 先于此门存在且已裁决：按提交事实归属是已发生的提交事实不是声明抢文件，sentinel-evidence-freeze⑤ 界定），本变更只是让两消费点口径一致，不新增伪造面。放弃的方案：① collectForeignDeclarations 扩扫 archive/ 声明面——用陈旧声明做意图归属正是 sentinel-evidence-freeze⑤ 否决的形态，且 archive 清单庞大性能面差；② 未归因警告文案改软——保留误报数据只软化措辞，治标。均已弃。
