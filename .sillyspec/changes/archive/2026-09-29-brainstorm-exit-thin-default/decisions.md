---
author: flow-machine-draft
created_at: 2026-09-28T23:59:27.186Z
---
# 决策记录（Decisions）— 2026-09-29-brainstorm-exit-thin-default

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：风险：① 拿不准默认 small 可能低估真复杂变更——兜底三层：实测失败自动升厚（既有）、--upgrade-thick 用户决策（既有）、收编后 thin 道自身门禁（实测/评审/patch）；② 模板标题下 agent 忘写 scale→null→默认收编，行为与 small 一致（符合设计）；③ premise-fail 型需求（前提不成立）仍要走满 8 步——行为演习发现的真实摩擦，属早期短路道新课题（记残留在变更报告）。行为级闭环验收：小白鼠带模糊中等规模需求（测试慢优化）走全链——入口选道进头脑风暴（负面信号命中）、Step 8 按新判据落 scale=small、CLI 指路 flow start 收编、下一步命令即收编命令——原始问题「头脑风暴后直奔五阶段」的反例实测成立。
