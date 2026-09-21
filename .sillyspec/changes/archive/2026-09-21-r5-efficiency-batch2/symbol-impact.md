# 符号影响面报告

> tasks.md 内容指纹（生成时）: cbcbf8ec02f179b0——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更——run/prompt.js outputStep 渲染路径内加分流（静态段指纹计算+落盘+短输出），导出面/函数签名不变。
- task-02: 无签名级变更——gate-snapshot.js overlay 循环内分叉分支翻转（cwdPath→wtPath）+警告文案，无签名/导出变更。
- task-03: 新增导出 src/stages/plan-postcheck.js#recommendWaveGroups（纯函数 additive）——无既有签名变更；execute.js/plan-postcheck.js 消费接线在本任务内。
- task-04: 无签名级变更——plan.js frontmatter 模板加注释键；execute.js 渲染分支（读 execution_mode），无签名/导出变更。
- task-05: 无签名级变更——镜像机械重生成+模块文档文本增补，不触任何源码符号。
