# 符号影响面报告

> tasks.md 内容指纹（生成时）: 78e84c5e57501c38——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更——config-schema 纯数据登记；verify-quality-scan 执行段为既有实测段内新增分支（executeVerifyQualityScan 签名不变，storeQualityScan 记录 additive）。
- task-02: parseEvidenceSlots 返回结构 additive（runtimeEvidence 条目增 source 可选字段，四字段不动）；classifyReceiptSourceTag/classifyReceiptCommandSource 返回值不变（识别规则扩展）；checkProbeConsistency 对比面扩展（签名不变）。
- task-03: evaluatePassEligibility triggered 数组加枚举值（返回结构 additive）；backfill 写面 additive（facts.smokeRan 新字段）。无签名变更。
- task-04: parseDesignApiTable 为新增导出；generateVerifyResultSkeleton 返回/渲染面 additive 新章节。无既有签名变更。
- task-05: validateApiCoverageMatrix 新增导出+注册（validators 数组追加）；evaluatePassEligibility 不在本任务动（task-03 已改）。无既有签名变更。
- task-06: stages/verify.js definition 文案与 stage-review-checklist 数据 additive（REVIEW_CHECKLISTS 新键）。无签名变更。
- task-07: 无签名级变更——纯测试新增/断言补充。
