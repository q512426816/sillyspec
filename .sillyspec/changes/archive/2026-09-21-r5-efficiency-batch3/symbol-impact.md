# 符号影响面报告

> tasks.md 内容指纹（生成时）: ea7245dc91e2b70d——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增 src/run/test-ledger.js（导出三键指纹/账本读写/查询三函数形态）——零既有签名变更；gates.js verify-test 与 quick 实测门为调用点增量。
- task-02: src/run/prompt.js 单点缺省翻转——导出面零变更；迁移面为测试 fixture env，无生产代码签名变化。
- task-03: gates.js 增 --full 装配（runGate additive opts）；verify-postcheck reconcile 复用加 dryRun 增量；index.js flag 注册 additive。
- task-04: complete-handlers.js handleVerifyDone 尾部追加报告块——纯增量不改返回形态。
- task-05: 纯文档面，无代码符号影响。
