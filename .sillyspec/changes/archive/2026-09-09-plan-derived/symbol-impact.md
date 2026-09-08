# 符号影响面报告

> tasks.md 内容指纹（生成时）: 23ae564da3482270——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: adoptPlanWaves 加可选 mode 参（默认 write 向后兼容，既有调用零破坏）；返回值加字段。validateBlueprintConsistency 加 opts.waves 覆盖参（可选，不传零变化）。section 2 内部重构无对外签名变更。调用点：index.js plan-adopt-waves case（行为等价测试锁定）。
- task-02: plan-postcheck 内部新增 reviewPlanLevelSignal（新函数无既有调用点），接入点在 executePlanPostcheck 函数末尾。无签名变更。
- task-03: 纯文档/prompt 层，无签名级变更。
