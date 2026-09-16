# 符号影响面报告

> tasks.md 内容指纹（生成时）: 750e9362fb801f9d——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。

- task-01: parseEvidenceSlots（src/verify-facts-schema.js:61）导出签名不变、返回结构不变（runtimeEvidence 数组多来源条目，字段同构）；内部行循环改索引推进属实现细节。无签名级变更。消费方（stage-contract.js / verify-probes.js / verify-postcheck.js）零改动。
- task-02: 新增导出 detectDuplicateTopKeys(fmText)→Array<{key,lines[]}>（纯函数，无既有调用点冲突，grep 全仓无同名符号）；validatePlanFeasibility 返回结构不变（errors 数组增条目）。新增签名级符号 1 个，无既有签名修改。
- task-03: resolveApplyAllowSet 导出签名与返回类型（Map<repo,Set>）不变——白名单条目并入 mainSet 返回值、declaredFace 以模块内辅助（或 Map 附带属性）带出，调用方（worktree-apply.js:1334 及 grep 所有点）零签名适配；applyWorktree result.warnings 增报备行（结构既定）。无签名级变更。
- task-04: createGateSnapshot 导出签名不变（opts 增量消费内部化）；config-schema.js 仅数据登记（SCHEMA 数组 + renderExample 字符串），无函数签名变更。无签名级变更。
- task-05: checkProbe7AnchorCoverage 导出签名与返回结构不变（missingAnchors 判定口径扩）。无签名级变更。
- task-06: 纯文档追加（5 个 sidecar changelog），无代码符号。无签名级变更。
