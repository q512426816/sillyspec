
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

## ql-20260916-018-b5e3 | 2026-09-16 16:38:42 | EHS复盘第二批信任链加固与降噪
状态：已完成
关联变更：（无）
文件：src/docs-debt.js（+7/-2）, src/foreign-declared.js（+25/-16）, src/run/gates.js（+14/-2）, src/run/prompt.js（+31/-1）, src/stage-review.js（+25/-2）, src/stages/execute.js（+1/-0）, src/stages/plan.js（+1/-0）, src/verify-postcheck.js（+34/-18）, src/verify-probes.js（+34/-29）, test/stage-review-degraded-selfreview.test.mjs（+9/-1）, test/stage-review-doc-hash-auto-refresh.test.mjs（+18/-0）, test/temp-boundary-spec-dir.test.mjs（+7/-3）, test/platform-dual-root-fixture.test.mjs（+111/-0）
需求：EHS复盘第二批信任链加固与降噪
根因：docHash放行零痕迹/代落盘不可见/probe1自指噪声/审查重验94分钟/双根hunt三新消费方——EHS会话复盘遗留
方案：刷新序数+hash漂移声明化与升级提醒;代落盘gate审计行;probe1-noqa行级豁免+34处噪声标记;前序review pass清单机械注入派发prompt;evidence双根/声明活性/docs-debt双候选修复+统一夹具;B3登记待立项;修temp-boundary测试cwd缺陷
结果：npm test 513文件0失败+lint过;新夹具4/4;扩展两测试文件用例全绿
审计：[gate] L2（跨 4 模块 · 13 文件：9 代码/4 测试）advisory；模块文档认领缺失（同步模块卡进改动集，或 --no-docs 显式豁免）

## ql-20260916-019-a95c | 2026-09-16 18:54:00 | EHS复盘收尾批：review status 只读查询命令+B3 登记更正+锚定修复
状态：已完成
关联变更：（无）
文件：src/index.js, test/review-status-command.test.mjs, test/temp-boundary-spec-dir.test.mjs, docs/sillyspec/platform-interface-map.md, .sillyspec/knowledge/known-issues.md
需求：EHS复盘收尾批：review status 只读查询命令+B3 登记更正+锚定修复
根因：C1 审查94分钟无收敛期间宿主无只读探针可查状态；B3 登记核实发现 probe5 跨仓已被 368c7e2 兑现（原登记基于 head 截断 grep 误判）；review status 插入致 doc-ref 7 锚漂移；temp-boundary 锚定上跳两层在 runner HOME 重定向下撞真实主目录
方案：index.js review case 新增 status 子命令（verdict/通道/刷新序数/代落盘·降级标记/docHash 现势，文本+json，平台解析同源）；known-issues B3-1 改已兑现、B3-2 收窄为 archive 表侧；temp-boundary case5 改一层上跳锚定；platform-interface-map.md 7 处行号重锚
结果：npm test 全量 514 文件 0 失败（新增 review-status-command 3/3）+lint 过 653 文件；doc-ref-check 88 处全过

## ql-20260916-020-2476 | 2026-09-16 20:03:00 | 探针7跨卡归属+端点提取注释掩码+三条知识登记
状态：已完成
关联变更：（无）
文件：src/verify-probes.js, src/endpoint-extractor.js, test/acceptance-matrix-probe.test.mjs, test/contract-artifacts.test.mjs, .sillyspec/knowledge/known-issues.md
需求：探针7跨卡归属+端点提取注释掩码+三条知识登记
根因：E变更verify实证8格假uncovered（provider acceptance连不上消费卡测试）；端点提取器JSDoc示例被当真路由；撞车预警/per-repo skip/worktree环境失败无登记
方案：probe7归属扩为本卡∪直接下游卡测试（depends_on反向单向）；stripCommentsKeepLength掩码接入Express/Spring提取器；known-issues三条登记
结果：npm test 514文件0失败+lint过；acceptance-matrix-probe 60/60新增跨卡用例；contract-artifacts 41/41新增掩码用例；probe5族10/10零回归

## ql-20260916-021-64c5 | 2026-09-16 22:55:41 | 同阶段复审findings回灌——复审prompt注入上一轮未决与已实证清单
状态：已完成
关联变更：（无）
文件：
- src/stage-review.js（collectSameStagePriorReview+renderPriorRoundFindingsMd 新导出（采集+渲染））
- src/run/prompt.js（independent 档注入同阶段上一轮复审基线块）
- src/stages/brainstorm.js（Design Grill 补 {PRIOR_REVIEW_FACTS} 占位符）
- test/stage-review-prior-round.test.mjs（31 断言（采集/过滤/渲染契约））
- docs/prompt/brainstorm.md（占位符镜像+文档行）
- docs/prompt/plan.md（占位符镜像+文档行（补 ql-018 滞后））
- docs/prompt/execute.md（占位符镜像+文档行（补 ql-018 滞后））
- docs/prompt/_extracted.json（提取脚本重生成）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（变更索引行）
需求：同阶段复审findings回灌——复审prompt注入上一轮未决与已实证清单
根因：独立复审子代理无对话历史，同stage上一轮FAIL的findings与pass面不回灌，复审全量重读且重复报告已修问题（obra/superpowers v6.2 scoped re-review 对照采纳）
方案：stage-review.js 新增 collectSameStagePriorReview（最近有效轮采集：跨变更过滤/骨架跳过/fail无明细notes合成）+renderPriorRoundFindingsMd（未决逐项核验+pass勿重复报告双向语义15条封顶）；prompt.js independent档注入拼进PRIOR_REVIEW_FACTS（self不注入）；brainstorm Design Grill 补占位符；docs/prompt 三md镜像同步
结果：新增单测31断言绿；全量npm test EXIT 0；lint 过；CLI实测注入块渲染正确
审计：[gate] L1（跨 3 模块 · 9 文件：3 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260917-001-7cd6 | 2026-09-17 05:27:09 | execute歧义裁决权限声明——非破坏性自行裁决+记录，破坏性停人
状态：已完成
关联变更：（无）
文件：
- src/stages/execute.js（确认执行范围步歧义裁决权限段+Wave prompt裁决回呼）
- test/execute-ambiguity-ruling.test.mjs（15断言（协议关键词面））
- docs/prompt/execute.md（镜像同步两段）
- docs/prompt/_extracted.json（提取重生成）
- docs/sillyspec/platform-interface-map.md（execute.js行漂移重锚（docs check --fix））
- docs/sillyspec/architecture-4a.md（同重锚）
- docs/sillyspec/prompt-control-debt.md（同重锚）
- .sillyspec/docs/sillyspec/modules/stages.changelog.md（变更索引行）
需求：execute歧义裁决权限声明——非破坏性自行裁决+记录，破坏性停人
根因：执行撞plan/design歧义无分级协议：可控歧义停人（外部实测9小时停摆）或静默猜测零记录（Superpowers v6.3 recorded rulings对照）
方案：确认执行范围步新增裁决段（非破坏性=裁决落主仓decisions.md新条目D-xxx@v1接续编号+Wave完成披露；破坏性/不可逆=--wait停人；拿不准按破坏性fail-closed）；buildWavePrompt紧凑回呼（子代理冲突回主代理裁决不自行记）
结果：新增单测15断言绿；全量npm test EXIT 0（行漂移重锚后）；lint过；CLI门禁实测通过
审计：[gate] L1（跨 1 模块 · 8 文件：1 代码/1 测试）advisory；每文件注记已全覆盖；测试增量不适用（≤1 代码文件）

## ql-20260917-002-5d8f | 2026-09-17 05:48:53 | plan全局硬约束段+实现者子代理触达
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（full模板全局硬约束段+汇总指引句）
- src/stages/execute.js（buildWavePrompt机械提取注入子代理要点第9条）
- test/plan-global-constraints.test.mjs（14断言）
- docs/prompt/plan.md（镜像同步两处）
- docs/prompt/_extracted.json（提取重生成）
- docs/sillyspec/platform-interface-map.md（行漂移重锚）
- .sillyspec/docs/sillyspec/modules/stages.changelog.md（变更索引行）
需求：plan全局硬约束段+实现者子代理触达
根因：plan.md无绑定所有task的硬约束承载体，designHotzone只达Wave协调者层，实现者子代理只读自己的卡不被design硬约束触达（Superpowers v6.0实测约束verbatim进plan才达下游，对照组2-4轮修复还漏真bug）
方案：plan.js full模板新增「##全局硬约束（从design.md逐字抄录）」段+指引句；execute.js buildWavePrompt机械提取该段作子代理要点第9条（冲突以本段为准并上报），advisory缺省零注入，超2400截断
结果：新增单测14断言绿；全量npm test EXIT 0（行漂移重锚后）；lint过；CLI门禁实测通过
审计：[gate] L1（跨 1 模块 · 7 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260917-003-d9c7 | 2026-09-17 06:04:13 | plan全局硬约束段存在性warning校验
状态：已完成
关联变更：（无）
文件：
- src/stage-contract-spec.js（plan.global-constraints warning清单条目）
- src/stage-contract.js（validatePlanOutputs读planLevel传ctx）
- test/plan-global-constraints-warning.test.mjs（12断言）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（变更索引行）
需求：plan全局硬约束段存在性warning校验
根因：ql-20260917-002落地的段只有模板指引与execute注入，plan收口缺段零提示（留账收口）
方案：stage-contract-spec清单加plan.global-constraints warning条目（literal-any+condition planLevel eq full）；validatePlanOutputs读plan.md frontmatter plan_level传入引擎ctx，读不到跳过零误报
结果：新增12断言绿；stage-contract-spec/test契约回归双绿；全量npm test EXIT 0；lint过；CLI门禁实测通过
审计：[gate] L1（跨 1 模块 · 4 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260917-004-1a8a | 2026-09-17 08:59:47 | quick流程反馈两修复——SKILL文档--input标必带+step3核对示例虚构占位化
状态：已完成
关联变更：（无）
文件：
- .claude/skills/sillyspec-quick/SKILL.md（--input升必带+示例命令全补；并行会话的两条要点删除经hunk分离留在工作区未暂存）
- src/stages/quick.js（step3补括注示例虚构占位化+--file-notes时效描述修正）
- docs/prompt/quick.md（镜像同步+step1存量漂移修复）
- docs/prompt/_extracted.json（镜像流水线再生成）
- .sillyspec/docs/sillyspec/modules/stages.changelog.md（ql-20260917-004变更索引）
需求：quick流程反馈两修复——SKILL文档--input标必带+step3核对示例虚构占位化
根因：用户2026-09-17工具使用小结两条摩擦：①漏--input启动触发CLI警告劝重启白跑一轮，根因是skill文档启动示例未把--input标为必带；②step3核对说明嵌auth/captcha仿真路径示例，多会话并行时可误认成本会话QUICKLOG条目
方案：①SKILL.md参数表--input升「启动必带（agent视角必填）」并补漏带代价，生命周期命令与全部典型用法示例补--input（保留两豁免：关联变更自动提取标题、CI无语义）；②quick.js step3补括注示例改带「虚构占位示例，非任何会话的真实条目」标注的<path/to/…>占位符并明示核对对象是本会话<quicklog-id>条目；③顺带修正quick.js --file-notes非末步行为描述（静默丢→硬拒绝重跑，依CLI实证）；docs/prompt/quick.md+_extracted.json镜像流水线同步（顺带修step1知识库段存量漂移）；stages.changelog.md追加变更索引
结果：定向测试8/8通过（quick-step1-injection/quick-testcase-design-include/quicklog-cli-managed/quick-session-guard-cleanup），lint 658文件全绿，docs/prompt/_verify.mjs exit 0，末步--done门禁CLI亲测npm test+lint通过
审计：[gate] L1（跨 1 模块 · 4 文件：1 代码/0 测试）advisory；每文件注记已全覆盖；测试增量不适用（≤1 代码文件）

## ql-20260917-005-fe92 | 2026-09-17 10:39:14 | 用户驾驭小结（六）负面三修：①brainstorm「新建文件需 NEW: 前缀」核验在第 8 步末才拦（Step 6 写清单时无提示浪费一轮返工）②平台同步会话…
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm.js（Step6 清单段 NEW: 前缀铁律）
- src/design-facts.js（骨架清单段示例行+铁律注释）
- src/sync.js（syncDocuments 指纹去重（manual 旁路））
- src/stage-review.js（refresh-hash noop-unchanged 幂等分支）
- src/progress/stage-machine.js（show 信号优先折叠（CAP=8））
- src/progress.js（show 三参透传）
- src/index.js（--all 解析+帮助行+noop 打印）
- docs/prompt/brainstorm.md（镜像 fence 手改）
- docs/sillyspec/platform-interface-map.md + docs/sillyspec/architecture-4a.md + docs/sillyspec/prompt-control-debt.md + .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md（sync.js 行漂移 docs check --fix 重锚）
- test/feedback2-quickfix.test.mjs（新增直测）
需求：用户驾驭小结（六）负面三修：①brainstorm「新建文件需 NEW: 前缀」核验在第 8 步末才拦（Step 6 写清单时无提示浪费一轮返工）②平台同步会话中反复回写变更文件（两次撞 file modified since read、LF/CRLF 归一）③progress show 输出 29 个滞留变更完整清单噪音大
根因：①规则只在 design-facts validateDesignFileList 的 --done 门禁与 machine-interface gate 预检（不主动跑预检则写作期零提示）②静态排查证实平台侧无自动回写本地 md 路径（pull 只写 DB/spec 树只推/bundle 恢复显式）——干扰源是 CLI 就地重写（register-stage-review --refresh-hash 整文件重写 bump mtime 打断 Read→Edit，上批会话两次实证）+ 每条命令 syncDocuments 全量 POST 刷「已同步 N 个文档」放大体感③stage-machine.show 多变更分支逐变更 3-5 行详情无折叠
方案：①brainstorm.js Step6 清单段+design-facts 骨架清单段双面新增「路径存在性核验（NEW: 前缀铁律）」（示例行同步 NEW: 前缀）；brainstorm.md 镜像 fence 手改（_extracted 让路并行会话）②syncDocuments 四件套 sha256 指纹 marker 去重（未变跳过 POST deduped:true，成功才落 marker，manual 旁路）+ register-stage-review --refresh-hash docHash 已一致 noop-unchanged（不写盘不 bump mtime）③stage-machine.show 信号优先折叠（有信号保持详情/无信号单行超 8 折叠计数/--all 展开；progress.js+index.js 透传；--json 不动）
结果：feedback2-quickfix.test.mjs 5 断言组全绿；全量 521/521 exit 0；lint exit 0；docs check --fix 重锚 4 份活文档行号锚（sync.js 插入段漂移的机械修复）；cli-top-level-aliases 一次状态性 flake 经配对复现+HEAD 对照证实非本次引入。--no-docs 豁免理由：三修均为提示文案/输出格式/幂等去重级内部行为，模块契约面零变化（NEW: 规则自证于 prompt+骨架两写作面；折叠不改 progress 数据契约；去重不改同步协议）；模块 changelog 正被并行会话暂存占用，避免同文件冲突。--force-baseline 理由：progress.js/stage-machine.js 受保护面正是反馈③的修复目标本体（输出折叠），ARCHITECTURE.md 为重锚机械修复。
审计：[gate] L2（跨 6 模块 · 13 文件：7 代码/1 测试）advisory；模块文档认领已 --no-docs 显式豁免

## ql-20260917-006-1deb | 2026-09-17 18:50:28 | 用户法证复现撤回「平台同步回写」归因后暴露的真实工具缺口：take-platform 回放/pull --spec 解包/worktree apply 三个批量…
状态：已完成
关联变更：2026-09-17-pass-cap-semantics
文件：
- src/write-audit.js（新模块 appendWriteAudit+detectCrlfFiles+CAP）
- src/sync.js（take-platform 落盘循环审计+CRLF 即时 warn+pull 解包审计）
- src/worktree-apply.js（merge 成功出口审计行）
- test/write-audit.test.mjs（5 断言组）
- .sillyspec/docs/sillyspec/modules/_module-map.yaml（sync 段补录）
- docs/sillyspec/platform-interface-map.md（sync.js 行漂移重锚（6 处））
需求：用户法证复现撤回「平台同步回写」归因后暴露的真实工具缺口：take-platform 回放/pull --spec 解包/worktree apply 三个批量写入口「单命令批量整文件重写+逐字节保留来源行尾+零持久留痕」——他机 CRLF 内容原样落盘且事后无任何日志可查（实证只能靠 3 文件毫秒级同 mtime 考古，用户按时间戳找 daemon 日志必然落空，因日志根本不存在）
根因：静态枚举证实：sillyspec 自产文件一律 LF（taskcard/plan-adopt-waves 显式声明，fs.writeFileSync 字符串写盘跨平台 LF）；唯一的字节回放写入方=resolve --take-platform 的 _takePlatformSpecPaths（writeFileSync(full, data) 逐字节、循环内连写=毫秒级同 mtime、文件集=冲突集可恰为 3 个）与 pull --spec 整树解包；worktree apply 是主仓面批量写入（patch/merge）。三者的写入证据只有当次 console 打印（进程结束即蒸发）——法证级时间戳查询无落点
方案：src/write-audit.js 新零依赖模块：appendWriteAudit(specDir, record) 追加 JSONL 到 .runtime/write-audit.jsonl（ts ISO/via/文件集/CRLF 画像，fail-open，WRITE_AUDIT_FILE_CAP=20 截断帽）+ detectCrlfFiles（Buffer.includes \r\n，string/Buffer 双形态）；三入口接线——_takePlatformSpecPaths 落 via:platform-resolve-take-platform（overwritten/removed/files/crlfPaths/crlfCount）+ CRLF 非空即时 warn（「他机编辑器产物按字节回放，autocrlf 提示属预期」防再误诊）；pullSpecBundle 解包落 via:pull-spec-bundle（fileCount/crlfCount，>4MB 大文件跳过采样）；applyWorktree merge 成功出口落 via:worktree-apply（manifestFace/删除面）；module-map sync 段补录 write-audit.js
结果：test/write-audit.test.mjs 5 断言组全绿（JSONL 追加+目录自建/异常 fail-open/CRLF 混合面精确命中含二进制/三入口源文本锚/CAP 常量）；回归 12/12+17/17；全量 522/522 exit 0；lint 绿；下次「18:09 谁动了 design.md」查 write-audit.jsonl 一行即中

## ql-20260917-007-b35d | 2026-09-17 21:45:44 | doctor 新增归档完整性重扫维度 archive_integrity（对标 OpenSpec validate --archived，能力先行钩子后置）
状态：已完成
关联变更：（无）
文件：
- src/doctor-diagnostics.js（D14 维度 detectArchiveIntegrity + runDoctorDiagnostics 注册，legacy 完成源切换规则钉在注释）
- test/doctor-archive-integrity.test.mjs（新文件，13 断言组 23 断言）
- .sillyspec/docs/sillyspec/modules/core-engine.md（最近变更行+frontmatter 时间戳同步）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（边车追加 ql-007 行）
需求：doctor 新增归档完整性重扫维度 archive_integrity（对标 OpenSpec validate --archived，能力先行钩子后置）
根因：归档前门禁虽严，目录搬进 changes/archive 后无任何机制回头看——手工搬目录绕流程/归档后手改 tasks.md 无人发现；且 task-truth-unify 前旧归档完成态勾在 plan.md，朴素读 tasks.md 会全量误报
方案：doctor-diagnostics.js 新增 D14 archive_integrity——遍历 changes/archive 逐目录核验任务全勾+plan.md 在场+注册表不可读必报不静默（#205 教训）；完成源 tasks.md 优先回退 plan.md，legacy 切换规则=tasks 有行 0 勾且 plan 至少 1 勾时以 plan 为完成源；WARNING advisory 只读无修复，无钩子挂载（门禁策略另裁）
结果：新测试 23/23 断言全绿（13 组含 legacy 切换/不可读不静默/CLI e2e）；全量 npm test 修复前后两轮均全绿、CLI --done 实测门禁复跑；lint 绿；真实仓首扫 offenders 43→18 份（消 0/N 全误报），真欠账=16 份老归档缺 plan.md+2 份近期归档测试任务勾选簿记漏翻（6 个测试文件俱在，工作真实完成，补勾与否留用户裁决）
审计：[gate] L1（跨 1 模块 · 4 文件：1 代码/1 测试）advisory；每文件注记已全覆盖；测试增量不适用（≤1 代码文件）

## ql-20260917-008-b66b | 2026-09-17 22:05:55 | 提交边界守卫落地——AGENTS.md第18条加厚(L1)+husky pre-commit commit-guard(L2)…
状态：已完成
关联变更：（无）
文件：
- src/commit-guard.js（analyzeStagedFace纯函数可直测+main fail-open，git调用stdio管道化防漏噪）
- .husky/pre-commit（新钩子node调commit-guard加true兜底，形态对齐pre-push）
- test/commit-guard.test.mjs（新文件19断言）
- AGENTS.md（第18条加厚——commit同pathspec/cached全量核对/禁链行+守卫指引）
- .sillyspec/docs/sillyspec/modules/_module-map.yaml（sync模块paths补录commit-guard（lint硬门要求））
- .sillyspec/docs/sillyspec/modules/sync.md（最近变更行+模块路径补commit-guard）
需求：提交边界守卫落地——AGENTS.md第18条加厚(L1)+husky pre-commit commit-guard(L2)，根治裸commit扫入并行会话staged文件的事故类
根因：git暂存区是多会话共享状态，裸commit提交的是整个暂存区——今日实证add带pathspec但commit裸跑仍把他会话5个staged文件扫入fb5bc11（事后reset --soft+pathspec外科手术拆回76de238）；纪律层(AGENTS.md)与工具层(钩子)需同时补，纪律会漏钩子不会漏
方案：L1第18条加厚——add/commit同清单pathspec（git commit -m ... -- 文件，他侧staged不被带走）/核对固定git diff --cached --name-only全量禁grep过滤（过滤正是致盲原因）/核对与提交禁链行；L2新增src/commit-guard.js两信号——S1 quick声明面对账（staged含ql patch json时读rows[].declared声明面，超面即警，quicklog账本自身豁免）+S2跨变更目录检测（≥2个changes/name即警），fail-open只警告exit恒0（非git/json损坏/任何异常全静默放行，钩子侧true兜底双保险——钩子挂全会话共享绝不拦人提交），命中写write-audit.jsonl（via=commit-guard）复用法证链；.husky/pre-commit形态对齐既有pre-push；commit-guard录进sync模块（write-audit法证链家族）
结果：19/19断言全绿（6单元+4e2e组，含真实事故复现组——夹带changes文件时stderr指名+write-audit审计行落盘）；全量npm test exit 0；lint首轮被module-map硬门拦（新src文件必须录模块——修复后补录sync模块paths+卡片）；开发中顺带修守卫两缺陷——execFileSync默认透传子进程stderr漏git usage噪音（显式stdio管道化）+非git目录git落--no-index模式行为差异实证
审计：[gate] L1（跨 1 模块 · 5 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260917-009-2ec3 | 2026-09-17 23:43:33 | archive_integrity D14 收尾——豁免账本+簿记补勾+advisory 挂载+DB 漂移核实（用户裁决三件套…
状态：已完成
关联变更：2026-09-17-api-coverage-smoke
文件：
- src/doctor-diagnostics.js（D14 豁免账本三态（exempted/effective/stale））
- test/doctor-archive-integrity.test.mjs（+4 测试组 10 断言）
- .sillyspec/archive-integrity-exempt.yaml（16 份豁免账本（新文件，纪律在头注释））
- .sillyspec/changes/archive/2026-09-07-ir-hardening/tasks.md（task-09 补勾+审计注释）
- .sillyspec/changes/archive/2026-09-08-auto-driver/tasks.md（task-06 补勾+审计注释）
- .husky/pre-push（advisory 段（零阻断））
- .sillyspec/docs/sillyspec/modules/core-engine.md（最近变更行+frontmatter）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（ql-009 行）
需求：archive_integrity D14 收尾——豁免账本+簿记补勾+advisory 挂载+DB 漂移核实（用户裁决三件套，warning 常红即无 warning 先清账）
根因：D14 首扫 18 份欠账两类异质不能同动作：16 份远古归档缺 plan.md 系早于流程约定（伪造文件=篡改历史），2 份近期未勾系归档时勾选簿记漏翻（工作真实完成）；门禁分两段（advisory 先行，ratchet 待清账）
方案：①doctor D14 增豁免账本 .sillyspec/archive-integrity-exempt.yaml（16 份逐份理由；账本内压红+账本外亮红+stale 提示+解析失败 fail-safe，新欠账禁止入账纪律钉头注释）②ir-hardening task-09 与 auto-driver task-06 补勾（六测试文件复核俱在直跑绿，补勾行内嵌审计注释引用本条 ql）③pre-push 追加 advisory 段（零阻断）④DB 漂移核实：listChanges 排除 archive，重激活归档行由 D4 ghostRows 覆盖，无缺口不加
结果：D14 测试 23→33 断言全绿（+4 豁免组：压红/账本外仍红/stale/fail-safe）；真实仓复扫维度转绿（93 份完整+16 豁免，18→0）；全量 npm test exit 0+CLI 门禁实测复跑；模块卡+changelog 同步；ratchet 第二段待欠账稳定另裁
审计：[gate] L1（跨 1 模块 · 6 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260918-001-5faf | 2026-09-18 06:49:35 | 批次A/C留档小债收口：①降级理由文法 HANDOVER_DOWNGRADE_REASON_RE 认 D-xxx@vN 带版本锚（现只认裸 D-\d+，批次A技术债务留档项）②test/check-syntax.mjs PENDING_EX…
状态：进行中
关联变更：（无）
文件：（见实际改动）

## ql-20260918-002-8ad7 | 2026-09-18 06:50:50 | 批次A/C留档技术债务三项收口（降级文法vN锚/白名单清理/正则族单点）
状态：已完成
关联变更：（无）
文件：
- src/verify-probes.js（降级文法正则增vN版本段+正则族收敛import消费）
- src/change-risk-profile.js（三常量export单点化）
- test/check-syntax.mjs（白名单清空）
需求：批次A/C留档技术债务三项收口（降级文法vN锚/白名单清理/正则族单点）
根因：批次A techdebt留档项+批次C QA N-2+批次A R-03长期项，均为范围明确局部修补无设计决策
方案：①HANDOVER_DOWNGRADE_REASON_RE 增 (?:@\d+)? 可选版本段——D-005@v2 类带版本锚的降级理由文法现可命中（fail-closed 不变）②PENDING_EXPORT_WHITELIST Map 清空（五符号 18 处测试引用已全部落地，按白名单纪律删除条目留清空注释）③RECEIPT_SOURCE_CROSS_LAYER_RE/RECEIPT_SOURCE_UNIT_RE/CLI_SMOKE_SOURCE_MARK 三常量 export 单点化 change-risk-profile.js + verify-probes.js import 别名消费（RECEIPT_CROSS_LAYER_RE/RECEIPT_UNIT_RE/SMOKE_RECEIPT_SOURCE_MARK）——消灭双文件逐词同步口径漂移面（G-3 根因），后续增词只改一处
结果：定向 50/0 全绿+lint 绿（671 文件未引用导出 0）；三项均验证通过
审计：📝 文档欠账（D-8）：3 个源码文件改动未同步任何模块文档（涉及模块：core-engine · cli-entry）

## ql-20260918-003-911c | 2026-09-18 07:37:35 | (quick 任务)
状态：已取消
关联变更：（无）
文件：（见实际改动）

## ql-20260918-004-0e26 | 2026-09-18 07:38:37 | PASS封顶双软开洞修复——移交表裸「无」占位行被按有效行计数 + 封顶条件①②④对facts字段缺失fail-open（批次A验收审核P0/P1收口）
状态：已完成
关联变更：（无）
文件：
- src/verify-probes.js（parseHandoverRows裸无行过滤（P0））
- src/stage-contract.js（evaluatePassEligibility条件①②④缺字段fail-closed对齐⑤（P1））
- test/pass-eligibility.test.mjs（A2缺字段块）
- test/verify-handover-structured.test.mjs（裸无行回归钉）
- test/acceptance-matrix-gate.test.mjs（夹具补handover字段）
需求：PASS封顶双软开洞修复——移交表裸「无」占位行被按有效行计数 + 封顶条件①②④对facts字段缺失fail-open（批次A验收审核P0/P1收口）
根因：骨架指引「结论=PASS/FAIL写『无』」与parseHandoverRows过滤规则存在契约缺口——裸无行被数成有效移交且未知类型保守映射成blocking（连带误伤apply门），批次A归档样本handover.count=1即一行无凑数；条件⑤已声明「字段不在场按未跑处理」同族口径但①只认等于not-ran、②④对handover/matrixPartialRows缺失零行为，A自身归档facts缺integrationRan/matrixPartialRows/smokeRan三字段仍PASS——门被自己的洞放行
方案：verify-probes.js parseHandoverRows加裸「无」行过滤（type/item精确相等才跳过，防误杀「无明确去向」类真条目）；stage-contract.js条件①改为不等于ran并补不在场文案、②加handover字段缺失fail-closed分支、④matrixPartialRows缺失按含partial处理（触发前提仍是零有效移交行，真移交行在场不误拦）；factsExpected=false存量兼容边界零改动；测试三处——handover解析加整表裸无回归钉+精确相等防误杀、pass-eligibility加A2缺字段fail-closed块（含防误拦与存量边界断言）、acceptance-matrix-gate夹具补handover字段对齐新契约
结果：定向45/45绿（pass-eligibility/verify-handover-structured/acceptance-matrix-gate/smoke-gate/verify-conclusion-slot五文件）；全量529/0绿；lint check-syntax 671文件绿
审计：📝 文档欠账（D-8）：5 个源码文件改动未同步任何模块文档（涉及模块：core-engine）
审计：[gate] L1（跨 1 模块 · 5 文件：2 代码/3 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260918-005-435a | 2026-09-18 08:40:26 | knowledge-stats 接入 L1 仪表盘——四类 fr-* 事件聚合+索引面扫描+承接引用率（L1 后续钩子 D-006 落地…
状态：已完成
关联变更：（无）
文件：
- src/knowledge-stats.js（buildFrIndexStats+CLI 两面）
- test/knowledge-fr-stats.test.mjs（新文件 15 断言）
- .sillyspec/docs/sillyspec/modules/core-engine.md（最近变更+frontmatter）
- .sillyspec/docs/sillyspec/modules/core-engine.changelog.md（ql-005 行）
需求：knowledge-stats 接入 L1 仪表盘——四类 fr-* 事件聚合+索引面扫描+承接引用率（L1 后续钩子 D-006 落地，观察期满直接出数裁决 L3）
根因：L1 设计只落事件流（D-006：聚合后续变更）——裁决时手数 jsonl 则实验失真；分母从索引文件读不往归档管线加事件
方案：buildFrIndexStats 四事件计数去重+unreferenced 按域+scanFrIndex 索引面+承接引用率（口径差异标注裁决用大窗口）；present 三态+前向兼容；CLI --json frIndex 键+人类模式实验段
结果：15/15 新断言+既有 stats 36/0+全量 531/0+CLI 门禁实测；真实仓活视图：4 条 active/1 来源/率 0%（第零天基线）；模块卡+changelog 同步
审计：[gate] L1（跨 1 模块 · 4 文件：1 代码/1 测试）advisory；每文件注记已全覆盖；测试增量不适用（≤1 代码文件）

## ql-20260918-006-f6e5 | 2026-09-18 17:32:28 | 影子 client 供给面接入（ceremony-risk-pricing 移交项 P3-1）：CLI 进程影子派发永不组装平台 client…
状态：已完成
关联变更：（无）
文件：src/run/gates.js（+24/-9）
需求：影子 client 供给面接入（ceremony-risk-pricing 移交项 P3-1）：CLI 进程影子派发永不组装平台 client，每次轻档完成必走 platform-client-missing skip，影子期对照数据无法积累——定价变更的防暗降兜底为空
根因：task-06 接线时设计取舍「本层不组装 client」，execute 独立评审定为 gap（client 供给面）复审收窄为移交项；平台 client 构造先例（index.js:1273）一直存在，属一行接线成本。危险文件判定说明：gates.js 命中门禁核心路径，但本次改动是影子派发 fire-and-forget 旁路段（新增 client 组装），不触碰任何门判定逻辑——定向回归（stage-completion-atomicity/noai-completion-gate）+lint 全绿佐证
方案：gates.js 影子接线处懒加载 SillyHubMcpClient 注入（Promise.all 双动态 import + 构造失败传 undefined 走函数内 skip）；构造只读 local.yaml 不联网，未配平台仓仍 probe no-config 合理 skip
结果：端到端实证：S1 档位+注入 client → 真实派发成功（mission cbb27116/worker 7386f671/shadowRunId 落账）——影子链路首次真实开火；无档位变更仍 tier-file-missing skip（前置链不回归）；定向绿+lint 全绿（677 文件未引用导出 0）；影子期对照数据自此开始积累，doctor ceremony_shadow 维度不再恒空

## ql-20260918-007-e242 | 2026-09-18 19:34:49 | 消灭定价双轨：classifyReviewTier 未喂真实判级，plan_level=full 代理映射把实判 S1 的变更推成 S2 independent…
状态：已完成
关联变更：（无）
文件：src/review-tier.js（+67/-22）, test/stage-review.test.mjs（+54/-15）
需求：消灭定价双轨：classifyReviewTier 未喂真实判级，plan_level=full 代理映射把实判 S1 的变更推成 S2 independent（回放实验实证：档位文件 S1 vs 审查面 S2，同一变更两个价）
根因：task-02 委托时调用侧未透传 riskDetection（task-05 遗留#4），三调用点全走 plan_level 代理兜底链
方案：classifyReviewTier 内部升级组装链：riskDetection ＞ design/plan 实判（真跑 detectChangeRisk+显式 frontmatter 并入）＞ plan_level 代理降兜底；档位文件在场且更高时只升不降并入；三调用点零改动
结果：回放 design 实测 S2→S1/self（CLI 清单核验）；测试翻新 4 断言+新增 1c 回归组；stage-review/spec-drift/gate 回归+lint 全绿；S1 轻仪自此真实生效
