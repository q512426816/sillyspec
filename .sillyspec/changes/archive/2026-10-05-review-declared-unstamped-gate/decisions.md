---
author: flow-machine-draft
created_at: 2026-10-05T12:12:22.544Z
---
# 决策记录（Decisions）— 2026-10-05-review-declared-unstamped-gate

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：本变更的 run 在极端场景（戳文件被误删/worktree cleanup 先清了 run 戳）真丢戳——声明面静默为空，apply 对 review 声明过的越界文件改报「不在 design 清单」violation，出路从「review 声明自动放行」变成「补 design 声明」——收紧方向可恢复（fail-closed），且该场景本身意味着 run 元数据已损坏，静默信任其声明才是风险面。放弃的方案：① 改 resolver 语义（无戳回退整体删除）——影响 task-done/cross-repo-reconcile 等全部消费方的 marker 漂移恢复路径，锁定面外；② 只改 warning 文案区分无戳来源——保留误挂数据只软化措辞，治标不治本。均已弃。
