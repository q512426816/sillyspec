# 符号影响面报告

> tasks.md 内容指纹（生成时）: 6af05afbde3ea1ca——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。

- task-01: **签名级变更——`_overlayBaseline(mainCwd, worktreePath)` → `_overlayBaseline(mainCwd, worktreePath, changeName = null)`**（私有方法，第三参缺省保零回归）。受影响调用点 2 处：worktree.js create step 5.6（~:725）与 in-place 路（~:868），均在 task 范围内同步传 `name`；新增 import `splitOwnVsForeignDiffFiles`（foreign-declared.js，已核实无环）。
- task-02: 无签名级变更——`applyWorktree` 内部 step 2 新增过滤段（局部逻辑），`getBlobHashMap`/`chunkPaths` 既有签名原样消费。
- task-03: 无签名级变更——config-schema 新增配置键 `worktree.supplyFiles`（数据面非符号面）；worktree.js create 流程内新增私有供给步（局部函数，不 exported）；meta.json 新增可选字段 `supplyFiles`（存量 meta 缺省兼容）。
- task-04: **签名级变更①——新增导出 `collectWorktreeChangedFiles(cwd, changeName, meta = null, opts = {})`**（task-review.js，全新符号无既有调用点；消费者 complete.js `prefetchDiffFileSet` 在本 task 内接线）。**签名级变更②——`attributeSuspectTasks` 返回类型 `Map<string, string>` → `Map<string, string[]>`**（模块内私有函数；受影响调用点 reconcileTargetFiles ③类报告组装（verify-postcheck.js ~:2582），在本 task 范围内边界 join('、') 成 string，gates.js:1606/archive-delta.js:213/325 下游零改动）。
- task-05: 无签名级变更——`runVerifyRequiredEvidenceCheckV2` 内部逐文件核验段双根化（私有函数，导出口 `runVerifyRequiredEvidenceCheck` 签名不动）。
- task-06: 无签名级变更——纯测试新增与文档章节。
