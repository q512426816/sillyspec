# 符号影响面报告

> tasks.md 内容指纹（生成时）: 8db4c227ed6b585b——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更——applyField/renderBlockLines 为模块内部函数（非导出），FIELD_LABEL_RE 常量扩展；parseDecisions 导出签名不变（返回对象增可选 files 数组字段，消费方零改动——JS 可选字段增量安全）
- task-04: 无签名级变更——config-schema 纯数据登记（新增 semantic_guard 段条目），不改任何函数
- task-02: 接口新增（非变更）——parseDecisionFile 内部函数增 cur.files/cur.anchor 读取；新导出 matchDecisionsByFiles(indexDir, files)；matchKnowledge/parseKnowledgeIndex/parseDecisionEntries 既有导出签名与返回结构不变（decisionHits 条目对象增可选 files 字段，增量安全）
- task-03: 全新模块——导出 collectRecentForeignDelivery/detectAssertionRewrites/renderSemanticGuardBlock/readSemanticGuardEnabled 四个新函数，无既有符号变更
- task-05: 无签名级变更——src/run/prompt.js 渲染函数内部追加 quick step1 注入分支；对外导出接口不变
- task-06: 无签名级变更——runQuickTestLintGate 签名不变，返回对象增可选 semanticGuard 字段（调用方 complete-handlers.js:1086-1094 只读 action/failed，不遍历——增量安全）；printQuickTestLintGate 渲染追加段
- task-07: 无签名级变更——纯验证+文档 task，无代码改动
