---
updated_at: 2026-09-18T10:20:00+08:00
author: qinyi
created_at: 2026-06-01T09:05:00
---

# core-engine
> 最后更新：2026-09-18
> 最近变更：ql-20260918-005-435a（knowledge-stats 接入 L1 仪表盘——buildFrIndexStats：四类 fr-* 事件聚合[inject/supersede/duplicate/unreferenced 按域]+索引面扫描[条目/active/superseded/来源变更/域]+承接引用率[分子窗口内事件/分母索引全量，裁决用大窗口]；CLI --json 增 frIndex 键+人类模式「FR 索引实验」段；present 三态+未知 fr- 前缀前向兼容；test/knowledge-fr-stats.test.mjs 15 断言；L1 后续钩子 D-006 落地——观察期满直接出数裁决 L3）/ 2026-09-18-fr-index-l1（FR 稳定索引 L1——**L3 证据发生器**：src/fr-index.js 五导出[发号 FR-<域>-NNN 连字符域/幂等键=全局 id/承接翻链就地补丁保摘要/unreferenced 探针/digest active-only/bigram overlap]+decision-distill 四函数参数化复用（decisions 零回归钉死）+archive noAI 步挂载（fr-supersede/fr-unreferenced 遥测——后者显式标注「不算 L3 门禁」）+brainstorm step8 {FR_INDEX_DIGEST} 注入与软门（fr-inject/fr-duplicate-warning，advisory 永不阻断）+D14 第四检查（epoch=2026-09-18 分界：索引在场+取代完整）+verify-probes facts.handover 恒落盘死锁修复（verify 期 Reverse Sync：原「有行才写」使零移交+PASS 被 eligibility fail-closed 拦死）；知识面新增 knowledge/fr/<域>.md；**自举验证**：本变更归档即真实仓首批索引 FR-core-engine-001..004，D14 复扫绿；独立验收审查两轮[三阻断：连字符域字符集/跨域翻链不落盘/doc 锚点位移]；35+40+132 断言）/ ql-20260917-009-2ec3（D14 archive_integrity 收尾三件套——①豁免账本：.sillyspec/archive-integrity-exempt.yaml 逐份记理由压红 16 份远古归档（早于 plan.md 流程，照 docs-check skip 先例不伪造历史），账本外继续亮红/stale 提示清理/解析失败 fail-safe 红灯保持，+4 测试组；②两份近期归档测试任务簿记补勾（ir-hardening task-09 / auto-driver task-06，对应测试文件俱在且直跑绿——D14 首扫发现的真实簿记漂移，补勾留 ql 审计痕；③pre-push 挂 advisory 零阻断露出（ratchet 门待欠账稳定后另裁）；④DB 漂移核实：listChanges 排除 archive，手工重激活归档行由 D4 ghostRows 覆盖，无缺口不加；真实仓维度转绿 93 完整+16 豁免）/ ql-20260917-007-b35d（doctor 新增 D14 archive_integrity 归档完整性重扫——补「归档后无人回头看」缺口（对标 OpenSpec validate --archived）：①任务全勾（tasks.md 优先回退 plan.md，**legacy 完成源切换**：tasks 有行 0 勾而 plan ≥1 勾 → 完成证据在 plan.md，真实仓首扫 43→18 份消 0/N 全误报——2026-08-20-task-truth-unify 前完成态勾在 plan）②plan.md 在场性（自愈基准文件）③注册表存在但不可读必须报、不许当无任务放行（#205 教训）；WARNING advisory 只读无修复，无钩子挂载（门禁策略另裁）；test/doctor-archive-integrity.test.mjs 23 断言）/ 2026-09-16-guard-consistency-probe（探针9 守卫一致性——clusterMutationMethods 同实体方法组聚类 + detectGuardSignals 四类守卫信号（编码式调用形态+注解式）+ runProbe9GuardConsistency advisory + 一致性抽查 probe9 维度 WARNING 级接线）/ 2026-09-16-cross-layer-contract-probe（探针8 扩展 design 契约维度——parseDesignContracts 契约面解析 + contractOrphans/missingRequired 两 advisory 维度 + 一致性抽查 probe8 WARNING 级接线）/ 2026-09-14-change-ownership-guards（task-review 归因分流 D-004@v1：readChangeIsolationMode DB 判源 + resolveAttributionDiffFiles 四模式路由——worktree/worktree-branch/worktree-cleaned/main-window，见下方专节）/ 2026-09-14-apply-conflict-hardening（doctor 新增 apply_manifest_drift 漂移检查维——两态内容 sha256 vs manifest 指纹三分支矩阵，活跃∪归档扫描面 appliedAt 降序取前 5，advisory WARNING）/ 2026-09-14-quick-exit-tiered-gates（quick 出口分级门禁：信号层 src/quick-gate-profile.js 三导出 + change-risk-profile 补 QUICK_RISK_PATH_PATTERNS 路径模式表 + scope-audit 增 gateProfile 双出口；THRESHOLDS 定稿 2/4/4/8）/ ql-20260910-002-9beb（stage-review 降级自审 CLI 侧配套：isDegradedSelfReview + gate ⚠️ 审计行 + 报错/契约降级出口——PI agent 等宿主无 Agent tool）/ 2026-08-23-adopt-harness-practices（knowledge-match 增 decisionHits 防复潮解析 + verify-postcheck skip 真跳过/evidence-auto 推荐）/ 2026-08-16-scan-docs-reconcile（契约/评审族与基础原语补录归属 + propose 回收）/ ql-20260809-003-c88a（#5 next-action 读路径对齐变更根目录 + #6 initChange 用 VALID_STAGES 单一源 + 修正 propose 残留误述）
> 模块路径：src/db.js, src/db-engine.js + 契约/评审族与基础原语（stage-contract 三件、check-primitives、stage-review、task-review、verify-postcheck、review-tier、change-risk-profile、quick-gate-profile、classify-change、contract-matrix、endpoint-extractor、knowledge-match、doctor-diagnostics、fs-atomic、constants、scan-postcheck）；完整清单见 _module-map.yaml core-engine paths。历史正文中的 run.js / progress.js / index.js 章节已分属 runtime / progress / cli-entry 模块卡

## 职责
SillySpec 的核心运行引擎 — 负责数据库存储、进度管理、阶段调度和 CLI 入口。

## 当前设计

core-engine 是 SillySpec 的基础设施层，由三个层次组成：持久化层（DB）、进度管理层（ProgressManager）、调度层（runCommand/index）。

**DB 类**（src/db.js）封装了 better-sqlite3（SQLite 的原生绑定，同步 API）。数据库文件位于 `.sillyspec/.runtime/sillyspec.db`，通过 PRAGMA 配置 journal_mode=WAL（伴随 `.db-wal`/`.db-shm` 侧车）、busy_timeout=5000、foreign_keys=ON、synchronous=NORMAL。better-sqlite3 打开即持久化，DDL/事务提交直接落盘主库，不再有旧 WASM 内存引擎的「全库 load 到内存 → 序列化写回」模型（旧模型是 last-writer-wins lost update 根因，现 WAL 单写者串行 + 应用层 SQLITE_BUSY 有限重试根治）。DB 类提供事务支持（`transaction` 方法，含 BUSY 退避重试），所有写操作通过事务批量提交；`close()` 时 better-sqlite3 自动做 WAL checkpoint 合并 `-wal`/`-shm` 回主库，无需显式 `_save`。`.bak` 损坏回退保留（主库→`.bak`→全新/报错 逐级回退）。

**ProgressManager 类**（src/progress.js）是核心状态管理器，管理项目全局数据和变更级进度。每个变更的进度由 stages 对象表示，每个 stage 包含 steps 数组。VALID_STAGES 定义了 8 个合法阶段：scan, brainstorm, plan, execute, verify, archive, quick, explore（主流程顺序见 MAIN_FLOW_ORDER：brainstorm→plan→execute→verify→archive；propose 阶段已移除——阶段合并进 brainstorm 产出四件套）。ProgressManager 通过 DB 类的 SQLite 后端存储所有状态。

**runCommand 函数**（src/run.js）是 CLI 调度核心，处理参数解析、变更名解析、阶段步骤获取/确保、步骤完成/跳过/重置、自动模式运行等。它通过 stageRegistry 和 auxiliaryStages 从 stages 模块获取阶段定义。

**契约/评审族与基础原语**（根级散文件，2026-08-16-scan-docs-reconcile 补录归属；与 ProgressManager/DB 同层共用）：

- `src/stage-contract.js` — 阶段协议单一来源（允许前置/必须产出/validators），completeStep 后必须过 validator；另导出 detectChangeRisk / checkExecuteCodeEvidence
- `src/stage-contract-spec.js` — 阶段产物字面校验规则的结构化 manifest（单一真相源：validators 消费它判定、prompt 渲染它事前预览，事前==事后同源）
- `src/stage-contract-engine.js` — 产物字面校验通用引擎（消费 spec manifest 按 kind dispatch 产出 errors/warnings；引擎不碰 fs，readFile 由调用方注入）
- `src/check-primitives.js` — 共享产物字面校验原语（纯函数：contains_sections/min_lines/no_placeholder/no_empty_files 全仓单一语义源），workflow 与 stage-contract 两引擎共用
- `src/stage-review.js` — 阶段级审查门（brainstorm/plan/execute-acceptance 的阶段级 review.json 校验：文档证据 reviewedFiles + docHash）；降级自审配套（2026-09-10 用户反馈①，PI agent 等宿主无 Agent tool）：`isDegradedSelfReview`（reviewerNotes 首行「降级：」约定检测）供 run/gates.js Stage Review Gate 放行时留 ⚠️ 审计行（独立性折损可见可追溯，不构成新阻断）；缺 review.json 报错与 gate FAILED 提示均带降级出口指引，契约（renderReviewJsonContract）同步文档化该约定。通道优先序批次（同日用户裁决「顺序归配置」）：`readReviewChannelPriority`（local.yaml `review_dispatch.channel_priority`，缺省现状序 [agent-tool, platform, host-mcp, self]、未知值忽略、self 恒隐式垫底）+ 契约头部「审查执行通道」段按配置序渲染（platform 通道 P2 review-dispatch 未落地前标注暂跳过，不引用不存在命令）+ `classifyReviewerChannel`（reviewer.channel 结构化落款 > 首行「降级：」兼容 > unspecified；gate 分支：self ⚠️ / platform ℹ️ missionId / 其余静默）
- `src/stage-review-checklist.js`——三 stage 审查清单单一来源 `REVIEW_CHECKLISTS`（2026-09-10-review-dispatch task-01/FR-05）：条目自 stages prompt 逐字迁移（下游可能字面引用），渲染前缀规则见模块 docblock；一致性由 test/stage-review-checklist.test.mjs 内嵌快照钉死；prompt 渲染与 review-dispatch worker_prompt 同源消费。stage-review.js 同批增：printStageReviewResult 平台在途区分（内联读 .runtime/review-dispatch-<change>.json 防静态环 fail-open）+ 契约 platform 描述改指 review-dispatch 命令。
- `src/task-review.js` — execute 每 task 的 review.json 校验（git 代码 diff 证据：base/head）；runId 并行碰撞根治（2026-09-10 驾驭小结①，坑 exec-run-id-same-second-collision）：`claimExecuteRunId`（非递归 mkdir 排他认领 run 目录，EEXIST=同秒碰撞 → 随机短后缀重试；认领即含 tasks/，真实 fs 障碍原样上抛由写入点分层 fail 接管）接入四处 generate 写入点（run/stage.js 主点 + run/gates.js/run/prompt.js/本文件 drafts 与 writeTaskReview 补写点）；`isValidExecuteRunId` 双形态兼容（存量 `exec-YYYY-MM-DD-HHMMSS` + 碰撞后缀 `…-<a-z0-9≤8>`，注入/穿越仍拒）——并行会话同秒启动 execute 不再共享 run 目录互相覆盖 per-task review.json。串台残余收口（同日第二批②）：`resolveLatestExecuteRunId` / `resolveLatestExecuteRunIdWithTasks` 的 mtime fallback 排除「戳属他变更」的有主 run（戳存在且不等值 = 有主，与 resolveExecuteRunForChange 同语义；全部有主 → null 宁缺毋错）——writeTaskReview 在 marker 缺失场景经它们定位 run，不再把本变更 review.json 写进他变更 run 的 tasks/。runId 结构化隔离（同日第三批①，用户建议「run 目录取 change 名哈希隔离」）：generateExecuteRunId(changeName) 附 change 名 FNV-1a 6 位 hex 段（两变更同秒必不同 runId，run 目录天然分家；同变更 regenerate 幂等；无参调用裸秒级向后兼容），isValidExecuteRunId 放宽至 0-2 段后缀（哈希段 + claim 碰撞随机段），与 claimExecuteRunId 排他认领互补——认领治「同 ID 两主」、哈希治「不同变更天生同 ID」
- `src/verify-postcheck.js` — verify 完成时 CLI 亲自执行 local.yaml 测试命令与 verify-result.md 自报告对账（自报 PASS 但实测失败 → 阻断）；
- `src/verify-probes.js` — verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）+ verify-result.md 骨架与 verify-facts.json 底稿（写入细节见下方 verify-facts v2 节）；探针 3 双根并集扫描（坑 probe3-worktree-test-false-negative，2026-09-10 驾驭小结第五批②：模块目录主仓在而新测试 untracked 在 worktree 时旧「主仓缺失才回退」不触发 → 假阴「未找到测试文件」；改主仓 ∪ worktree 无条件并集，与探针 5 三根并集同族）。平台模式回显注记（2026-09-10 驾驭小结②）：`formatPlatformPathNote`（pointer 存在时产物回显行尾补「物理写盘在 hub 镜像根 / 主仓同步位置 .sillyspec/changes/<change>/<file>」，本地模式返回空串零变化）+ `writeVerifyFacts` 增 opts.platformNote（纯回显层不进落盘），消「回显镜像路径 / 核对主仓路径」的显示混乱
- `src/verify-facts-schema.js` — verify-facts.json v2 schema 单点（2026-09-08-ir-verify-facts，D-005@v2）：FACTS_SCHEMA_VERSION/EVIDENCE_STATUS/EXEMPTION_RE/classifyVerifiedFile（code|artifact 证据核验口径分流）/parseEvidenceSlots（证据账+集成验证回执槽段解析，行首锚定占位 fail-closed）/validateFactsV2；builder/对账/集成证据/渲染四方 import 同源2026-08-23 起 test_strategy 新值接线（D-005@v2）：`resolveTestStrategy` 统一入口（`src/verify-postcheck.js:21`）解析配置策略 + evidence-auto 按 module-impact.md 影响面推荐检查组合（行为→module 聚焦测试、文档/prompt→docs-check、门禁契约→gate；缺失/不可解析降级 module 并注记）；
  skip=真跳过（`src/verify-postcheck.js:1010` mode 'strategy-skip'）——不回退全量、verify 输出显式标注留审计痕迹（R-07），`--done` 对账按 skip 分支放行
- `src/review-tier.js` — 审查分级（self/independent）：plan_level 确定性映射（none/light→self、full→independent），无 plan_level 阶段退文件数启发式；run/gates.js 与 run/prompt.js 消费
- `src/change-risk-profile.js` — 变更风险分级检测（P0 阻塞确认 / P1 记录 / P2 通过，产出 risk-profile.json）；`QUICK_RISK_PATH_PATTERNS`（2026-09-14-quick-exit-tiered-gates）——auth/permission/billing/migration/lock/scheduling 六域路径模式表（`Array<{pattern, re}>`），供 quick-gate-profile 画像风险命中消费（纯增量导出，detectChangeRisk 判级语义零变化）
- `src/quick-gate-profile.js` — quick 出口分级门禁画像信号层（2026-09-14-quick-exit-tiered-gates task-01 / FR-02，纯函数零 IO 零子进程，D-007）：`computeGateProfile`（CLI 审计链 git 事实 changedFiles × _module-map.yaml paths/core_files 前缀聚类 → L0/L1/L2 画像 + 检查项）+ `resolveGateThresholds`（local.yaml quick-gate 段覆写合并，D-009）+ `THRESHOLDS` 阈值单点；与 change-risk-profile/scope-audit 同卡，三导出明细见下方对外接口小节，全部 advisory 不阻断（D-003）
- `src/classify-change.js` — 变更规模分类器（quick/auto/full，供 auto 模式决定内部流程深度）
- `src/contract-matrix.js` / `src/endpoint-extractor.js` — API 契约矩阵生成与注入（provider/consumer 端点提取与 parity check）
- `src/knowledge-match.js` — knowledge 关键词匹配引擎（INDEX.md 条目解析 + 任务上下文匹配生成 hit report）；2026-08-23 起 INDEX `## Decisions` 段路由行进决策匹配（`src/knowledge-match.js:110-155`）：新增 `parseDecisionEntries` 解析 decisions/<域>.md 条目 + `matchKnowledge` 返回值新增 decisionHits——任务上下文命中的 Decisions 路由行所指向文件内全部 D-xxx@vN 条目，rejected 优先排序（防复潮信息最先可见）；matched/entries/report/json 旧四键结构与语义不变，无 decisions 库/路由行未命中 → decisionHits: []，供 brainstorm Step2 防复潮注入（runtime run/prompt.js 消费）
- `src/doctor-diagnostics.js` — 结构化项目自检（平台模式状态分裂检测 D1-D5 + safe_actions 只描述建议动作绝不自动执行，`sillyspec doctor --json`）
- `src/fs-atomic.js` — 原子文件写 + Windows 友好 rename 重试（writeAtomicSync，用于 .runtime/*.json/pointer 等跨进程读文件；sillyspec.db 不走此路）
- `src/constants.js` — 平台状态枚举（manifest/pointer/postcheck/workflow-runs 共享，SillyHub 侧直接用常量值）
- `src/scan-postcheck.js` — CLI 层 scan 完成后强制校验（不依赖 agent 自检报告；平台模式须全过才 success 否则降级）

## 对外接口（表格）

### src/scope-audit.js — 变更范围对账纯函数（2026-09-10-change-scope-audit 新增）
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `computeChangeScopeAudit(opts)` | 变更范围对账单一数据源：quick-<8hex> 会话走归属表（复用 auditQuickCompletion 窗口），否则 full-flow 三态（计划侧 change-list.js 解析 × 实际侧 resolveReconcileActualFiles + numstat 真实行数）；全 advisory fail-soft；quick 模式增量携带 `gateProfile`（2026-09-14-quick-exit-tiered-gates task-03 / FR-04 / D-008——实时态透传 auditQuickCompletion 挂的 review.gateProfile 不重复计算，冻结态旧记录无该字段时按 rows 冻结文件清单现算 `computeGateProfile` 重放，module-map/阈值与 --done 时点同链路、字段同构；消费方按存在性读取，full-flow 恒无此字段） | `{cwd, specBase, changeName, platformOpts}` |
| `renderScopeAuditTable(result, opts?)` | 人类可读表渲染（三态/归属标记、BIN/— 占位、合计、⚠️ 出口指引、maxRows 截断）；result.gateProfile 存在时（quick 模式）追加 [gate] 画像段（与 run/quick-audit.js [gate] 打印块同数据源同 tier 语义，full-flow/画像 null 零输出） | `ScopeAuditResult, {maxRows}` |
| `collectNumstatByPath(cwd, paths, opts)` | 行数三档采集（tracked=numstat / untracked=wc-l / binary=BIN），quick 与 full-flow 共用 | `cwd, paths, {baseRef}` |

消费方（scope-audit 命令 / execute--done / verify--done / archive--confirm / quick--done 四注入）只 import 本三导出，禁止自研采集（D-003）。冻结重放/双 map 仓消歧走模块内 `pickModuleMapProject`（内部 helper 非导出）：按样本文件对候选 _module-map.yaml 归属得分唯一最高选项目，零归属样本平分 → degraded（与 computeGateProfile.unmappedFiles 同款归属口径）。

### src/quick-gate-profile.js — quick 出口分级门禁画像（2026-09-14-quick-exit-tiered-gates 新增）
定位：quick --done 分级门禁的信号单一来源——纯函数零 IO（moduleIndex/风险表/阈值全由参数或默认值，D-007 / R-04），接线消费见 runtime 卡（run/shared.js 挂 review.gateProfile）。

| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `computeGateProfile(changedFiles, moduleIndex, opts)` | 画像计算：非文档文件 × paths/core_files 前缀聚类模块归属 + `QUICK_RISK_PATH_PATTERNS` 风险命中 → level（正常态 L2=跨 ≥L2_SPAN 模块或风险命中、L1=跨 ≥L1_SPAN 或 ≥L1_FILES 文件；module-map 缺失降级档 span 退出判级、L2=≥L2_FILES_DEGRADED 文件）+ checks{perFileNotes（--file-notes 覆盖率）, testDelta（na/missing/ok 机械规则）, docClaim（claimed/missing/exempt-no-docs，模块卡认领空真防假 advisory）, runtimeEvidence（风险命中→required）}；文档文件不计数不参与归属与风险命中（docSyncHint isDoc 同源口径） | `changedFiles, moduleIndex, {riskTable?, thresholds?, fileNotes?, noDocs?}` |
| `resolveGateThresholds(config)` | local.yaml quick-gate 段覆写与代码默认值合并（无段全默认；键非法回退默认并 warn；D-009） | `config` |
| `THRESHOLDS` | 阈值单点（缺省行为单一事实源）：L1_SPAN=2 / L1_FILES=4 / L2_SPAN=4 / L2_FILES_DEGRADED=8——task-05 真实图谱校准维持定稿，依据见 changes/2026-09-14-quick-exit-tiered-gates/design.md「阈值校准记录」节。⚠️ 升 blocking 另立变更时须重审判级基：现判级用 fileCount（含文档，裁决依据=与旧「≤3 文件」规则边界连续+advisory 噪音可容忍，见 quick-gate-profile.js 计数口径注释）；blocking 期「2 代码+2 文档抬进 L1」误伤与文档同步者系统性跨阈的激励成本需重估，届时改用 codeFileCount 为文件维判级基是候选（用户裁决条件 2026-09-14，ql-20260914-009-4623） | — |

### src/db.js — DB 类
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `DB` (class) | SQLite 数据库封装 | `constructor(dbPath)` |
| `DB.init()` | 同步初始化（better-sqlite3 同步打开/创建库、设 PRAGMA、按 schema 版本戳建表；主库→.bak→全新 逐级回退） | — |
| `DB.close()` | 关闭连接（better-sqlite3 close 自动 WAL checkpoint 合并 -wal/-shm 回主库，无需显式 _save） | — |
| `DB.transaction(fn)` | 原生事务（自动 BEGIN/COMMIT/ROLLBACK，fn 抛错自动回滚不吞错）+ SQLITE_BUSY 应用层有限重试（3 次退避） | `fn(sqlDb)` |
| `DB.getDb()` | 返回底层 better-sqlite3 Database 实例（供 progress.js 直接 prepare/run） | — |

### src/progress.js — ProgressManager 类
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `ProgressManager` (class) | 进度状态管理器 | `constructor()` |
| `ProgressManager.init(cwd)` | 初始化项目级数据库和目录结构 | `cwd` |
| `ProgressManager.initChange(cwd, changeName)` | 初始化变更级数据 | `cwd, changeName` |
| `ProgressManager.read(cwd, changeName?)` | 读取变更进度 | `cwd, changeName?` |
| `ProgressManager._write(cwd, data, changeName?)` | 写入变更进度 | `cwd, data, changeName?` |
| `ProgressManager.readGlobal(cwd)` | 读取全局数据 | `cwd` |
| `ProgressManager.listChanges(cwd)` | 列出所有活跃变更 | `cwd` |
| `ProgressManager.registerChange(cwd, changeName)` | 注册新变更 | `cwd, changeName` |
| `ProgressManager.unregisterChange(cwd, changeName)` | 注销变更 | `cwd, changeName` |
| `ProgressManager.setStage(cwd, stage, changeName?)` | 切换当前阶段 | `cwd, stage, changeName?` |
| `ProgressManager.addStep(cwd, stage, stepName, changeName?)` | 添加步骤 | `cwd, stage, stepName, changeName?` |
| `ProgressManager.updateStep(cwd, stage, stepName, options, changeName?)` | 更新步骤状态 | `cwd, stage, stepName, {status, output, input?}, changeName?` |
| `ProgressManager.completeStage(cwd, stage, changeName?)` | 标记阶段完成（含历史快照） | `cwd, stage, changeName?` |
| `ProgressManager.show(cwd, changeName?)` | 显示变更进度详情 | `cwd, changeName?` |
| `ProgressManager.status(cwd, changeName?)` | 获取进度状态摘要 | `cwd, changeName?` |
| `ProgressManager.validate(cwd, changeName?)` | 校验进度数据完整性 | `cwd, changeName?` |
| `ProgressManager.reset(cwd, stage, changeName?)` | 重置指定阶段 | `cwd, stage, changeName?` |
| `ProgressManager.updateBatchProgress(cwd, batchData, changeName?)` | 批量更新进度 | `cwd, batchData, changeName?` |
| `ProgressManager.readBatchProgress(cwd, changeName?)` | 读取批量进度 | `cwd, changeName?` |

### src/run.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `runCommand(args, cwd)` | CLI 主入口 — 参数解析、调度阶段运行 | `args: string[], cwd: string` |

### src/index.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `main()` | CLI 顶层入口 — 解析命令行参数、分发子命令 | — |

## 关键数据流

1. **CLI 入口流**: main() (index.js) → runCommand(args, cwd) (run.js) → ProgressManager → DB → SQLite 文件
2. **阶段运行流**: runCommand → resolveChangeName → ensureStageSteps → runStage → outputStep(输出 prompt) → completeStep → ProgressManager.updateStep
3. **自动模式流**: runAutoMode → 按 MAIN_FLOW_ORDER（brainstorm→plan→execute→verify→archive）自动推进阶段，每个阶段内按步骤顺序执行；brainstorm→plan 衔接由变更根目录 next-action.json 的 has_blocking_questions 门控（true 则 wait 用户回答阻塞问题）
4. **进度持久化**: ProgressManager 的所有写操作通过 DB.transaction 批量提交到 SQLite，数据库文件在 `.sillyspec/.runtime/sillyspec.db`

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| 使用 better-sqlite3（原生 SQLite 绑定）而非旧 WASM 内存引擎 | 原生绑定直连 SQLite，WAL 真生效（WASM 纯内存库 WAL 无意义）；事务提交即持久化，消除全库 export/load 的 last-writer-wins lost update 根因 | WASM 内存库（零原生依赖但纯内存，需全库 export 落盘） |
| 同步 API（非 async）用于数据库操作 | better-sqlite3 是同步原生绑定；PM 核心读写方法已同步化，read 每次查最新不缓存快照 | 异步 ORM |
| VALID_STAGES 硬编码为常量 | 阶段固定且与 stageRegistry 一一对应 | 配置文件驱动 |
| 进度快照写入 history 目录 | 便于回溯和调试 | 仅保留当前状态 |
| 双层目录结构 (.runtime + changes) | 运行时数据与变更数据隔离 | 扁平结构 |
| doctor D8 lifecycle_doc_staleness 用 git 提交时间比较（%ct），与 docs-debt 模块卡 behind 同哲学 | 只读事实计算 + WARNING 提示不阻断，把 CLAUDE.md 文档同步检查清单变自动卡点（P2-2-②，2026-09-02）；文档缺失/非 git/时间戳不可解析降级跳过不误报 | 校验文档内容与源码逐条对账（重、易误报） |

## 依赖关系
- 内部依赖：src/stages/index.js（stageRegistry, auxiliaryStages）、src/stages/execute.js（buildExecuteSteps）、src/stages/plan.js（buildPlanSteps）、src/init.js（cmdInit, getVersion）
- 外部依赖：better-sqlite3、fs、path

## 注意事项
- DB 类使用同步 API；better-sqlite3 事务提交即落盘主库（WAL），close() 负责 WAL checkpoint 合并 -wal/-shm 回主库并释放连接（不再需要旧 WASM 引擎时代的显式 _save）
- ProgressManager 的方法大多接受 `changeName = null`，null 表示使用 currentChange
- VALID_STAGES 必须与 stageRegistry 的 key 保持一致
- runCommand 中的 resolveChangeName 有多级回退：显式指定 > progress.currentChange > 自动检测
- 自动模式 (runAutoMode) 按 MAIN_FLOW_ORDER（brainstorm→plan→execute→verify→archive）顺序推进，跳过已完成的阶段
- quick 守卫（`auditQuickCompletion`）：step 1 记录 baselineFiles（预存脏文件），`--done` 审计时排除它们；quick 自身写入的 `.sillyspec/` 元数据（quicklog/.runtime/modules/_module-map）由 `isQuickMetadata` 精确豁免。`--force-baseline`（覆盖受保护/危险文件如 src/run.js）/`--allow-new`（允许新增）在 step 1 持久化进 guard.json，也可在 `--done` 时传入（与持久化值取或）
- quick 出口分级门禁（2026-09-14-quick-exit-tiered-gates）：quick --done 审计链挂 `review.gateProfile`（L0/L1/L2 画像，信号层 src/quick-gate-profile.js——判级/检查项/三导出见上方对外接口小节），全部 advisory 不改 status 三态与 exit code（D-003）。THRESHOLDS 定稿值 L1_SPAN=2 / L1_FILES=4 / L2_SPAN=4 / L2_FILES_DEGRADED=8（task-05 按 sillyhub 919 条 quicklog × 5 份真实 _module-map.yaml 校准维持，证据见 changes/2026-09-14-quick-exit-tiered-gates/design.md「阈值校准记录」节）。local.yaml quick-gate 段四 optional 键（l1_span/l1_files/l2_span/l2_files_degraded）可覆写代码默认值（D-009，readers=resolveGateThresholds，键非法回退默认并 warn；.sillyspec/local.yaml.example 有注释示例）。风险路径模式表 `QUICK_RISK_PATH_PATTERNS` 落 change-risk-profile.js（六域，detectChangeRisk 判级语义零变化）。测试 test/quick-gate-profile.test.mjs（27 用例）

## 变更索引

见 [core-engine.changelog.md](core-engine.changelog.md)（split-changelog 迁出）。

## verify-facts v2（2026-09-08-ir-verify-facts）

verify-facts.json 升 schemaVersion 2：buildVerifyFacts 五段（probes 机器段原样 + conclusion/tests/requiredEvidence/runtimeEvidence/factsConsistency slot-backfill 段）；writeVerifyFacts 分段合并（re-init 保留固化段，P1-5）；--init 骨架增「证据账/集成验证回执」槽段（占位不含枚举词）+ 段落级补齐幂等（R-02）；backfillFactsFromMdAndTests 只固化既有底稿（创建唯一入口 --init——无中生有会误升存量判别）。runVerifyRequiredEvidenceCheck v2 槽优先分类核验（code=存在×mtime×diff 交集 / artifact 豁免 diff；verifyStartAt=execute completed_at，R-05 fallback design created_at；无槽 legacy 子串降级）+ status 扩 blocked；checkIntegrationEvidence v2 回执槽优先（绿判据 log 存在×mtime 窗口×签名扫描噪声剔除×exit 0，literals 降 legacy）；checkProbeConsistency 增 facts 基线对比维度（probe1/6=ERROR、probe3/5=WARNING，probe6 HEAD-advance 豁免防重复报）。消费方：run/gates.js 收尾接线（backfill 先行 → runValidators（context.verifyStartAt）→ test 实测 tests 二次回填 → cannot_verify 硬门 rollback）。

## doctor 三探测器与渲染（2026-09-09-doctor-noai）
detectWorktreeHealth（复用 WorktreeManager.doctor 薄适配 + sillyspec/* 残留分支对账，锚定主仓根）/detectBuildEnv（engines 前缀比较 + 包管理器推断）/detectMcpEndpoints（项目级 MCP 配置在场，零网络）——全部只读 fail-soft、skipped 带内降级、并入 runDoctorDiagnostics 十一维；renderDoctorSummary（全新契约：逐维 ✅/⚠️/❌+label+findings 截三+safe_actions 提示）供顶层非 --json 命令与 _cliAction 步共用。

## doctor apply-manifest 漂移检查（2026-09-14-apply-conflict-hardening，FR-04/D-005）
`detectApplyManifestDrift(cwd, specDir)`（src/doctor-diagnostics.js，内部函数，经 runDoctorDiagnostics 并入第十二维 `apply_manifest_drift`，advisory WARNING 不改 doctor 退出码语义）——消费 applyWorktree 成功尾声落的 apply-manifest.json 指纹（文件→sha256）做 apply 后丢失/篡改检测。**扫描面**（R-03）：权威 specDir 下活跃 `changes/<名>/` ∪ 归档 `changes/archive/<名>/` 两桶 glob 统一收集，按 appliedAt 降序取前 5；无 manifest 零输出零告警（skipped），单 manifest 坏 fail-open 跳过。**哈希口径**：两态均自算内容 sha256（git blob hash 是 sha1 与指纹 sha256 异构不可直比）——staged 态=`git show :<path>` buffer 直接算（与写侧 staged blob 指纹天然同基）；worktree 态=readFile 后 CRLF→LF 归一（latin1 往返保字节，防 autocrlf=true 误报）；`approx:true` 条目跳过 staged 比对（指纹基不是 staged，比了必误报）。**三分支判定**：①worktree≠manifest → 落盘面漂移（丢失/被改）；②staged≠manifest → 暂存面漂移（index 被动过）；③盘上与暂存区皆无 → 丢失。告警行含变更名×文件×期望/实际短 hash + safe_actions 指引（对照 worktree 判定直拷/手并，落地后立即 git add 锁定）。doctor 只读不写。测试 test/apply-conflict-hardening.test.mjs 块②（干净零告警/篡改触发/无 manifest skipped）。

## task-review 归因分流（2026-09-14-change-ownership-guards，D-004@v1 / FR-03）

`src/task-review.js` 草稿（`generateTaskReviewDrafts`）/代算（`writeTaskReview`）的 changedFiles 取数源路由——troubleshooting §65 事件②根因（review/草稿 changedFiles 按主仓共享工作区脏窗口归因，并行会话在途文件混入）：

- **判定源 `readChangeIsolationMode`（模块内函数）**：读 `changes.isolation_mode` 列（DB 直连 db.js——task-review 是叶子模块，静态 import progress.js 会成环 progress→consistency-doctor→task-review；meta 缺失也可判）。DB 路径候选序 platformOpts.specRoot > specDriftAnchor > specBase > cwd/.sillyspec（首个存在 sillyspec.db 的根）；进程内按 dbPath+change 缓存（CLI 短进程生命周期内 isolation_mode 不变）。
- **路由单一入口 `resolveAttributionDiffFiles`（模块内函数，两消费点共用）**，四模式：
  - `worktree` — DB 判 worktree 且 meta/目录活 → 原口径（`resolveVerifyChangedFiles` meta 路径 + porcelain 并入）零回归；
  - `worktree-branch` — meta 失联/in-place meta/目录已删但分支 ref 活 → merge-base(主仓 HEAD, 分支 tip)..tip 的 commit diff + 约定路径 worktree 目录在则 porcelain 并入（与 verify reconcile 同口径），**不落主仓共享脏窗口**；meta 与 DB 同属 worktree 族但值不一致时以 DB 为准（注记）；
  - `worktree-cleaned` — 分支 ref 也已删（cleanup 后态）→ **fail-closed 空集 +「不可归因（worktree 已清理）」注记，绝不回退主仓窗口**（复审残留①）；草稿层 reason 显式区分终态空源与普通「无 diff」；
  - `main-window` — 其余（DB in-place / NULL 存量）→ 主仓窗口原行为零回归；NULL 且 meta 缺失加存量路由注记（D-04 残留②：不追求完美只保安全）。DB in-place 但 meta 判 worktree 且目录活 → 仍取 worktree（fail-safe：归因源只会更隔离不会更共享）。
- 测试 test/change-ownership-guards.test.mjs ⑥ 组（meta 活/分支活两形态主仓脏文件零吸入 + 分支已删空集注记）。
