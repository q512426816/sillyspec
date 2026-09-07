# 符号影响面报告

> tasks.md 内容指纹（生成时）: c8417f6d01d56170——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更（新文件纯新增导出）；复用 scanBackendEndpoints/normalizePath 既有签名。
- task-02: 无签名级变更。index.js endpoints case 子分发（extract 分支逐字节等价）+ execute.js prompt 一行。
- task-03: 无签名级变更（纯新增）。archive-delta 增源与渲染段，collectDeltaSources 返回对象加键（additive）。
- task-04: 无签名级变更。新增测试 + 既有断言更新。
