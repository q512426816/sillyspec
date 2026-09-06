# 符号影响面报告

> tasks.md 内容指纹（生成时）: 2ffd54af655882ce——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。

- task-01: 无签名级变更。buildTaskcardSkeleton 参数与返回结构不变（仅模板字符串内追加 target_files 占位注释行与尾注释）；消费方（taskcard CLI/index.js 调用点）零影响。
- task-02: 无签名级变更。src/stages/plan.js 仅 prompt 模板字符串文案追加，不改步骤定义结构。
- task-03: 无签名级变更（纯新增导出）。新增 parseTargetFiles/validateTargetFiles 两个导出（不改既有 6 检查签名）；新增消费方：①executePlanPostcheck 内部（本文件）②task-04 verify-postcheck 跨文件 import（在任务范围；先例 worktree-apply.js:21 import parseAllowedPaths，依赖链 plan-postcheck→{change-list,stage-contract-spec,taskcard-placeholders,cmd-existence} 不含 verify-postcheck——无环）。
- task-04: 无签名级变更（纯新增导出）。新增 reconcileTargetFiles 导出（复用 resolveVerifyChangedFiles/filterDeliverableFiles/splitOwnVsForeignDiffFiles 既有签名）；消费方 task-05 gates.js（在任务范围）。
- task-05: 无签名级变更。gates.js verify 块追加 import+调用（reconcileTargetFiles 为 task-04 新增契约，expects_from 已声明）；不改既有五项检查分支与 completeStageGates 签名。
- task-06: 无签名级变更。新增测试文件 + 既有测试断言更新（测试侧，不改被测签名）。
