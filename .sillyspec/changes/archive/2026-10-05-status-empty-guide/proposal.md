---
author: flow-machine-draft
created_at: 2026-10-05T00:38:47.105Z
---
# 提案书（Proposal）— 2026-10-05-status-empty-guide

## 动机

任务原话转写：status/doctor 只读短路的空态分支（src/run/command.js）在'未找到进度数据'时只输出一句就 exit 0，新会话 agent 得不到下一步指引；改为空态时在原句后追加一行 flow start / brainstorm 引导。
成功标准：
- 空仓库跑 sillyspec status 与 sillyspec run status 均输出引导行（含 flow start 字样）且 exit 0 不变
- 有活跃变更时输出与现状逐字节一致（不回归）
- 新增测试断言空态引导行，全量测试绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 空仓库跑 sillyspec status 与 sillyspec run status 均输出引导行（含 flow start 字样）且 exit 0 不变
2. 有活跃变更时输出与现状逐字节一致（不回归）
3. 新增测试断言空态引导行，全量测试绿

## 成功标准（可验证）

1. 空仓库跑 sillyspec status 与 sillyspec run status 均输出引导行（含 flow start 字样）且 exit 0 不变
2. 有活跃变更时输出与现状逐字节一致（不回归）
3. 新增测试断言空态引导行，全量测试绿
