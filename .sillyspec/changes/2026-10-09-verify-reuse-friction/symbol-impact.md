# 符号影响面报告

> tasks.md 内容指纹（生成时）: ffd2a2003d72d82c——重入本步时若与当前 tasks.md 指纹一致且结论已填全，直接沿用不重做扫描。
> 骨架由 CLI 生成（`sillyspec symbol-impact --change <变更名>`，gate 失败时也会自动落一份）。
> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）
> 写变更类型 + 受影响调用点 + 是否在任务范围内；无签名级变更也要显式写「无签名级变更」。
> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。

- task-01: 无签名级变更——executeVerifyQualityScan 内部控制流重排（两复用闸移至快照创建后），导出面（shouldReuse* 纯函数签名）不变；调用点 complete.js/verify-probes 无感。
- task-02: 新增导出 reportGateSnapshotFallback（gate-snapshot.js）；friction-tally FRICTION_TYPES 封闭枚举 +1 值（additive，读侧未知值忽略）；gates.js/verify-quality-scan.js 调用点内部化，无外部签名变化。
- task-03: 新增模块 code-face-key.js（filterCodePorcelain/isNonCodePath/computeCodeTreeKey）；green-cache.js 的 filterCodePorcelain 转 re-export（旧 import 路径兼容）；computeGateFingerprint/computeQualityScanFingerprint 签名不变、指纹语义变化（HEAD→树键，旧缓存自然失配一次）。
- task-04: runVerifyTestCheck/runModuleSubset 增可选参数 observability（缺省 null 零行为）；storeQualityScan 增可选 missReason/scopeDecision（additive）；verify-postcheck 新增导出 appendReuseDecision。
- task-05: 无签名级变更——gates.js verify 段门序重排（块搬移+阻断改聚合 push）；reconcileRuntimeRoot/isStrictCheck 提升作用域，模块内可见性变化无跨模块影响。
- task-06: test-bindings normalizeRow 行 schema additive repo 字段（存量行零迁移）；resolveTraceResidual 返回值增 perFile（additive）；runTraceResidual 增可选 groups 参数（缺省旧形态）。
- task-07: cross-repo-reconcile collectRepoActual 返回 anchor.source 新增 worktree-baseline-window 档（读侧按 source 字符串展示，无结构破坏）；verify-postcheck 跨仓 diff 窗口内部化。
- task-08: index.js wt-commit 推断内部逻辑（剥后缀）；runWtCommit 目标定向内部逻辑（cwd 所属 worktree 优先）——导出签名不变。
- task-09: 纯文档：四模块卡 changelog + platform-interface-map 锚漂 5 处重锚（+19 行）。无签名级变更。
