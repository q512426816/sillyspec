# 符号影响面报告

> tasks.md 内容指纹（生成时）: fa519944ea3bcd0a——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增导出 src/stages/plan-postcheck.js#checkBatchAdvisory（新函数签名，additive）——无既有签名变更；调用点：plan postcheck warnings 通道（本任务内接线）；src/stages/plan.js 仅 prompt 字符串追加，无签名级变更。
- task-02: 新增导出 src/review-material-pack.js#assembleExecuteTaskMaterials（新函数签名，additive）——无既有签名变更；assembleStageReviewMaterials 及 sectionBody/extractSnippets/clamp 先例签名不动；src/stages/execute.js buildWavePrompt 签名不变仅输出文本追加一行。
- task-03: 无签名级变更——src/stages/execute.js 仅 prompt 渲染文本追加（要点段三条 + 回收段一行），全部函数签名与导出面不变。
- task-04: 无签名级变更——纯新增测试资产（test/probe-suite/ 两文件），src/verify-probes.js 零改动（只 import 既有导出）。
- task-05: 无签名级变更——镜像文件机械重生成 + 模块文档/changelog 文本增补，不触任何源码符号。
