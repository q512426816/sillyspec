# 符号影响面报告

> tasks.md 内容指纹（生成时）: b6e218e778db7197——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无既有签名级变更——纯新增模块 src/run/gate-snapshot-ledger.js（7 个新导出：gateSnapshotLedgerPath/register/unregister/readGateSnapshotLedger/isSafeSnapshotRoot/isSafeLedgerEntry/selectStaleSnapshots/reclaimStaleGateSnapshots），消费方为 task-03（接线）与 task-04（doctor 维度），二者 import 面在本卡之后产生，均在变更范围内；既有文件零改动。
- task-02: 内部重构+新增导出——cleanup 闭包体抽为模块级导出 cleanupSnapshot({snapshotRoot,cwd,runGit,removeDir})（新导出，可注入故障）；对外契约不变：createGateSnapshot 返回体仍含 cleanup 无参闭包与 {snapshotRoot,overlaid,pinnedCacheLinks}，既有调用方（src/run/quick-audit.js:540、src/run/gates.js:946 经 createVerifyGateSnapshot）零改动即兼容。既有 gate-snapshot 族 9 文件内 createGateSnapshot 调用点全在范围内。
- task-03: 签名级变更（additive，向后兼容）——createGateSnapshot 新增可选形参 runtimeRoot（默认 null；不传时账本链路退 no-op，行为与改前一致）。受影响调用点：src/run/quick-audit.js:540（更新为 resolveRuntimeRoot(null, specBase) 传入，在 task-03 边界内）与 src/run/gate-snapshot.js:754 内部 createVerifyGateSnapshot（已持 resolveRuntimeRoot 结果，下传即可）；src/run/gates.js 无需改。既有测试调用 createGateSnapshot 处不传即走原路径（范围内回归验证）。
- task-04: 新增导出 detectGateSnapshotLeak + runDoctorDiagnostics 内部汇总增一个 dimensions 条目（name/label/pass/severity/findings/safe_actions）——既有函数签名与既有维度输出不变；消费 src/run/gate-snapshot-ledger.js 新导出（在 task-01 范围内）。doctor 三个调用点（src/index.js:2685-2698 等）零改动。
- task-05: 无签名级变更——纯文档与清单登记（.sillyspec/docs/sillyspec/modules/runtime.md、runtime.changelog.md、docs/sillyspec/file-lifecycle.md、package.json test:core 列表）。
