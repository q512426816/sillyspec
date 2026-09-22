
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
