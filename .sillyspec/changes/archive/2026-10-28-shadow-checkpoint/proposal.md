---
author: flow-machine-draft
created_at: 2026-10-28T04:37:52.062Z
---
# 提案书（Proposal）— 2026-10-28-shadow-checkpoint

## 动机

任务原话转写：任务勾选即影子存档，随时读档回滚

多 agent 共享仓的断点恢复目前只有进度级（tasks.md 记做到哪），没有内容级（工作区长什么样）——agent 跑歪或改崩时没有手段回到出事前状态，只能手工 git 抢救。本变更用 git 原生 plumbing 在每次 task tick 时落影子提交存档：临时索引（GIT_INDEX_FILE 按会话隔离，绝不碰共享暂存区）→ read-tree HEAD → add -A（硬排除常见产物目录与 .env*）→ write-tree → tree SHA 与上次相同即零开销跳过 → commit-tree 挂 refs/sillyspec/checkpoints/<change>。恢复走 git restore --source 按路径选择性读档、先 diff 预览；大体积未忽略产物超阈值跳过留痕不阻断；change 删除时同步清 ref；local.yaml 可关；worktree 会话 v1 不启用。零新依赖，三平台原生。

成功标准：
- task tick 成功勾选时自动落影子提交到 refs/sillyspec/checkpoints/<change>，快照覆盖 tracked+untracked，全程零触碰共享 index（双会话并发测试断言暂存区不变）
- 无变化时跳过不落对象（tree SHA 相同 no-op）
- 支持列出与恢复：读档前 diff 预览，按路径选择性恢复
- 体积护栏：未忽略 untracked 总量超阈值跳过并留痕，不阻断 tick
- change-delete 时同步删除对应 checkpoint ref
- local.yaml 配置开关（缺省开启）
- 纯 git plumbing 实现，无新依赖，Windows/Linux/macOS 兼容

## 变更范围

按成功标准机械推导，共 7 条验收面：
1. task tick 成功勾选时自动落影子提交到 refs/sillyspec/checkpoints/<change>，快照覆盖 tracked+untracked，全程零触碰共享 index（双会话并发测试断言暂存区不变）
2. 无变化时跳过不落对象（tree SHA 相同 no-op）
3. 支持列出与恢复：读档前 diff 预览，按路径选择性恢复
4. 体积护栏：未忽略 untracked 总量超阈值跳过并留痕，不阻断 tick
5. change-delete 时同步删除对应 checkpoint ref
6. local.yaml 配置开关（缺省开启）
7. 纯 git plumbing 实现，无新依赖，Windows/Linux/macOS 兼容

## 成功标准（可验证）

1. task tick 成功勾选时自动落影子提交到 refs/sillyspec/checkpoints/<change>，快照覆盖 tracked+untracked，全程零触碰共享 index（双会话并发测试断言暂存区不变）
2. 无变化时跳过不落对象（tree SHA 相同 no-op）
3. 支持列出与恢复：读档前 diff 预览，按路径选择性恢复
4. 体积护栏：未忽略 untracked 总量超阈值跳过并留痕，不阻断 tick
5. change-delete 时同步删除对应 checkpoint ref
6. local.yaml 配置开关（缺省开启）
7. 纯 git plumbing 实现，无新依赖，Windows/Linux/macOS 兼容
