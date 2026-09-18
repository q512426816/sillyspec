# 符号影响面报告

> tasks.md 内容指纹（生成时）: 0dfd01119c95ee9a——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 签名级变更=可选参数扩展（splitKnowledgeSections 增 opts 参数、syncIndexRoutingLines 增 opts 参数）+四函数新增 export——既有调用点（本模块 distillIntoKnowledge 内部）走缺省参数行为等价，distill 测试族零回归实证；task-02 是新增消费方（范围内）。
- task-02: 新增导出（FR_INDEX_EPOCH/parseChangeRequirements/indexRequirements/readActiveFrDigest/frTitleOverlap/scanFrIndex/resolveTouchedDomains）——全新符号零既有调用点；消费方 task-03/04/05/06 范围内接线。
- task-03: 无签名级变更（executeArchiveDistill 函数体追加调用与遥测，签名不变）。
- task-04: 无签名级变更（brainstorm step8 prompt 模板文本增 token 与指引；prompt.js 新增 {FR_INDEX_DIGEST} 替换分支——新增分支非签名变更；stage-contract validateBrainstormOutputs 顶部新增 import + warnings 追加块，函数签名不变）。
- task-05: 无签名级变更（detectArchiveIntegrity 循环内新增第四检查分支 + 循环外 frEntries 预计算，函数签名不变）。
- task-06: 无签名级变更（纯测试：两测试文件）。
- task-07: 无签名级变更（只读验收）。
