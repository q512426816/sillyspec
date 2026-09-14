---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — core-engine

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-903@v1 SQLite 引擎访问收敛 db-engine.js 单点
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
锚点：src/db-engine.js:12
最近确认：71a7fe6
理由：所有 SQLite 访问必须经 src/db-engine.js 单一换引擎点——sql.js（WASM）时代无 FTS5/native 扩展且纯内存需整库 export 落盘，2026-08-11 换 node:sqlite DatabaseSync；引擎能力取舍（pragma/transaction/pluck 缺口消解）都在此层判断，勿绕过 db.js/db-engine.js 直用驱动。

## D-005@v2 test_strategy 实为两值，skip 接线兑现声明语义 + 增 evidence-auto
状态：implemented
锚点：未记录
最近确认：test123
理由：修正认知前提：`full/module` 语义不变；`skip` 从「声明未接线（配置后实际全量）」接线为「真跳过」；新增 `evidence-auto`（按 module-impact.md 推荐检查组合，缺失降级 module）；消费端 extractTestStrategy 在 src/verify-postcheck.js 接线（v1 遗漏的真实 reader）
来源：2026-08-23-adopt-harness-practices
supersedes：D-005@v1

## D-006@v1 防复潮注入挂 brainstorm Step2（knowledge-match 扩展），不新建步骤
状态：implemented
锚点：未记录
最近确认：test123
理由：扩展 knowledge-match 扫描 knowledge/decisions/，Step2 加载上下文时命中即注入否决理由与复潮条件；不加新步骤、不动 Step3+
来源：2026-08-23-adopt-harness-practices

## D-002@v1 : 方案A 双gate分治——plan 声明核验 + verify 对账，change 级 worktree diff 权威
状态：implemented
变更：2026-09-06-ir-stage-p3a
锚点：未记录
最近确认：11aa319
理由：用户选方案A（2026-09-06 对话轮）：plan 侧 task 卡 target_files 声明 + plan-postcheck 新增声明核验检查；verify 侧新增对账检查，Σ(target_files) vs resolveVerifyChangedFiles（change 级 worktree diff，机器权威）算三类差集。拒绝方案B（per-task 对账押在 agent 手写 changedFiles 上，违背「CLI 算事实不信任 agent 自报告」约定，其归因价值降级为对账报告附注）与方案C（advisory 无门禁力，违背种子稿「对账 gate」意图）。

## D-002@v1 : 方案A——facts.json 审计底稿 + gate 重跑对比正文预填段（防篡改不依赖底稿）
状态：implemented
变更：2026-09-07-ir-stage-p3b
锚点：未记录
最近确认：6d72aca
理由：用户预授权自主抉择方案A（2026-09-07「做完 p3a 就继续 p3b」轮）：①verify-facts.json=CLI 全权写的审计底稿（探针命令行+首跑关键指标+时间戳，供事后复跑，agent 勿手改）；②gate 一致性检查=重跑 runVerifyProbes 对比 verify-result.md 正文预填段——对比基准是正文而非 facts.json（删底稿绕不过防篡改）；③分级：探针1命中数/探针6删除清单不符或预填段缺失=ERROR（确定性高），探针3/5 指标不符=WARNING（测试文件列表/端点 parity 环境敏感）。拒绝B（全 ERROR 环境变化假红）与C（无门禁力，违背「防声称测过」意图）。

## D-001@v1 : P3d 缩范围=delta 聚合器 + advisory 联动，端点 before 基线明确不做
状态：implemented
变更：2026-09-07-ir-stage-p3d
锚点：未记录
最近确认：f4db7c9
理由：核心缩为两件：①delta 聚合器——sillyspec delta --change <名> CLI 从前三期已就位的机器产物（P3a reconcile-result.json 的 touched/matched 三类差集、module-map 归属、P3b verify-facts.json 探针摘要、decisions.md 提炼清单）聚合生成 delta.md 落变更目录（archify Delta 的 Before/Delta/After 对应物，md 非 yaml 与全系列一致）；②advisory 联动——delta.md 尾部生成「下次 scan facts 建议刷新模块」段（受影响模块清单）。端点 before/after 基线明确不做（contract-matrix 只有事后快照，before 机制独立立项）；增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）；knowledge 自动沉淀已有 decision-distill（不重复）。

## D-002@v1 : 方案A——独立 CLI + archive 步骤自动生成双入口
状态：implemented
变更：2026-09-07-ir-stage-p3d
锚点：未记录
最近确认：f4db7c9
理由：预授权抉择：sillyspec delta --change <名> 独立命令（幂等可复跑）+ archive「确认归档」步自动调用（产物随归档目录保存）。四源聚合：reconcile-result.json（最新 verify-runs 取）+ verify-facts.json + module-map 归属推导 + decisions.md 条目（distill 口径当前版本）。md 输出（Before=变更前模块状态摘要/Delta=文件×模块×差集/After=建议动作）。

## D-001@v1 : 基线=execute 启动时幂等快照（首次落盘不覆盖），增删=归档时 delta 第五源
状态：implemented
变更：2026-09-07-endpoint-baseline
锚点：未记录
最近确认：99d255c
理由：用户指令立项（P3d 多次提示）。采集：sillyspec endpoints baseline --change <名>（幂等——已存在不覆盖，首次跑=变更前状态基线）落 .runtime/endpoint-baselines/<change>.json（endpoints[] method/path/source + baseCommit + generatedAt）；execute Step 3（worktree 确认步）prompt 指引 agent 跑一次（对齐 verify-probes --init 先例）。消费：归档时 archive-delta 增第五源——endpoint-extractor 现算当前端点集 × 基线 → diffEndpointSets 纯函数（added/removed）→ delta.md「端点增删」节（替代 P3d 的「独立立项提示」条件行）。provider 产物 endpoints.json 不动（contract-matrix 零改动）。

## D-001@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
状态：implemented
变更：2026-09-11-cross-change-decision-guard
锚点：未记录
文件：src/knowledge-match.js
最近确认：358af35
理由：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。

## D-002@v1 quick 出口分级门禁（L0/L1/L2 机械画像），不新增第三条车道
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：不新增 mid 车道（自选车道会被激励扭曲绕过：95% 超限 quick 本就是 agent 自选、独立完成绕过 full 仪式；新车道=新状态机+新 prompt 面，违背纯减法原则）。改为 quick --done 出口按 CLI 侧机械信号自动升级：L0=现状 test/lint 实测门；L1（跨≥2 模块 或 ≥4 文件）=+每文件注记非空+测试增量检查；L2（跨≥4 模块 或 风险特征命中）=+模块文档认领或显式 --no-docs 豁免留痕+运行时证据要求。判定输入用 CLI 自算 changedFiles×module-map，不用 --files 自声明（37.1% 超限条目存在未声明脏文件）。

## D-003@v1 新门禁 advisory 起步，稳定后另立变更升 blocking
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：沿用 docs-consistency D-003 先例（docs-check 决策规则 advisory 起步，稳定后升 error）：L1/L2 起步 advisory（warn 打印+quicklog reasons 落账），dogfood 一个稳定周期后另立小变更升级阻断。避免 sillyhub 等存量大流量仓升级即被新门禁卡死。

## D-004@v2 风险命中 v1 收敛为路径模式，diff 关键词维度延后
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：Design Grill 独立审查（2026-09-14 brainstorm-review-2026-09-14-093804）阻断 2：quick 审计链无 diff 文本入参（changedFiles 是路径清单），引入 diff 扫描需加 git 子进程（违背零子进程承诺）且 scope-audit 冻结重放态只有 rows 路径、diff 维度不可重放。收敛：v1 风险命中=路径模式 only（确定性、可重放、零子进程），覆盖 auth/permission/billing/migration/锁/调度主要踩坑域；diff 关键词维度出现真实需求时另立变更。运行时证据要求与人工确认排除条款不变。

## D-006@v1 门禁切分点数字以真实模块图谱重算为准
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：交叉表两套启发式模块映射下格子数字不稳定（同一格 n=8 vs n=38），但交互模式稳定。阈值初值按本轮统计取（L1: 跨≥2 或 ≥4 文件；L2: 跨≥4 或风险命中），design 期用 _module-map.yaml 真实图谱重算 sillyhub 数据校准，作为本变更第一个实证任务。

## D-007@v1 实现形态选方案 B——独立纯函数信号模块 quick-gate-profile
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：用户选方案 B（2026-09-14 对话轮，单字确认"b"）：新建纯函数信号模块（暂名 src/quick-gate-profile.js，命名 design 期可调），输入 changedFiles + _module-map.yaml + 风险特征表 → 输出画像 {模块跨度, 模块清单, 文件数, 风险命中, 门禁级别}；scope-audit.js 的 auditQuickCompletion 只调用不内联。拒绝 A（信号计算锁死 quick 链路、verify 侧将来无法复用、难单测）；拒绝 C（单消费场景 YAGNI、新配置面=新误判面、违背纯减法原则）。

## D-008@v1 scope-audit 命令增强为门禁画像独立出口（表格 + --json，可重放）
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：用户 2026-09-14 指定（设计确认轮顺带需求）：现有 `sillyspec scope-audit --change <变更名或quick会话id>` 增强为画像出口——表格与 `--json` 两条出口均含 gate 画像（文件数/模块跨度/模块清单/风险命中/门禁级别）与 L1/L2 advisory 发现；利用该命令既有的 quick 会话（quick-<8hex>）与归档变更重放能力，历史会话可回溯审计。与 D-006 校准任务打通：`--json` 批量重放 sillyhub 历史会话即真实图谱交叉表。维持命令 advisory 只读定位，不设门禁。

## D-009@v1 门禁阈值支持 local.yaml quick-gate 段覆写，缺省=校准默认值
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：用户 2026-09-14（execute Step2 期追加）：THRESHOLDS 四键（l1_span/l1_files/l2_span/l2_files_degraded）经 local.yaml quick-gate 段覆写，未配置时用代码内默认值（即 task-05 校准定稿值）。与 D-007 否决的「配置化 gate 引擎」边界不同——不引入规则表达式/检查项配置面，仅四个数值键；默认值仍集中 quick-gate-profile.js 单点，config-schema.js 按「local.yaml 键单一数据源」惯例登记四 optional 键。

## D-001@v1 范围=7 份 scan 文档刷新闭环，不碰模块卡/map 结构/knowledge（复潮边界记录）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
锚点：未记录
最近确认：318e80c
理由：只做 scan 7 文档（docs/<project>/scan/*.md）。模块卡归 archive（sync-module-docs）、_module-map 结构归 `modules rebuild --force`（merge 语义，手动字段全保留）、knowledge 是人工追加域——refresh 越界会变成第三个写入方，重新打开 D-7 推迟方案 C 的双轨问题。知识库 decisions/core-engine.md D-001@v1（ir-stage-p3d）原句「增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）」是范围切割非方向否决——本变更即 scan 域立项，复潮条件满足。

## D-002@v1 入口形态=`sillyspec scan refresh` 子命令（CLI 算差异+门控+出工单，agent 手术编辑，--done 盖章）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
锚点：未记录
最近确认：318e80c
理由：独立子命令 `sillyspec scan refresh`（与 `scan diff` 同族旁路，不动 scan 主流程 11 步注册表）。两拍交互：①refresh（只读）= 算受影响文档集 + 门控 + 渲染手术工单（每文档：过时引用清单 + 相关 diff hunks + commit messages + 编辑纪律）；agent 按工单定点编辑文档正文。②`scan refresh --done` = stamp bump 盖章（只推进本次核对过的文档的 source_commit/updated_at，generator 标 scan-refresh）+ 跑 postcheck + 记录刷新审计。依据：D-7 落地记录明确刷新形态为「agent 按清单定点补」；仓库哲学 CLI 预咀嚼事实、agent 从发现降级为解读；scan diff 已是该模式的只读半边。用户在 2026-09-14 对话轮对「落地形态」建议回复「干」= 预授权。

## D-003@v2 基线语义=per-doc bump + 消费方三方对齐（scan-diff 取最旧 / scan-staleness 取最旧 / worktree-guard 经 D-007 握手）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
锚点：未记录
最近确认：318e80c
理由：per-doc bump 不变（只推进本次核对过的文档）。v1 漏盘了第三个消费方 scan-staleness（src/scan-staleness.js:49-57「任一文档代表整批」break 首个命中——readdirSync 顺序决定读到新/旧基线，per-doc bump 后 advisory 会随机失真）；且 v1 对 worktree-guard 的论证有误：guard 写入用 40 位全哈希（src/run/stage.js:291 rev-parse HEAD）而 frontmatter 盖章 7 位短哈希（src/scan-postcheck.js:528 --short），worktree-guard.js:214 精确比对**恒不等**——「异基线触发保护、同基线放行」的前提不成立，实际是 guard 存在即恒拦。修正：①scan-diff readSourceCommit 聚合=最旧提交时间（v1 原案）；②scan-staleness 同口径改「收集全部 source_commit、按最旧（落后最多）计」——最坏情况口径，宁可多提醒不漏报；③worktree-guard 交互由 D-007@v1 握手机制解决，7/40 位错配作为存量 bug 在本变更顺带修复（归一化比对）。
supersedes：D-003@v1

## D-007@v1 refresh 编辑拍 × scan 覆盖保护=guard 握手（mode+refreshDocs 白名单前置分支，顺带修 7/40 位错配）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
锚点：未记录
最近确认：318e80c
理由：握手机制三件：①refresh ①拍**原子写** scan-guard.json 为刷新会话态：{ name_zh: '增量刷新守卫', mode: 'scan-refresh', refreshDocs: ['docs/<p>/scan/<doc>.md', ...]（相对 specRoot 的 POSIX 路径）, sourceCommit: <7 位短 HEAD——与盖章同格式>, startedAt: now, forceRescan: false }；②worktree-guard.js shouldBlockScanDocOverwrite 在 guard 读取后加**前置分支**：guard.mode==='scan-refresh' 且目标文档相对路径 ∈ refreshDocs → 放行；不在白名单的 scan 文档继续走原保护（非本次刷新面不放松）；③顺带修存量 bug：check-1 比对前双方归一为 7 位短哈希（String(x).slice(0,7)），恢复「同基线放行/异基线拦截」的设计本意（现 7 vs 40 恒拦）。不做 draft 暂存区方案（agent 写 .runtime 草稿 + CLI apply——复杂度不成比例且 postcheck 时序别扭）；不滥用 forceRescan=true（会全局解除保护到下次 scan，攻击面过大）。--done 后 guard 不清理（沿用现状「下次 run scan 重写」语义，与 scan 会话同款生命周期）。

## D-008@v1 三处 scope 口径显式化（dirtyCheck 空范围回退 / 受影响集全量变更集 / 软门 scope 过滤计数）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
锚点：未记录
最近确认：318e80c
理由：①dirtyCheck：scope 非空=限 scope 内未提交改动；scope 空（module-map 缺失/解析为空）=回退全仓源码面（git status --porcelain 排除 .sillyspec/**、node_modules、dist、build、.git——scan 文档自身的预期脏不阻断，源码脏即拒，保守 fail-closed）并附 warning 提示先跑 modules rebuild；②受影响文档集的变更集=**全量变更集（不经 scope 过滤）**——与 scan-diff staleRefs 同语义（staleRefs 注释明示「引用自带范围，范围外命中同样过时」），scope 过滤的是文件级漂移归模块，不是引用过期判定；③软门漂移计数=scope 过滤后的 driftCount（与 scan diff 的 driftCount 同口径，可比可解释）。

## D-009@v1 Grill 复核 P2 收口——聚合键改「落后最多」（拓扑）+ --done 内容比对门 + finalize specDir 口径
状态：implemented
变更：2026-09-14-scan-incremental-refresh
锚点：未记录
最近确认：318e80c
理由：①聚合键从「提交时间最旧」改为「落后最多」：对去重基线集逐个 rev-list --count，取计数最大者（拓扑序免疫日期倒挂，且直接就是保守目标本体——落后最多=漂移窗最大）；N≤去重基线数，成本可忽略。②finalizeRefresh 内 specDir = platformOpts?.specRoot || null 再传 runScanPostCheck（对齐 scan-profile.js:356 executeScanFinalize 口径）。③①拍在 guard.refreshDocs 各条目记文档内容 sha256；--done 逐文档比对——内容未变者**默认不 bump**，打印「未编辑即盖章」提示，需显式 --docs 点名或 --force 才推进（工单零改动文档本就不该吃新基线）。附带 P3 措辞修正：①拍写面表述补 _facts.md；FR-5 ④dirty 明确 --force 不可越；staleness 聚合条目从 FR-7 挪入 FR-4；审计平台路径根=resolveRuntimeRoot(platformOpts, specBase)。

## D-005@v1 回退门=硬门三条件 + 软门阈值告警（--force 可越软门不可越硬门）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
锚点：未记录
最近确认：318e80c
理由：硬门（拒绝执行，--force 也不可越）：①任一 scan 文档无 source_commit（旧版/绿地——无基线可增量）；②基线非 HEAD 祖先（分支切换/rebase——diff 两快照对比呈假象，本仓 brainstorm 注入漂移事实 2026-09-14 实证出现过）；③受影响文档含 scan_depth: quick（浅文档本就该 --deep 升级全量重写）。软门（warning 建议全量，--force 可继续）：漂移合计 > 100 文件或 behindCommits > 200（token 收益消失，一致性风险上升——阈值仿 staleness 50/14 的量级惯例放大）。依据：仓库近案 fail-closed 惯例（ql-20260914-003 双占用硬拦不猜归属）。

## D-001@v1 mergeDirtyOverlapThreeWay 写回后补显式 pathspec git add + apply-manifest.json 指纹
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：§64 护栏①：mergeDirtyOverlapThreeWay clean 写回（worktree-apply.js:143）后立即 `git add -- <该批文件显式 pathspec>`（对齐 archive git add 下沉先例）；apply 成功尾声落 apply-manifest.json（文件→sha256 指纹，全量 applied 面=patch 面∪merge 面），供 verify/doctor 做 apply 后漂移检测（staged/worktree 与指纹比对，不一致显式警告）。

## D-005@v1 方案 A——manifest 落变更目录（verify-facts 先例）+ doctor 既有检查项
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：用户选 A（2026-09-14 对话轮，确认 manifest 体量后拍板）：apply-manifest.json 落变更目录（verify-facts.json「CLI 全权写审计底稿」同款先例，随归档留存可审计）；漂移检测走 doctor 既有检查项形态（decision-touch-cli-drift D-001/D-002 先例：不加新命令/新步骤/新占位符）。体量依据：每文件≈150B（路径+sha256+JSON 结构），典型 apply 10-40 文件=3-6KB，极端 50 文件<8KB。拒绝 B（.runtime 随清理丢历史，检测时点优势不抵）；拒绝 C（丢 §64 护栏①后半「apply 后丢失/篡改可检测」价值）。

## D-001@v1 归类闭环选型——agent 归类 + 人抽审（非全自动、非拆分）
状态：implemented
变更：2026-09-14-knowledge-loop-close
锚点：未记录
最近确认：d8fd9ce
理由：选 agent 归类+人抽审：quick --done 收尾时 CLI 拿刚落盘条目根因字段跑 matchKnowledge 渲染归类提议；新子命令 knowledge classify 一次确认后落位（追加目标知识文件 + 更新 INDEX + 从 uncategorized 删除，均可逆）；人闸从逐条确认后置为 archive/doctor 抽审位；配 knowledge-baseline 棘轮（仿 docs-check-baseline 范式：uncategorized 条数 ≤ 基线放行、降则自动收紧）软警告起步。方案 B（全自动）被否——归类错误无审计面、违背"不信口头"主轴；方案 C（拆分延后）被否——归类与注入共享 matchKnowledge 基础设施，拆开则学习闭环两端各自不完整。

## D-002@v1 消费端从「建议读」升级为「机械注入 + 遥测」，不做消费硬门禁
状态：implemented
变更：2026-09-14-knowledge-loop-close
锚点：未记录
最近确认：d8fd9ce
理由：CLI 在 prompt 组装时用任务描述跑 matchKnowledge，命中文件内容直接注入 prompt（top-3 限额，仿「📦 模块上下文」注入先例）+ 每次命中落 .runtime/knowledge-hits.jsonl（仿既有 decision-hits.json 遥测先例）+ 新子命令 knowledge stats 输出命中矩阵（从未命中的文件列死重清单）。明确不做「必须消费」硬门禁——先遥测后优化，数据说话再决定是否升级门禁。
