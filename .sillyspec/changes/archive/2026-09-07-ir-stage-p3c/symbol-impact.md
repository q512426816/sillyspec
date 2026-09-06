# 符号影响面报告

> tasks.md 内容指纹（生成时）: 0ac417f3443a163a——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更（新文件纯新增导出 validateDecisionModuleRefs/generateDesignSkeleton 等）；消费方 task-02 接线、task-04 测试。
- task-02: 无签名级变更。complete.js 钩子链追加调用 + index.js 新 case（纯追加）。
- task-03: 无签名级变更。brainstorm.js/prompt.js 仅 prompt 文案与注入函数追加。
- task-04: 无签名级变更。新增测试文件。
