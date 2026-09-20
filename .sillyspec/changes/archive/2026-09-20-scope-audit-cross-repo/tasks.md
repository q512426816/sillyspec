---
author: qinyi
created_at: 2026-09-20
---
# 任务注册表（Tasks）— 2026-09-20-scope-audit-cross-repo

- [x] task-01: src/cross-repo-reconcile.js 抽共享采集内核 `collectRepoActual({repoKey, specBase, cwd, runtimeRoot, changeName})`——仓注册解析→仓根→锚点四级（reviews-range[resolveLatestExecuteRunIdWithTasks+readReview 按 repo 切片，diffPaths 收窄，区间并集∪status] > head~1-window > head-uncommitted-window > degraded 三类判据[未注册/路径不可达/git 双源失败合并]）→actual 文件集（行数采集不进内核防循环 import）；`reconcileCrossRepoDeclarations` 重构为消费内核（签名增量可选 {runtimeRoot, changeName} 喂 A 档，声明差集与既有字段形状不动，增量 anchor 字段）+ 既有 verify 侧测试回归
- [x] task-02: src/scope-audit.js 集成——computeFullFlowAudit 非预执行分支：plannedEntries 按 repo 分组调内核，集成层 collectNumstatByPath 对该仓根+锚点采行数；跨仓行真实 verdict/additions/deletions/kind+crossRepo；degraded 仓退 ⊘ 形态+note；信封 repos[]（main 首位+anchor+三态计数，仅多仓非预执行输出）；settled 快照：新快照自动冻结、回放 return 增量透传 snap.repos、needsStats 补采跳过 crossRepo 行（防主仓根伪数据）、旧快照 ⊘+「冻结于跨仓对账上线前」注记；totals 含跨仓行 (depends_on: task-01)
- [x] task-03: 渲染与查询面——renderScopeAuditTable 跨仓行真实三态带仓标 label+表尾 per-repo 汇总行；getFileDiff 跨仓行路由该仓（rows crossRepo 判据先于主仓冻结 patch 捷径，A 档 `git diff base..head -- file` 优先，B/C 档实时窗口兜底）；src/verify-postcheck.js 调用点传参贯通（runtimeRoot/changeName）+notes 锚点档动态化；src/run/gates.js printCrossRepoReconcile 锚点档标签；src/index.js scope-audit 帮助文案 (depends_on: task-02)
- [x] task-04: 测试——NEW:test/scope-audit-cross-repo.test.mjs（collectRepoActual 锚点四态真 git 夹具/跨仓行真实三态/degraded 四边界/单仓变更 --json 逐字节等价断言/双仓 e2e 三仓合并表）；test/scope-audit.test.mjs「改进点 2」两项断言按新形态更新；npm test 全量+lint (depends_on: task-02, task-03)
- [x] task-05: 文档同步——.sillyspec/docs/sillyspec/modules/core-engine.md（scope-audit 跨仓真实对账+cross-repo-reconcile 共享内核+契约字段）；design.md 契约节与实现终态核对（如实现期口径微调回写契约文档） (depends_on: task-04)
