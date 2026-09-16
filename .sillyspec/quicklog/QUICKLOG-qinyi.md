
## ql-20260916-012-086e | 2026-09-16 11:00:41 | 登记两条待立项已知问题：③worktree隔离期跨仓命令锚定错位（guard命令名白名单无路径感知：cd ../注册仓 在worktree内指向worktrees目录锚点错位+cd不在只读白名单进人工审批——修法guard路径感知需完整流程…
状态：已取消
关联变更：（无）
文件：.sillyspec/knowledge/known-issues.md, .sillyspec/knowledge/INDEX.md

## ql-20260916-013-76ab | 2026-09-16 11:01:09 | 登记两条待立项已知问题（③worktree跨仓命令锚定错位 ④QUICKLOG条目交织）——只落档不实施
状态：已完成
关联变更：（无）
文件：
- .sillyspec/knowledge/known-issues.md（两条待立项条目）
- .sillyspec/knowledge/INDEX.md（两条路由）
需求：登记两条待立项已知问题（③worktree跨仓命令锚定错位 ④QUICKLOG条目交织）——只落档不实施
根因：两项均需正式设计（hook语义/全链路文件化），用户指示先文档记录；知识库为正规登记处+INDEX路由保证命中
方案：known-issues.md两节（现象/根因/修法建议/来源完整）+INDEX两条路由
结果：纯知识条目（白名单）；无src锚不涉docs check

## ql-20260916-014-c49f | 2026-09-16 11:07:10 | worktree-guard跨仓命令锚点感知——known-issues③兑现（纠偏留痕+测试类从严放行）
状态：已完成
关联变更：（无）
文件：
- src/hooks/worktree-guard.js（analyzeCrossRepoCd+两分支接线+导出）
- test/worktree-guard-cross-repo-cd.test.mjs（15断言）
- .sillyspec/knowledge/known-issues.md（③条目翻已兑现）
需求：worktree-guard跨仓命令锚点感知——known-issues③兑现（纠偏留痕+测试类从严放行）
根因：EHS三仓形态两摩擦：①worktree内cd ../注册仓 解析到worktrees存储目录而非真实兄弟仓（锚点错位静默跑错）②verify等非execute/quick阶段主仓cwd跑兄弟仓测试/lint被cd白名单缺口整条拦截
方案：analyzeCrossRepoCd双基准解析（shell=callerCwd实际解析 vs 意图=主仓根，命中repos注册根）；shouldBlockBash两分支：worktree cwd放行不变+shell解析落存储目录时stderr纠偏留痕（真实路径）；非execute/quick阶段从严放行（cd意图基准命中注册根+其余片段全测试类CROSS_REPO_TEST_RE+危险黑名单不沾），写类/混合/未注册维持stage门禁fail-closed；导出_测试钩；known-issues③条目翻已兑现
结果：新增test/worktree-guard-cross-repo-cd.test.mjs 15断言（放行六形态/纠偏留痕三断言/双基准备析单元）15/15绿；guard族回归bypass/execute-guard/db-fallback/cross-worktree 7/0；lint 641文件0告警；全量npm test由--done CLI实测
