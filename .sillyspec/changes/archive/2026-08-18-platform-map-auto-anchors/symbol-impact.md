# 符号影响面检查（Symbol Impact）— docs check --fix

> 依据：execute step2 符号影响面扫描要求。逐 task 核对是否有签名/接口/DTO 级变更及其调用点是否都在 allowed_paths 内。

| task | 变更类型 | 受影响调用点 | 是否在范围内 |
|---|---|---|---|
| task-01 | `runDocsCheck` 返回结构**增量字段**（invalid[].fix），不改现有函数签名 | 调用点：`src/index.js` docs check 分支（已在 task-03 allowed_paths）；`test/doc-ref-check.test.mjs`（只读 result.ok/total/invalid，不触 fix 字段，无断言失效） | ✅ 在范围内 |
| task-02 | **新增导出** `applyFixes(projectRoot, fixes, opts)`，纯增量（无既有符号签名变更） | 消费方：`src/index.js` docs check 分支（task-03 allowed_paths 覆盖）；无其他 import 方 | ✅ 在范围内 |
| task-03 | `src/index.js` docs check 分支内 BARE_FLAGS 数组增量 + 局部逻辑，无跨文件签名变更 | 调用点：无（CLI 入口分支，无下游 import） | ✅ 无签名级变更 |
| task-04 | 新增测试文件，不触源码 | — | ✅ 无签名级变更 |
| task-05 | 实测任务（临时改动后 git 还原），不触源码签名 | — | ✅ 无签名级变更 |
| task-06 | 文档同步，不触源码 | — | ✅ 无签名级变更 |

## 结论

全链路无 class 构造参数 / interface / DTO / API client / 函数签名级**破坏性**变更：
- `runDocsCheck` 为返回结构加法式扩展（新字段 `invalid[].fix`），现有两个消费方（index.js 路由、doc-ref-check.test.mjs）均不读取该字段，行为零变化；
- `applyFixes` 为全新导出，唯一计划消费方 task-03 已声明 expects_from；
- `suggestLines`/`resolveCandidates`/`validateRefLines`/`collectDocRefs` 等既有导出一律不改。

无调用点逃逸 allowed_paths 的情况，**不阻断 execute**。
