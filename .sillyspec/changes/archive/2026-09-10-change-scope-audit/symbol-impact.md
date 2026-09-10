# 符号影响面报告

> tasks.md 内容指纹（生成时）: 1b5d35587347595e——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更（新模块三导出 computeChangeScopeAudit/renderScopeAuditTable/collectNumstatByPath 为全新符号，无既有调用点受影响）
- task-02: 签名级变更：resolveReconcileActualFiles（src/verify-postcheck.js:2289）加 export 前缀 + 返回对象新增 baseAnchor 字段——导出属可见性扩大零行为变化；新增字段纯增量，唯一既有调用方 reconcileTargetFiles（:2478 附近）不读该字段，在任务范围内
- task-03: 无签名级变更（index.js 新增 case 分支，不改既有命令签名）
- task-04: 无签名级变更（complete.js 阶段完成输出区追加打印与快照落盘，不改 completeStep/continueStep 签名）
- task-05: 无签名级变更（stages/archive.js prompt 文本占位符 + run/prompt.js 注入分支，不改函数签名）
- task-06: 无签名级变更（complete-handlers.js 输出行上行数，不改 handleQuickStageCompletion/printQuickAuditReview 签名）
- task-07: 无签名级变更（新增测试文件，无生产代码符号变更；微修限 task-01/02 产出文件）
