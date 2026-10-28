---
author: flow-machine-draft
created_at: 2026-10-28T04:37:52.062Z
---
# 任务注册表（Tasks）— 2026-10-28-shadow-checkpoint

- [x] task-01: 建 src/checkpoint.js 核心（createCheckpoint：临时索引→read-tree→add -A 硬排除→write-tree→no-op 判定→commit-tree 成链→update-ref；readCheckpointConfig 手解析 local.yaml），test/shadow-checkpoint.test.mjs 起骨架：落档含 tracked+untracked、no-op 跳过、排除清单、链式父指——跑绿
- [x] task-02: 零污染与护栏面：单测硬断言共享 staged 面前后逐字节一致+临时索引 finally 清理+双会话隔离；体积护栏早停跳过留痕且 tick 不阻断——跑绿
- [x] task-03: 恢复面：listCheckpoints/previewRestore/restoreCheckpoint（git restore --source 仅工作区、--path 选择性、--all 需 --yes）单测——跑绿
- [x] task-04: 挂点：task-tick 成功翻格后 best-effort 落档（fail-open + skip 回显）、worktree 会话跳过、enabled=false 不落档——集成单测跑绿
- [x] task-05: CLI 动词 sillyspec checkpoint（list/--diff/--restore/--delete-ref）注册进 index.js、change-delete 清 ref 步骤、config-schema 键位登记——CLI 面单测跑绿
