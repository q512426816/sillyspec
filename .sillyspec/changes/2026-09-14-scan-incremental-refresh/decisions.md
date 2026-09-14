---
author: qinyi
created_at: 2026-09-14 03:19:07
generated_by: sillyspec-fourpiece-init
change: 2026-09-14-scan-incremental-refresh
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 范围=7 份 scan 文档刷新闭环，不碰模块卡/map 结构/knowledge（复潮边界记录）
- type: boundary
- priority: P0
- status: accepted
- 模块域: core-engine, docs-consistency
- source: docs
- question: 增量刷新的范围边界在哪——是否顺带刷新模块卡 / _module-map.yaml / knowledge？
- answer: 只做 scan 7 文档（docs/<project>/scan/*.md）。模块卡归 archive（sync-module-docs）、_module-map 结构归 `modules rebuild --force`（merge 语义，手动字段全保留）、knowledge 是人工追加域——refresh 越界会变成第三个写入方，重新打开 D-7 推迟方案 C 的双轨问题。知识库 decisions/core-engine.md D-001@v1（ir-stage-p3d）原句「增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）」是范围切割非方向否决——本变更即 scan 域立项，复潮条件满足。
- normalized_requirement: refresh 的写面仅限 docs/<p>/scan/ 下 7 份文档 + _facts.md 重跑；modules/、knowledge/、glossary 均不写。
- impacts: [FR-1, task-01]
- evidence: docs/sillyspec/design-d7-scan-lifecycle.md（方案 C 裁决「暂不做」+ 双轨问题陈述）；.sillyspec/knowledge/decisions/core-engine.md D-001@v1；src/modules.js:92（rebuild merge 语义注释）

## D-002@v1: 入口形态=`sillyspec scan refresh` 子命令（CLI 算差异+门控+出工单，agent 手术编辑，--done 盖章）
- type: architecture
- priority: P0
- status: accepted
- 模块域: cli-entry, core-engine
- source: user
- question: 增量刷新以什么形态入口——独立子命令 / scan 阶段新模式（--incremental）/ 纯 agent 自发行为？
- answer: 独立子命令 `sillyspec scan refresh`（与 `scan diff` 同族旁路，不动 scan 主流程 11 步注册表）。两拍交互：①refresh（只读）= 算受影响文档集 + 门控 + 渲染手术工单（每文档：过时引用清单 + 相关 diff hunks + commit messages + 编辑纪律）；agent 按工单定点编辑文档正文。②`scan refresh --done` = stamp bump 盖章（只推进本次核对过的文档的 source_commit/updated_at，generator 标 scan-refresh）+ 跑 postcheck + 记录刷新审计。依据：D-7 落地记录明确刷新形态为「agent 按清单定点补」；仓库哲学 CLI 预咀嚼事实、agent 从发现降级为解读；scan diff 已是该模式的只读半边。用户在 2026-09-14 对话轮对「落地形态」建议回复「干」= 预授权。
- normalized_requirement: 新增 src/scan-refresh.js（计算层+IO 面分层，仿 scan-diff.js 结构）；index.js 子命令接线（仿 scan diff 转发）；不改 stages/scan.js 步骤结构。
- impacts: [FR-2, FR-3, task-02, task-03]
- evidence: docs/sillyspec/design-d7-scan-lifecycle.md 落地记录；src/scan-diff.js 分层先例；用户 2026-09-14「干」轮

## D-003@v2: 基线语义=per-doc bump + 消费方三方对齐（scan-diff 取最旧 / scan-staleness 取最旧 / worktree-guard 经 D-007 握手）
- type: compatibility
- priority: P0
- status: accepted
- 模块域: core-engine, docs-consistency
- supersedes: D-003@v1
- question: 刷新后 source_commit 怎么推进——整批推到 HEAD 还是按文档推进？「批次同值」假设的**全部**消费方如何兼容？
- answer: per-doc bump 不变（只推进本次核对过的文档）。v1 漏盘了第三个消费方 scan-staleness（src/scan-staleness.js:49-57「任一文档代表整批」break 首个命中——readdirSync 顺序决定读到新/旧基线，per-doc bump 后 advisory 会随机失真）；且 v1 对 worktree-guard 的论证有误：guard 写入用 40 位全哈希（src/run/stage.js:291 rev-parse HEAD）而 frontmatter 盖章 7 位短哈希（src/scan-postcheck.js:528 --short），worktree-guard.js:214 精确比对**恒不等**——「异基线触发保护、同基线放行」的前提不成立，实际是 guard 存在即恒拦。修正：①scan-diff readSourceCommit 聚合=最旧提交时间（v1 原案）；②scan-staleness 同口径改「收集全部 source_commit、按最旧（落后最多）计」——最坏情况口径，宁可多提醒不漏报；③worktree-guard 交互由 D-007@v1 握手机制解决，7/40 位错配作为存量 bug 在本变更顺带修复（归一化比对）。
- normalized_requirement: scan-diff.js readSourceCommit 与 scan-staleness.js 基线读取统一为「全文档收集→最旧提交时间者」；两者 fail-soft 回退语义保留；guard 比对归一化见 D-007@v1。
- impacts: [FR-4, FR-7, task-02, task-04, task-05]
- evidence: Design Grill 独立审查（.sillyspec/.runtime/stage-reviews/brainstorm-review-2026-09-14-112549/）P1-1/P1-2；src/run/stage.js:289-312；src/scan-postcheck.js:528；src/hooks/worktree-guard.js:214

## D-007@v1: refresh 编辑拍 × scan 覆盖保护=guard 握手（mode+refreshDocs 白名单前置分支，顺带修 7/40 位错配）
- type: architecture
- priority: P0
- status: accepted
- 模块域: hooks, core-engine
- source: code
- question: refresh ①拍（工单）与 --done（盖章）之间，agent 对已存在 scan 文档的手术编辑会被 worktree-guard hook 拦截（guard 只写不删、检查先于白名单、check-1 恒不等）——编辑拍如何走通？
- answer: 握手机制三件：①refresh ①拍**原子写** scan-guard.json 为刷新会话态：{ name_zh: '增量刷新守卫', mode: 'scan-refresh', refreshDocs: ['docs/<p>/scan/<doc>.md', ...]（相对 specRoot 的 POSIX 路径）, sourceCommit: <7 位短 HEAD——与盖章同格式>, startedAt: now, forceRescan: false }；②worktree-guard.js shouldBlockScanDocOverwrite 在 guard 读取后加**前置分支**：guard.mode==='scan-refresh' 且目标文档相对路径 ∈ refreshDocs → 放行；不在白名单的 scan 文档继续走原保护（非本次刷新面不放松）；③顺带修存量 bug：check-1 比对前双方归一为 7 位短哈希（String(x).slice(0,7)），恢复「同基线放行/异基线拦截」的设计本意（现 7 vs 40 恒拦）。不做 draft 暂存区方案（agent 写 .runtime 草稿 + CLI apply——复杂度不成比例且 postcheck 时序别扭）；不滥用 forceRescan=true（会全局解除保护到下次 scan，攻击面过大）。--done 后 guard 不清理（沿用现状「下次 run scan 重写」语义，与 scan 会话同款生命周期）。
- normalized_requirement: hook 前置分支仅识别 mode==='scan-refresh'（缺字段的存量 guard 行为逐字节不变）；refreshDocs 匹配用 specRoot 相对 POSIX 路径；refresh ①拍写 guard 用 writeAtomicSync（hook 并发读，防半截 JSON fail-closed 窗口——对齐 stage.js:300 注释的并发教训）；归一化比对带回归测试（同基线放行/异基线拦截/7-40 位混合）。
- impacts: [FR-3, FR-7, task-03, task-05]
- evidence: Design Grill P1-1（guard 无清理点 + 恒拦链路）；src/hooks/worktree-guard.js:199-231（检查序）、:759-761（先于白名单）；src/run/stage.js:291（40 位写入）

## D-008@v1: 三处 scope 口径显式化（dirtyCheck 空范围回退 / 受影响集全量变更集 / 软门 scope 过滤计数）
- type: boundary
- priority: P1
- status: accepted
- 模块域: core-engine
- source: docs
- question: module-map 缺失（scope 空）时 dirtyCheck 行为？受影响文档集的变更集取 scope 过滤前还是后？软门「漂移>100 文件」计数口径？
- answer: ①dirtyCheck：scope 非空=限 scope 内未提交改动；scope 空（module-map 缺失/解析为空）=回退全仓源码面（git status --porcelain 排除 .sillyspec/**、node_modules、dist、build、.git——scan 文档自身的预期脏不阻断，源码脏即拒，保守 fail-closed）并附 warning 提示先跑 modules rebuild；②受影响文档集的变更集=**全量变更集（不经 scope 过滤）**——与 scan-diff staleRefs 同语义（staleRefs 注释明示「引用自带范围，范围外命中同样过时」），scope 过滤的是文件级漂移归模块，不是引用过期判定；③软门漂移计数=scope 过滤后的 driftCount（与 scan diff 的 driftCount 同口径，可比可解释）。
- normalized_requirement: computeRefreshPlan 三处口径按上述固定并各附代码注释；scope 空时 dirtyCheck 不静默跳过。
- impacts: [FR-5, task-02, task-05]
- evidence: Design Grill P1-4；src/scan-diff.js:169-171（staleRefs 不经 scope 的既有语义）、:124-126（文件级 scope 过滤）

## D-009@v1: Grill 复核 P2 收口——聚合键改「落后最多」（拓扑）+ --done 内容比对门 + finalize specDir 口径
- type: consistency
- priority: P2
- status: accepted
- 模块域: core-engine, docs-consistency
- source: docs
- question: 复核轮三个 P2：①「最旧提交时间」用 committer date，rebase/amend 后与拓扑序倒挂违反保守目标且 scan-diff/scan-staleness 双处共用瑕疵面翻倍；②finalizeRefresh 复跑 runScanPostCheck 的 specBase→specDir|null 转换缺失（本地模式直传误走平台严格分支）；③--docs 缺省会把未经编辑的受影响文档盖章到 HEAD。
- answer: ①聚合键从「提交时间最旧」改为「落后最多」：对去重基线集逐个 rev-list --count，取计数最大者（拓扑序免疫日期倒挂，且直接就是保守目标本体——落后最多=漂移窗最大）；N≤去重基线数，成本可忽略。②finalizeRefresh 内 specDir = platformOpts?.specRoot || null 再传 runScanPostCheck（对齐 scan-profile.js:356 executeScanFinalize 口径）。③①拍在 guard.refreshDocs 各条目记文档内容 sha256；--done 逐文档比对——内容未变者**默认不 bump**，打印「未编辑即盖章」提示，需显式 --docs 点名或 --force 才推进（工单零改动文档本就不该吃新基线）。附带 P3 措辞修正：①拍写面表述补 _facts.md；FR-5 ④dirty 明确 --force 不可越；staleness 聚合条目从 FR-7 挪入 FR-4；审计平台路径根=resolveRuntimeRoot(platformOpts, specBase)。
- normalized_requirement: 聚合键=rev-list 计数最大；guard.refreshDocs=[{path, sha256}]；--done 未变文档默认跳过 bump；finalize specDir 转换三处进测试。
- impacts: [FR-3, FR-4, FR-5, task-02, task-03]
- evidence: 复核轮 review.json P2×3（brainstorm-review-2026-09-14-112549 第二轮）；src/run/scan-profile.js:355-360

## D-004@v1: 脏工作区 fail-closed——in-scope 有未提交改动拒绝刷新
- type: risk
- priority: P0
- status: accepted
- 模块域: core-engine
- source: code
- question: scan diff 算 base..HEAD（仅已提交）而全量 scan 读工作区，本仓常态脏（多 agent 并行）——增量刷新遇未提交改动怎么处理？
- answer: fail-closed：refresh 前置检查 `git status --porcelain`（限 module-map scope 内路径），in-scope 有未提交改动 → 拒绝刷新并提示（提交后重试 / 或走全量 scan）。依据：若此时推进 source_commit 到 HEAD，等于把「未验证状态」盖章成「已验证」——未提交改动一旦提交落在新基线之后，永远逃出漂移窗。宁可误拒不漏检（D-7 §四同款保守原则）。scope 外脏（如 .sillyspec 文档自身）不阻断。
- normalized_requirement: computeRefreshPlan 增加 dirtyCheck：scope 内 A/M 文件非空 → 返回 { ok:false, reason:'dirty-worktree', files }；不做自动 stash/commit。
- impacts: [FR-5, task-02, task-05]
- evidence: 本仓 git status 常态脏（多会话共享）；src/scan-diff.js:116（diff 仅 base..HEAD）

## D-005@v1: 回退门=硬门三条件 + 软门阈值告警（--force 可越软门不可越硬门）
- type: boundary
- priority: P1
- status: accepted
- 模块域: core-engine
- source: docs
- question: 什么情况下增量刷新必须回退全量 scan？
- answer: 硬门（拒绝执行，--force 也不可越）：①任一 scan 文档无 source_commit（旧版/绿地——无基线可增量）；②基线非 HEAD 祖先（分支切换/rebase——diff 两快照对比呈假象，本仓 brainstorm 注入漂移事实 2026-09-14 实证出现过）；③受影响文档含 scan_depth: quick（浅文档本就该 --deep 升级全量重写）。软门（warning 建议全量，--force 可继续）：漂移合计 > 100 文件或 behindCommits > 200（token 收益消失，一致性风险上升——阈值仿 staleness 50/14 的量级惯例放大）。依据：仓库近案 fail-closed 惯例（ql-20260914-003 双占用硬拦不猜归属）。
- normalized_requirement: 门控三硬一软；软门阈值漂移>100 文件或落后>200 commit；输出明确区分「拒绝（含理由与建议命令）」与「告警（--force 继续语义）」。
- impacts: [FR-5, task-02, task-05]
- evidence: src/scan-staleness.js:22（阈值惯例 50/14）；CLI 注入漂移事实实证「source_commit 4401b3d 不在当前分支历史」；src/stages/scan.js:124（quick 浅层覆盖升级语义）

## D-006@v1: 检出极限如实声明——refresh 不撤 staleness advisory，产物标注核对范围
- type: risk
- priority: P1
- status: accepted
- 模块域: docs-consistency
- source: docs
- question: staleRefs 只能发现带 file:line 引用的过期陈述，无引用的事实性论断检不出——增量刷新的保证边界如何呈现？
- answer: ①refresh 不替代也不撤除 scan-staleness advisory（其判定语义 2026-08-16 已裁决：落后数≠文档错误）；②refresh --done 后的审计记录与文档 frontmatter 只声称「核对至 HEAD 的检出项已处理」，不声称「文档与源码一致」；③帮助文案与 workflow 文档显式写明检出极限。依据：scan-staleness 头注释判定语义修正案（ql-20260916-009-fb44 同源原则——advisory 信号与判定信号分层）。
- normalized_requirement: refresh 输出/审计不含「一致」断言文案；staleness 注入逻辑零改动；README/help 含检出极限说明。
- impacts: [FR-6, task-06]
- evidence: src/scan-staleness.js:9-13（判定语义裁决记录）；docs/sillyspec/design-d7-scan-lifecycle.md 方案 A 定位
