
## ql-20260922-003-ad68 | 2026-09-22 09:32:04 | task done 四合一：review write+勾选→finish→可选 wt-commit 单命令串行，子步幂等断点重入（r5l 方案1/护栏#3）
状态：已完成
关联变更：（无）
文件：
- src/task-done.js（新建 runTaskDone 编排器（四子步幂等/断点续/拒改写继承））
- src/index.js（task case 新增 done 分支（--verdict/--notes/--evidence/--commit -m/--pathspec-from-file/--透传/用法文本））
- test/task-done.test.mjs（新建 4 用例（happy 四段/重入幂等/改判拒+force/中段失败断点续））
- .sillyspec/docs/sillyspec/modules/_module-map.yaml（src/task-done.js 录 core-engine）
需求：task done 四合一：review write+勾选→finish→可选 wt-commit 单命令串行，子步幂等断点重入（r5l 方案1/护栏#3）
根因：13 任务×4 连收尾往返（review write/finish/wt-commit）≈52 次 CLI 调用纯属可合并——每次往返按当时全量上下文计费，合并后每任务省 3 次 ~300K 重发（R5-L 桶① 实证）
方案：src/task-done.js runTaskDone 编排器+index.js done 分支：①writeTaskReview 同源落 review.json（幂等=同 runId 同 task 同双 verdict 跳过；改判默认拒改写继承拒覆盖，--force 越过；--base/--head/--changed-files 透传对齐 review write）②autoCheckPlanFromReviews 勾选（fail-soft）③finish 标记清除（不在即跳）④可选 runWtCommit（显式 pathspec 纪律/无变更自然 skip/锁与 worktree 判定继承）；四段结果行合并输出；失败精确报告已完成子步+重入指引
结果：task-done 4/4（含中断半态重入幂等用例：全跳零副作用 review 逐字节不动 HEAD 不动；wt-commit 中段失败点名+断点续）；review-write/backfill/wt-commit/task-review-schema 单独通道回归全绿；CLI bin 冒烟退出码正确；lint 741 过（module-map 录 core-engine）；全量 581/582（唯一失败 doc-ref-check=并行会话 command.js 在途行号漂移，零交集留痕）
审计：[gate] L1（跨 2 模块 · 3 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260922-004-6353 | 2026-09-22 09:49:00 | verify 填槽制：--init --draft 四节机器预填+指纹，--done 篡改门禁拒收整份重写（r5l 方案3/护栏#2）
状态：已完成
关联变更：（无）
文件：
- src/verify-draft.js（新建（四节机器句子/指纹标记对/sidecar 台账/三态违规判定/amend 重锚审计））
- src/index.js（verify-probes 接 --draft（需 --init）与 --amend-draft 分支+用法文本（draft 材料构建与 verify 门同源））
- src/run/gates.js（verify --done 新增 draft 篡改门禁（探针抽查 rollback 先例同款，fail-soft；判定链零旁路））
- test/verify-draft.test.mjs（新建 3 用例（形态+幂等+槽契约/篡改四态/amend 留痕））
- .sillyspec/docs/sillyspec/modules/_module-map.yaml（src/verify-draft.js 录 core-engine）
- docs/sillyspec/platform-interface-map.md（六处 index.js 行号漂移修复（3988/2678/2954/3909/3861/3674/3771，docs check 对账过——剩余 3 处 command.js 漂移属并行会话在途））
需求：verify 填槽制：--init --draft 四节机器预填+指纹，--done 篡改门禁拒收整份重写（r5l 方案3/护栏#2）
根因：verify-result.md 被读写 14 次、每次 heredoc 整份回填一次全量重发（两次各挂起 7min；R5-L 桶② 实证）——模板 29KB 里 CLI 已能机械预填大部分，agent 手写面应收窄到三槽
方案：src/verify-draft.js（buildDraftSections 四节完整句子/transformSkeletonToDraft 指纹标记+三 AGENT 槽+横幅/applyDraftMode 落盘+sidecar/checkDraftIntegrity 三态违规/amendDraftMarkers 重锚+审计）+CLI --draft（需 --init）/ --amend-draft+gates.js --done 门禁（标记删/哈希失配/手工重锚未审计→阻断回滚；AGENT 槽不受限；无 sidecar 零红；门禁异常 fail-soft）；结论枚举槽行契约逐字不动；零 prompt 劝说（P8）；另修 platform-interface-map.md 六处 index.js 行号漂移（本改动 +110 行所致，docs check 对账过）
结果：verify-draft 3/3（draft 形态四节+三槽+幂等/篡改门禁内容改写-标记整删-手工重锚拒收+AGENT 槽放行+无 sidecar 零红/amend 重锚放行+审计在案+修正内容保留）；verify 族回归全绿；CLI bin 冒烟三态；lint 743 过（module-map 录 core-engine）；全量 582/583（唯一失败 doc-ref-check 剩余 3 处=并行会话 command.js 在途行号漂移，与本改动零交集留痕）；工作流 draft→填槽→复核 读写 ≤3 次结构达成
审计：📎 文档引用失效：3/93 处 file:line 失效（sillyspec docs check 可复现）
审计：   ❌ [docs/sillyspec/platform-interface-map.md:133] command.js:1557 → src/run/command.js: 关键词缺失：期望任一「_write / triggerSync / _getPlatform」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过关键词断言
审计：   ❌ [docs/sillyspec/platform-interface-map.md:134] command.js:1970 → src/run/command.js: 关键词缺失：期望任一「checkApproval」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过关键词断言，层1 行界仍校验——勿删行号）
审计：   ❌ [docs/sillyspec/platform-interface-map.md:135] command.js:875 → src/run/command.js: 关键词缺失：期望任一「SILLYSPEC_AGENT_LOG / recordAgentLogInvocation」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后
审计：🔧 行号漂移已自动重锚 3 处（同口径复跑：3 → 0；剩余 0 处需人工 sillyspec docs check）
审计：[gate] L1（跨 3 模块 · 5 文件：3 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260922-005-0f85 | 2026-09-22 17:47:25 | task-done 四合一 review.head 回填（提交后重锚根治）
状态：已完成
关联变更：（无）
文件：src/task-done.js（+25/-1）, test/task-done.test.mjs（+5/-0）
需求：task-done 四合一 review.head 回填（提交后重锚根治）
根因：task done 的 review 写在 wt-commit 前，head 停在基线 → Task Review Gate base..head 切片空误判零改动伪造（R7 会话 5 份手工重应急，坑 task-done-head-premature）
方案：子步 4 提交成功（HEAD 前移且 review 在场）即回填 review.head=提交全哈希+headBackfilledAt 审计戳+结果行留痕；fail-soft；skipped 提交不触发（幂等复跑 review 逐字节不动）
结果：task-done 4/4（happy 增 head===worktree HEAD 断言+审计戳+留痕行）；task-review 族 8 组零回归；lint 753 文件绿

## ql-20260922-006-8474 | 2026-09-22 17:58:38 | R7 dogfood 复盘行动项落盘（环境一致性测试纪律+设计模板两项自查）
状态：已完成
关联变更：（无）
文件：src/stages/brainstorm.js（+11/-0）
需求：R7 dogfood 复盘行动项落盘（环境一致性测试纪律+设计模板两项自查）
根因：套件阀继承使 env 门控断言套件内红裸跑绿；gitignored 配置中途修改不进快照 overlay；设计死亡面无人审（41 孤儿）；两裁定组合出归档死锁
方案：conventions 新增 env 双模式纪律+INDEX 路由；brainstorm 设计模板增 10b 非功能生命周期节与多裁定组合推演自查
结果：lint 753 绿；brainstorm-plan-contract 零回归；guidance 级不进 gate 硬校验存量零影响

## ql-20260922-007-3446 | 2026-09-22 18:12:22 | flow start 补 watcher 拉起接线（薄跑道观测面完整）
状态：已完成
关联变更：（无）
文件：（见实际改动）
需求：flow start 补 watcher 拉起接线（薄跑道观测面完整）
根因：flow start 走 index.js 分发不经 runCommand，change 启动即观测在薄跑道落空（R7 测试环境准备时实测发现）
方案：cmdFlowStart 建卡后独立 spawnWatcher（无条件+单飞锁合并+best-effort+未连平台也 spawn，与 command.js 同语义）
结果：flow 族 10/10 零回归+lint 753 绿；demo 真 watcher 冒烟：拉起到 archived 事件落 jsonl 后干净自退零泄漏

## ql-20260923-001-b3d2 | 2026-09-23 00:09:02 | 指路牌回归：AGENTS.md 规则 3/6 改回完整流程（run 族五阶段）为默认，薄道降实验通道
状态：已完成
关联变更：（无）
文件：
- AGENTS.md（规则3/6 指路牌回归（完整流程默认+薄道降 flow.mode: thin 实验通道附注））
- C:/nvm4w/nodejs/node_modules/sillyspec/AGENTS.md（仓外全局包同款同步立即生效（不入本仓 git））
需求：指路牌回归：AGENTS.md 规则 3/6 改回完整流程（run 族五阶段）为默认，薄道降实验通道
根因：此前指引被改为薄流程（flow start/done 两调用）默认，产品已裁定回归旧流程为主体
方案：两处 AGENTS.md 同款改动（仓内 + 全局包 C:/nvm4w/nodejs/node_modules/sillyspec/AGENTS.md）：规则 3 改回完整流程五阶段（每阶段一次渲染+一次 --done 收口；local.yaml 开 stage.burst 时一次下发全部步骤说明书；verify 用 --init --draft 机器预填），flow start/done 降为 flow.mode: thin 显式开启的实验通道附注；规则 6 保留决策密度判据，剔除 --thick/缺省薄流程/机器草稿转厚档等薄道措辞，回归 quick/完整流程二分。全局包 SKILL.md/INSTRUCTIONS.md 查无薄默认措辞未动，源头已改下次打包自然一致
结果：纯 doc 零代码，测试门自动跳过；验收 grep 四文件零命中勿再用/薄流程默认/--thick/机器草稿残留，规则 3 三标记（完整流程/一次渲染一次--done/flow.mode: thin 实验通道）均在

## ql-20260923-002-7473 | 2026-09-23 00:18:22 | quicklog 检索导线扩 flow 变更源
状态：已完成
关联变更：（无）
文件：
- src/knowledge-quicklog.js（parseQuicklogEntries 扩双信号源（flow 归档伪条目+source 排序键））
- test/knowledge-quicklog.test.mjs（增源② fixture 与 5a-5j 断言）
需求：quicklog 检索导线扩 flow 变更源
根因：flow 族变更不产生 quicklog 条目，parseQuicklogEntries 只扫 quicklog/QUICKLOG-*.md 单源——flow 变更知识不在检索面（与 ql-011 同族病）
方案：parseQuicklogEntries 扩双源：parseQuicklogFileEntries 原逻辑零变化；新增 parseFlowArchiveEntries 扫 changes/archive 含 flow-state.yaml 目录合成伪条目（qlId=变更名/date=目录名日期前缀 mtime 兜底/title=proposal.md 首 # 行缺件退变更名/files 恒空）；条目增 source 字段，排序加 source 键双源命中 quicklog 排前；全链 fail-open
结果：knowledge-quicklog 28/28（新增 5a-5j：双源聚合/伪条目三料/flow 变更可命中/quicklog 排前/无 flow-state 目录不入源/mtime 兜底），knowledge-inject 47/47 零回归，全量门禁由 --done 亲测
审计：📝 文档欠账（D-8）：2 个源码文件改动未同步任何模块文档（涉及模块：core-engine）

## ql-20260923-003-4829 | 2026-09-23 00:24:05 | 测试最低面门槛 advisory（薄道/burst 测试厚度显性化）
状态：已完成
关联变更：（无）
文件：
- src/run/quick-audit.js（buildTestSurfaceAdvisory+门禁接线（同文件他者 hunk 已分离））
- test/quick-test-gate.test.mjs（增 11a-11n 断言）
需求：测试最低面门槛 advisory（薄道/burst 测试厚度显性化）
根因：R7-L 重放实测测试量仅为旧流程 40%——薄道 flow done ledger 子步与 burst 收口走 runQuickTestLintGate，无 quick 出口 L1 门禁 testDelta 检查，测试厚度零约束
方案：quick-audit.js 增导出纯函数 buildTestSurfaceAdvisory：交付文件（剔 .sillyspec）中 src 类 ≥3 且测试文件 0 改动（P2 账本测试面同态无增量）→ 一行警告文案，负例 null；runQuickTestLintGate 两条早退后接线 console.warn——advisory 不阻断，action/failed 零改动；代码判定正则提为模块级常量复用。同文件并发处置：他者未提交 hunk（restrictFiles 接线/快照 lint 主仓对照）按分离纪律排除在提交 f3737663 外、原样留工作树
结果：quick-test-gate 42/42（新增 11a-11n 三负例零输出+正例一行警告+接线三态）+quick-gate-snapshot 4/4+semantic-guard 30/30+flow-protocol 7/7 零回归+主仓全量 EXIT=0

## ql-20260923-004-e764 | 2026-09-23 00:50:02 | 模块文档认领 advisory（归档链资产缺口显性化）
状态：已完成
关联变更：（无）
文件：
- src/run/complete-handlers.js（deriveFlowDeliverableFace+buildArchiveModuleDocAdvisory+runArchiveChain 接线（受保护文件 --force-baseline 放行））
- src/decision-distill.js（parseModulePathsSubset 导出+doc 捕获+discoverModuleIndex 合并保 doc）
- test/archive-chain.test.mjs（新增 4 测试（单元+集成））
- docs/sillyspec/platform-interface-map.md（行号锚 2419→2512 重锚）
- .sillyspec/docs/sillyspec/modules/runtime.md（行号锚 579→768 重锚）
- docs/sillyspec/file-lifecycle.md（行号锚 597→768 重锚）
- .sillyspec/knowledge/decisions/unmapped.md（行号锚 1340→1453 重锚）
需求：模块文档认领 advisory（归档链资产缺口显性化）
根因：flow done/burst 收口不产生模块文档增量——旧流程的文档同步挂在 execute/verify 步骤里，薄道绕过；R7-L 重放实证零模块文档
方案：complete-handlers.js runArchiveChain 顶部接线 advisory（fail-open 不阻断）：deriveFlowDeliverableFace 从 srcDir/flow-state.yaml 的 baseline_commit 自算交付面与 docs 增量（flow.js changedFilesSinceBaseline 同口径本仓实现——flow.js 为并行会话在改不 cross-import；非 flow 变更跳过，legacy archive 有 module-impact 死信硬门）；buildArchiveModuleDocAdvisory 按 docs/<项目>/modules/_module-map.yaml 扫描（decision-distill parseModulePathsSubset 同源解析，导出复用+增 doc 标量捕获），交付面前缀交集 ≥1 且无 .sillyspec/docs/** 增量 → 一行警告列未认领模块卡路径；调用方显式 deliverableFiles/docsIncrement 参数优先（burst 等未来调用方）。附带：插行致 3 处活文档行号锚漂移已重锚（runtime.md/file-lifecycle.md/unmapped.md）
结果：archive-chain 7/7（新增 4：命中列卡路径/三负例零输出/基线自算两段并入/归档链集成正例出警告不阻断+负例零输出）；decision-distill 三件+fr-index 两件+archive-distill-noai+flow-protocol 7/7 零回归；无新文件故无 module-map 登记
审计：📎 文档引用失效：1/96 处 file:line 失效（sillyspec docs check 可复现）
审计：   ❌ [docs/sillyspec/file-lifecycle.md:291] gates.js:1259 → src/run/gates.js: 关键词缺失：期望任一「validatePlanForExecute / parseTaskRegistry」在 [start-2, end+5] 窗口内（跨文件引用/论述语境的纯位置锚：行号后加 ? 跳过
审计：🔧 行号漂移已自动重锚 1 处（同口径复跑：1 → 0；剩余 0 处需人工 sillyspec docs check）
审计：[gate] L1（跨 2 模块 · 6 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260923-005-74fe | 2026-09-23 04:03:19 | watcher alerts 查询命令——哨兵告警可视化出口（quick）
状态：已完成
关联变更：（无）
文件：
- src/watcher.js（新增 watcherEventsPath+readWatcherEvents 纯读导出（jsonl 解析+告警过滤+坏行容忍），default 导出同步补录）
- src/index.js（case 'watcher' alerts 子命令分发+usage 行+topCommands 补录）
- test/watcher-alerts.test.mjs（10 例（纯函数 3+CLI 面 6+follow 子进程 1））
- .sillyspec/docs/sillyspec/modules/sync.md（watcher 段落补纯读出口一笔+对外接口表两行）
需求：watcher alerts 查询命令——哨兵告警可视化出口（quick）
根因：哨兵规则引擎（1a91587c）已把 warning 事件落 .sillyspec/.runtime/watcher-events-<变更名>.jsonl，但查看只能人肉 grep，缺一条顺手查询命令
方案：src/watcher.js 导出纯读 readWatcherEvents+watcherEventsPath（jsonl 解析+告警子集过滤（kind/severity=warning 双字段容差，对齐 mkWarning 实际写出形态）+坏行容忍计数（readKnowledgeHits 先例）+缺失 exists:false）；src/index.js 加 case 'watcher' 分发 alerts 子命令：--change 必填+assertSafeChangeName 防路径穿越，--all 全事件（kind 入 rule 列），--follow 2s 轮询按 events 序号锚水位增量打印+SIGINT 末次统计，表格 本地时间|rule|detail（截80）+统计行「N 条告警 / M 条事件」+坏行注记，文件/目录缺失友好提示 exit 0，runtimeRoot 与 spawnWatcher 同源（--runtime-root > 平台指针 > specBase/.runtime，resolveRuntimeRoot 单点）；usage 行+topCommands 补 watcher；sync.md 登记导出（段落一笔+接口表两行）
结果：新测 test/watcher-alerts.test.mjs 10/10 绿（readWatcherEvents 纯函数 3+CLI 面 6+--follow 子进程杀超时真轮询 1）；watcher+sentinel 回归 41/41 零失败；lint 757 文件未引用导出 0+module-map 覆盖全；真仓冒烟：sentinel-rules 流缺省 0 告警/23 事件、--all 全列、缺失 two-case exit 0
审计：[gate] L1（跨 2 模块 · 4 文件：2 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260923-006-9f78 | 2026-09-23 08:11:48 | 哨兵假勾选规则 worktree 盲区修复：buildSnapshot 提交证据并入 sillyspec/<change> 分支（hash 去重并集）
状态：已完成
关联变更：（无）
文件：
- src/watcher.js（新导出 mergeCommitEvidence+buildSnapshot 分支证据面（注入+真git双路径，fail-open））
- test/sentinel-rules.test.mjs（新增 2 例（mergeCommitEvidence 判重；buildSnapshot worktree 注入面：并入/缺失/空/零真git/主源null+R1 端到端静默））
- .sillyspec/docs/sillyspec/modules/sync.md（哨兵段补分支证据并入一笔，测试锚 28→30）
需求：哨兵假勾选规则 worktree 盲区修复：buildSnapshot 提交证据并入 sillyspec/<change> 分支（hash 去重并集）
根因：提交证据只读主仓 git log -20，worktree 流程任务提交先落分支、apply 前不可见，两路证据同时落空——change-events-channel 流 8 个 task 提交全在分支上，R1 两拍全量误报假勾选（04:38:45/05:27:25）
方案：①src/watcher.js 新导出 mergeCommitEvidence（hash 判重保序并集，apply 后同提交两面可达不双计）；②buildSnapshot 增 gitLogWorktreeImpl 注入参数+生产路径 git log -20 sillyspec/<change> 分支证据并集，分支缺失/git 失败 null 不动主仓结果（fail-open）、主源 null 语义不变、只注入 gitLogImpl 时零真 git 约定保持；③sync.md 哨兵段登记并入语义+测试锚 28→30
结果：test/sentinel-rules.test.mjs 30/30 绿（新增 2 例：并集判重/分支注入面含端到端 R1 静默）；watcher+watcher-alerts+sentinel 三套回归 53/53 零失败；lint 758 文件未引用导出 0+module-map 覆盖全；CLI 亲测门禁 test/lint=passed

## ql-20260923-007-ecac | 2026-09-23 08:21:37 | 归档终态推送补推扫描：bg-sync 子进程主轮收尾顺带补推「本地终态未被平台镜像」的变更
状态：已完成
关联变更：（无）
文件：
- src/run/bg-sync.js（新导出 collectTerminalSyncPending+TERMINAL_SWEEP_MAX，runBgSyncFromEnv 收尾补推循环（预算耗尽让位下一轮）；危险文件面显式 --force-baseline 放行（补推扫描即本 quick 目标改动））
- test/spec-sync-terminal-sweep.test.mjs（新增 4 例（谓词/上限排序/库缺失/向上发现；Windows sqlite 句柄关池再删目录））
- docs/sillyspec/platform-interface-map.md（triggerSync 条目补终态补推扫描一笔（行内扩展））
- docs/sillyspec/troubleshooting.md（bg 异步化修复块补补推扫描 bullet+测试锚两文件）
需求：归档终态推送补推扫描：bg-sync 子进程主轮收尾顺带补推「本地终态未被平台镜像」的变更
根因：终态推送依赖归档后还有一轮 triggerSync（bg 子进程 best-effort），最后一轮被吞（spawn 失败/单飞锁竞态/会话戛然而止）则平台镜像永久停在旧阶段——2026-09-22 session-fork-continuation 实证：本地 04:22 归档、平台侧停在 verify，此后再无命令碰该变更
方案：①src/run/bg-sync.js 新导出 collectTerminalSyncPending：扫 DB 取 status=archived/deleted 且 last_local_modified_ts 脏于 last_synced_platform_ts（或从未同步）的变更（last_active 倒序≤3 条；双戳皆空的 D-013 前陈年行 fail-closed 不补；库路径与 sync() 内 ProgressManager 同源 resolvePlatformSpecDir）；②runBgSyncFromEnv 主轮收尾接线补推循环（主变更跳过/预算耗尽让位/逐条 best-effort）；③补推幂等依据=sync() 对 archived/deleted 推终态+墓碑且 POST 幂等
结果：test/spec-sync-terminal-sweep.test.mjs 新增 4/4 绿（谓词面/上限排序/库缺失空集/向上发现同库）；test/spec-sync-bg.test.mjs 全过（真子进程+mock server 集成回归）；lint 759 文件未引用导出 0+module-map 覆盖全；CLI 亲测门禁 test/lint=passed
审计：[gate] L1（跨 1 模块 · 4 文件：1 代码/1 测试）advisory；每文件注记已全覆盖；测试增量不适用（≤1 代码文件）

## ql-20260923-008-bea4 | 2026-09-23 08:43:52 | 执行会话反馈的 sillyspec 侧三摩擦：①接口矩阵锚点校验报错无可复制样例且 design接口表# 形态在场而端点不可提取时只报泛化『缺五形态之一』（执行…
状态：已完成
关联变更：（无）
文件：
- src/run/command.js（--step 补登记 knownFlags+VALUE_FLAGS，带死路前例注释）
- src/stage-contract.js（锚点行级分诊+聚合报错五形态可复制样例）
需求：执行会话反馈的 sillyspec 侧三摩擦：①接口矩阵锚点校验报错无可复制样例且 design接口表# 形态在场而端点不可提取时只报泛化『缺五形态之一』（执行会话三轮试错实测约 15 分钟，最终被逼换更弱的 DDL@ 形态过门）②散文式接口定义（### 标题+prose）解析零端点，表格形态要求只埋在骨架注记里没人看 ③--done --step <名|序号> 说明书出示的形态进命令即被『未知参数』exit(2) 拦死
根因：①stage-contract.js 五形态聚合报错只有抽象描述无样例；design接口表# 与其余四形态宽严不对称（# 后必须 METHOD /path 才计命中）且无分诊——agent 无法区分『形态没写对』与『写了没算数』②零面注记不区分『无接口段』与『接口段在场但散文写法』（parseDesignApiTable 的 sectionHint 信号现成未用），控制台无提示③--step 在 command.js:340 消费但 knownFlags/VALUE_FLAGS 均漏登记（--wait-interactive 漏登记死路同款，ql-20260911-029 前例）
方案：①锚点校验分诊：design接口表# 字样在场但正则不提取→定向报『# 后未提取到 METHOD /path，仅表名/行号/散文描述不计』；聚合报错五形态各带可复制样例（design接口表#POST /api/xx/权限矩阵[admin×读]/契约表@任务卡字段清单/DDL@users.id/载荷@e2e_body.json）；verify-probes 预填说明同步带样例与仅表名不计告警②renderApiCoverageMatrixLines 按 sectionHint 分诊：接口段标题在场×表格零端点→注记点名『检测到接口段标题/散文式接口定义不进矩阵』；writeVerifyFacts 刷完 facts 控制台同款左移警告（修复时机从 verify 收口提前到 --init）③--step 补登记 knownFlags+VALUE_FLAGS（吃值）
结果：聚焦 25/25（api-coverage-matrix+run-exit-codes，含新增 4c 锚点分诊/4d 散文零面分诊/--step 白名单三例）；全量 594/594 绿（591+3 新增）；lint 759 文件未引用导出 0+module-map 覆盖全；零新增导出（renderApiCoverageMatrixLines 保持私有）
审计：[gate] L1（跨 2 模块 · 5 文件：3 代码/2 测试）advisory；每文件注记缺失（--file-notes 覆盖变更文件全集）；测试增量已含

## ql-20260923-009-bb64 | 2026-09-23 09:27:17 | archive-tombstone 坑（MP 仓 docs/sillyspec/archive-tombstone-归档墓碑致面板已归档变更软删不可见.md…
状态：已完成
关联变更：（无）
文件：
- src/sync.js（_applyTombstoneStatus 终态透传+墓碑日志动态化+三处注释）
- docs/sillyspec/platform-interface-map.md（仅行号锚漂移修复（1067→1078 等）无内容变更）
需求：archive-tombstone 坑（MP 仓 docs/sillyspec/archive-tombstone-归档墓碑致面板已归档变更软删不可见.md，2026-09-23 部署验收发现）：CLI 墓碑载荷把归档链伪装成 deleted，平台 _apply_cli_tombstone 见值即软删+镜像收敛，归档变更在面板已归档 tab 隐身；本地 1237 archived vs 3 deleted（全非 archive 阶段）实证受影响面全部是冤案
根因：sync.js _applyTombstoneStatus（2026-08-29 task-13 引入）无条件 changes[0].status='deleted'，而 serializeForSync 本已携带真实终态（unregisterChange→archived / deleteChange→deleted）——单点写死致两链不可区分；注释『对齐既有 archived 语义』暴露原意是归档信号但平台读到的语义是删除
方案：终态透传：_applyTombstoneStatus 按 DB status 透传（deleted 链行为不变，archived 链发 'archived'）；兼容已核：旧平台对 archived 载荷走既有读时投影（零 location 动作零软删），新平台补写路径（本坑平台侧另修）。测试 X1-1 改造（归档链墓碑=archived 且全程无 deleted 载荷）+新增 X1-1b（deleteChange 链仍 deleted）；注释三处+file-lifecycle.md 更新；platform-interface-map.md 五处行号锚漂移修复
结果：聚焦 32/32（tombstone+change-delete+noise+terminal-sweep）；doc-ref 93 处引用全过（修复 5 处漂移）；全量 594/594 绿；lint 759 文件未引用导出 0

## ql-20260923-010-32f9 | 2026-09-23 10:35:14 | R8 对撞双修复：execution_mode 缺省翻转 main 直写 + verify 门禁绿结果指纹缓存
状态：已完成
关联变更：（无）
文件：
- src/run/green-cache.js（NEW——绿结果指纹缓存纯模块（指纹/存取/TTL/阀/披露行五导出），known_failures 失败签名的成功面对偶）
- src/machine-interface.js（greenCachedCheck 包装三处 verify 门禁调用点，命中强制披露 cached）
- src/stages/execute.js（execution_mode 解析缺省翻转为 main，显式 dispatch 才派发）
- src/stages/plan.js（执行模式声明话术+light/full 两档模板行翻转）
- docs/prompt/plan.md（与 stages/plan.js 模板同步翻转）
- docs/prompt/execute.md（M4 条目缺省语义翻转）
- test/execution-mode-render.test.mjs（T1/T3/T4/T5 改断言钉新默认（契约变更非改测试凑绿））
- test/green-cache.test.mjs（NEW 六例）
需求：R8 对撞双修复：execution_mode 缺省翻转 main 直写 + verify 门禁绿结果指纹缓存
根因：R8 对撞实证（2026-09-23 change-events-channel 基线 vs OpenSpec 单上下文同任务）：execute 80min 中约 47min 是 6 个子代理派发墙钟（冷启动上下文重建 887 万 token+伪并行+小任务全额派发开销），同规模实现切片仅 14min（3.6 倍税）；verify 31min 里 gate verify 三轮加 --done 收口把同一套 commands.test/lint 重复真跑约 13min。R7 实证（main 直写 7 分钟 vs 派发 70 分钟）早已同向结论但默认行为未翻转
方案：①execute.js 解析翻转——缺省/非法值回退 main（显式 dispatch 才派发，判据=任务真可并行×单任务规模大×上下文需分片）；plan.js light/full 模板与执行模式声明话术、docs/prompt 的 plan.md/execute.md 同步翻转。②NEW src/run/green-cache.js——指纹=HEAD+代码脏面（剔 .sillyspec、docs、*.md，对齐 watcher dirtyCode 口径，verify 收敛循环文档修订不击穿）+local.yaml 哈希（换命令即失效）；TTL 30min；SILLYSPEC_GREEN_CACHE_OFF=1 全关、SILLYSPEC_GREEN_CACHE_TTL_MIN 覆盖；fail-open。③machine-interface.js 三处接线（runGate verify-test/verify-lint + runDerive verify-test facet）——命中合成等价 passed 并在 warnings/data 强制披露 cached=本次未重跑，未命中真跑且 passed 才写缓存；module-map 由 runtime 模块 src/run/ 前缀天然覆盖
结果：聚焦 30/30 绿（green-cache 6 新例：过滤口径/存取 TTL/阀/指纹敏感性/披露行；execution-mode-render 7 例改断言钉新默认：无键===main 逐字节+显式 dispatch 逃生通道+模板两档 main 缺省行；machine-interface 9 例与 gate 四件 8 例回归零失败）；lint 761 文件未引用导出 0+module-map 覆盖全；--done 门禁隔离快照实测 test/lint 双绿

## ql-20260923-011-d859 | 2026-09-23 10:41:16 | 哨兵降噪双修：detached watcher git 子进程闪窗（windowsHide 全入口补齐）+ R3 范围漂移基线豁免与 SILLYSPEC_SEN…
状态：已完成
关联变更：（无）
文件：
- src/git-helper.js（主凶——共享 git 入口双点补 windowsHide）
- src/watcher.js（R3 基线豁免+applySentinelRules env 总阀）
- src/commit-guard.js（windowsHide 一致性（基线保护文件，--force-baseline 显式解锁））
- src/docs-check.js（同上一致性）
- src/run/gate-snapshot.js（同上一致性）
- src/run/green-cache.js（safeGit 补 windowsHide）
- test/sentinel-rules.test.mjs（基线豁免正反例+总阀例）
- .sillyspec/docs/sillyspec/modules/sync.md（watcher 段落补降噪三件登记）
需求：哨兵降噪双修：detached watcher git 子进程闪窗（windowsHide 全入口补齐）+ R3 范围漂移基线豁免与 SILLYSPEC_SENTINEL=0 总阀
根因：用户实证「弹窗出来又立马消失」全天反复——detached watcher（无控制台进程）每轮轮询经 git-helper 跑 3-4 条 git.exe，Windows 下无 windowsHide 的控制台子进程每个闪一个 cmd 窗即灭；且 R3 范围漂移把观测起点已在脏面的并行会话文件误归因本变更（R8 对撞 MP 实证 9 文件假告警），多会话共享仓高频噪声
方案：①git-helper.js 双 execFileSync 点+commit-guard/docs-check/gate-snapshot/green-cache 四处 git 调用统一补 windowsHide true（跨平台安全）——detached 进程的 git 子进程不再创建控制台窗，闪窗根治。②watcher.js R3 基线豁免：applySentinelRules 首判轮以 prev 脏面拍 baselineDirty（水位重启场景 prev 即水位快照语义自洽），ruleScopeDrift 过滤基线文件——只对观测启动后新出现的声明面外文件告警。③哨兵总阀 env 参数 SILLYSPEC_SENTINEL=0 规则面零告警（watcher 照常记中性事件），与 SILLYSPEC_WATCHER=0/SILLYSPEC_WATCHER_PUSH=0 构成三级阀。④sync.md watcher 段落补登记（--no-docs 豁免其余三模块：windowsHide 纯选项无文档面）。commit-guard 属 hook 基线保护文件，改动仅一行 windowsHide，显式 --force-baseline
结果：sentinel-rules 30/30（新增基线豁免正反例+总阀双条件例）+watcher 13/13+green-cache 7/7 回归零失败；六源文件 node --check 过；lint 761 文件未引用导出 0+module-map 覆盖全；--force-baseline 因 commit-guard 基线保护显式解锁（一行 windowsHide 纯选项）
审计：[gate] L2（跨 4 模块 · 7 文件：5 代码/1 测试）advisory；模块文档认领已 --no-docs 显式豁免

## ql-20260923-012-0ef3 | 2026-09-23 11:06:46 | 知识库可见性三件：收件箱横幅带标题（不再基线内静默）+ knowledge inbox 子命令 + quick 资产尾 FR 去处明细
状态：已完成
关联变更：（无）
文件：
- src/run/complete-handlers.js（buildKnowledgeInboxLines 纯函数+棘轮渲染升级+资产尾 frFiles 明细（基线保护文件 --force-baseline 显式解锁））
- src/knowledge-classify.js（parseUncategorizedEntries export+cmdKnowledgeInbox 新增）
- src/stages/knowledge.js（inbox 二级路由+available 补录）
- src/index.js（usage 行补 inbox）
- test/knowledge-inbox.test.mjs（NEW 四例）
- test/knowledge-baseline.test.mjs（超线文案断言随新契约更新）
- .sillyspec/docs/sillyspec/modules/runtime.md（知识闭环段补可见性升级登记）
需求：知识库可见性三件：收件箱横幅带标题（不再基线内静默）+ knowledge inbox 子命令 + quick 资产尾 FR 去处明细
根因：用户实证：quick/变更执行中生成待审知识点或蒸馏出 FR 等资产时聊天面完全无感——旧披露只有两处且都不达标：基线棘轮警告只报条数不带标题（还得自己去开 uncategorized.md）、基线内存量条目完全静默、quick 资产尾只有计数无去处
方案：①complete-handlers.js 新增纯函数 buildKnowledgeInboxLines（零条目零输出的降噪钉；超基线 ⚠️/基线内 📚 双形态；标题直出前 3 条+余量指引+classify 用法行），renderKnowledgeBaselineRatchet 升级为收件箱横幅——待审>0 即渲染（quick --done 与归档收尾两个共用点一次生效），清空才静默；②NEW 子命令 sillyspec knowledge inbox [--json]（cmdKnowledgeInbox：uncategorized 标题+ql 前缀+一行摘要+基线态，纯读零副作用；parseUncategorizedEntries 随之 export 供横幅与命令共用）；③quick 资产尾 FR 计数带去处文件清单（frFiles 去重数组，fr-index written 的 file 维度）；④usage 行补 inbox、runtime.md 模块卡登记（stages/knowledge.js 的 inbox 路由属其既有 dispatch 面，cli-entry/core-engine/stages 三模块仅经 index.js usage 行与路由表受及，--no-docs 豁免留痕）。complete-handlers 属基线保护文件，--force-baseline 显式解锁
结果：knowledge-inbox 4/4（解析器双形态/横幅零输出钉+双形态+余量/inbox json 与人读+空态）+knowledge-baseline 5/5（176 行文案断言随契约更新，条数+基线值语义不变）+knowledge-classify 1/1 回归零失败；lint 762 文件未引用导出 0+module-map 覆盖全；真机冒烟：inbox 输出本仓 5 条真实待审带标题全文
审计：[gate] L2（跨 4 模块 · 7 文件：4 代码/2 测试）advisory；模块文档认领已 --no-docs 显式豁免

## ql-20260923-013-a5ab | 2026-09-23 11:27:38 | 演示：知识收件箱横幅真实触发样例
状态：已完成
关联变更：（无）
文件：（见实际改动）
需求：演示：知识收件箱横幅真实触发样例
根因：无，纯演示（用户要求可见性样例）
方案：无文件改动——仅触发收口渲染链路，展示 quick --done 收尾时收件箱横幅如何把待审知识标题打出来
结果：无测试面（零改动）；演示横幅见输出

## ql-20260923-014-0d96 | 2026-09-23 11:36:21 | 知识可见性收口：收口输出转达义务写入步骤说明书——agent 必须把收件箱横幅转达用户
状态：已完成
关联变更：（无）
文件：
- src/stages/quick.js（step3 新增转达义务契约段）
- src/stages/archive.js（确认归档步第 9 条同款）
- docs/prompt/quick.md（镜像同步（_sync 流水线））
- docs/prompt/archive.md（确认归档步 fence 手工补齐（旧六步结构时代漂移，编号追平留后））
- docs/prompt/_extracted.json（抽取重建）
需求：知识可见性收口：收口输出转达义务写入步骤说明书——agent 必须把收件箱横幅转达用户
根因：用户实证（2026-09-23 第二轮反馈）：收件箱横幅/待归类提议/资产尾都只出现在 CLI stdout——用户在会话上看不到，agent 转不转述全凭自觉；「可见性」前一轮只修了 CLI 输出面，没有闭环到用户真实所在的聊天面
方案：①quick step3（暂存和更新记录）说明书新增「📚 收口输出的转达义务」契约段：--done 输出含知识收件箱横幅/待归类提议/quick 资产尾三块之一时必须在最终回复原文转达用户（CLI 输出用户不可见，转述是唯一通道），未出现不提及防编造；②archive 确认归档步新增第 9 条同款转达义务（--confirm 收口的收件箱横幅）；③docs/prompt 镜像按流水线同步（_extract→_sync，quick.md step3 fence 已替换；archive.md 属旧六步时代结构，按「时代漂移」先例手工补确认归档步 fence 内容，编号重排留后续专门追平）
结果：docs-gate 18/18 绿；lint 762 文件未引用导出 0+module-map 覆盖全；prompt 镜像 _verify 基线内（execute 时代漂移为既有已知项）；说明书为纯模板文案零逻辑面，既有 6 例 quick 流程测试零回归

## ql-20260923-015-6ae9 | 2026-09-23 11:42:53 | 纯演示零改动
状态：已完成
关联变更：（无）
文件：（见实际改动）
需求：纯演示零改动
根因：纯演示零改动
方案：纯演示零改动
结果：纯演示零改动

## ql-20260923-016-51e9 | 2026-09-23 15:58:54 | requirements 模板补规范语言约定——MUST/MUST NOT/SHOULD/MAY 约束强度标注（RFC 2119）
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm.js（requirements 模板 GWT 说明后加强度标注约定行（含 MUST NOT 红线实例））
- docs/prompt/brainstorm.md（镜像同步（step5/step7 fence））
- docs/prompt/_extracted.json（抽取重建）
需求：requirements 模板补规范语言约定——MUST/MUST NOT/SHOULD/MAY 约束强度标注（RFC 2119）
根因：跨工具对比实证（2026-09-23 R8/R9 + 用户质询链）：约束句无强度词时读不出是描述还是禁令（「不做 X」歧义），红线类约束靠读的人自觉掂量；OpenSpec 规格库的 SHALL/MUST 纪律是其实际优点之一，sillyspec 侧补齐此写作约定属零逻辑成本（fr/ 蒸馏逐字透传，强度词随知识注入自动带给后续变更）
方案：brainstorm.js requirements.md 格式模板 GWT 块说明后追加约定行：MUST/必须=硬性要求（违反即缺陷）、MUST NOT/禁止=红线（绝对不允许）、SHOULD/应当=强烈建议（偏离须注明理由）、MAY/可以=可选，禁止裸写无强度词约束句（带事件通道红线实例）；docs/prompt 镜像按 _extract→_sync 流水线同步（brainstorm.md step5/step7 两 fence 替换）
结果：docs-gate 18/18 绿；fourpiece/brainstorm 相关 4/4 零回归；lint 762 文件未引用导出 0+module-map 覆盖全；纯模板话术零逻辑面（知识库 patterns.md 已有姊妹评估纪律条目）

## ql-20260923-017-89e4 | 2026-09-23 16:17:12 | verify 畅通批①——测试超时配置化 + 快照 test 超时/冻结自动回退主仓
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（resolveTestTimeoutMs+冻结鉴别+lint 链（与并行会话在途 hunk 零重叠，选择性提交见 commit））
- src/run/quick-audit.js（快照 test 回退主仓块）
- src/config-schema.js（双键登记+renderExample 模板两行）
- .sillyspec/local.yaml.example（注释示例（--force-baseline））
- test/test-timeout-config.test.mjs（NEW 三例）
需求：verify 畅通批①——测试超时配置化 + 快照 test 超时/冻结自动回退主仓
根因：R9 实证两坑：全量套件实测 27:03 撞固定 600s 帽被当超时失败（R1 轮 ~10min 损失）；快照 pytest 冻结零输出只能人工杀（R2 轮 ~11min）——lint 已有 2026-09-12 快照超时回退主仓先例，test 路径缺同款
方案：①verify-postcheck.js resolveTestTimeoutMs 三级链（local.yaml commands.test_timeout_sec > env SILLYSPEC_TEST_TIMEOUT_MS > 600s）接 runFullCommand，超时 reason 冻结鉴别（双空输出=疑似环境冻结附复跑指引；非冻结附提帽/收窄指引）；lint 同链 lint_timeout_sec。②quick-audit.js 快照 test 超时/零输出自动回退主仓复跑（对齐 lint 先例）。③config-schema 双键登记+renderExample 模板同步（防漂耦合钉）+local.yaml.example 注释示例。收口口径披露：快照门禁本次恒假红——会话开始前已脏（含并行会话 hunk）的文件被边界审计记为前序 baseline 不进 overlay，快照缺本会话导出（快照分叉家族第三 sibling，登记 known-issues 待修），按既有口径 SILLYSPEC_QUICK_GATE_SNAPSHOT_OFF=1 主仓实测收口
结果：主仓口径实测：npm test 全量绿（含新 test-timeout-config 3/3 与 config-schema 426/426）+verify 族 57/57 零失败（两轮自修：env 单位 bug、renderExample 模板耦合漏同步、阀名误用自纠）；lint 763 文件未引用导出 0

## ql-20260923-018-ad3c | 2026-09-23 19:01:16 | 快照 overlay 归属根治——门禁文件集改「审计∪声明」并集（治 declared∩前序脏被二选一丢弃）
状态：已完成
关联变更：（无）
文件：
- src/run/quick-audit.js（mergeGateFiles 纯函数+并集接入+fileSource 三态（--force-baseline 基线保护解锁；与并行会话在途 hunk 零重叠选择性提交））
- test/gate-files-merge.test.mjs（NEW 三例）
需求：快照 overlay 归属根治——门禁文件集改「审计∪声明」并集（治 declared∩前序脏被二选一丢弃）
根因：2026-09-23 ql-017 三轮门禁恒假红实证：runQuickTestLintGate 文件集旧口径二选一（audited 非空时整体丢弃 declaredFiles）——会话启动前已脏（含并行会话 hunk）但被本会话修改并显式声明的文件不进快照 overlay，快照装 HEAD 旧版，本会话新增导出缺失，快照内测试 import 即炸且重跑恒红（known-issues 快照分叉家族第三 sibling 的根治件）。src/run/quick-audit.js 属基线保护文件，--force-baseline 显式解锁
方案：①新 export 纯函数 mergeGateFiles（审计∪声明，去重保序审计在前；null/空串/非串/重复剔除）；②runQuickTestLintGate 接入替代二选一，fileSource 标签区分审计/审计∪声明（N+M）/声明兜底三态；倒推 B 兜底语义保留（审计空→声明独撑），并集对快照零成本（overlay 与 HEAD 同内容不产生差异）；声明即边界——声明过的文件无论审计口径是否计入一律随会话进快照
结果：gate-files-merge 3/3（并集钉含 ql-017 五文件实证形态/倒推 B 保留/非法容忍）+quick-gate 与 gate-snapshot 族回归 72/72 零失败；lint 764 文件未引用导出 0；本 quick 收口即自验——修复使能快照正确装载本会话文件，门禁实测通过即根治生效的直接证据

## ql-20260923-019-4703 | 2026-09-23 19:28:36 | token 减负话术件——长输出跑批落文件纪律 + 评审派发保留澄清（直写只免实现派发）
状态：已完成
关联变更：（无）
文件：
- src/stages/execute.js（运行测试步铁律+mainExecSection 评审派发保留段）
- src/stages/quick.js（step2 第 5 条）
- src/stages/plan.js（执行模式声明第 4 条）
- docs/prompt/quick.md（镜像同步）
- docs/prompt/_extracted.json（抽取重建）
需求：token 减负话术件——长输出跑批落文件纪律 + 评审派发保留澄清（直写只免实现派发）
根因：R9 实证 token 解剖：verify 段 13.8M 大头是裸测试输出摄取（4-6M，R8-OS 的 agent 天生输出截尾故 18M）；且 main 直写误伤审查通道（R9 无派发工具被迫降级自审——R8 基线审查曾抓真缺口，审查实效是直写唯一损失项）
方案：①execute 运行测试步铁律+quick step2 各加「长输出跑批纪律」：全量/多文件测试与 lint 输出重定向落文件，上下文只回看尾部摘要与失败段（tail -50/grep FAIL）；CLI 门禁自跑测试已是摘要输出不受约束。②execute mainExecSection+plan 执行模式声明各加「评审派发保留」：Stage Review（tier=independent）仍须派独立子代理（小上下文干重读活+保审查实效），无派发工具环境才降级自审且 reviewerNotes 首行留降级审计行。③quick 镜像 _extract→_sync 同步（plan/execute 属 DYNAMIC 跳过项）。测试门禁口径披露：SILLYSPEC_QUICK_TEST_GATE=skip 显式跳过（审计留痕）——快照全量 6 个失败经归属判定为并行会话 19:11-19:13 落地的 wave 串行化契约红（git stash 对照：HEAD 原样同样 6 失败，±本会话改动失败集逐一致=失败中性）；本会话自有验证：execution-mode-render 9/9+quick-laststep 零回归+lint 770 文件过+prompt 纯话术零逻辑面
结果：render 9/9+lint 770 未引用导出 0；失败中性证据（stash 对照）入本条；红账移交：plan-grouping-recommend B1-B4/plan-execute-contract/execute-testcase-design-include 六失败属并行会话在途语义，建议其下一笔 quick 修复（当前 HEAD 红会阻断一切后续 quick 门禁）
审计：[gate] L1（跨 1 模块 · 5 文件：3 代码/0 测试）advisory；每文件注记已全覆盖；测试增量缺失（3 个代码文件无测试改动）

## ql-20260923-020-7c5c | 2026-09-23 20:00:51 | token 减负④分段信号——阶段-会话账本+肥上下文税升级告警（CLI 只产信号不做编排）
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（updateStageSessionLedger+阶段收口升级告警接线（--force-baseline））
- test/stage-session-ledger.test.mjs（NEW 三例）
- docs/sillyspec/platform-interface-map.md（锚漂修复 8 处（本件 1+ql-012 欠 6+超界 1））
需求：token 减负④分段信号——阶段-会话账本+肥上下文税升级告警（CLI 只产信号不做编排）
根因：R9 实证：单会话五阶段 53.5M 输入、尾段单轮 30 万+、归档 3 分钟 7.2M——肥上下文税随会话内阶段数单调累积；既有瘦会话一行提示 R9 四次看见四次没听（无数据无升级无动作主体）；架构约束（conventions 钉）：会话不能自建会话，CLI 只产信号与接力载荷。complete.js 属基线保护文件 --force-baseline 显式解锁
方案：①NEW updateStageSessionLedger 纯函数（同会话连续阶段计数、切换重置、stages 尾窗 8 防膨胀，仿 wave-session-ledger 先例）；②complete.js 阶段收口接线：同会话连续 ≥2 阶段 → 升级告警块（带 R9 实测数据+sillyspec handoff 交接块引用〔含 watcher-preview 机器预览态接力段〕+动作主体明写用户新开会话或平台 session-fork+conventions 约束引注）；首阶段保持既有软提示零行为变化；③platform-interface-map 锚漂修复 8 处（complete.js:279→296 本件漂移 + index.js 六处 ql-012 usage 插行未随修 + 行号超界项）——living-doc 全绿
结果：stage-session-ledger 3/3（连续计数/切换重置/尾窗+空参）；lint 771 未引用导出 0；docs check living-doc 0 失效。测试门禁口径：SILLYSPEC_QUICK_TEST_GATE=skip 留痕——主树红仍为并行会话 wave 串行化契约（plan-grouping-recommend 4 fail 复核在案，归属同 ql-019 stash 对照），本件零失败中性；docs check 其余 ~20 处存量漂移（scan/ARCHITECTURE/architecture-4a 等，非 living-doc 非本会话文件）记欠账待归属方修

## ql-20260923-021-d344 | 2026-09-23 20:18:12 | quick 门禁 deps-auto-default：未配置仓缺省跑变更关系子集而非全量
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（decideVerifyTestAction 增参+前置采集+deps-auto-subset 分支）
- test/verify-deps-auto-default.test.mjs（NEW）
需求：quick 门禁 deps-auto-default：未配置仓缺省跑变更关系子集而非全量
根因：用户裁定（2026-09-23）：CLI 跑测试应跑对应开发相关的测试。缺口=未配置 test_strategy/modules 的仓（多数用户态）门禁缺省落全量 commands.test——R9 对撞 MP 仓（当时未配置）正因此卡全量套件 40 分钟。已配置仓不受影响（module 路径优先）
方案：verify-postcheck.js：①decideVerifyTestAction 增 depsAutoEligible——strategy=null 且 deps 可得→deps-auto-subset，空→full 零打扰，显式 full 不变；②未配置仓前置采集 diff 面（restrictFiles 收窄同款）；③新分支 runModuleSubset({hits:[]})——与模块 0 命中测试兜底同款执行面（deps(auto)=import 被改 src 的测试∪本次变更测试）
结果：verify-deps-auto-default 2/2（纯决策四分流+端到端双场景：改被 import src→deps 聚合 passed；改无关系文件→full）；verify 族 46/46；lint 772 未引用导出 0

## ql-20260923-022-f7f4 | 2026-09-23 20:33:03 | quick/verify 门禁 CNF 环境缺件降档——commands 链条二进制缺失不再硬拦 --done
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（decodeShellOutput+CNF 检测器+三接线降档（护栏防真债被掩盖）+aggregateStatus skipped+伪影签名扩展）
- test/verify-gate-command-missing.test.mjs（7 用例锁死契约（含 NODE_TEST_CONTEXT 基建伪影规避注记））
需求：quick/verify 门禁 CNF 环境缺件降档——commands 链条二进制缺失不再硬拦 --done
根因：multi-agent-platform 实证（坑 quick-test-gate-frontend-lint-tempdir-no-nodemodules）：纯 backend 改动被 frontend 链段 next CNF 拦死只能 skip 逃生；实测反转原诊断——沙箱 junction 无罪（健康 pnpm node_modules 经 junction 实测 tsc/next 均可解析），真因=主仓 frontend node_modules 半装（.bin 缺失/链接悬空，已另行 pnpm install 修复环境）；工具缺口成立：CNF 属环境信号非代码失败，超时降档/存量债归属鉴定先例均此口径但 CNF 形态无覆盖；附带连根修 GBK 乱码——zh-Windows cmd 报错经错误代码页解码致签名失效+门禁输出不可读（坑文档「乱码一行难归因」原话）
方案：src/verify-postcheck.js 五处——①NEW decodeShellOutput：三处 execSync（lint/full/module）改 buffer 捕获+智能解码，utf8 无损直通零行为变化；②NEW detectCommandMissingFailure：四族 CNF 签名（zh/en cmd、bash、debian sh、pnpm 横幅）+二进制名捕获+乱码兜底签名+尾部 1.5KB 窗防中段 fixture 噪音；③三接线 failed→skipped 带响亮修复指引（lint 护栏=失败输出无可归属路径；test 护栏=判账行集全 wrapper 噪声含 TAP 汇总族；降档不进 lint tally）；④aggregateStatus 认识 skipped 单元+runModuleSubset 聚合 reason 点名跳过模块；⑤ARTIFACT_ENV_MISSING_RES 补 next+zh 两侧签名。跨仓路径不动（并行会话 TAP 覆盖刚落）
结果：新测 verify-gate-command-missing 7/7（签名族+尾部窗+真实 cmd GBK 解码+lint/test/module 三路径端到端降档与真债硬拦对照+聚合+伪影分诊）+核心面 112/112+verify 族 118/118+quick-audit+gate 族 57/57+lint 773 文件 0 问题（未引用导出 0）；本 --done 门禁实测同口径。留痕：父 node --test 注入 NODE_TEST_CONTEXT 使被测命令里的 node --test 零输出零退出码——ql-20260923-021 deps-auto E2E 在该伪影下断言空转绿，红账另册
