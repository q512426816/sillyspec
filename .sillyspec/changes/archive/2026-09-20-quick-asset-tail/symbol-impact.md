# 符号影响面报告

> tasks.md 内容指纹（生成时）: 596f7410e924b20a——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更——fr-index 新导出 markFrNeedsReview（首发零存量调用点）；readActiveFrDigest 返回体加可选字段（向后兼容，digest 消费方 prompt.js/stage-contract.js 均解构不整列，加字段零破坏）。
- task-02: 新导出 distillLinkedChangeAssets/liteArchiveChange（首发）；内部消费 pm.unregisterChange/assertChangeOwnership 既有签名。
- task-03: 钩子#1 块内追加调用（无签名变更）；handleQuickStageCompletion 内追加段（无签名变更）。
- task-04: 无签名级变更——纯测试。
