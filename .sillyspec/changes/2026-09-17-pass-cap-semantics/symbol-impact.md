# 符号影响面报告

> tasks.md 内容指纹（生成时）: 86ae308af5b275ab——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更——parseHandoverRows 返回结构 additive（items[] 增 severity 字段，既有三字段不动）；backfillFactsFromMdAndTests 写入面 additive（5 新 facts 字段）；parseDbScriptDeclarations 为新增私有函数。既有调用方（facts 回填链/parseHandoverRows 消费方 backfill+骨架渲染）零改动兼容，均在本任务范围。
- task-02: auditRuntimeReceipt（change-risk-profile.js:398）签名增可选参 opts.sourceTag——向后兼容缺省 build；唯一调用链 checkIntegrationEvidence(:325)→stage-contract(:685) 在本任务范围同步。validatePassEligibility 为新增导出（validator 注册面追加，无既有符号改签名）。requiresEvidence 为函数内逻辑分层，签名不变。
- task-03: 无签名级变更——validateAcceptanceMatrix 内部分支扩展（返回结构 ok/errors 既有形态）；verify-probes Runtime Evidence 骨架注释与消费侧，渲染函数签名不变。
- task-04: 无签名级变更——worktree-apply apply 尾声与 complete-handlers handleArchiveConfirmStep(:778-787) 为既有流程内插校验段；run/prompt.js 新增 {HANDOVER_SUMMARY} 占位符（fail-soft，模板层 additive）。
- task-05: 无签名级变更——mergeCrossRepoResults 前置短路（内部逻辑）；isExplicitReviewWrite 白名单数组追加一项；prefetchDiffFileSet 数据源扩充（返回结构不变）；buildAcceptanceHints 根数组扩充；design-facts 校验分支降级。全部函数签名不变。
- task-06: 无签名级变更——prompt 源文案与 checklist 数据条目新增；_extract/_sync/_verify 流水线为数据再生。
- task-07: 无签名级变更——纯测试新增/断言补充。
