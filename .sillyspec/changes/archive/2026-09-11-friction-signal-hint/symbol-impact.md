# 符号影响面报告

> tasks.md 内容指纹（生成时）: 05444496e0e16475——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增模块，导出 recordFrictionEvent({cwd,platformOpts,changeName,type,detail})/consumeFrictionHint({cwd,platformOpts,changeName})/renderFrictionHintLine(counts)——全新符号无存量调用点；无签名级变更（新增）
- task-02: rollbackCompletionAndReturn(pm,progress,stageData,steps,currentIdx,cwd,changeName,platformOpts) 增可选第 9 参 friction（默认 gate_rollback/gate-cascade）——模块私有函数（未 export，gates.js:509 实证），调用点全部在 gates.js 内 13 处，本任务范围内同步补实参；无对外签名影响
- task-03: executeVerifyQualityScan（已 export）函数体内部插入 record 调用，签名不变；complete.js 两处收尾段插入 consume+console.log，不新增/修改导出符号；无签名级变更
- task-04: handleQuickStageCompletion（已 export）函数体内部插入 record/consume，签名不变；pruneArchivedChangeRuntime(runtimeRoot,changeName)（已 export）函数体新增一个 try 清理块，签名不变；无签名级变更
- task-05: LOCAL_YAML_SCHEMA 数据结构新增 friction_hint.enabled 键条目（live，readers=[src/friction-tally.js]）——消费方 renderSchemaJson/renderExample 自动遍历，无签名级变更
- task-06: 纯新增测试文件，无签名级变更
- task-07: 纯文档，无签名级变更
