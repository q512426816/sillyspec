# 符号影响面报告

> tasks.md 内容指纹（生成时）: 95f6f3d7207c1002——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增导出 collectRepoActual（纯新增符号，无既有签名变更）；reconcileCrossRepoDeclarations 签名增量**可选参数** {runtimeRoot, changeName}（缺省行为=现状，向后兼容）。受影响调用点：src/verify-postcheck.js:33（唯一 import 消费点，:2918 调用——task-03 认领传参贯通，缺省态零影响）。范围内。
- task-02: computeFullFlowAudit 内部逻辑扩展+返回值**增量字段** repos[]（additive，既有字段形状不变）；跨仓行 verdict 语义升级（恒 untouched→真实三态，契约 v2 有意的破坏性语义修复）。受影响调用点：computeChangeScopeAudit 消费方 src/index.js:1430（CLI --json/表格出口，投影字段不变零适配）、src/run/complete.js:960、src/run/prompt.js:1659、src/run/complete-handlers.js:1694（四处均按存在性读字段，additive 零适配）。collectNumstatByPath/buildFrozenPatch/renderScopeAuditTable 签名零变化。范围内。
- task-03: renderScopeAuditTable/getFileDiff 入参与返回形状零变化（渲染内容升级）；src/verify-postcheck.js:2918 调用点增量传参（task-01 提供的可选参数）；src/run/gates.js printCrossRepoReconcile 渲染增量读 anchor 字段（按存在性，旧形态无 anchor 零输出）。范围内。
- task-04: 无签名级变更（纯测试新增/断言更新；test/scope-audit.test.mjs「改进点 2」断言按行为升级更新——断言对象「跨仓不恒 untouched」的中间态）。
- task-05: 无签名级变更（纯文档）。
