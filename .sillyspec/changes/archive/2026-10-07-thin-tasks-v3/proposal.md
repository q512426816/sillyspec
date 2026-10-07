---
author: flow-machine-draft
created_at: 2026-10-07T06:49:15.464Z
---
# 提案书（Proposal）— 2026-10-07-thin-tasks-v3

## 动机

任务原话转写：实测对比 openspec 发现 thin 流程 tasks.md 逐格勾选失效：任务面=成功标准镜像（验收形态，只能结尾一起成真）+ 文件内指令与横幅自相矛盾 + 收口代勾兜底教会懒行为 + watcher 采样合并误伤老实逐格勾。按对比结论重构（用户裁定）。

成功标准：
- tasks.md 变为纯工作分解：机器稿与 backfill 稿均无任何 > 指导块，requirements.md/design.md 文件内 > 指导块同步移除，必要书写规则由 flow start 输出与命令卡承载（- [ ] task-NN: 行形态保留）
- 哨兵镜像豁免与收口代勾（mirror_autotick）移除：已勾任务统一按提交 token/review.json 证据判（detectFakeCheckCompletion 不再吃 baselineTasksMd）；agent 全未勾时收口只警告不代勾
- task tick 直写精确 task-done 事件进 watcher 事件流（source 标记），detectBatchCheckCadence 对采样合并去重——CLI 快速连续 tick 不再被节奏门误判拒收
- flow start 横幅（thin/adopt 两处）任务面文案改为工作分解契约，verifyThinDocsV2 去镜像 advisory，命令卡 flow.md 同步
- 相关测试更新至新契约（sentinel-mirror-waiver/batch-tick-gate/flow-draft/thin-docs-v2/task-tick 等）且 npm run test:core 全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. tasks.md 变为纯工作分解：机器稿与 backfill 稿均无任何 > 指导块，requirements.md/design.md 文件内 > 指导块同步移除，必要书写规则由 flow start 输出与命令卡承载（- [ ] task-NN: 行形态保留）
2. 哨兵镜像豁免与收口代勾（mirror_autotick）移除：已勾任务统一按提交 token/review.json 证据判（detectFakeCheckCompletion 不再吃 baselineTasksMd）；agent 全未勾时收口只警告不代勾
3. task tick 直写精确 task-done 事件进 watcher 事件流（source 标记），detectBatchCheckCadence 对采样合并去重——CLI 快速连续 tick 不再被节奏门误判拒收
4. flow start 横幅（thin/adopt 两处）任务面文案改为工作分解契约，verifyThinDocsV2 去镜像 advisory，命令卡 flow.md 同步
5. 相关测试更新至新契约（sentinel-mirror-waiver/batch-tick-gate/flow-draft/thin-docs-v2/task-tick 等）且 npm run test:core 全绿

## 成功标准（可验证）

1. tasks.md 变为纯工作分解：机器稿与 backfill 稿均无任何 > 指导块，requirements.md/design.md 文件内 > 指导块同步移除，必要书写规则由 flow start 输出与命令卡承载（- [ ] task-NN: 行形态保留）
2. 哨兵镜像豁免与收口代勾（mirror_autotick）移除：已勾任务统一按提交 token/review.json 证据判（detectFakeCheckCompletion 不再吃 baselineTasksMd）；agent 全未勾时收口只警告不代勾
3. task tick 直写精确 task-done 事件进 watcher 事件流（source 标记），detectBatchCheckCadence 对采样合并去重——CLI 快速连续 tick 不再被节奏门误判拒收
4. flow start 横幅（thin/adopt 两处）任务面文案改为工作分解契约，verifyThinDocsV2 去镜像 advisory，命令卡 flow.md 同步
5. 相关测试更新至新契约（sentinel-mirror-waiver/batch-tick-gate/flow-draft/thin-docs-v2/task-tick 等）且 npm run test:core 全绿
