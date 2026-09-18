# 符号影响面报告

> tasks.md 内容指纹（生成时）: 92e85b7d5d7c063e——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增五导出：prefillFileChangeList/prefillDecisionTable/prefillCardIds/hasUnconfirmedPrefill/runPrefillRefresh——纯函数族零存量触碰
- task-02: src/index.js 三接线点（design-init/taskcard 生成段内部+新命令路由）——CLI 分发层增量，无既有命令签名变更
- task-03: gates.js advisory 注入点+verify-probes.js 探针面新增一项——均为增量检查，判定链零改动
- task-04: 新增测试文件，无源码签名变更
