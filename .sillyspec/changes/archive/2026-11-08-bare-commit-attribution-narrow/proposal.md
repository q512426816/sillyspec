---
author: flow-machine-draft
created_at: 2026-11-08T04:59:59.870Z
---
# 提案书（Proposal）— 2026-11-08-bare-commit-attribution-narrow

## 动机

任务原话转写：裸提交归属判定细分收窄冻结面

坑②裁决（multi-agent-platform/docs/sillyspec/2026-10-23-flow-done-shared-repo-multi-session-frictions.md 活跃余项）：baseline..HEAD 窗口内无变更名的裸提交（release/Merge/归档 chore 等）touch 的文件被判 own 穿透归属刀，污染本变更文件面/FR 域路由/冻结面（10-28 实证：release-record 归档提交的两个文件混入无关变更冻结面）。原 fail-closed 前提（自己的交付提交可能不带变更名）已过时——thin-tasks-v3 起交付提交必带 task-NN token（收口哨兵核的证据面）。细分：无变更名且无 task token 的纯裸提交 touch → 判 foreign；带本变更名或 task token 的 → 恒 own。

成功标准：
- 纯裸提交（subject 无变更名括号且无 task-NN token）touch 的文件被剔除出 own 面（splitOwnVsForeignDiffFiles/attr bufs）/冻结面（filterCommittedFace）/FR 域（attributedChangedFiles 同刀继承）
- 带本变更名或含 task-NN token 的提交 touch 的文件恒 own（交付协议证据，fail-closed 不变）
- 误剔兜底：收口既有「提交面夹带嫌疑 advisory」可点名漏声明文件（不改）
- test/commit-attribution-split.test.mjs 等既有归因测试面按新口径改写后全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 纯裸提交（subject 无变更名括号且无 task-NN token）touch 的文件被剔除出 own 面（splitOwnVsForeignDiffFiles/attr bufs）/冻结面（filterCommittedFace）/FR 域（attributedChangedFiles 同刀继承）
2. 带本变更名或含 task-NN token 的提交 touch 的文件恒 own（交付协议证据，fail-closed 不变）
3. 误剔兜底：收口既有「提交面夹带嫌疑 advisory」可点名漏声明文件（不改）
4. test/commit-attribution-split.test.mjs 等既有归因测试面按新口径改写后全绿

## 成功标准（可验证）

1. 纯裸提交（subject 无变更名括号且无 task-NN token）touch 的文件被剔除出 own 面（splitOwnVsForeignDiffFiles/attr bufs）/冻结面（filterCommittedFace）/FR 域（attributedChangedFiles 同刀继承）
2. 带本变更名或含 task-NN token 的提交 touch 的文件恒 own（交付协议证据，fail-closed 不变）
3. 误剔兜底：收口既有「提交面夹带嫌疑 advisory」可点名漏声明文件（不改）
4. test/commit-attribution-split.test.mjs 等既有归因测试面按新口径改写后全绿
