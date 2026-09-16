
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

## ql-20260916-015-44dd | 2026-09-16 11:27:54 | QUICKLOG 多会话提交摩擦工具化——sillyspec quicklog commit 一键收编本会话条目（known-issues④ v1）
状态：已完成
关联变更：（无）
文件：
- src/quicklog.js（新增 runQuicklogCommit（锁内定位→切片→pathspec 提交→finally 恢复；patches sidecar+额外 pathspec；fail-fast 附人工四步舞））
- src/index.js（quicklog commit dispatch case + help 行（保护文件外科手术式追加））
- test/quicklog-commit-slice.test.mjs（7 用例：切片/轮转双文件/幂等/CRLF/fail-fast/dispatch）
- docs/sillyspec/platform-interface-map.md（5 处 index.js 行号锚重锚（dispatch+help 插入漂移））
需求：QUICKLOG 多会话提交摩擦工具化——sillyspec quicklog commit 一键收编本会话条目（known-issues④ v1）
根因：QUICKLOG 是多会话共享追加的单文件而 git 暂存按文件粒度：某会话提交整文件必夹带并行会话未完成条目（违反显式 pathspec 隔离纪律），只能手工四步舞（备份→剥离并行条目→commit→恢复），2026-09-15/16 单会话实证 6 次（e97251d/42cef77 同款）
方案：src/quicklog.js 新增 runQuicklogCommit：持用户 QUICKLOG 锁全程（与 allocate/complete 同锁）——锁内恒扫主文件+轮转归档定位本会话条目（含已取消）→切片（HEAD 基线+本会话条目块，EOL 随工作区文件，已收编条目幂等跳过不重写）→git add/commit 显式 pathspec（QUICKLOG+patches sidecar+额外 pathspec）→finally 恢复工作区全量（并行条目回未提交态，.runtime 落备份兜底）；index.js 接 dispatch case+help（参数面照抄 wt-commit 先例，保护文件只增不改）；任一步 fail-fast 附人工四步舞兜底文案
结果：新命令端到端可用：test/quicklog-commit-slice.test.mjs 7 用例全过（主文件切片/轮转双文件/新文件空基线/幂等跳过/CRLF/fail-fast/dispatch 参数面+guard 端到端）；npm test 全量 504 文件 0 失败；lint 零告警；platform-interface-map.md 5 处行号锚重锚；本会话 QUICKLOG 收编即用新命令完成（真实使用替代手工舞步）
审计：[gate] L1（跨 2 模块 · 4 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含
