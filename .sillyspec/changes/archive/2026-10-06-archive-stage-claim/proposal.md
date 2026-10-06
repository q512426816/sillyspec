---
author: flow-machine-draft
created_at: 2026-10-06T07:15:04.788Z
---
# 提案书（Proposal）— 2026-10-06-archive-stage-claim

## 动机

任务原话转写：动机：2026-10-06-module-map-list-leak 收口实测发现归档「补暂存源侧移动」与实态脱节——complete-handlers.js 补暂存循环调用 safeGit(cwd, ['add', '--', ...batch]) 后无条件打印「已补暂存本变更归档的源侧移动（N 项）」，但 safeGit 语义是返回 {value, error} 不抛错（git-helper.js），add 失败（锁竞争/路径异常等）时成功提示照印，暂存面实际缺项；实测该变更收口时声称补暂存 1 项但暂存面无该删除，靠人工核对暂存面纪律兜住后手工补提交。相邻的未跟踪归档目录兜底分支反而是 try/catch+告警的正确形态。

成功标准：
- complete-handlers.js 补暂存循环逐批校验 safeGit 返回的 error：任一批失败时不再打印成功提示，改为 ⚠️ 告警（含失败路径与 error 首行）并给出手工兜底指引（git add -- <源侧路径> 后重跑收口）——与相邻 untrackedArchiveHit 兜底分支的告警形态一致
- 全部成功时维持既有成功提示不变（含 N 项计数）
- 测试覆盖：add 失败路径告警且不打成功提示 / add 成功路径提示不变的单元回归

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. complete-handlers.js 补暂存循环逐批校验 safeGit 返回的 error：任一批失败时不再打印成功提示，改为 ⚠️ 告警（含失败路径与 error 首行）并给出手工兜底指引（git add -- <源侧路径> 后重跑收口）——与相邻 untrackedArchiveHit 兜底分支的告警形态一致
2. 全部成功时维持既有成功提示不变（含 N 项计数）
3. 测试覆盖：add 失败路径告警且不打成功提示 / add 成功路径提示不变的单元回归

## 成功标准（可验证）

1. complete-handlers.js 补暂存循环逐批校验 safeGit 返回的 error：任一批失败时不再打印成功提示，改为 ⚠️ 告警（含失败路径与 error 首行）并给出手工兜底指引（git add -- <源侧路径> 后重跑收口）——与相邻 untrackedArchiveHit 兜底分支的告警形态一致
2. 全部成功时维持既有成功提示不变（含 N 项计数）
3. 测试覆盖：add 失败路径告警且不打成功提示 / add 成功路径提示不变的单元回归
