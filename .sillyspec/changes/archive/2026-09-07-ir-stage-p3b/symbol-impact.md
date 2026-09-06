# 符号影响面报告

> tasks.md 内容指纹（生成时）: ccea2f47b05a7a71——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更。generateVerifyResultSkeleton 参数/返回不变（标题行追加后缀，纯文本级）；新增导出 buildVerifyFacts（纯新增）。消费方 task-05 测试。
- task-02: 无签名级变更（纯新增导出）。checkProbeConsistency 新增；锚点常量导出供 task-05 round-trip。不改既有导出。
- task-03: 无签名级变更。gates.js verify 块 reconcile 接线后追加调用（checkProbeConsistency 为 task-02 新增契约，expects_from 已声明）；不改既有分支。
- task-04: 无签名级变更。stages/verify.js 仅 Step 7 prompt 文案追加。
- task-05: 无签名级变更。新增测试文件 + 既有断言更新（测试侧）。
