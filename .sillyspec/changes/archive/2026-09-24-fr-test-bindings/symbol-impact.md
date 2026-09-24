---
author: qinyi
created_at: 2026-09-24 13:05:00
---

# 符号影响面报告

> tasks.md 内容指纹（生成时）: 89b510dc2cc1b838——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 新增模块 src/test-bindings.js——全新导出面（normalizeRow/writeChangeTrace/promoteTraceFromMatrix/upsertFrBindings/readFrBindings/markFrBindingsSuperseded/unbindFrRows/upsertQlBindings/unbindQlRows/queryByAnchor/queryByChange/anchorResolvable/applySupersededToEntryLines/orphanAccRef/readChangeTrace/readQlBindings/parseEntryBindings），无既有签名修改；消费方为本变更 task-02~06（范围内）
- task-02: src/index.js 新增 tests 命令 case（命令分发分支，不改既有函数签名）；git-helper 追加命名导入 gitQuiet（既有导出，零签名变化）
- task-03: src/verify-probes.js 探针 7 构建尾部 additive 挂点（try/catch fail-open），消费 task-01 新导出；矩阵渲染/探针函数签名零变化
- task-04: src/run/gates.js verify 门记账块后 additive 挂点（fail-open），消费 promoteTraceFromMatrix；既有门禁函数签名零变化
- task-05: src/run/complete-handlers.js QUICKLOG 标完成后 additive 挂点（fail-open），消费 upsertQlBindings；completeQuicklogEntry 等签名零变化
- task-06: src/fr-index.js 承接翻链处内存态行翻转（applySupersededToEntryLines）+ 落盘后提升块（upsertFrBindings）——均为 additive，indexRequirements/renderFrLines 签名零变化
- task-07: package.json test:core 追加测试文件 + E1 端到端用例；无签名级变更
