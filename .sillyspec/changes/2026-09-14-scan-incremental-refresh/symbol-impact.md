# 符号影响面报告

> tasks.md 内容指纹（生成时）: 6986f9a6f277810d——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: readSourceCommit 内部聚合语义变更（签名不变）；parseNameStatus 由内部函数转 export（新导出，无既有调用点受影响）；collectStaleRefs 新导出（自 computeScanDiff 内联段抽出，computeScanDiff 自身改调用——行为等价）。调用点：scan-diff.js 内部 + index.js scan diff 子命令（经 computeScanDiff 间接受益，无签名级破坏）。均在范围。
- task-02: computeScanStaleness 签名不变，内部基线收集从 break 首个命中改全文档聚合。调用点：src/run/prompt.js:596（brainstorm 注入）——无签名级变更，注入行为按聚合口径自然变化（设计意图）。
- task-03: bumpScanDocBaselines 全新导出（无既有调用点）；stampScanDocHeaders 及其调用方（run/scan-profile.js:228,361、run/complete-handlers.js:1923,2008）零改动。
- task-04: shouldBlockScanDocOverwrite 内部逻辑扩展（guard mode 前置分支 + check-1 归一化比对），函数签名不变。调用点：worktree-guard.js:761（同文件主流程）与 test/worktree-guard.test.mjs。行为变化=设计意图（7/40 恒拦修复 + refresh 白名单）。
- task-05: computeRefreshPlan 全新函数（无既有调用点）；消费 task-01 新导出（collectStaleRefs/parseNameStatus）。
- task-06: runRefresh/finalizeRefresh 全新函数；index.js 新子命令分支（scan refresh 转发，仿 scan diff 先例 index.js:2529-2547 模式）；消费 task-03 bumpScanDocBaselines 与 task-05 computeRefreshPlan。
- task-07: 纯测试任务，无签名级变更。
- task-08: 纯文档任务，无签名级变更。
