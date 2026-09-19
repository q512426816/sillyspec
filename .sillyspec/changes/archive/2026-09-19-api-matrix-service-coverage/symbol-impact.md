# 符号影响面报告

> tasks.md 内容指纹（生成时）: e64f3e2c216919b6——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更。judgeApiCoverageMatrix/extractApiCoverageMatrixSlots 既有导出签名零变化，改动为行为增量（白名单加值/新分支/记账口径/advisory）+文案。受影响符号调用点：MATRIX_VERDICT_WHITELIST 消费点 stage-contract.js:872（探针7门 unfilled 判定）与 :1062（接口矩阵 unfilled 判定）——均在 task-01 的 allowed_paths（src/stage-contract.js）内。
- task-02: 无签名级变更。renderApiCoverageMatrixLines/ensureApiCoverageMatrixSection 导出签名零变化（渲染文案层）。消费点 verify-probes.js:3084 复用 render——同文件（task-02 allowed_paths）内。
- task-03: 无签名级变更。checkProbe7AnchorCoverage 导出签名零变化（枚举数组扩值+分支）。
- task-04: 无签名级变更。纯测试文件（fixture/断言），无对外符号。
