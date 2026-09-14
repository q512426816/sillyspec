# 符号影响面报告

> tasks.md 内容指纹（生成时）: 9c580c5ebc57012b——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无既有签名级变更。verify-probes.js runVerifyProbes 返回值新增 probe7 字段（additive，既有消费方按键取用不受影响）；新增内部函数 ensureAcceptanceMatrixSection；index.js --init 流程追加一次调用（语句级，无签名变化）。
- task-02: 无既有签名级变更。stage-contract.js 新增导出 extractAcceptanceMatrixSlots + contracts.verify.validators 数组追加一项（消费方 runValidators 遍历数组自动拾取，无签名变化）。
- task-03: 无既有签名级变更。纯模板文本与提取产物同步（testcase-design/verify-probes/verify.js prompt 段/docs-prompt 再生成）。
