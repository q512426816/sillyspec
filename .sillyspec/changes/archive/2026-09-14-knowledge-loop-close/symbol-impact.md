# 符号影响面报告

> tasks.md 内容指纹（生成时）: c22dea7f1e536296——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无既有签名级变更。新增导出：knowledge-hits.js appendKnowledgeHit(runtimeDir, hit)/readKnowledgeHit s(runtimeDir, opts)（全新符号，无既有调用点）；stages/knowledge.js cmdKnowledge switch 新增 classify/stats 两 case + available 列表两项（分支追加，函数签名不变）。
- task-02: 无既有签名级变更。新增导出：knowledge-classify.js classifyUncategorizedEntry({knowledgeDir, qlId, targetFile, sectionTitle, keywords, titleFallback, dryRun})（全新符号）；消费方为本变更内 knowledge 子命令路由（task-01 注册）。
- task-03: 无既有签名级变更。complete-handlers.js handleQuickStageCompletion/handleArchiveConfirmStep 内部追加渲染段（签名不变）；新增模块内私有 helper（matchKnowledge 调用 + baseline 计数，不导出）。调用点：run/complete.js 委托链不变。
- task-04: 无既有签名级变更。prompt.js 既有 KNOWLEDGE_HIT_REPORT 渲染路径（:757-786）从 report 清单升级为正文注入——函数签名与返回结构不变（injection 字符串内容变化）；quickFirstStep/buildWavePrompt 为 prompt 模板文本追加段（构建函数签名不变）。注意不新增 {{include:}} 槽（execute-testcase-design-include.test.mjs:74 断言 include 计数 n===1）。
- task-05: 无既有签名级变更。新增导出：knowledge-stats.js buildHitMatrix(knowledgeDir, runtimeDir, opts)（全新符号）；模块卡/changelog 为文档追加。
