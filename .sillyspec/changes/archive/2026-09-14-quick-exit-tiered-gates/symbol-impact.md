# 符号影响面报告

> tasks.md 内容指纹（生成时）: 17cfe9661262f7ce——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 调用点扫描实测（2026-09-14，grep src/ 全量）：

- task-01: 无签名级变更。NEW:src/quick-gate-profile.js 为新文件新导出（含 resolveGateThresholds，D-009）；config-schema.js 新增 quick-gate 段四 optional 键为增量配置声明，无既有签名/调用点变化（computeGateProfile/THRESHOLDS，无既有调用点）；src/change-risk-profile.js 仅新增路径模式数据表导出，detectChangeRisk 判级函数与签名不动（调用点 stage-contract.js/stage-contract-spec.js/run/verify-quality-scan.js/stages/verify.js 均不受影响）。
- task-02: 返回对象增量字段，无签名级变更。auditQuickCompletion（run/shared.js）review 对象新增 gateProfile 字段——增量字段，既有调用点（scope-audit.js:396、run/complete-handlers.js、run/concurrent-detect.js、index.js、git-helper.js 注释面）按既有字段读取不受影响；新增消费点在任务范围内（complete-handlers.js auditNotes 组装、quick-audit.js 打印）。run/command.js knownFlags 白名单追加 --no-docs + opts 透传（内部参数，无对外签名变化）。
- task-03: 返回对象增量字段+渲染段，无签名级变更。computeChangeScopeAudit（scope-audit.js）结果对象新增 gateProfile 字段——调用点 index.js（--json/表格）、run/complete-handlers.js、run/prompt.js、run/complete.js 按既有字段消费不受影响；renderScopeAuditTable 增画像段（渲染层，签名 (result, opts) 不变）；index.js scope-audit 分支输出面增量。
- task-04: 无代码符号变更（AGENTS.md + templates/agents-instruction.md 纯文档）。
- task-05: 常量值校准，无签名级变更。THRESHOLDS 数值调整（消费方按值读取，quick-gate-profile 单测阈值边界用例随定稿值同步——在 task-05 allowed_paths 内）。
- task-06: 无代码符号变更（三张模块卡纯文档）。
