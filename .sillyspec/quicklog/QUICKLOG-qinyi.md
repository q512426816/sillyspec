
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

## ql-20260916-016-914b | 2026-09-16 12:03:14 | EHS会话复盘第一批：跨仓测试降级+审查prompt纪律+清单校验前移+③类聚合+双根回归锁定
状态：已完成
关联变更：（无）
文件：（见实际改动）
需求：EHS会话复盘第一批：跨仓测试降级+审查prompt纪律+清单校验前移+③类聚合+双根回归锁定
根因：2026-09-15 wp EHS 三仓会话复盘暴露的摩擦：跨仓仓无 test script 时 fallback npm test 必假红逼 agent 造配置；独立审查子代理 94 分钟无收敛且写通道故障空转 35 分钟；design 清单 41 条误报只在 --done 末步爆出；③类 58 条逐行刷屏；design-file-ref-cross-repo-blind 与 register-repo-specbase-split-brain 两坑修复缺直接回归锁定
方案：①runCrossRepoFullTest：command===npm test 且 package.json 无 scripts.test 且无 own local.yaml 覆盖→skip+warn+hint（显式配置无条件执行，解析失败维持原行为）②brainstorm/plan/execute 三处 tier=independent 派发 prompt 注入时间盒收敛/前序 stage-review 实证直接引用勿重验/写拒绝≤3次重试即回传主代落盘留痕 ③runGate brainstorm 新增 design-file-list check（复用 validateDesignFileList，errors 拍平为 message）④printReconcileTargetFilesCheck ③类>20 条按顶层目录聚合（计数降序+每目录2样例+reconcile-result.json 指引，≤20 维持逐条含归因）⑤新增两坑回归测试：register-repo-platform-split-brain（平台指针默认写项目侧/不双写/显式--spec-dir尊重）+ design-file-list-gate ④段（跨仓分段核验：既有文件不误报/段内幻觉仍报/未注册段warning指引）
结果：npm test 全量 504 文件 0 失败（连续两轮；触及的 cross-repo-verify 9/9、design-file-list-gate 21/21、plan-target-files 113/113、register-repo-platform-split-brain 7/7 定向复跑全绿）+ npm run lint 通过（643 文件 0 未引用导出）

## ql-20260916-017-2074 | 2026-09-16 13:52:21 | resolveSpecDir 加 tmpdir 硬边界 + 失败行账本三处去噪（friction5 verify 移交项）
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（resolveSpecDir 增 tmpdir 硬边界（坑 temp-root-stray-sillyspec））
- src/verify-postcheck.js（partitionFailures 去噪（✅ 标记/advisory 前缀剔/fail- 复合词中和））
- test/temp-boundary-spec-dir.test.mjs（env 注入隔离复刻事故）
- test/verify-failure-ledger-noise.test.mjs（事故噪声行誊抄+真失败对照）
- docs/sillyspec/platform-interface-map.md（docs check --fix 重锚（本 quick shared.js +13 行漂移 12 处 + 既有 8 处））
- docs/sillyspec/prompt-control-debt.md（同款重锚 3 处（含主变更 worktree-apply 漂移））
需求：resolveSpecDir 加 tmpdir 硬边界 + 失败行账本三处去噪（friction5 verify 移交项）
根因：①resolveSpecDir 祖先链只有 home 守卫无 tmp 边界——Temp 根游离 .sillyspec（某次 cwd=Temp 直系调用遗留）劫持所有 temp 夹具祖先解析，agent-automation-batch4/feedback-batch2 两测试假败的真根因；②partitionFailures 三缺口——✅ 不在 PASS_LINE_RE 标记集、CLI ⚠️ℹ️🔄 advisory 行无剔除类、\bFAIL\b i 标志命中 fail-closed 等工具词汇——verify 实测 20/27 未豁免失败行为噪声
方案：①resolveSpecDir：起点在 os.tmpdir() 子树内（含自身）时走到 tmpdir 层即封顶（整段不检查——temp 下合法 .sillyspec 只会在夹具自身内部）；②partitionFailures：PASS_LINE_RE 补 ✅、新增 ADVISORY_LINE_RE 行首剔 advisory 通道、FAIL_COMPOUND_NEUTRALIZE_RE 判账前中和复合词（真失败词不受剥除，漏检由 fail-safe 兜底）；③docs check --fix 随手重锚 20 处行号漂移（shared.js/worktree-apply.js 头部插入致下方平移）
结果：新测 12 断言全过（temp-boundary-spec-dir 5：env 注入隔离复刻事故；verify-failure-ledger-noise 7：事故噪声 14 行零计入/真失败 7 行全收/豁免照常/fail-safe 不变）；回归 resolveSpecDir 消费方 23/23 + ledger 既有系全绿；docs check 修复回执 20→0
审计：[gate] L1（跨 2 模块 · 9 文件：2 代码/2 测试）advisory；每文件注记缺失（--file-notes 覆盖变更文件全集）；测试增量已含
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：docs/sillyspec/architecture-4a.md, docs/sillyspec/doc-consistency-debt.md
