# 符号影响面报告

> tasks.md 内容指纹（生成时）: 96c008b4029d9868——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无既有签名级变更。brainstorm.js prompt 模板文本追加行；decision-distill.js applyField 内 switch 加 2 case + FIELD_LABEL_RE 白名单扩标签 + renderBlockLines 条件行（函数签名不变）；stage-contract.js 两 validator 内 warnings.push 追加（返回结构 additive）。
- task-02: 无既有签名级变更。friction-ledger.js 全新导出（readFrictionLedger/mergeFrictionEntry/rollLedger）；complete.js 两处收尾语句级调用；complete-handlers.js pruneArchivedChangeRuntime 返回值 additive 加 ledgerAppend（既有测试仅断言 .ok）；doctor-diagnostics.js dimensions 数组 additive push。
