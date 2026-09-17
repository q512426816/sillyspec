# 符号影响面报告

> tasks.md 内容指纹（生成时）: 89dcced3e58ff608——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更——REF_RE/SYMBOL_REF_RE 是模块内常量（非导出符号），collectDocRefs 导出签名与返回对象字段零增减（file 字段值域扩至可含 [ ] 字面量，属值域非签名）。
- task-02: 接口字段级变更——runDocsGate 返回对象新增 reanchored: boolean（缺省 false）+ 陈旧分支 baseline 返新值；既有字段（exitCode/ok/current/baseline/delta/originCount/message/inited）零增删。受影响调用点：src/index.js:2390（docs gate CLI 分支，只消费 message/exitCode 透传，新增字段向后兼容零改动）；测试消费面归 task-04。
- task-03: 无签名级变更——纯测试文件新增用例（test/docs-fix-capability.test.mjs）。
- task-04: 无签名级变更——测试文件用例改写/新增（消费 task-02 新增返回字段，断言面非签名）。
- task-05: 无签名级变更——纯文档镜像（interface-contract.md）。
