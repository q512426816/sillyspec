---
author: flow-machine-draft
created_at: 2026-10-10T11:18:08.264Z
---
# 决策记录（Decisions）— 2026-10-10-repo-inline-worktree-placement

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：三处手写 YAML 解析（plan-postcheck 内核、guard parseSimpleYaml 产物消费、deps 内联 IIFE）对同一对象形态的解析漂移——缓解：内核 `_parseRepoEntries` 单一事实源 + 旁路两处各自的最小升级 + 三处都有形态级测试（场景 16/17、guard-cd 既有回归、sibling-repo 既有回归）。试过但放弃的方案：直接删除 worktree.crossPlacement（未发布、干净迁移）——上一变更刚归档发号 FR-setup-083~089（knowledge/fr 已入库），删除需 supersede 对账且破坏「归档件即事实」原则；保留兼容读面零成本（readCrossPlacementConfig 已存在），优先级内联 > legacy 平滑迁移。
