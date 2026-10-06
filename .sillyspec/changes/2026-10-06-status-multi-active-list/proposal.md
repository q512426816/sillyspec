---
author: flow-machine-draft
created_at: 2026-10-06T14:07:58.424Z
---
# 提案书（Proposal）— 2026-10-06-status-multi-active-list

## 动机

任务原话转写：实测发现：裸跑 sillyspec status（无 --change）在进度库存在 ≥2 个活跃变更时，read() 因「多活跃无法自动推导」返回 null（src/progress.js:416-424），只读空态分支一律打「ℹ️ 未找到进度数据（只读查询不建变更）」——数据明明存在（本仓实测 10 个 active 行、其中 2 个有真实目录待收口），文案却断言无数据，误导 AGENTS.md「恢复与查看」面。

成功标准：
- 裸 status 在多活跃（≥2）时列出全部活跃变更名并提示 --change 指定查看，不再出现「未找到进度数据」
- 零活跃或库不存在时维持既有空态引导文案（不回归）
- 只读短路语义不变：不 initChange、不新建 sillyspec.db（库不在场时）、exit 0

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 裸 status 在多活跃（≥2）时列出全部活跃变更名并提示 --change 指定查看，不再出现「未找到进度数据」
2. 零活跃或库不存在时维持既有空态引导文案（不回归）
3. 只读短路语义不变：不 initChange、不新建 sillyspec.db（库不在场时）、exit 0

## 成功标准（可验证）

1. 裸 status 在多活跃（≥2）时列出全部活跃变更名并提示 --change 指定查看，不再出现「未找到进度数据」
2. 零活跃或库不存在时维持既有空态引导文案（不回归）
3. 只读短路语义不变：不 initChange、不新建 sillyspec.db（库不在场时）、exit 0
