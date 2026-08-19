---
author: qinyi
created_at: 2026-08-19T12:10:33+08:00
---

# 符号影响面扫描（Symbol Impact）— reopen-and-execute-batch-guard

扫描方法：tasks/task-01..10 的 allowed_paths 逐文件提取变更类型（签名/接口/DTO/返回值），rg 调用点搜索，与 allowed_paths 对账。

| task | 变更类型 | 受影响调用点（rg 实测） | 是否在范围内 |
|---|---|---|---|
| task-01 | completeStep 内部回填分支行为变化（无签名变更） | 无外部调用点（completeStep 由 run/command.js 单点调用，行为变化为返回值新增 staleBlocked 字段，调用方只读 stageCompleted，向后兼容） | ✅ 在范围内（src/run/complete.js） |
| task-02 | completeStage 方法行为变化（拒绝 stale，无签名变更） | pm.completeStage 经 src/progress.js facade 转发（facade 透传不变），CLI 入口 src/index.js progress complete-stage 分支（报错文案变化，不改编码） | ✅ 在范围内（src/progress/stage-machine.js；facade 无需改） |
| task-03 | 新增测试文件（无源码符号变更） | 无 | ✅ 无签名级变更 |
| task-04 | shouldAutoCheckTask 签名加可选第三参 ctx（rg 实测调用点 1 处：src/run/complete.js:509 autoCheckPlanFromReviews 内） | src/run/complete.js:509（同文件，task-04 allowed_paths 覆盖）；外部 test/execute-batch-endtoend-checkbox.test.mjs 直接 import（已列 task-04 related_tests + allowed_paths） | ✅ 在范围内 |
| task-05 | detectExecuteBatchFinish 返回值新增 blockedTasks 可选字段（私有函数，rg 实测调用点 1 处：src/run/complete.js:235） | src/run/complete.js:235（同文件，task-05 allowed_paths 覆盖） | ✅ 在范围内 |
| task-06 | 新增测试文件（无源码符号变更） | 无 | ✅ 无签名级变更 |
| task-07 | applyWorktree 第二参 options 新增 base 键（可选，缺省 merge-base；rg 实测调用点 3 处：src/index.js:1063、src/index.js:1161、src/worktree-apply.js:916） | src/index.js 两处（task-07 allowed_paths 含 src/index.js，flag 解析同点透传）；src/worktree-apply.js:916 为 assess 内部 checkOnly 调用（不传 base → 默认 merge-base，fail-open 回退语义保证行为兼容，同文件在 allowed_paths） | ✅ 在范围内 |
| task-08 | rollbackApply 私有函数调用点错误信息构造（无签名变更） | 无外部调用点（模块内 629-643 行） | ✅ 在范围内（src/worktree-apply.js） |
| task-09 | 新增测试文件（无源码符号变更） | 无 | ✅ 无签名级变更 |
| task-10 | 文档同步（无源码符号变更） | 无 | ✅ 无签名级变更 |

结论：全部 task 的签名级变更调用点均在对应 task allowed_paths 内（或同文件覆盖），无范围外调用点，不阻断 execute。
