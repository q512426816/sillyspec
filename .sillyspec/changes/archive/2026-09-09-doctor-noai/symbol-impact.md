# 符号影响面报告

> tasks.md 内容指纹（生成时）: 9881b144563cbf93——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增导出三 detector + renderDoctorSummary（新函数零既有调用点）；runDoctorDiagnostics 数组追加（内部）。无签名级变更。
- task-02: constants 数组移除成员（消费方 command.js 判据自动联动）；stage.js/complete.js 新分支注册（新增 else-if，无既有分支变更）；doctor.js steps 数组重写（阶段定义，无外部消费签名）；index.js doctor case 内部分支重排。无对外签名变更。
- task-03: 纯测试/文档层，无签名级变更。
