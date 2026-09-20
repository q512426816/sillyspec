# 符号影响面报告

> tasks.md 内容指纹（生成时）: 61f3493cb16d51a9——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增模块零存量符号；新导出 splitFrontmatter(content)→对象 与 parseTaskFrontmatter(content)→对象，无既有调用点（新增消费在 task-02/03 接线）。
- task-02: parseTaskContracts（src/stages/plan-postcheck.js:327）返回对象 additive 新增 yamlError 键——受影响调用点 ：714（解构 provides）与 :736（解构 expectsFrom），解构式消费零感知，在任务范围内；validatePlanFeasibility（:1247）新增步骤 0b 分支，返回形状不变（errors 数组多一类文案）。
- task-03: parseTaskAcceptance（src/verify-probes.js:1722）返回契约变更——数组|null 改为 {status, acceptance, error} 对象三态；受影响调用点仅 :2141 探针 7 构建（plan 独立审查实证收口），同任务内同步迁移；renderProbe7Lines 消费新可选字段 fmError（缺省时行为逐字节不变）。
- task-04: 纯测试新增/迁移，无签名级变更；test/acceptance-matrix-probe.test.mjs:155-159 五条断言随 task-03 契约迁移（连带测试债已在 plan 范围声明）。
