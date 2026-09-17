# 符号影响面报告

> tasks.md 内容指纹（生成时）: e96b28d0bca40216——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增导出 DIAGNOSTIC_CODES（冻结对象）与 checkCode(checkId)——全新符号，无既有调用点受影响；消费方在 task-02/03/05 范围内接线。
- task-02: buildEnvelope 参数对象新增可选字段 codes（加法式，undefined 缺省时行为与现状逐字节一致）——签名级变更=可选参数扩展；受影响调用点=本文件 runGate/runDerive/runStatusOverview 三处内部调用（均在任务范围内），外部无直接 import buildEnvelope 的调用方（mcp-server 经 CLI 子进程消费信封，不经函数签名）。
- task-03: 无签名级变更（纯文档：interface-contract.md 对账与两新节）。
- task-04: 无签名级变更（纯文档：模块卡同步）。
- task-05: 无签名级变更（纯测试新增/增补，不改任何 src 符号）。
- task-06: 无签名级变更（只读验收；契约示例若需按真实 CLI 输出修正，仍属文档面）。
