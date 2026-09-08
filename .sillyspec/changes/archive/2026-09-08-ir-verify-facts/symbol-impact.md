# 符号影响面报告

> tasks.md 内容指纹（生成时）: e26d0eecbc9a50b1——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: buildVerifyFacts 返回值加段（调用方 writeVerifyFacts 同卡内）；writeVerifyFacts 签名不变内部改合并；新增导出 backfillFactsFromMdAndTests（新函数无既有调用点）；generateVerifyResultSkeleton 返回文本加两槽段——调用点 index.js --init（同卡内）。接口级变更仅「新增导出」，无破坏性签名变更，调用点全在任务范围内。
- task-02: runVerifyRequiredEvidenceCheck 返回结构加 items[].verification 与 status 扩 blocked——既有调用点 gates.js（task-03 卡内，已声明）；progress.js 新增只读 getStageCompletedAt（新导出，无既有调用点）。范围内。
- task-03: gates.js 内部接线重排 + 新调 backfillFactsFromMdAndTests/runVerifyRequiredEvidenceCheck v2——被调方均在 task-01/02 卡内。本卡无对外签名变更。
- task-04: checkIntegrationEvidence 签名加第三参 opts（可选参数，向后兼容）——唯一调用点 stage-contract.js:613（同卡内）；literals 路径保留为 legacy 回退。范围内。
- task-05: checkProbeConsistency 返回值增 facts 基线维度结论——调用点 gates.js:705-715（task-03 卡内已声明依赖）。无签名破坏。
- task-06: 纯文档/prompt/map 变更，无签名级变更。
