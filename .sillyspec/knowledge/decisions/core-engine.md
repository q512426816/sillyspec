---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — core-engine

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-core-engine-023@v1 SQLite 引擎访问收敛 db-engine.js 单点
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
原编号：D-903@v1
锚点：src/db-engine.js:12
最近确认：71a7fe6
理由：所有 SQLite 访问必须经 src/db-engine.js 单一换引擎点——sql.js（WASM）时代无 FTS5/native 扩展且纯内存需整库 export 落盘，2026-08-11 换 node:sqlite DatabaseSync；引擎能力取舍（pragma/transaction/pluck 缺口消解）都在此层判断，勿绕过 db.js/db-engine.js 直用驱动。

## D-core-engine-001@v2 test_strategy 实为两值，skip 接线兑现声明语义 + 增 evidence-auto
状态：implemented
原编号：D-005@v2
锚点：src/verify-postcheck.js
最近确认：test123
理由：修正认知前提：`full/module` 语义不变；`skip` 从「声明未接线（配置后实际全量）」接线为「真跳过」；新增 `evidence-auto`（按 module-impact.md 推荐检查组合，缺失降级 module）；消费端 extractTestStrategy 在 src/verify-postcheck.js 接线（v1 遗漏的真实 reader）
来源：2026-08-23-adopt-harness-practices
supersedes：D-005@v1

## D-core-engine-002@v1 防复潮注入挂 brainstorm Step2（knowledge-match 扩展），不新建步骤
状态：implemented
原编号：D-006@v1
锚点：未记录
最近确认：test123
理由：扩展 knowledge-match 扫描 knowledge/decisions/，Step2 加载上下文时命中即注入否决理由与复潮条件；不加新步骤、不动 Step3+
来源：2026-08-23-adopt-harness-practices

## D-core-engine-003@v1 : 方案A 双gate分治——plan 声明核验 + verify 对账，change 级 worktree diff 权威
状态：implemented
变更：2026-09-06-ir-stage-p3a
原编号：D-002@v1
锚点：未记录
最近确认：11aa319
理由：用户选方案A（2026-09-06 对话轮）：plan 侧 task 卡 target_files 声明 + plan-postcheck 新增声明核验检查；verify 侧新增对账检查，Σ(target_files) vs resolveVerifyChangedFiles（change 级 worktree diff，机器权威）算三类差集。拒绝方案B（per-task 对账押在 agent 手写 changedFiles 上，违背「CLI 算事实不信任 agent 自报告」约定，其归因价值降级为对账报告附注）与方案C（advisory 无门禁力，违背种子稿「对账 gate」意图）。

## D-core-engine-004@v1 : 方案A——facts.json 审计底稿 + gate 重跑对比正文预填段（防篡改不依赖底稿）
状态：implemented
变更：2026-09-07-ir-stage-p3b
原编号：D-002@v1
锚点：未记录
最近确认：6d72aca
理由：用户预授权自主抉择方案A（2026-09-07「做完 p3a 就继续 p3b」轮）：①verify-facts.json=CLI 全权写的审计底稿（探针命令行+首跑关键指标+时间戳，供事后复跑，agent 勿手改）；②gate 一致性检查=重跑 runVerifyProbes 对比 verify-result.md 正文预填段——对比基准是正文而非 facts.json（删底稿绕不过防篡改）；③分级：探针1命中数/探针6删除清单不符或预填段缺失=ERROR（确定性高），探针3/5 指标不符=WARNING（测试文件列表/端点 parity 环境敏感）。拒绝B（全 ERROR 环境变化假红）与C（无门禁力，违背「防声称测过」意图）。

## D-cli-entry-003@v1 : P3d 缩范围=delta 聚合器 + advisory 联动，端点 before 基线明确不做
状态：implemented
变更：2026-09-07-ir-stage-p3d
原编号：D-001@v1
锚点：未记录
最近确认：f4db7c9
理由：核心缩为两件：①delta 聚合器——sillyspec delta --change <名> CLI 从前三期已就位的机器产物（P3a reconcile-result.json 的 touched/matched 三类差集、module-map 归属、P3b verify-facts.json 探针摘要、decisions.md 提炼清单）聚合生成 delta.md 落变更目录（archify Delta 的 Before/Delta/After 对应物，md 非 yaml 与全系列一致）；②advisory 联动——delta.md 尾部生成「下次 scan facts 建议刷新模块」段（受影响模块清单）。端点 before/after 基线明确不做（contract-matrix 只有事后快照，before 机制独立立项）；增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）；knowledge 自动沉淀已有 decision-distill（不重复）。

## D-cli-entry-004@v1 : 方案A——独立 CLI + archive 步骤自动生成双入口
状态：implemented
变更：2026-09-07-ir-stage-p3d
原编号：D-002@v1
锚点：未记录
最近确认：f4db7c9
理由：预授权抉择：sillyspec delta --change <名> 独立命令（幂等可复跑）+ archive「确认归档」步自动调用（产物随归档目录保存）。四源聚合：reconcile-result.json（最新 verify-runs 取）+ verify-facts.json + module-map 归属推导 + decisions.md 条目（distill 口径当前版本）。md 输出（Before=变更前模块状态摘要/Delta=文件×模块×差集/After=建议动作）。

## D-cli-entry-001@v1 : 基线=execute 启动时幂等快照（首次落盘不覆盖），增删=归档时 delta 第五源
状态：implemented
变更：2026-09-07-endpoint-baseline
原编号：D-001@v1
锚点：未记录
最近确认：99d255c
理由：用户指令立项（P3d 多次提示）。采集：sillyspec endpoints baseline --change <名>（幂等——已存在不覆盖，首次跑=变更前状态基线）落 .runtime/endpoint-baselines/<change>.json（endpoints[] method/path/source + baseCommit + generatedAt）；execute Step 3（worktree 确认步）prompt 指引 agent 跑一次（对齐 verify-probes --init 先例）。消费：归档时 archive-delta 增第五源——endpoint-extractor 现算当前端点集 × 基线 → diffEndpointSets 纯函数（added/removed）→ delta.md「端点增删」节（替代 P3d 的「独立立项提示」条件行）。provider 产物 endpoints.json 不动（contract-matrix 零改动）。

## D-core-engine-005@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
状态：implemented
变更：2026-09-11-cross-change-decision-guard
原编号：D-001@v1
锚点：未记录
文件：src/knowledge-match.js
最近确认：358af35
理由：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。

## D-core-engine-009@v1 quick 出口分级门禁（L0/L1/L2 机械画像），不新增第三条车道
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-002@v1
锚点：未记录
最近确认：e84bc89
理由：不新增 mid 车道（自选车道会被激励扭曲绕过：95% 超限 quick 本就是 agent 自选、独立完成绕过 full 仪式；新车道=新状态机+新 prompt 面，违背纯减法原则）。改为 quick --done 出口按 CLI 侧机械信号自动升级：L0=现状 test/lint 实测门；L1（跨≥2 模块 或 ≥4 文件）=+每文件注记非空+测试增量检查；L2（跨≥4 模块 或 风险特征命中）=+模块文档认领或显式 --no-docs 豁免留痕+运行时证据要求。判定输入用 CLI 自算 changedFiles×module-map，不用 --files 自声明（37.1% 超限条目存在未声明脏文件）。

## D-core-engine-024@v1 新门禁 advisory 起步，稳定后另立变更升 blocking
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-003@v1
锚点：未记录
最近确认：e84bc89
理由：沿用 docs-consistency D-003 先例（docs-check 决策规则 advisory 起步，稳定后升 error）：L1/L2 起步 advisory（warn 打印+quicklog reasons 落账），dogfood 一个稳定周期后另立小变更升级阻断。避免 sillyhub 等存量大流量仓升级即被新门禁卡死。

## D-core-engine-025@v2 风险命中 v1 收敛为路径模式，diff 关键词维度延后
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-004@v2
锚点：未记录
最近确认：e84bc89
理由：Design Grill 独立审查（2026-09-14 brainstorm-review-2026-09-14-093804）阻断 2：quick 审计链无 diff 文本入参（changedFiles 是路径清单），引入 diff 扫描需加 git 子进程（违背零子进程承诺）且 scope-audit 冻结重放态只有 rows 路径、diff 维度不可重放。收敛：v1 风险命中=路径模式 only（确定性、可重放、零子进程），覆盖 auth/permission/billing/migration/锁/调度主要踩坑域；diff 关键词维度出现真实需求时另立变更。运行时证据要求与人工确认排除条款不变。

## D-core-engine-026@v1 门禁切分点数字以真实模块图谱重算为准
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-006@v1
锚点：未记录
最近确认：e84bc89
理由：交叉表两套启发式模块映射下格子数字不稳定（同一格 n=8 vs n=38），但交互模式稳定。阈值初值按本轮统计取（L1: 跨≥2 或 ≥4 文件；L2: 跨≥4 或风险命中），design 期用 _module-map.yaml 真实图谱重算 sillyhub 数据校准，作为本变更第一个实证任务。

## D-core-engine-027@v1 实现形态选方案 B——独立纯函数信号模块 quick-gate-profile
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-007@v1
锚点：src/quick-gate-profile.js
最近确认：e84bc89
理由：用户选方案 B（2026-09-14 对话轮，单字确认"b"）：新建纯函数信号模块（暂名 src/quick-gate-profile.js，命名 design 期可调），输入 changedFiles + _module-map.yaml + 风险特征表 → 输出画像 {模块跨度, 模块清单, 文件数, 风险命中, 门禁级别}；scope-audit.js 的 auditQuickCompletion 只调用不内联。拒绝 A（信号计算锁死 quick 链路、verify 侧将来无法复用、难单测）；拒绝 C（单消费场景 YAGNI、新配置面=新误判面、违背纯减法原则）。

## D-cli-entry-007@v1 scope-audit 命令增强为门禁画像独立出口（表格 + --json，可重放）
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-008@v1
锚点：未记录
最近确认：e84bc89
理由：用户 2026-09-14 指定（设计确认轮顺带需求）：现有 `sillyspec scope-audit --change <变更名或quick会话id>` 增强为画像出口——表格与 `--json` 两条出口均含 gate 画像（文件数/模块跨度/模块清单/风险命中/门禁级别）与 L1/L2 advisory 发现；利用该命令既有的 quick 会话（quick-<8hex>）与归档变更重放能力，历史会话可回溯审计。与 D-006 校准任务打通：`--json` 批量重放 sillyhub 历史会话即真实图谱交叉表。维持命令 advisory 只读定位，不设门禁。

## D-core-engine-010@v1 门禁阈值支持 local.yaml quick-gate 段覆写，缺省=校准默认值
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-009@v1
锚点：未记录
最近确认：e84bc89
理由：用户 2026-09-14（execute Step2 期追加）：THRESHOLDS 四键（l1_span/l1_files/l2_span/l2_files_degraded）经 local.yaml quick-gate 段覆写，未配置时用代码内默认值（即 task-05 校准定稿值）。与 D-007 否决的「配置化 gate 引擎」边界不同——不引入规则表达式/检查项配置面，仅四个数值键；默认值仍集中 quick-gate-profile.js 单点，config-schema.js 按「local.yaml 键单一数据源」惯例登记四 optional 键。

## D-core-engine-011@v1 范围=7 份 scan 文档刷新闭环，不碰模块卡/map 结构/knowledge（复潮边界记录）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-001@v1
锚点：未记录
最近确认：318e80c
理由：只做 scan 7 文档（docs/<project>/scan/*.md）。模块卡归 archive（sync-module-docs）、_module-map 结构归 `modules rebuild --force`（merge 语义，手动字段全保留）、knowledge 是人工追加域——refresh 越界会变成第三个写入方，重新打开 D-7 推迟方案 C 的双轨问题。知识库 decisions/core-engine.md D-001@v1（ir-stage-p3d）原句「增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）」是范围切割非方向否决——本变更即 scan 域立项，复潮条件满足。

## D-cli-entry-008@v1 入口形态=`sillyspec scan refresh` 子命令（CLI 算差异+门控+出工单，agent 手术编辑，--done 盖章）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-002@v1
锚点：未记录
最近确认：318e80c
理由：独立子命令 `sillyspec scan refresh`（与 `scan diff` 同族旁路，不动 scan 主流程 11 步注册表）。两拍交互：①refresh（只读）= 算受影响文档集 + 门控 + 渲染手术工单（每文档：过时引用清单 + 相关 diff hunks + commit messages + 编辑纪律）；agent 按工单定点编辑文档正文。②`scan refresh --done` = stamp bump 盖章（只推进本次核对过的文档的 source_commit/updated_at，generator 标 scan-refresh）+ 跑 postcheck + 记录刷新审计。依据：D-7 落地记录明确刷新形态为「agent 按清单定点补」；仓库哲学 CLI 预咀嚼事实、agent 从发现降级为解读；scan diff 已是该模式的只读半边。用户在 2026-09-14 对话轮对「落地形态」建议回复「干」= 预授权。

## D-core-engine-012@v2 基线语义=per-doc bump + 消费方三方对齐（scan-diff 取最旧 / scan-staleness 取最旧 / worktree-guard 经 D-007 握手）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-003@v2
锚点：未记录
最近确认：318e80c
理由：per-doc bump 不变（只推进本次核对过的文档）。v1 漏盘了第三个消费方 scan-staleness（src/scan-staleness.js:49-57「任一文档代表整批」break 首个命中——readdirSync 顺序决定读到新/旧基线，per-doc bump 后 advisory 会随机失真）；且 v1 对 worktree-guard 的论证有误：guard 写入用 40 位全哈希（src/run/stage.js:291 rev-parse HEAD）而 frontmatter 盖章 7 位短哈希（src/scan-postcheck.js:528 --short），worktree-guard.js:214 精确比对**恒不等**——「异基线触发保护、同基线放行」的前提不成立，实际是 guard 存在即恒拦。修正：①scan-diff readSourceCommit 聚合=最旧提交时间（v1 原案）；②scan-staleness 同口径改「收集全部 source_commit、按最旧（落后最多）计」——最坏情况口径，宁可多提醒不漏报；③worktree-guard 交互由 D-007@v1 握手机制解决，7/40 位错配作为存量 bug 在本变更顺带修复（归一化比对）。
supersedes：D-003@v1

## D-core-engine-013@v1 refresh 编辑拍 × scan 覆盖保护=guard 握手（mode+refreshDocs 白名单前置分支，顺带修 7/40 位错配）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-007@v1
锚点：未记录
最近确认：318e80c
理由：握手机制三件：①refresh ①拍**原子写** scan-guard.json 为刷新会话态：{ name_zh: '增量刷新守卫', mode: 'scan-refresh', refreshDocs: ['docs/<p>/scan/<doc>.md', ...]（相对 specRoot 的 POSIX 路径）, sourceCommit: <7 位短 HEAD——与盖章同格式>, startedAt: now, forceRescan: false }；②worktree-guard.js shouldBlockScanDocOverwrite 在 guard 读取后加**前置分支**：guard.mode==='scan-refresh' 且目标文档相对路径 ∈ refreshDocs → 放行；不在白名单的 scan 文档继续走原保护（非本次刷新面不放松）；③顺带修存量 bug：check-1 比对前双方归一为 7 位短哈希（String(x).slice(0,7)），恢复「同基线放行/异基线拦截」的设计本意（现 7 vs 40 恒拦）。不做 draft 暂存区方案（agent 写 .runtime 草稿 + CLI apply——复杂度不成比例且 postcheck 时序别扭）；不滥用 forceRescan=true（会全局解除保护到下次 scan，攻击面过大）。--done 后 guard 不清理（沿用现状「下次 run scan 重写」语义，与 scan 会话同款生命周期）。

## D-core-engine-028@v1 三处 scope 口径显式化（dirtyCheck 空范围回退 / 受影响集全量变更集 / 软门 scope 过滤计数）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-008@v1
锚点：未记录
最近确认：318e80c
理由：①dirtyCheck：scope 非空=限 scope 内未提交改动；scope 空（module-map 缺失/解析为空）=回退全仓源码面（git status --porcelain 排除 .sillyspec/**、node_modules、dist、build、.git——scan 文档自身的预期脏不阻断，源码脏即拒，保守 fail-closed）并附 warning 提示先跑 modules rebuild；②受影响文档集的变更集=**全量变更集（不经 scope 过滤）**——与 scan-diff staleRefs 同语义（staleRefs 注释明示「引用自带范围，范围外命中同样过时」），scope 过滤的是文件级漂移归模块，不是引用过期判定；③软门漂移计数=scope 过滤后的 driftCount（与 scan diff 的 driftCount 同口径，可比可解释）。

## D-core-engine-014@v1 Grill 复核 P2 收口——聚合键改「落后最多」（拓扑）+ --done 内容比对门 + finalize specDir 口径
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-009@v1
锚点：未记录
最近确认：318e80c
理由：①聚合键从「提交时间最旧」改为「落后最多」：对去重基线集逐个 rev-list --count，取计数最大者（拓扑序免疫日期倒挂，且直接就是保守目标本体——落后最多=漂移窗最大）；N≤去重基线数，成本可忽略。②finalizeRefresh 内 specDir = platformOpts?.specRoot || null 再传 runScanPostCheck（对齐 scan-profile.js:356 executeScanFinalize 口径）。③①拍在 guard.refreshDocs 各条目记文档内容 sha256；--done 逐文档比对——内容未变者**默认不 bump**，打印「未编辑即盖章」提示，需显式 --docs 点名或 --force 才推进（工单零改动文档本就不该吃新基线）。附带 P3 措辞修正：①拍写面表述补 _facts.md；FR-5 ④dirty 明确 --force 不可越；staleness 聚合条目从 FR-7 挪入 FR-4；审计平台路径根=resolveRuntimeRoot(platformOpts, specBase)。

## D-core-engine-029@v1 回退门=硬门三条件 + 软门阈值告警（--force 可越软门不可越硬门）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-005@v1
锚点：未记录
最近确认：318e80c
理由：硬门（拒绝执行，--force 也不可越）：①任一 scan 文档无 source_commit（旧版/绿地——无基线可增量）；②基线非 HEAD 祖先（分支切换/rebase——diff 两快照对比呈假象，本仓 brainstorm 注入漂移事实 2026-09-14 实证出现过）；③受影响文档含 scan_depth: quick（浅文档本就该 --deep 升级全量重写）。软门（warning 建议全量，--force 可继续）：漂移合计 > 100 文件或 behindCommits > 200（token 收益消失，一致性风险上升——阈值仿 staleness 50/14 的量级惯例放大）。依据：仓库近案 fail-closed 惯例（ql-20260914-003 双占用硬拦不猜归属）。

## D-core-engine-007@v1 mergeDirtyOverlapThreeWay 写回后补显式 pathspec git add + apply-manifest.json 指纹
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-001@v1
锚点：未记录
最近确认：23dc755
理由：§64 护栏①：mergeDirtyOverlapThreeWay clean 写回（worktree-apply.js:143）后立即 `git add -- <该批文件显式 pathspec>`（对齐 archive git add 下沉先例）；apply 成功尾声落 apply-manifest.json（文件→sha256 指纹，全量 applied 面=patch 面∪merge 面），供 verify/doctor 做 apply 后漂移检测（staged/worktree 与指纹比对，不一致显式警告）。

## D-core-engine-008@v1 方案 A——manifest 落变更目录（verify-facts 先例）+ doctor 既有检查项
状态：implemented
变更：2026-09-14-apply-conflict-hardening
原编号：D-005@v1
锚点：未记录
最近确认：23dc755
理由：用户选 A（2026-09-14 对话轮，确认 manifest 体量后拍板）：apply-manifest.json 落变更目录（verify-facts.json「CLI 全权写审计底稿」同款先例，随归档留存可审计）；漂移检测走 doctor 既有检查项形态（decision-touch-cli-drift D-001/D-002 先例：不加新命令/新步骤/新占位符）。体量依据：每文件≈150B（路径+sha256+JSON 结构），典型 apply 10-40 文件=3-6KB，极端 50 文件<8KB。拒绝 B（.runtime 随清理丢历史，检测时点优势不抵）；拒绝 C（丢 §64 护栏①后半「apply 后丢失/篡改可检测」价值）。

## D-change-management-003@v1 归类闭环选型——agent 归类 + 人抽审（非全自动、非拆分）
状态：implemented
变更：2026-09-14-knowledge-loop-close
原编号：D-001@v1
锚点：未记录
最近确认：d8fd9ce
理由：选 agent 归类+人抽审：quick --done 收尾时 CLI 拿刚落盘条目根因字段跑 matchKnowledge 渲染归类提议；新子命令 knowledge classify 一次确认后落位（追加目标知识文件 + 更新 INDEX + 从 uncategorized 删除，均可逆）；人闸从逐条确认后置为 archive/doctor 抽审位；配 knowledge-baseline 棘轮（仿 docs-check-baseline 范式：uncategorized 条数 ≤ 基线放行、降则自动收紧）软警告起步。方案 B（全自动）被否——归类错误无审计面、违背"不信口头"主轴；方案 C（拆分延后）被否——归类与注入共享 matchKnowledge 基础设施，拆开则学习闭环两端各自不完整。

## D-change-management-004@v1 消费端从「建议读」升级为「机械注入 + 遥测」，不做消费硬门禁
状态：implemented
变更：2026-09-14-knowledge-loop-close
原编号：D-002@v1
锚点：未记录
最近确认：d8fd9ce
理由：CLI 在 prompt 组装时用任务描述跑 matchKnowledge，命中文件内容直接注入 prompt（top-3 限额，仿「📦 模块上下文」注入先例）+ 每次命中落 .runtime/knowledge-hits.jsonl（仿既有 decision-hits.json 遥测先例）+ 新子命令 knowledge stats 输出命中矩阵（从未命中的文件列死重清单）。明确不做「必须消费」硬门禁——先遥测后优化，数据说话再决定是否升级门禁。

## D-core-engine-006@v1 覆盖矩阵判定权归 agent 语义判定 + 槽位 fail-closed，关键词只做提示
状态：implemented
变更：2026-09-14-acceptance-test-matrix
原编号：D-001@v1
锚点：未记录
最近确认：7d448ba
理由：三层分工：机械层只做结构归属（allowed_paths∩测试模式 ∪ review.changedFiles∩test/）与关键词命中提示（从 acceptance 提取标识符 grep 归属测试文件，展示命中词）；判定层归 agent 四枚举（covered/partial/uncovered/non-testable）+ 证据必填（测试名或 file:line）；门禁层 fail-closed 只查「槽位已填 + 证据在场」，不查判定内容（防关键词误报阻断 + 防橡皮图章两头堵）。备选否决：纯机械判定——中文 acceptance 与测试名语义鸿沟大，误报会逼 agent 假对齐；硬性全覆盖——文档/部署类 acceptance 合法无测试，需要 non-testable 逃生门。

## D-core-engine-030@v2 台账格式定案 JSON 数组 + 锁（supersedes D-001@v1 的 JSONL 措辞）
状态：implemented
变更：2026-09-15-tax-governance
原编号：D-001@v2
锚点：未记录
最近确认：793951e
理由：JSON 数组 + withFileLock + writeAtomicSync（friction-tally 锁先例）——改动面最小；坏文件=空数组重启全量历史为容忍立场（台账是行为数据非审计账，friction-tally history 本就 20 条截尾同哲学）。v1 answer 中「单行小 JSON + 容忍残行（同 hits.jsonl 模式）」措辞作废。滚动挂 consume 侧 merge-by-change（v1 未涉，Grill P1-1 补）。
supersedes：D-001@v1
故障面：台账坏文件=全量历史重启（容忍立场）；merge 写失败 fail-soft 丢本条不阻断收尾
退役判据：台账积累 50+ 条后阈值提示从未触发行动，或字段覆盖率三个月 <50%，降级纯记录

## D-core-engine-015@v1 勾选守卫 diff 集对齐 D-004@v1（库内）worktree 分支 diff+porcelain 口径，抽公共 helper
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
原编号：D-004@v1
锚点：src/run/complete.js:prefetchDiffFileSet
最近确认：42cef77
理由：不降级。根因是 `prefetchDiffFileSet` 的 diffFileSet 只算 `git diff base..head`（worktree 已提交），而草稿归属（generateTaskReviewDrafts）并入了 porcelain 未提交 + merge-base committed 补齐——子代理默认不 commit 时 diffFileSet 恒空/缺文件，勾选守卫全部跳过。修法：把「worktree 改动文件集（porcelain ∪ committed merge-base 补齐）」抽成公共 helper，complete.js 勾选守卫与 task-review.js 草稿归因共用（两处既有「口径须同步改」注记正好收口）。同文件多 task 归属：`attributeSuspectTasks` 首中即止改全量多归属（map 值 string[]），③类报告渲染完整作者列表。
故障面：helper 对 meta 缺失/in-place 返回 [] → 守卫退回 base..head 现状（fail-open 不放大勾选面）；多归属渲染膨胀 → 截断展示
退役判据：review/勾选改为 per-task 锡点锚定（base/head 写进 task 卡）全量落地时

## D-core-engine-031@v1 required-evidence 消费侧双根核验，生成时机不动
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
原编号：D-005@v1
锚点：src/verify-postcheck.js:runRequiredEvidenceCheckV2
最近确认：42cef77
理由：消费侧。`runRequiredEvidenceCheckV2` 逐文件核验（存在性/mtime）从单根（主仓 cwd）改双根：候选根 = [cwd, worktree 根]（worktree 根经 `specBase/.runtime/worktrees/<change>/meta.json` 解析，与 resolveVerifyChangedFiles 同源）；文件在任一根存在即 filesExist=true，mtime 取所在根 stat。diffHit 不动（resolveVerifyChangedFiles 已 worktree-aware）。生成时机不动——execute 期 Task Review Gate 写入是既有契约（gates.js:1172?）。
故障面：worktree 根解析失败 → 退单根现状（误报回潮但不误放行）；双根同文件内容分叉取 worktree mtime → 主仓后写场景误判 mtimeOk=false → 属实报（主仓后写=apply 后态，不该在 verify 期）
退役判据：verify 核验统一改在 worktree 内执行（单根化）时

## D-core-engine-032@v1 接口矩阵引入第五判定形态 covered-service（service 层承接计入覆盖）
状态：implemented
变更：2026-09-19-api-matrix-service-coverage
原编号：D-001@v1
锚点：未记录
最近确认：7438d34
理由：新增 verdict 枚举 `covered-service`：**计入分子、分母不变**（区别于 non-testable 的分母扣除——那是「不可测」，service 承接是「已测、覆盖层不同」）；证据列必须含**真实测试锚点**（复用 probe7-anchor-check 的测试文件口径：`.test.` / `test/` 路径 / file:line 形态），缺锚点即 error（与 non-testable 必须有一句理由同构——防滥用是 D-004@v1(api-coverage-smoke)「防挑好测的测」立意的延续，虚标 covered 反而是当前最大的诚实性漏洞）；不触发 PASS 封顶降级（区别于 partial——service 承接是已完成态不是移交待办），但 advisory 单独计数「N 端点由 service 层测试承接（非端点级）」保持评审可见。
故障面：全部端点都标 covered-service、零端点级验证的系统性逃避——advisory 计数保持可见但不阻断（先观察滥用面再考虑上限；写端点的回执/集成门禁是独立门照常拦截）。
退役判据：若接口矩阵迁结构化产物（design-frontmatter/api.yaml），覆盖形态语义随预填源切换重审；advisory 实证滥用面可忽略时移除计数注记。

## D-core-engine-033@v1 MATRIX_VERDICT_WHITELIST 两矩阵共用——covered-service 联动接受而非拆分
状态：implemented
变更：2026-09-19-api-matrix-service-coverage
原编号：D-002@v1
锚点：未记录
最近确认：7438d34
理由：接受联动不拆白名单。依据：两矩阵判定词汇本就「骨架口径注记字面同源」；验收矩阵语义上「验收项由非端点层测试承接」本就是正当形态（单测承接验收项是常态），联动是语义修正而非风险扩散。执行时必须核实探针 7 门（:872 附近）对 covered-service 的记账路径——不得落进 unfilled 分支误报。
故障面：探针 7 记账分支若显式枚举 verdict 值（而非白名单判非）会把 covered-service 误判 unfilled——需测试覆盖「验收矩阵含 covered-service 行」用例。
退役判据：若两矩阵判定词汇语义分化（各自需要不同枚举集），拆白名单为两份。

## D-core-engine-034@v1 方案选择——A（新枚举 covered-service）胜出
状态：implemented
变更：2026-09-19-api-matrix-service-coverage
原编号：D-003@v1
锚点：未记录
最近确认：7438d34
理由：选 A。**用户未应答（自主模式推进，非用户确认——可否决：--reopen 重选）**，依据：用户原始反馈方向（诚实标注 service 承接、不再被迫虚标 covered）与 A 完全对齐；B 的最小改动恰好牺牲本变更的目的本身（端点级/间接区分度、承接占比可审计、防滥用——原虚标问题被合法化）；C 把 partial 语义重载为「间接覆盖可放行」，与移交联动/PASS 封顶分支纠缠最深、回归面最大。
故障面：自主选案未经用户实时确认——用户回看时若否决 A，需 --reopen 从 step 4 重做并 supersedes 本条。
退役判据：用户回看确认方案 A（step 5 设计确认轮已实质覆盖——设计为 A 的直接展开且获用户实答「确认设计，继续」）。

## D-core-engine-017@v1 完成门「声明追赶重定价」——无摩擦可降、摩擦地板不退（「只升不降」契约修订）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-003@v1
锚点：未记录
最近确认：7438d34
理由：escalateCeremonyTierAtGate 在档位文件在场时先用当前 design/plan 重跑 computeInitialCeremonyTierDoc，再跑摩擦升档。**transitions 为空且 ledger 摩擦未超阈：开跑价整档换成重算结果，可升可降**，reasons 留「声明追赶重定价」；**已有摩擦迁移：地板不退**，重算只更新 blast/span 分量，最终档=max(重算档, 摩擦地板)。懒 agent 靠删关键词把真 S3 写成 S0 仍由收口双跑按实际 diff 硬拦（verify-postcheck 事实面 detectChangeRisk 无声明通道）。
故障面：重定价抖动（design 反复改声明 → 档位反复横跳）——每次迁移留 transitions 审计痕，评审可见；摩擦地板保证已付仪式价不白付。
退役判据：若声明通道前移到定价时刻强制存在（如 brainstorm 门要求 frontmatter 先行），追赶重定价需求自然消失。

## D-core-engine-035@v1 双跑高报 severity warn——只记账不阻断
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-005@v1
锚点：未记录
最近确认：7438d34
理由：增加高报态：事实档低于声明档 → severity 'warn'，写入 reasons/notes，verify 不回滚、archive 不阻断、不记 gate_rollback 摩擦；低报维持 error 硬拦。消费面（runCeremonyDualRunCheck 返回结构与 complete-handlers 接线）同步 'warn' 非阻断语义。
故障面：高报免费化被滥用来「买保险」——高报自身代价是更重仪式（S3 两轮评审），自罚机制天然存在，无外部性。
退役判据：无（单向低报硬拦是不可让步的诚实性门）。

## D-core-engine-016@v2 重定范围——四件事编队（supersedes D-001@v1 五刀编队）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-001@v2
锚点：未记录
最近确认：7438d34
理由：范围收成四件事（用户裁定原文「范围收成四件事：路径声明的 blast、追赶重定价、span 标题、高报记账」）：①blast 轴项目化（D-008）②追赶重定价（D-003 保留）③span 标题（D-004 保留）④高报记账（D-005 保留）。刀 1/5 作废（D-002/D-006 superseded）；变更名保留不改（内容重定，目录 churn 无收益）。
故障面：范围仍跨三模块+scan 文档——rebuild 保留手工字段（D-008）与九消费点切换是两大执行风险，分别以回归测试与逐点处置表对冲。
退役判据：若路径声明面实证维护成本过高（声明漂移没人管），重审是否引入 scan 自动推导建议（仍需人工确认落 map）。

## D-core-engine-036@v2 在途 api-matrix 变更不动档位文件（supersedes D-007@v1，entryPoint 论断随词表退役作废）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-007@v2
锚点：未记录
最近确认：7438d34
理由：只保留：在途 api-matrix-service-coverage 继续按已锁定的 S3 跑完（已付仪式不追溯，排期解耦）。entryPoint「词汇碰撞非边界 bug」论断随散文匹配退役失去对象（D-008）——新架构下该词不再被任何路径匹配。
故障面：无（零动作决策）。
退役判据：无。

## D-core-engine-037@v1 仪式档与证据门分离——证据只认显式标记，不从仪式档推断
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-009@v1
锚点：未记录
最近确认：7438d34
理由：blast 声明两项独立属性：`tier`（仪式档）与 `evidence: true`（需要真实集成证据）。**证据门只认显式标了 evidence 的路径，不从 tier S3 推断**；evidence 命中**不被 risk_level 显式声明豁免**（豁免=改 map，git 可见——今日显式短路「声明 doc-only 连证据门都免」的懒 agent 洞顺手收掉）；risk_level 仍可经 D-003 追赶压低仪式档。requiredVerification 生成源从 level 词汇推断改为 evidence 位直出。
故障面：evidence 位滥用（全仓标 true）→ 证据门大面积误拦——自举声明表只挂真运行时域（D-010），map 评审可见。
退役判据：无（分离是不可让步的语义边界）。

## D-core-engine-018@v1 sillyspec 自举声明表口径——S3 钉真运行时域、门禁判定文件 S2、core-engine 不整模块标价
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-010@v1
锚点：未记录
最近确认：7438d34
理由：**S3+evidence 只钉真正的会话/租约/worktree/dispatch 路径**（runtime 会话域文件、worktree 模块、dispatch 域）；**门禁判定文件最多 S2**（stage-contract/verify-postcheck/verify-probes/ceremony-tier/review-tier/change-risk-profile/quick-gate-profile/probe7-anchor-check/run/gates 等）；**core-engine 不整模块标价**（datetime/constants/fs-atomic/taskcard 等零声明）。按此口径 api-matrix 类变更新架构下 = S2（8 文件 span），不是 S3——「改门禁判定白名单」与「改会话租约」不同价。具体路径清单在 design 落全量表。
故障面：声明表与模块演化脱节（新文件落错价）——map 评审流程可见，scan 层不自动改价（宁缺勿错）。
退役判据：无。

## D-core-engine-038@v1 QUICK_RISK_PATH_PATTERNS 同族登记——管道建好后迁，不单独立刀
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-011@v1
锚点：未记录
最近确认：7438d34
理由：本变更只在 design 登记同族关系与迁移方向（blast 声明管道落地后，该表迁为项目可配置——本仓自举声明可吸收或保留为缺省种子待定），**不扩刀不单独立刀**。
故障面：遗忘——design 与归档蒸馏双登记（archive 时 decisions 提炼进知识库）。
退役判据：迁移变更落地时本条 superseded。

## D-core-engine-019@v1 方案选择——A（评审材料包契约）胜出；1/2 合并为同一契约矛盾
状态：implemented
变更：2026-09-19-review-material-pack
原编号：D-001@v1
锚点：未记录
最近确认：7438d34
理由：选 A。**核心判断（用户）：原 1/2 不是两个功能，是同一处契约矛盾**——复审增量机制 2026-09-16 已进引擎（stage-review.js:513 renderPriorRoundFindingsMd 注入 {PRIOR_REVIEW_FACTS}，明文「以增量为主，不重演全量审查」；S3 菜单第二轮只盯首轮未决项），QA2 仍烧 135 万是因为同 prompt 里有更高优先级的反指令：Grill 输入材料段写死「必须读取完整 design.md」（brainstorm.js:417）与「素材宁可多读，不要只读摘要」（:424）；94 分钟事故后加的时间盒只限发散、没缩短必读清单——**子代理服从必读清单，不服从回灌块**。B（仅删清单无注入）被否：材料面失控、子代理自行检索重新发明热点；C（含填卡/轮次/计量）被否：范围炸且自吃狗粮。
故障面：材料包太薄→评审质量降为确认偏差放大器（对策见 D-003 基准面语义）。
退役判据：若材料包实测导致评审漏检率上升（P0/P1 逃逸到后续阶段），重审包的下限构成。

## D-core-engine-020@v1 验收标准——可证伪的清单覆盖，不是 token 节省比例
状态：implemented
变更：2026-09-19-review-material-pack
原编号：D-003@v1
锚点：未记录
最近确认：7438d34
理由：不能——那个数是希望，写进 design 会变成无法证伪的成功标准。验收两条：①**清单上的每一条都能只靠材料包回答**；②**复审 prompt 里不再出现「读完整 design / 宁可多读」**（机械可查——补一条回归钉：grep 阶段 prompt 模板断言无此类指令字样）。
故障面：验收②的机械钉可能误伤合法表述（如「可按需定向查证」与「宁可多读」边界）——钉只匹配「必须读取完整/素材宁可多读」两个原语，正则收窄。
退役判据：无。

## D-core-engine-021@v1 范围与硬约束——六模式表迁项目声明，价目表/blast 段零改动
状态：implemented
变更：2026-09-19-span-risk-pattern-migration
原编号：D-001@v1
锚点：未记录
最近确认：c796534
理由：迁移=六模式表自硬编码改项目声明（形态在方案步定），两消费面（①ceremony-tier.js:218 span 轴命中→至少 S2；②quick-gate-profile.js:148 computeGateProfile 默认 riskTable 命中→L2+runtimeEvidence advisory）按方案期决策切换。硬约束（用户原话逐条）：**价目表不动**（三轴 max 公式、阈值 8/2、force_tier 只升不降）；**blast 声明面（blast 段）不动**——只迁 span 的路径模式；quick 画像消费面与定价消费面口径**可以分开迁也可以一起**（design 定）；risk_level 先行纪律（design frontmatter 首次定价前声明）。
故障面：迁移中匹配语义漂移（口径变化伪装成迁移）——以「同 token 集 ⇒ 逐字节同命中」等价性钉对冲（方案步定）。
退役判据：若 span 轴整体改结构化输入（非路径模式），本机制随轴退役。

## D-core-engine-022@v1 方案 A——map 顶层 span_risk 段（token 扁平列表）+ 空缺省 + 双消费面同刀 + 硬退役
状态：implemented
变更：2026-09-19-span-risk-pattern-migration
原编号：D-003@v1
锚点：未记录
最近确认：c796534
理由：选 A（用户简报显式委托方案期定夺——原话「形态 brainstorm 定」「缺省行为、本仓自举表、两消费面切换、向后兼容（无声明项目）都在方案期落决策」；本条 agent 按委托选定，可 --reopen 否决）。理由：①与 blast 管道同构（D-008 先例：map 主声明进 git 可评审、modules rebuild --force 未知顶层段通用回插已覆盖 span_risk、装载容错立场「坏段跳过不拦截」现成）；②B 被等价问题显式否决过——local.yaml gitignore 每机一份当共享价目表（D-008 evidence 原文「local.yaml 当共享价目表」被否）；③C 与 blast「未配置禁止回退」（D-008）正面冲突且让全宇宙表活在缺省路径，违反知识库 conventions「判级/定价/门禁输入必须项目声明，禁全宇宙词表」口径真相源条目。覆盖决策：符合 D-001（价目表公式零改动）、不违 D-002（不触碰 blast 段）。
故障面：①无声明项目静默失去六域网（auth/billing 路径不再触发 span S2 / quick L2）——以 known-issues/文档登记 + 本仓自举表示范对冲，blast 迁移同款取舍；②token 写错（拼错/过宽）静默失配——token 为纯字面量可评审，装载数量进 reasons 审计。
退役判据：若 span 轴改结构化输入或 pattern 声明并入 blast 段 schema 升版，本段形态随之退役。

## D-core-engine-039@v1 执行期裁决——连带测试翻新面扩展两文件（Grill 枚举遗漏）+ design 阈值措辞修正
状态：implemented
变更：2026-09-19-span-risk-pattern-migration
原编号：D-005@v1
锚点：未记录
最近确认：c796534
理由：扩翻新面：两测试文件补翻新（夹具 map 补 span_risk 段走真实装载路径——比注入更端到端），design 文件清单/任务卡 allowed_paths/tasks.md 同步扩面；阈值措辞全文修正为「阈值 8/3/2 三常量」（约束实质=三常量零改动，已满足且继续满足）。非破坏性：可逆、局部、不改 D-001~D-004 语义、不越变更边界（两文件属本变更行为契约的直接连带测试，FR-03 同类翻新义务）。
故障面：夹具补段后夹具 map 与真实 map 演进脱节（token 变更夹具不跟）——夹具只钉本变更语义所需最小 token 集（auth 族），真实口径以仓 map 为准。
退役判据：无（连带翻新属一次性收口）。

## D-cli-entry-010@v1 收口范围=方案B（读面闭环+遍历召回接线）
状态：implemented
变更：2026-10-08-knowledge-graph
原编号：D-001@v1
锚点：未记录
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69
理由：用户选方案B：读面闭环（本体表 + knowledge-graph.js 派生图 + knowledge graph 子命令 + doctor 图完整性检查）+ matchKnowledgeHybrid 新增 scope 遍历召回层与防复潮保底；平台侧 graph-search 端点与 stats 图维度指标不在本变更范围

## D-core-engine-040@v1 本体三档强度与逐边传递规则，遍历召回只走强边
状态：implemented
变更：2026-10-08-knowledge-graph
原编号：D-002@v1
锚点：未记录
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69
理由：三档分强/中/弱：强边（anchors/supersedes/from-change/belongs-module/module-dep/module-files/deliverables/change-modules/test-binding/describes/changelog-of/changelog-entry）可进 impact 闭包与召回传播；中边（doc-refs/scan-refs，随代码漂移的正文引用）仅查询展示；弱边（route/entry-link 预留）仅展示与自检。可传递边仅 supersedes（版本链）与 module-dep（依赖闭包）
故障面：强弱分档错误导致召回漏（错标弱）或洪水（错标强）；分档表为 design.md 本体节定稿契约
退役判据：实测遍历召回命中率持续低于本地词片回退层时重审分档

## D-core-engine-041@v1 与 project-map 墓碑切割——无导航文档/无刷新机制/内存派生
状态：implemented
变更：2026-10-08-knowledge-graph
原编号：D-003@v1
锚点：未记录
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69
理由：不新增任何人读导航文档；不新增任何刷新/缓存机制；图=buildKnowledgeGraph() 解析时内存派生随建随用；md/yaml 真相源一字不动。产出只有机器查询面与自检面

## D-core-engine-042@v1 查询入口键=机器算，agent 不以自由文本为图查询键
状态：implemented
变更：2026-10-08-knowledge-graph
原编号：D-004@v1
锚点：未记录
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69
理由：入口三键全部机器算：①变更执行期 scope 文件集（resolveVerifyChangedFiles 既有函数，CLI 算事实）；②需求期承接引用（brainstorm Step8 注入清单）∪ 声明模块域反查（belongs-module）∪ 词面三层兜底（既有）；③手动 CLI 锚点（文件/模块/变更名）。词面是弱入口（既有三层在管），结构键（diff/承接/模块域）是强入口（本变更新增）
故障面：scope 集计算失败/为空时整层静默跳过（降级即现状），不抛错阻断调用方
退役判据：若实测 scope 遍历召回命中与词面三层高度重合（增量趋零），重审第四层存续

## D-core-engine-043@v1 deliverables 双源=design.md 交付表 ∪ change-patch.json files
状态：implemented
变更：2026-10-08-knowledge-graph
原编号：D-005@v1
锚点：src/fr-index.js:frCoverageFiles
最近确认：a677be8ad7b448ce17fa8eecea3d6112b0cdfd69
理由：双源并集（fr-index frCoverageFiles 同款）：厚道主源 design.md 交付清单表（剥反引号/NEW: 前缀），thin 主源 change-patch.json 的 files；统一剔 .sillyspec/ 前缀、POSIX 归一。change-modules 边由 deliverables ∩ 模块 paths 前缀匹配派生（最长前缀优先）

## D-unmapped-139@v1 变更期 trace 载体 = changes/<名>/test-trace.json
状态：implemented
变更：2026-09-24-fr-test-bindings
原编号：D-001@v1
锚点：未记录
最近确认：6ac260bd
理由：

## D-unmapped-140@v1 两处真源 + 单点解析模块（src/test-bindings.js）
状态：implemented
变更：2026-09-24-fr-test-bindings
原编号：D-002@v1
锚点：未记录
最近确认：6ac260bd
理由：

## D-unmapped-141@v1 晋升时机 = verify --done 矩阵门通过时
状态：implemented
变更：2026-09-24-fr-test-bindings
原编号：D-003@v1
锚点：未记录
最近确认：6ac260bd
理由：

## D-unmapped-142@v1 quick 行落 candidate（诚实优先）
状态：implemented
变更：2026-09-24-fr-test-bindings
原编号：D-004@v1
锚点：未记录
最近确认：6ac260bd
理由：

## D-unmapped-143@v1 orphan 行身份 = acc-<index>-<textHash8>
状态：implemented
变更：2026-09-24-fr-test-bindings
原编号：D-005@v1
锚点：未记录
最近确认：6ac260bd
理由：

## D-unmapped-144@v1 锚点集=task 卡 requirement_ids 并集；差集保守向
状态：implemented
变更：2026-09-24-fr-test-readside
原编号：D-001@v1
锚点：未记录
最近确认：82002514
理由：

## D-unmapped-145@v1 现选测逐字保留，残差只在结果层加法
状态：implemented
变更：2026-09-24-fr-test-readside
原编号：D-002@v1
锚点：未记录
最近确认：82002514
理由：

## D-unmapped-146@v1 runner 复用 buildDepsBatches 推断面
状态：implemented
变更：2026-09-24-fr-test-readside
原编号：D-003@v1
锚点：未记录
最近确认：82002514
理由：

## D-unmapped-147@v1 悬空硬错=门入口 fail-fast
状态：implemented
变更：2026-09-24-fr-test-readside
原编号：D-004@v1
锚点：未记录
最近确认：82002514
理由：

## D-unmapped-148@v1 披露真源=JSON sidecar
状态：implemented
变更：2026-09-24-fr-test-readside
原编号：D-005@v1
锚点：未记录
最近确认：82002514
理由：

## D-unmapped-149@v1 trace 非空变更账本停复用（fail-closed）
状态：implemented
变更：2026-09-24-fr-test-readside
原编号：D-006@v1
锚点：未记录
最近确认：82002514
理由：

## D-unmapped-154@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-residual-runner-parity
原编号：D-001@v1
锚点：未记录
最近确认：0c507e2ebe90ac31d847cd319669d4a9b13a3f91
理由：最大风险=jsxRunner 提取的命令串形态不匹配项目实际（cd 链/嵌套 pnpm exec）——提取不到走 skip 批（安全侧：转办不假跑），提取到但命令错会 failed 由 known_failures/归属鉴定兜（与 py 侧推断同风险面同兜法）。死路：CLI 主动探测项目 vitest 配置（读 vite.config/tsconfig 判项目类型）——探测面无界且易过时，命令串推断+skip 转办是诚实分界，弃；死路：JSX 批也 node --test 顶着 known_failures——制造恒败段正是要修的病，弃。

## D-unmapped-155@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-reconcile-source-isolation
原编号：D-001@v1
锚点：未记录
最近确认：3eb3bfbff3b9962ef5430bd6c75ea299bfda9df5
理由：最大风险=meta.branch 指向的分支已被删/移（rev-parse 验证挡住→静默省略回降级，不误锚）；meta.changeName 键与实际变更不匹配（worktree 建立时写入的键与 change 名同源——键漂移时第三候选同样落空回到现状，无恶化面）。死路：让 agent 在对账前「重建分支」的指引——这正是 R18 死循环的形态（4 种面重建 matched=0）；诊断给的出路是登记/恢复既有 ref 而非重建内容，弃。

## D-unmapped-164@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-dynamic-test-inference
原编号：D-001@v1
锚点：未记录
最近确认：7372e0efe88964f7b5be299b98dab54a2a50a2a9
理由：最大风险：动态子集的覆盖面判断错误→漏测放行（门禁漏跑=静默通过）。缓解：三源并集宁可多跑（import 闭包+FR 回归都是加法面）、deps 批超帽照旧（30/组保底 5）、全量语义留 test_strategy: full+CI 兜底；existing 测试大量断言 commands.test 执行——显式 full 逃生阀保住该路径语义，fixture 迁移成本可控。次风险：结构推断 runner 猜错（如 monorepo 双 package manager）——推断按「最近清单祖先」就近原则，猜不出降档 skipped 带指引不硬跑。放弃的方案：① 纯静态修补（继续 local.yaml 加 per-module 键）——治标，并行互改问题原样；② bindings 单源（只跑 FR 绑定测试）——冷启动仓索引空会饿死，且 bindings 是「上次跑过」非「必须跑」的形式化证明；③ agent 每变更自带测试命令参数——把配置问题转移成提示词纪律，无机器校验面。

## D-unmapped-167@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-knowledge-digest
原编号：D-001@v1
锚点：未记录
最近确认：a3b99f259e9ac7e7fc5b8a06ff0d65845a21a8b2
理由：最大风险：阈值为拍脑袋初值（rot 100/inbox 20）——先按本仓实测量级定（本仓实测 305/39 首跑双超），连续安静或持续爆表都该调，防仪式化熔断在案。次风险：suggestDomainFromFiles 对扁平 src 布局返回 src（无意义域）——已接受（monorepo 规则在前覆盖；错建议不自动执行只提示，人工裁决兜底）。readFrBindings 逐条目扫描 O(条目×文件) 性本仓秒级可接受（周节奏消费）。放弃方案：rot 判据收紧——细看后收回：广域变更打 239 条标记是诚实信号（真触达），病在阅读面不在判据，digest 按域聚合即解。

## D-unmapped-172@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-redomain
原编号：D-001@v1
锚点：未记录
最近确认：8b454e10018457d8a73086a3158e51c1a9eb2ad5
理由：最大风险：ID 前缀与域不符的历史痕迹（FR-auto-backend-019 住 platform-sync.md）——有意取舍：换号会断绑定/supersede/最近确认三条寻址链，痕迹只影响美观；INDEX 路由按域文件而非 ID 前缀，注入/rot 查询全按文件域走。次风险：syncIndexRoutingLines 全目录同步在 INDEX 手改杂行时的行为——既有函数幂等语义（既有行 no-op），风险承袭不新增。放弃方案：迁域换号+三链改写——身份重写面太大且易漏，违背 D-001 单一身份。

## D-unmapped-174@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-change-birth-stage-brainstorm
原编号：D-001@v1
锚点：未记录
最近确认：a419b37670355b1bec7891eb34c3cb1850e5aace
理由：最大风险：迁移把「从未进主流程」的存量行改判为 brainstorm 后，滞留提示语义从「停在代码扫描」变「停在需求探索」——展示层措辞变化，用户已裁定接受（起步就是头脑风暴）。放弃的方案：① 从 VALID_STAGES/STAGE_ORDER 里整体移除 scan——放弃，scan 阶段本身（项目级扫描操作）合法存在，牵动 stage-contract/consistency 面太大且非本缺陷根因；② 只改出生默认不做存量迁移——放弃，存量误导行（governance-rpc-actions 类）会一直显示到归档才消失，修复不完整。

## D-unmapped-181@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-known-failures-hardening
原编号：D-001@v1
锚点：未记录
最近确认：309f6ffaa39f1c07f9592ccfac1b9b0d5f872d8d
理由：最大风险：泛用词停用可能让某仓既有清单里的懒模式失效 → 该仓门从假 PASS 变真 FAIL——这是修复不是回归（装载警告点名停用条目，改锚定式即恢复）。放弃方案：硬失败行只准锚定式豁免（首轮实现实测误伤主用例——按文件名豁免预存失败测试正是硬行+裸子串的合法组合，跨仓全在用，已回退改为泛用词停用）。

## D-unmapped-184@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-tap-judge
原编号：D-001@v1
锚点：未记录
最近确认：bdd45b24cf039b38828e4e58b6d71e0ea2d874d0
理由：最大风险：TAP 报告器为 node 18.17+ 特性——旧 node 消费仓的 auto-js 批（本就要求现代 node 跑 node --test）实际不构成风险，非 TAP 回退兜底。放弃方案：全量换 JSON 报告器（变化面更大，TAP 文本行与既有豁免模式语义更接近）。

## D-unmapped-185@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-watcher-signal-widen
原编号：D-001@v1
锚点：未记录
最近确认：5e564b73c4c4eaecec2998f35d504c3429936543
理由：最大风险：verify-runs 全目录逐文件 JSON 解析在运行目录多时变慢——3s 轮询周期内条目有限（实测当日 ~60 目录），必要时后续加目录名倒序早退。放弃方案：假勾选改「区间终态判定不预警」（丢失即时信号，拍位消解两全）；watcher 直读 local.yaml 内容上事件（隐私面拒绝）。

## D-unmapped-186@v1 范围裁定——只管 thin 道入口，run 族入口不动
状态：implemented
变更：2026-09-28-unclear-req-to-brainstorm
原编号：D-002@v1
锚点：src/db.js:266
最近确认：cb6fc0a0
理由：不需要。run 族（完整流程）本来就从 brainstorm 阶段起步（.sillyspec 状态机 stage 序列 brainstorm→…→archive，src/db.js:266 current_stage 默认 'brainstorm'），不存在「跳过头脑风暴」问题；失效面只在 thin 道 flow start 直通

## D-unmapped-192@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-knowledge-reason-overlap
原编号：D-001@v1
锚点：未记录
最近确认：ebc3ae489dd88b6f5748f0be96e06349d3a0acf0
理由：风险：①平局先验只兜「标题零命中」的近义查询，查询词命中了无关条目标题时先验不介入（主题信号优先于先验，属正确取舍）；②死路条目在文件序靠后时靠先验置顶而非相关度——先验普适于死路类（本变更全链路的立论即死路类是最强防复潮信号）。退役判据=死路先验导致高频无关置顶投诉。

## D-unmapped-193@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-knowledge-score-denoise
原编号：D-001@v1
锚点：未记录
最近确认：decac02868444a405fbbbe613a5599cb0eb00e66
理由：风险：① 剥数字后「含版本号/年份的语义查询」（如 查 FR-016 相关决策）丢失数字区分力——决策标题本无数字语义，可接受；② \p{P} 剥除连中英标点（含全角），标题实词不受影响。死路=正则 Unicode 类别写错会静默破坏主场景（首版 \W 误剥 CJK 被测试②当场拦截）——测试钉主场景/近义/ASCII 三面。退役判据=出现依赖数字 bigram 才能区分的相关性场景投诉。

## D-unmapped-197@v1 否决入库侧路由词表派生——同窗词片按序截断=抽签
状态：rejected
变更：2026-09-29-decision-route-vocab
原编号：D-001@v1
锚点：未记录
最近确认：b8a7ccc9f572b09dbe993ae9c84a9841391181bf
理由：实测否决：unmapped.md n∈[2,3] 窗词片千级（同日三口径复测 844~1176 随并行漂移），目标词（谓词 n=2）深藏数百名——任何 cap 都是抽签而非选择；入库时挑选词表与「枚举定义开放世界」同构（挑选权无处安放）。改查询侧：只测查询自身几十个词片，无挑选无 cap。
否决理由：同窗词片按序截断=抽签，选择面无信号；且 INDEX 行膨胀不可读。
复潮条件：出现可靠的封闭面词显著性判据（非出现频次）或蒸馏 agent 主动写 tag 的机制落地。

## D-unmapped-198@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-brainstorm-closure-gates
原编号：D-001@v1
锚点：未记录
最近确认：e8f23a7e5f00b52e8be8988768549d1dfb1c5848
理由：最大风险：warning 噪声——design-init 骨架未编辑完的 design.md（R-01 待填行／决策追踪待确认行）会在 --done 集中亮 2-3 条 warning。这是预期收口行为（骨架=未闭合），文案已逐条给出路；退役判据：观测一个周期——误报为主且 agent 普遍忽略→收窄词表，真阳率主导→升 error。 试过放弃：① error 级阻断——存量 brainstorm 阶段进行中变更会立即撞墙，破坏「存量行为不变」兼容红线，且与故障面软警告先例相悖；② 自审存疑查裸词「自审存疑」——design-init 自审 checklist 模板行含该词必然常驻误报，改为查「自审存疑[:：]」应用形态＋行内闭合 token（D-xxx/R-xx/已解决/已闭合/已确认）判定；③ requirements D 覆盖沿用 shared.id-traceability 通用文案——缺「决策覆盖矩阵补行或标剩余风险」的闭环出路提示，语义丢失，故立独立规则带出路文案。 死路注记核对：知识库 unmapped 域 5 条死路（restrict 空清单传参／回溯补录历史断链／CLI 探测派发能力／CLI 探测 vitest 配置／对账前重建分支）与本方案无交集——本方案不建清单通道、不回溯历史、不探测环境，全部复用既有管线。

## D-unmapped-199@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-knowledge-vector-recall
原编号：D-001@v1
锚点：未记录
最近确认：bc68334cae0cfbf1adada8f8b25e62f83b9e57f3
理由：风险：① 平台未实现期每个零命中查询打一次真实平台 404（静默、debug 可开——流量无害但可观测）；② 向量结果随 embedding 模型升级漂移（非确定性）——advisory 面可接受，确定性底座是本地层；③ 同号锚点缺 change 时全量带回可能放大（unmapped 实测 65 同号）——三层有界：构建侧 score 序封顶 20、flow/complete 渲染 slice(0,5)、prompt 渲染 slice(0,5)（审查 P2 补齐）。退役判据=平台向量命中长期与主题无关（召回质量投诉）或平台放弃该端点（删本层即回两层）。

## D-unmapped-202@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-rot-retire-inject-cap
原编号：D-001@v1
锚点：未记录
最近确认：0a4ed3c3a1270ee35e49c7f0d3d876a273499140
理由：最大风险：needsReview 字段存在未核证的隐性消费方导致运行时 undefined——已由三个只读子代理全仓 grep 核证仅 flow.js:172 与 prompt.js:1231 两处，且拆除顺序钉死「先拆消费、后拆字段」。次风险：剥行误伤条目正文中的「待复核」字样——剥离仅匹配行首前缀「^待复核：」，与机器契约行格式一致，另有测试断言剥后 grep 为零。 死路（已试弃，防复潮）：① 修 rot 判据精度（枢纽文件 df 降权）保留标记层——零消费实证下把信号修准仍是家具，先拆后看；② unmapped 池整池外移冻结——resolveTouchedDomains 兜底会重建池子、104 个来源变更的幂等闸门只扫 fr/ 会把搬走条目静默写回（子代理核证），本次只做注入排除；③ distill dup 升硬门——存量 active 标题 pairwise 38 对 ≥0.6（「测试覆盖」三条互撞 1.00）全是真独立需求，硬门逼假承接行污染取代链。

## D-unmapped-212@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-30-verify-done-green-reuse
原编号：D-001@v1
锚点：未记录
最近确认：80491e838e08e19d94dd1a12bbb22294552f575b
理由：最大风险：缓存绿被误复用——「本次没跑但结论是绿的」若指纹口径有洞（如 local.yaml 恰好在两次 --done 间被改）会吃旧绿。防线：local.yaml 整文件哈希入指纹（改命令必 miss）+ TTL 30min + 文档面剔除只影响「文档改动不击穿」（代码改动必击穿）+ OFF 逃生阀。已放弃方案：a) verify 收口实测结果全量缓存（不过期）——违背 fail-closed，环境漂移（DB/网络态）会吃陈旧绿，弃；b) 只修文案不接缓存——文案消掉三轮试错但 10 轮 ×290s 的实测重复真跑原样保留（本次实证的大头），弃。已知残留：multi-agent-platform .runtime/green-cache/ 下有 0 字节 'change' 文件（14:13 产物），非本仓代码与项目代码所写（双仓 grep 零命中），不影响 lookup（文件名精确匹配永远 miss），留观察不入本变更。

## D-unmapped-217@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-fr-governance-telemetry
原编号：D-001@v1
锚点：未记录
最近确认：91c23bc43362de4c29e3daa499712a73c055eeaa
理由：最大风险：候选视图被当门禁用——高 suspect 次数不等于该退休（热文件天然高频被触达）。对冲：渲染文案显式「候选非裁决」，处置指引给出人裁出口（承接翻链/needs_review），视图零阻断。声明边界：①帽 20 截断——超大触达面事件只带前 20 个 id，聚合计数是下界（视图本就是 Top-N 指引）；②存量 64+ 次事件无 id——视图只对新事件生效，历史需积累（不回填伪造）；③unmapped 迁移只做机械可迁面（来源变更可判域者），语义归属不猜。试过放弃：给 unreferenced 探针做全量 id（不帽）——单事件可达数百 id 撑爆 jsonl 行，帽 20 抽样足够指引裁决。

## D-unmapped-223@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-04-log-window-arity
原编号：D-001@v1
锚点：未记录
最近确认：902c07f2bed907e230808d359c78068279008bd4
理由：最大风险：把 D7 改绿被误读为「修测试过门」——但方向相反：产码缺陷（裸计数 fatal）是真修复主体，夹具修正只是让测试重新测到它（修复前该断言在纯 HEAD 稳定红）。试过放弃：只改产码不动夹具（否决——B1 先命中下 note 断言仍永红，测试继续假失败）。

## D-unmapped-226@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-knowledge-stats-freshness
原编号：D-001@v1
锚点：未记录
最近确认：d47d4ee37d52454e11d847f138c36bb8873a0481
理由：最大风险：口径混淆——若 lastEventAt 误用窗口内记录（buildHitMatrix 的 records），`--since-days 7` 时「数据截至」会显示 7 天内最新而非全量最新，读数失真。对策：函数只收 runtimeDir 不收窗口参数，类型签名层面杜绝窗口口径混入。 试过放弃：复用 matrix[0].lastHitAt（最高命中文件的最近命中）——它是窗口内且按文件聚合的口径，最高命中文件未必是最近写入的文件，且窗口截断失真，放弃。

## D-unmapped-227@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-status-empty-guide
原编号：D-001@v1
锚点：未记录
最近确认：a1b0bb6ec15b9aabbf7429bd6c789a2ddc8f818c
理由：最大风险：文案与未来选道入口漂移（若 flow start 参数形态变更，引导文案会悄悄失效）——以 FR-01 断言「含 flow start 子串」钉住最小锚，入口大改时测试会显式红。放弃的方案：读取本仓 spec 状态做「智能下一步建议」（如检测 .sillyspec/docs 存在性给不同建议）——空态分支的定义就是 progress 无数据可读，智能层没有可靠输入反而引入误判面，且跨仓语义不通用，故弃。

## D-unmapped-228@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-dogfood-audit-fixes
原编号：D-001@v1
锚点：stages/knowledge.js
最近确认：cb8fddc71b66e78c840ed6120653136904a3df0f
理由：最大风险：行为修复让「原先静默降级为人类可读」的调用方（若依赖旧错误行为的脚本）突然收到 JSON——属暴露既有契约而非破坏；排查过 index.js 全局解析后 filteredArgs 不含 --json，无其他调用方向实现文件传 json 的路径，影响面封闭在三个子命令。 试过放弃：改 stages/knowledge.js 调度层把 opts.json 注入 args（--json 塞回 args 数组）——污染 args 语义（args 反映用户输入而非程序状态），且 digest 已确立 opts.json 直读惯例，放弃。

## D-unmapped-237@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-review-declared-unstamped-gate
原编号：D-001@v1
锚点：未记录
最近确认：a26821acd8caefeee88ae1031526b8564d124a74
理由：最大风险：本变更的 run 在极端场景（戳文件被误删/worktree cleanup 先清了 run 戳）真丢戳——声明面静默为空，apply 对 review 声明过的越界文件改报「不在 design 清单」violation，出路从「review 声明自动放行」变成「补 design 声明」——收紧方向可恢复（fail-closed），且该场景本身意味着 run 元数据已损坏，静默信任其声明才是风险面。放弃的方案：① 改 resolver 语义（无戳回退整体删除）——影响 task-done/cross-repo-reconcile 等全部消费方的 marker 漂移恢复路径，锁定面外；② 只改 warning 文案区分无戳来源——保留误挂数据只软化措辞，治标不治本。均已弃。

## D-unmapped-259@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-fr-regress-cap-drop
原编号：D-001@v1
锚点：未记录
最近确认：dee59107324624cc525f561ac2e42bb1a7a21cd6
理由：最大风险：优先面无上界放大单批执行时长（病态绑定面大仓单批逼近超时帽）。评估：本仓实测 63 文件 ≈ 100s，远低于 600s 帽；FR 绑定面本身是知识库声明面（有治理），放大是「该跑的终于跑了」而非噪声放大；超时护栏仍在。放弃的方案：① 给优先面另设上限（如 120）——重新引入「钦定回归被弃」，只是把弃置线上移，披露语义又得分层，复杂度不值；② 帽内优先面按 FR 命中数加权选择——仍是弃置，只是更聪明的弃置，与「绑定面即测试需求」哲学冲突；③ 只修披露不修行为（标签改准、弃置照旧）——回执诚实了但钦定回归照丢，假绿风险留存，不彻底。

## D-unmapped-261@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-fr-priority-overlap
原编号：D-001@v1
锚点：未记录
最近确认：7f921a670bb4e9e4504acb8d5a6863f260db62df
理由：最大风险：优先面扩大（全量绑定文件含重叠）进一步放大执行批尺寸——与 fr-regress-cap-drop 已裁决的边界同族（TEST_TIMEOUT_MS 兜底、绑定面是知识库声明面有治理），增量只是重叠子集（本仓实测 14 个），可忽略。放弃的方案：① 在 buildDepsBatches 内部把 priorityFiles 语义改为「并集口径」——调用方语义应显式，函数不该猜调用者意图；② 去重时把 frLinked 换成 fr.files 并顺带删 added 计算——frReport 的 addedCount（新增并入 N）是既有披露口径，动了会漂移控制台文案语义。

## D-unmapped-262@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-datetime-timeago
原编号：D-001@v1
锚点：未记录
最近确认：c886ad61490707995a4a33279c7a4c01ac9cded7
理由：最大风险：档位换算复刻不严导致进度面板展示漂移（如 59 分 59 秒被四舍五入进位）。对策：逐字复刻 floor 链（分钟 floor → 小时 floor(分钟/60) → 天 floor(小时/24)）+ 测试钉住全部档位边界（含 59 分 59 秒 / 23 小时 59 分 / 未来时间）。 试过放弃①：把解析失败回退（返回原串/『未知』）做进 timeAgo 内部——会让「无效输入必须抛 TypeError」的契约失效，且容错回退是 stage-machine 对脏数据的展示职责，塞进通用工具语义含糊，放弃。 试过放弃②：解析也一并迁给 datetime（让 timeAgo 吃 _parseFlexibleTs 的 zh-CN 回退）——回退正则是进度面板对存量 lastActive 的兼容面，迁走等于把调用方私有数据形态泄漏进通用模块，放弃。

## D-unmapped-265@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-status-multi-active-list
原编号：D-001@v1
锚点：未记录
最近确认：9e0a8c4df213f6b3a1dfb2b66a9f2714e30bafc6
理由：最大风险：幽灵行刷屏——DB 残留大量 status='active' 但目录早已不在的行时，清单较长且多数标「本地无目录」。可接受：这正是 DB 真相，且 doctor --cleanup-remnant 是既有清幽灵通道，本分支只负责如实展示。放弃的方案：①在 listChanges（库函数）里过滤无目录行——污染库语义，DB 行与目录存在性是两个真相层，别处依赖 DB 口径；②改 read() 让多活跃返回特殊值——动核心推导语义，调用方十余处，风险与收益不成比例；③清单截断加「其余 N 个略」——现实活跃数是个位数到两位数，截断只省屏幕不省正确性，反藏信息。

## D-unmapped-266@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-verify-docs-prefill
原编号：D-001@v1
锚点：未记录
最近确认：e9c01f7cd4f66c5a2fb43bc6775ab9eb3723fad1
理由：最大风险：②的候选注入是变更级近似（frHits 无逐卡文件映射面，无法精确到「这张卡的 acceptance 连哪个 FR」）——无归属卡收到的是全部 FR 关联文件的并集，可能含无关用例。缓解：只注入无归属卡（有归属卡零噪音）、注记行明示「候选，命中≠结论，判定由你复核」、判定枚举仍由 agent 改写；宁可多给候选不回到「无归属测试——大概率 uncovered」的零信息预填。第二个风险：①的占位检查可能被 driver 误读为「测试通过」——warnings 三处明示「本档不含测试客观核验，以完整 gate/--done 为准」，exit code 语义不变（占位 ok=true 但整 envelope 的 ok 仍由 artifacts 等真检查决定）。试过但放弃：a) docsOnly 用命令子形态（gate docs <stage>）——与既有 --full flag 家族不一致；b) probe7 逐卡精确映射（requirement_ids→active FR）——本变更新 FR 与知识库 active FR 是两个编号系，映射需标题相似度启发（frTitleOverlap），误配代价高于并集噪音；c) guide 清理按 mtime 过期——时间窗语义在多变更并行下比引用白名单更粗暴。另：本变更撤销了最初计划的「评审三档」——档位机器已存在（review-tier S0/S1→self + flow-review 五路证据定档 + 1/4 抽样校准），再加 self 档会破坏抽样校准机制；55 万 token 病根是厚流程选道错位（运维修复应走轻量道），属选道纪律非档位缺失。

## D-unmapped-273@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-07-scope-audit-thin-patch-replay
原编号：D-001@v1
锚点：未记录
最近确认：2d63d0471894624eb4c2ce18b93046c90ec57f05
理由：最大风险：patch 段解析与 git 真实 numstat 的口径偏差（路径含空格的引号形态、rename 段、\ No newline 标记）。缓解：段头正则与既有 filterPatchForFiles/slicePatchForFile 同款（b/ 新路径），\ 开头续行不计，rename 场景 thin 冻结面罕见且行数偏差不改变三态判定；测试对拍 buildFrozenPatch 产物。放弃的方案：① flow done 补写 scope-audit.json（写侧）——只救新变更救不了存量归档，且造双冻结源；② 行数按 meta.baseline..head 提交区间改采 git numstat——对 committed 面精确但冻结面含 done 时点工作树件（治理工件/untracked），且引入对 git 对象库存活的依赖，不如解析冻结 patch 自包含。

## D-unmapped-275@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-knowledge-stats-fr-only
原编号：D-001@v1
锚点：未记录
最近确认：920137ffb776865a0f44eb31da0ce8c9c0abcdb1
理由：最大风险：输出层过滤遗漏某个段导致「跳过」不完全。对策：测试覆盖三态断言段级完整性与字节一致性。放弃的方案：在计算层直接跳过 matrix/conventions 计算——弃，因为计算层是共用函数（被其他消费方引用），跳过会改共用函数签名引入回归面。

## D-unmapped-280@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-graph-summary-nodes
原编号：D-001@v1
锚点：未记录
最近确认：a2f725df2eb9b67e6dd7a6e095f0cba9e2bc9e4a
理由：最大风险：clusters 数量随域增长（真图 883 簇）撑爆平台 lite 画布——已由 `--clusters N` 截断旗标化解（消费方按需取 top-N，簇计数守恒不变）。放弃的方案：①CLI 侧默认截断 50——否，默认值是平台 UI 偏好不是引擎语义，全量才是可审计口径；②summary 落盘缓存——否，违反 D-003 图不落盘铁律且引入失效问题；③doctor 内调 summary 复用——已如此（同源口径互引，不复制实现）。死路提示：不要为「跨仓锚点单列计数」去解析 local.yaml 外仓（探测面无界，历史否决同型）。

## D-unmapped-281@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-graph-summary-consistency
原编号：D-001@v1
锚点：未记录
最近确认：78cb671e6f0c7a5f0027bcabf27d41ab46b1205b
理由：最大风险：⑩交叉断言解析 doctor finding 文本计数——doctor 输出格式（「graph-module-doc-gap：N 个」）成为测试契约面，未来改 finding 文案需同步改测试正则。接受：该格式本就是平台时间线展示面，钉住它等于钉住消费契约；格式漂移测试红属正确报警。放弃的方案：doctor 直接消费 graphSummary 拿计数——弃，doctor 需要 finding 样本明细（样本列表进 warning 文本），纯计数接口喂不饱；维持两函数但加注释声明对齐义务——弃，注释不是牙齿（本变更要修的正是注释与实现脱节的先例）。

## D-unmapped-283@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-graph-dump-layout
原编号：D-001@v1
锚点：未记录
最近确认：19b2d5dd92c2d8149860d606cf80eeafe9f17685
理由：最大风险：星系数=150（真图实测）比平台 design 初估 10-15 多——但这就是原型 comm() 的真实分组数（原型视觉即如此），不改算法（改了就不是原型视觉）；平台侧按 150 星系渲染。放弃的方案：①summary 细簇分组——否，883 簇主环 ~8900px 退化散点（Grill F-01）；②坐标落盘缓存——否，违反图不落盘铁律；③与原型逐位等价——降级为非约束（tie-break 稳序差异，确定性才是硬约束）。

## D-unmapped-284@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-brainstorm-impact-antirevival
原编号：D-001@v1
锚点：未记录
最近确认：9baab96fea518c5de08e6106909100fb7c5d65ce
理由：最大风险：impact 闭包比 scopeRecall 宽（深度 2 + 传递例外 + change-modules 反查），模块域键在热区模块（如 core-engine）上可达条目多——回显前 5 条封顶沿用，但"无关 rejected 挤占席位"的噪音面变大。缓解：已回应不重弹过滤沿用（evidence 回应过即静默）；真实仓实测 9 条可达属合理密度；若实测噪音超标，收窄方向是把 impact 深度对 gate 场景降为 1 或按 impactKey 分组限额——留运行时证据再动。放弃的方案：拓 scopeRecall 吃模块键（模块→文件→决策两跳，丢失 change-modules/supersedes 可达面且要改检索器签名）；解析 --output 提取路径入键（违 D-004 自由文本纪律，弃）。

## D-unmapped-286@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-archive-integrity-thin-aware
原编号：D-001@v1
锚点：未记录
最近确认：2edde8bd4addf24e870503ff287d587447203d68
理由：最大风险：epoch 豁免面过宽——若有人在 2026-10-07 前的 thin 归档里真留了未完成工作，本检查不再点名（归档完成门在 flow done 六子步当时已判，事后无法区分占位稿与漏勾）。接受理由：v3 前勾选不是完成契约（无机械区分依据），误报 36 份 vs 漏检理论值的代价权衡明确；新账（epoch 后）照常严查。次风险：批量入账 42 条若混入真欠账——逐条按五类理由归类（每类有形态证据：quick 通道产物有 decisions+delta 无 flow-state、spike 仅 proposal.md 等），且账本条目带 exempted_at 可追溯，stale 条目 doctor 会提示清理。放弃的方案：簿记补勾 36 份 pre-epoch thin（伪造完成态，违 2026-09-17 裁决）；全部走账本不修检查（172 份系统性误报逐条入账是拿账本抹平检查缺陷，且未来 thin 归档持续新增误报）；只修检查不入账（42 份真历史形态继续亮红，advisory 狼来了）。

## D-unmapped-287@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-graph-docrefs-noise
原编号：D-001@v1
锚点：未记录
最近确认：524546f45bc4149b101c35a0feda8fcd185bdf04
理由：最大风险：跨仓豁免把"真失效的跨仓引用"也隐掉（文档引用了平台仓某文件而该文件确已被删）——本仓无法核验独立仓文件系统，豁免是诚实的能力边界而非判断。缓解：crossRepo 计数仍注记（2446 条），平台仓侧若有同类检查可对账。次风险：64 个空 changelog 索引若模块实际有变更史（散在卡内「变更历史」节），空表欠信息——头部注明来源指引，后续 split-changelog 迁移时补。放弃的方案：裸名 basename 唯一消解连边（304/438 多义，盲连错边比不连更糟）；逐条修 1439 条文档引用（96% 是伪影，修秤优先于迁就坏秤）；为 13 条真欠账伪造占位文件（篡改交付语义，点名留人工判才对）。

## D-unmapped-297@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-verify-papercuts
原编号：D-001@v1
锚点：未记录
最近确认：f60b9d54ff7e11da1551f89d07ccbcf3cb1edfd4
理由：最大风险：②的段携载把 stale 人工面带进新骨架——沿 refreshProbeSections 既定安全方向（宁可少刷新不误删），stale 行追加段尾留 agent 裁决，gate 一致性抽查独立把关。放弃的方案：①按空白截断（script 名合法字符外还有大量 Unicode，白名单比黑名单稳定）；③无锚 blanket 20 提交全入窗（他变更文件污染窗口，必须消息锚定）；②只备份不携载（现状——找回回填来回比携载贵，当日实证）。

## D-unmapped-310@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-dyn-subset-nontest-runner-face
原编号：D-001@v1
锚点：./config.js
最近确认：58257512ae9f8a51f1ef0636897351b3ea7f8356
理由：最大风险：预填面收紧的漏检边界——连字形态 `foo_test.js`（无 `.test.` 点锚）不再预填。取向与 isTestFileName 注释一致（宁紧勿松：漏检落 agent 手查是 fail-visible，误判产生脏绑定+假败是 fail-hidden 更糟）；js 生态主流形态是 `.test.`/`.spec.`，连字形态罕见，且执行侧权威口径本就不认它（预填了也进不了执行批）。放弃的方案：a) 在 `collectFrLinkedTests` 读侧直接过滤非测试路径——绑定语义是「FR 覆盖证据」不限测试文件（capability 证据可以是源码/文档），读侧过滤会让合法证据绑定静默失效，改在执行侧拦「当测试跑」这一步；b) node --test 批加 `--experimental-strip-types` 类运行参数迁就 TS 源码——治标且方向反了（源码本就不该进测试执行面，`./config.js` 类 ESM 后缀映射在裸 node 下无解）。

## D-unmapped-315@v1 跨仓 diff 正文收口冻结内嵌 change-patch.json（scopeAudit.repos[].patch）
状态：implemented
变更：2026-10-10-cross-repo-patch-freeze
原编号：D-001@v1
锚点：src/scope-audit.js:reconcileCrossRepoPlan
最近确认：becd7a9c24abb735c295a05c467176ddea5241de
理由：收口时点（execute --done 与 flow done 两通道）按 repos[].anchor 窗口对每个已注册跨仓采集 diff 正文，内嵌 change-patch.json `scopeAudit.repos[].patch` + `patchSha256`（\n 归一 sha256）；不落独立文件族（方案 A，破单套两件纪律、读侧动面最大，记非目标）、不混单 change.patch（方案 C，git apply 必失效，否决）。
故障面：大 patch 使 JSON 体积膨胀（R-01，binary 折叠+文件面过滤缓解，v1 接受）；B/C 档字面 ref 窗口漂移（R-02，采集与窗口判定同步段完成，anchor.label 诚实标注）
退役判据：平台出现按仓 diff 独立展示/apply 需求时，升级方案 A 独立文件族（接口不锁死）

## D-unmapped-317@v1 patch 采集窗口与行数窗口同根同窗；顶级主仓投影面不动
状态：implemented
变更：2026-10-10-cross-repo-patch-freeze
原编号：D-003@v1
锚点：src/scope-audit.js:computeFullFlowAudit
最近确认：becd7a9c24abb735c295a05c467176ddea5241de
理由：patch 窗口 = 行数采集窗口（A/B' 档锚 hash 为 baseRef；B 档 HEAD~1 窗口用字面 HEAD~1、C 档未提交窗口用字面 HEAD，工作树口径含 untracked 自拼 hunk——buildFrozenPatch 既有形态），「与行数同根同锚」契约延续到正文粒度；顶级 files[]/totals 保持主仓实改投影（projectTraceFaceRows 不动，既有单测钉住），全景走 scopeAudit.rows（全三态）+ scopeAudit.repos[]（锚点/计数/正文）——展示面由平台读 scopeAudit 承接，「沉淀资产面 vs 对账面」双层架构（2026-10-07-unify-close-trace）不破。
故障面：平台不读 scopeAudit.repos[] 时展示面仍只见主仓——本变更供数完整，展示承接是 SillyHub 侧一次读侧适配（跨仓协作边界，显式声明）
退役判据：顶级面与对账面双层架构被平台统一读法取代时重估

## D-unmapped-333@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-12-verify-handover-hint
原编号：D-001@v1
锚点：未记录
最近确认：6b494d187421f6c864720d13ff130d44c6afd7e4
理由：最大风险：文案与判定漂移——若未来 non-testable 准入变严（如要求锚点），场景句会误导。缓解：句内写法与现行校验逐字对齐（理由一句话）；本仓探针 cli-copy-selfsufficient 已把「文案与门判定一致」纳入评审必查。 试过但放弃：①加 covered-build/handover 枚举——进分子稀释激励、不进分子与 non-testable 同义（详见做法概述）；②只改骨架注释不改报错——agent 撞门时读的是报错不是骨架，两处都要。

## D-unmapped-341@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-cli-pit-fix-batch
原编号：D-001@v1
锚点：未记录
最近确认：34560b18d3dc5f1fff1a6058a391bb3f245cba35
理由：最大风险：deps --set 成为常态绕过通道（该验的不验直接 set linked）——缓解为 --reason 强制必填 + 覆写留痕三字段（前值/理由/时间戳），verify/archive 对账以 depsOverrideNote 为审计锚，理由不实属未定义行为（文案明示）。放弃的方案：①让 worktree deps 自动探测 node_modules 可用性免 --reason——离线环境探测本身不可靠（npm ci 超时≠不可用），且弱化留痕动机，弃；②knowledge 帮助做成独立子命令（knowledge help）——探索型调用习惯是 `--help`，拦 --help/-h 才堵得住 refresh 误触发，help 子命令留作未来增强。

## D-unmapped-349@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-cross-repo-baseline-anchor
原编号：D-001@v1
锚点：未记录
最近确认：ed4434217925b4aea7c8fe1bb6a43a0cd0fcc8b2
理由：最大风险：token 归因依赖提交消息约定——跨仓提交不带变更名时零命中回退全窗口，外来已提交内容会进冻结面与 totals（审计污染可见）。缓解：AGENTS 规则 11 本就要求提交消息带变更名（跨仓不应例外）；回退面是可见噪音（unplanned 行+锚 label 自述「零 token 命中回退全窗口」），与主仓夹带嫌疑 advisory 同语义。次风险：共享跨仓未提交态天然混面（token 无法归因未提交内容）——文档披露的残留，根治需跨仓 worktree 隔离（另立项）。试过放弃的方案：①仅记基线不做 token 过滤——实验实证外来提交进窗污染冻结面，主面必须过滤；②flow done 时反向推断基线（窗口内最早提交的父）——交错时序下推断错位（正是 B 档病灶），start 时点快照才是唯一可靠锚；③跨仓也建 worktree——策略面大（往外部仓写状态），thin 首步不碰。均否。

## D-unmapped-368@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-gate-verify-apiface-preflight
原编号：D-001@v1
锚点：未记录
最近确认：30cdee45ba5f3c1a0ebc4c2d4672108a31282057
理由：最大风险：注入后 `newPipeline`（apiFace != null）判定从 false 翻 true——对「factsExpected=true 但 facts.apiFace 缺席」的变更，矩阵段缺失从 warning 升 error（仅严格档/critical）；这与 --done backfill 后的判定完全一致（backfill 无条件落 apiFace），属预检对齐而非回归；非严格非 critical 仍 warning，存量兼容口径不变。 试过但放弃的方案： - gate 路径直接做 backfill 落盘（与 gates.js 同款调用）——违反 gate 只读契约（D-002@v1），且引入多 agent 并发 gate 时 facts.json 读改写竞争面，放弃。 - verify-probes --init 侧落 apiFace——制造双生产者且改 writeVerifyFacts 分段合并语义；且救不了存量 facts（本次平台变更正卡在 --init 后形态），把修复责任推给使用方逐变更重跑 --init，放弃。 - stage-contract 内直接 live 解析——违反消费路径铁律（本模块零 import verify-probes，verify-probes TLA 动态 import 回指 stage-contract，静态依赖成环死锁），放弃；改由壳层调用方（machine-interface，与 gates.js 同款动态 import 时点）注入。 独立评审修正（2026-10-14 review P1 清偿 + P3 清偿）：design.md 缺失/不可读态 helper 返 null（gate 注入通道不注入、facts 口径继续），不返空面——初版空面注入会覆写有效 facts.apiFace 反致误阻断，违 FR-03。P3 同步清偿：backfill 侧恒落对象面（缺失/不可读 → 空面对象，基线口径不变，`|| { endpoints: [], declared: null, writeEndpoints: [] }` 兜底）——null 只是 gate 注入通道的「不注入」信号，不得改变 backfill 落盘形态（否则「design 蒸发×矩阵段缺失×严格档/critical」窄角会从基线 error 降 warning，重构夹带行为变化）；9d 内含基线回归锚。gate/--done 在该病态窄角判定重新一致（backfill 空面 parseSet 空 → 锚点空指拦、矩阵段缺失 error 分层不变），无分叉。

## D-unmapped-370@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-supersedes-mislink-and-change-display
原编号：D-001@v1
锚点：未记录
最近确认：beeb1ebae01f15018240be37e474b9114d7119ca
理由：- 最大风险：去掉回退后，原先靠回退「连上」的 33 条边消失——这是有意的清偿（它们本就错连他变更）；真实取代关系在 v2 条目的「supersedes：」文本与 superseded 承接中仍有记载，图谱边只作强边闭包信号，误连（进 impact/注入面传播错误事实）比缺边危害大。 - 死路（放弃）：保留回退再加启发式过滤（版本更低/标题相似）——33 条误连的目标版本恰低于引用者、标题各异，版本/标题判据都区分不了「同号不同变更」，仍是抽签。 - 死路（放弃）：展示面改渲染全局号（D-<域>-NNN 发号）——属 P3 增量方案（新条目 epoch 发号、老条目零触碰），不在本单范围；本单以「变更名限定词」最小改动达成消歧。

## D-unmapped-001@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-decision-global-id-epoch
原编号：D-001@v1
锚点：未记录
最近确认：79c831d3e1fe990145066757e8c0b0850191f1c1
理由：- 最大风险：发号影响面广——既有测试断言蒸馏产物标题为局部形态（约 10+ 测试文件）需同步更新；读面正则放宽（`D-(?:[A-Za-z0-9_-]+-)?\d+`）须确认不误吞正文（标题行锚定 `^## `，误吞面为零）。回补：真实库副本演练（③）锁存量零触碰。 - 死路（放弃）：全量重发号 698 条——37 条不可回源、70 组扇出身份歧义、平台 anchor 全量失效（迁移评估报告裁定）。 - 死路（放弃）：发号写回 change 目录 decisions.md（回灌局部文档）——变更件是冻结审计面，全局号只落知识库侧。

## D-unmapped-374@v1 stage-review 错位目录读侧容错（不搬文件不改 marker 形态）
状态：implemented
变更：2026-10-15-pitfall-batch-clearance
原编号：D-001@v1
锚点：未记录
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7
理由：读侧三级探测容错（规范 → 双前缀 → 裸 runId），写入侧恒规范路径，SKILL.md 口径统一为「目录名 = <stage>- + marker 值原样」
故障面：容错探测每读点三次 existsSync（可忽略）；错位文件永不迁移可能在 stage-reviews/ 长期共存（审计面可见 docHash 刷新留痕）
退役判据：存量错位目录自然消亡且 skill 文档新口径运行一个季度无新错位报告时可收敛为单形态探测

## D-unmapped-375@v1 错位目录归一否决「marker 值改为完整目录名」
状态：rejected
变更：2026-10-15-pitfall-batch-clearance
原编号：D-002@v1
锚点：未记录
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7
理由：否决，选读侧容错
否决理由：改 marker 写入形态破坏全部存量 marker 读取兼容（getLatestStageReviewRunId 校验 review- 前缀、prompt {STAGE_REVIEW_RUN_ID} 注入、fallback 扫描三处按裸 runId 契约），迁移成本与风险远高于读侧 existsSync 容错
复潮条件：出现 marker 值与目录名形态再次分叉的系统性新需求（如 per-change 多 review 并存需目录名携带更多语义）时重议

## D-unmapped-376@v1 archive 完成度缺口走「批量完成自动补草稿」而非「复合真相源」
状态：implemented
变更：2026-10-15-pitfall-batch-clearance
原编号：D-003@v1
锚点：未记录
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7
理由：detectExecuteBatchFinish 复核循环前调既有 generateTaskReviewDrafts 幂等补缺失草稿（挂在 runId marker 读取前，run 缺失一并建立）；archive 真相源语义不变
故障面：cannot_verify 草稿计数为 completed（summarize 单列 cannotVerifyCount 可见）——草稿≠真验过，verify 兑证/人工复核仍是升级通道
退役判据：archive 完成度判定改为 tasks.md+acceptance 复合真相源时本钩子可退化为 advisory

## D-unmapped-377@v1 archive 复合真相源方案否决
状态：rejected
变更：2026-10-15-pitfall-batch-clearance
原编号：D-004@v1
锚点：未记录
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7
理由：否决，选 D-003 自动补草稿
否决理由：复合真相源改动语义面大（summarize 三消费方连锁）且与 backfill-reviews 手动通道先例冲突；自动补草稿复用既有幂等生成器，改动收敛在批量完成单点
复潮条件：草稿补齐路径在生产再出现「草稿冒充完成」误判（cannot_verify 被当 pass 消费）时重议复合真相源

## D-unmapped-378@v1 对账 EOL-only 过滤用配对探测（正向信号才剔）
状态：implemented
变更：2026-10-15-pitfall-batch-clearance
原编号：D-005@v1
锚点：未记录
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7
理由：每个 plain diff 源配一次同范围 --ignore-cr-at-eol --numstat 对照，差集=纯行尾差异才剔（absence-based 不可用）；未跟踪豁免；探测失败 fail-open
故障面：post-apply 全量并入 main 后 B1 基点=分支 tip，已提交行尾重写不进 plain diff 不过滤（保守保留，软 note 无）——仅工作树与 form A 已提交段两探测面覆盖
退役判据：仓统一定 .gitattributes 行尾策略后 gen 类脚本不再产纯行尾 diff 时可退役

## D-unmapped-379@v1 代勾证据源收敛为 subject token × allowed_paths 交叠
状态：implemented
变更：2026-10-15-pitfall-batch-clearance
原编号：D-006@v1
锚点：未记录
最近确认：8340ef2f5ad081dc5f209a0295901da123ad60d7
理由：提交 subject 行（%s）的 task-NN token 为证据，卡面 allowed_paths 在场时要求提及该 task 的提交触及面与声明面交叠（parseAllowedPaths+pathMatches 与草稿归属同口径）；无卡面退化仅 subject；shouldAutoCheckTask 草稿守卫 ctx 缺席同样保守不勾
故障面：漏勾方向保守（卡面 allowed_paths 声明面与实际改动不符时退化人工勾选）；execute-batch 两用例的「ctx 缺省草稿照勾」向后兼容钉随本决策更新为保守不勾
退役判据：task 完成事实锚出现更权威信号（如 review verdict 全链在场）时可退化为纯 review 锚

## D-unmapped-382@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-15-graph-dangling-crossrepo-split
原编号：D-001@v1
锚点：未记录
最近确认：6226a98eafd4a1ed652bef83b026ca71131e095a
理由：最大风险：跨仓口径被误读为「2447 条可以不管」——跨仓锚点在各自仓内有对账价值（决策↔交付文件机器锚），本变更只是不让它们污染本仓健康数字；口径已在 summary 文案与字段注释双处声明「单列不对账」。次风险：平台 GraphDanglingData DTO 若严格校验未知键会拒收——实证安全：平台侧 _norm_dangling 按 _as_int 取已知键、多余键忽略（graph.py:231-240 实证），且 --local 未传时 query.local 键为 undefined 不序列化。放弃方案：①把跨仓强边从 dangling 主计数剔除（破坏 doctor 对账守恒与既有测试钉，且丢对账价值）；②按目标仓建多图（buildKnowledgeGraph 单根假设，重构量大收益小）；③只在 doctor 文案分流（10-09 已做，数字面失真问题依旧）。

## D-unmapped-383@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-15-vector-gate-tighten
原编号：D-001@v1
锚点：未记录
最近确认：93fd54a4ca19ba10e9e3edd4ff04d7187f41a1f8
理由：最大风险：用户误以为向量召回一直在用、收紧后以为「坏了」——实际半月来从未有向量结果（404 实证），收紧只是让日志/行为与真相一致；文件头注记已声明恢复路径。次风险：env 未知值保守视为 off 可能与未来新开关值冲突——接受：显式值集 {on,auto,off} 已覆盖语义空间，新增值走显式扩展。放弃方案：①auto 改「探测一次缓存」（探测本身也要一轮网络+缓存失效复杂度，不如缺省关诚实）；②只加死信短路不动缺省（本仓 local.yaml 有 platform 段，空转照旧，问题实质未解）；③直接删向量层（平台可能实现端点，保留 opt-in 层零维护成本）。

## D-unmapped-385@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-15-supersedes-ghost-nodes
原编号：D-001@v1
锚点：未记录
最近确认：74f5700a6f509a7e7400a1a00d645415c97d309e
理由：最大风险：幽灵合成放宽跨变更同号引用=2026-10-14-supersedes-mislink 误连复活（换皮）——首版实现确实踩了此坑（无条件合成），被既有测试②「跨变更同号不建边」拦下后收紧为自身版本链口径；该防护测试零回归是本变更验收项。次风险：幽灵节点混入 nodes --search 结果被 agent 当真实条目消费——label 带「（已被 X 取代）」+status=superseded 双标识；幽灵无 anchors/FR 边不进 impact 的决策锚定面，只经 supersedes 传递边可达。放弃方案：①蒸馏保留旧版本段为 superseded 形态（改文件契约，全消费面重审——量级不成比例）；②只在 impact 查询时动态解析 supersedesText（闭包/summary/orphans 各消费点重复解析，不如建图时一次合成）；③把 supersedesText 引用当悬空注记显示（不建边则传递闭包/防复潮可达集全部受益为零，问题实质未解）。

## D-unmapped-386@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-rot-coverage-git-source
原编号：D-001@v1
锚点：未记录
最近确认：963fc06134acde9b492fd4f007e0671f57bd288e
理由：最大风险：--grep 子串误吸——变更名 A 是变更名 B 子串时 B 的文件被吸进 A 覆盖面。评估：变更名格式 `YYYY-MM-DD-主题`，互为前缀子串的场景是同日同名变体（罕见且语义相近），宁可宽勿漏；如需收紧可改 --grep "^<名>$" 正则锚定（regex 语义）留作后续。次风险：大仓 git log 全历史遍历的性能成本（每 unknown 变更一次、covCache 摊薄、64MB maxBuffer 上限）——本仓实测毫秒级，量级无忧。放弃方案：①往归档变更补写 change-patch.json（冻结件 sha256 锚定，篡改审计真相=红线）；②unknown 来源持久化豁免清单（补丁摞补丁，git 源把根因解了豁免无必要）；③只对 unknownSources 计数不列名（丢定位信息，收口 advisory 失去可操作性）。

## D-unmapped-387@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-classify-surface
原编号：D-001@v1
锚点：未记录
最近确认：af483d02f69a8e600ccdcb2ae9df4ebe14d03bc2
理由：最大风险：info 信号常态化出现在每次 digest（收件箱长期 1~5 条是正常运维态）——提示疲劳。评估：info 与 warn 视觉分区（ℹ️ vs ⚠️）、healthy 不翻红、底数行照旧——看到「有条目待归类+一条命令」是恰当的轻推，狼来了风险低于原 >20 报警（那才是积压到忍无可忍才叫）。次风险：平台 governance 卡对 level 字段缺省的旧信号（warn）渲染分支——既有信号全带 'warn' 字面量，无缺省态，零影响。放弃方案：①给 classify 做自动建议目标文件（条目语义分类需要模型判断，词面建议错误率高——留给 agent 按清单自行裁决）；②收件箱阈值降到 >5 报 warn（把提示当告警用，语义错位）；③只改 healthy 不加 info 信号（收件箱存在但仍隐身，问题实质未解）。

## D-unmapped-388@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-graph-registry-domain-split
原编号：D-001@v1
锚点：未记录
最近确认：dc3354f9a381b7883dfc3a973ab5e2a74bb2c4e3
理由：最大风险：登记名与模块卡名撞车造成簇键歧义（如登记 backend 且同树有 backend 模块卡）——file 节点归簇优先 module-files（精确挂接赢），登记前缀只兜底无挂接节点，无歧义路径。次风险：大小写不敏感匹配在大小写敏感文件系统上的语义错位——本匹配只影响展示聚簇键，不触文件解析，安全。放弃方案：①为跨仓建模块卡（doc-debt behind 计算在本仓无对应提交面=垃圾数据，且模块卡是维护义务不是标签）；②跨仓前缀硬编码清单（projects/ 登记机制已是单一真相源，硬编码制造第二源）；③_unmapped 簇直接隐藏（真缺口必须可见——761 是可行动信号非噪音）。

## D-unmapped-392@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-vector-capability-autodetect
原编号：D-001@v1
锚点：未记录
最近确认：6748ef4f39fdcff94ef171db460944ded0ff3557
理由：最大风险：重试窗内平台完成部署 → 最多 1h 语义召回延迟——可接受（advisory 面；on 强制开可即时验证）。次风险：乐观试在平台网络不可达时每重试窗一次 3s 超时成本——404/超时都写 unavailable（超时也写：不可达≠端点在场，同窗跳过），成本从「每检索一次」降为「每窗一次」。放弃方案：①心跳探测（后台定时打端点——CLI 无常驻进程，引入复杂度无收益）；②平台配置下发开关（平台侧加配置面+sync 下发链路——过度工程，能力探测已闭环）；③保持缺省关（用户裁决否决：每仓手工配置不可扩展，「新项目 agent 怎么知道配置」的发现性问题在 auto 下消解为零）。

## D-unmapped-397@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-jsx-batch-cmd-chunk
原编号：D-001@v1
锚点：未记录
最近确认：893ae3bcde0054969180971e02536ffd67dd4802
理由：最大风险：maxLen=6000 对极短前缀+超长单参数（Windows 单路径组件上限 255，理论单参数 <300 字符）恒安全，但对自定义超长前缀（如极深 cd 链）的批未覆盖——当前调用面前缀均 <100 字符，风险可忽略。试过放弃：①按文件数分块（如 50/批）——文件名长方差大（60~120+ 字符带引号），数帽不能保证字符上限，放弃；②跨仓通用 argv 文件清单通道（vitest 无 stdin 文件清单原生支持）——侵入 runner 协议，超出最小修复范围，留待上游。

## D-unmapped-400@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-plan-review-focus
原编号：D-001@v1
锚点：src/stage-review-checklist.js
最近确认：043fd74722d930016ae6bba68062bcb16f8b940c
理由：- **最大风险：盲区清单的填写质量不可机械验证**（与上一变更同款风险）。盲区是"没人想到要声明的东西"，agent 填不出真盲区时会写占位行。缓解：①要求每条必须带承接落点（task 的 acceptance/测试）——空承接的行在审查步会被抓；②「已检查，无」显式出口让"没找到"合法，降低编造动机；③审查计划步把"每行有承接测试"列为复查项，双层。 - **次风险：≤5 条上限被当作目标凑满**。缓解：模板文本明确"上限不是配额——写不出第 4 条就停，宁缺毋滥"；审查复查项盯"编造低价值行"。 - **与既有「禁止泛泛风险分析」约束的表观张力**：Review Focus 行若写成"并发场景需注意"就是泛泛风险分析——文本里明确要求行=具体输入/条件+可判定预期行为，与泛泛风险互斥；这条张力是设计意图（盲区行是具体化的风险，不是风险登记表的复制）。 - **放弃的方案**： - *在 `src/stage-review-checklist.js` 加三条清单项*：快照测试与字面引用面（plan-postcheck/worker_prompt）使任何改动都要连锁更新多处——收益不成比例；prompt 侧独立小节零连锁。 - *给 plan-postcheck 加 Review Focus 在场性 warning*：向后兼容面（存量在途变更的 plan.md 无此节会新增告警噪声）+ 需要新代码与测试；留作观察一批后再决定是否机械化的后续决策。 - *把 Review Focus 放进 TaskCard frontmatter 新字段*：卡片 frontmatter 被 plan-postcheck 硬校验（缺字段阻断），新字段=格式破坏性变更；plan.md 一节零 schema 面。

## D-unmapped-409@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-16-step-guide-dyn-completeness
原编号：D-001@v1
锚点：未记录
最近确认：d3d36152b1e6dda1e66a50640d0c1d85c9f7b2c5
理由：- 风险：复入附录体积增长（评审步骤重入时打印 tier/菜单/契约/材料包全文）。评估：这正是 2026-10-15 事故缺失的救命信息，且复入本就为「上下文丢失后恢复」场景；JSON 消费面（jsonHijacked）与 SILLYSPEC_STEP_GUIDE=0 逃生门不受影响。接受。 - 次风险：降级分支（catch 内）也 push 占位值（'self'/异常文案）——无害（附录如实呈现降级态），且帮助事后诊断。 - 死路：只修评审六处而不收编其余 7 站点——同类漏收仍在（WORKTREE_META 等），下次同类事故换一个 token 复现；类级修复才治本。 - 死路：把复入附录做成「读取时惰性重建」——重建需重跑全部注入逻辑（副作用/耗时），与「渲染时收集」的既有单向结构冲突；push 是零成本路径。

## D-unmapped-412@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-16-probe7-prefill-noise-fix
原编号：D-001@v1
锚点：未记录
最近确认：32955910e7d5396cc6b9dd5252dbe85adbf5ba60
理由：- **最大风险：提升信号（第⑥级）方向从「宁 partial」翻向「宁 covered」**——若 review changedFiles 噪声大（如 rebase/工具重写导致无关测试入 changedFiles），会出现新的假 covered。缓解：lift 仅覆盖「零字面命中」格（有正文命中仍封顶 partial）；≥5 候选不触发 lift（第④级在前）；证据显式带「待人工复核」注记供复核者降级；review.json 缺失时不升格。若实测仍噪，回退开关即删除第⑥级（单点）。 - 试过但放弃：a) 只做「正文命中→partial」不引入测试名判定——不能解决锚点空心，covered 仍来自 docstring 行号；b) 用「测试文件被 diff 触碰」全量提升——会连未归属的改动测试一起升格，过宽；c) FR 池按 acceptance 词过滤收窄——池本身与卡粒度错配（130 文件来自整变更面），过滤后仍可能残留无关文件，不如「代码任务 + >5 交人工」两刀干净；d) 保留 anchors 仅改证据文案——词法层未变，hints.files 仍会把 docstring 命中当承接提示，治标不治本。 - 兼容风险：acceptance-matrix-probe / testpath-anchor 既有断言按旧契约（注释级命中→covered）钉死——属本记录显式判定的缺陷面，测试按新契约改写（非「改测试绕逻辑」，是契约修订）。

## D-unmapped-413@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-16-ci-linux-residual-fix
原编号：D-001@v1
锚点：未记录
最近确认：354c20bab3e89d9ebd9762c4e5ce092d4ad88394
理由：- **最大风险：删 `constants` 键后 quicklog 图内若有代码读 `fs.constants`** → 运行期取到 `undefined` 而静默错行为。核验：`grep -n constants src/quicklog.js src/git-helper.js` 零命中， 且容器/本机双端该文件 12/12 全绿（③b 走的就是 mock 后的真实 quicklog 调用链）。 - **次风险：⑥段分叉把 linux 侧断言写成「永远绿」的空断言**（假验证）。缓解：linux 分支断言 `missing.length === 1 && /Src\/Foo\.js/`（对具体路径形态断言，不是仅判 `!== 0`），且第一段 断言（`./` 前缀 + 注记命中）在双端恒真——linux 侧若归一/匹配链真坏，第一段先红。 - **NUL 字节替换风险：把内容改坏**（文件 337KB，含中文注释）。缓解：字节级替换只动 2 个 0x00 → 12 字节 `\u0000`，改前改后以 node 对比两处字符串值与 `node --check`、全量池零失败。 - **EOL 探测改 numstat 的风险：rename 形态被误判 EOL-only 剔出**（numstat 文本形态 `old => new` / `pre{old => new}post` 若不解析新名，`real` 集对不上 porcelain 路径 → 重命名被当纯行尾踢出 changedFiles，审计静默放宽）。缓解：改走 `-z` 流（按位置取新名， 与文本形态无关）——评审实测的字面 ` => ` 文件名误剔路径随之消失，并锁非 windows 回归用例； 另注意 `git diff --numstat` 在纯 EOL 变更上整条不输出（容器 git 2.39.5 实证）。 - **版本差在 CI 上不可见**（CI runner git 2.55 会过滤，行为测试恒绿）：故 FR-07 配源码钉而非 仅行为断言——源码钉是唯一在 CI 可见的回归锁；行为面另由容器 git 2.39.5 / WSL git 2.43.0 / Windows 三端各跑一次兜住。 - 试过但放弃： a) **改实现让 linux 也折叠大小写**——会在敏感文件系统上替写错路径放水（②类假阴性），实现 口径明确写着「Linux 保持敏感」，属设计意图而非缺陷； b) **⑥段整段 skip 非 win32**——CI 上的 linux 面就失去回归保护（⑥段正是被本变更修正的断言面）， 分叉断言比 skip 多钉住反向行为； c) **`Object.defineProperty(fsExports, 'constants', {configurable:true})` 后再 spread**—— 多此一举且语义含糊，`delete` 与兄弟文件同款、一眼可审； d) **仅靠 CI 迭代（继续盲推）**——本轮每轮往返 3-4 分钟且失败面要等跑完才知，容器本地门把 往返压到秒级且可反复复现（已实证一字不差复现）； e) **EOL 探测逐文件 `git diff --quiet --ignore-cr-at-eol HEAD -- <path>`**——版本无关但 N 次 调用（脏仓几十文件即几十次进程 spawn），且偏离 verify-postcheck 的既有单次 numstat 口径； f) **只报不改 EOL 缺陷**（CI 绿、非本轮原范围）——主流用户环境（Debian 12 / Ubuntu 24.04 默认 git）下坑是活的，且修法与同仓既定口径一致、改动单函数局部，故随本变更一并清偿。

## D-unmapped-420@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-18-runtime-relayout
原编号：D-001@v1
锚点：flow.js/index.js/task-tick.js/complete-handlers.js
最近确认：446d93fe321a1cf7366bbc00bdf269e640a97d00
理由：- **最大风险：读写点遗漏**（19 类家族散布 ~25 个源文件，读点比写点多——watcher-events 有 flow.js/index.js/task-tick.js/complete-handlers.js 四处读点）。对策：逐家族 grep 全仓读写点清单化（设计已列写入点文件清单），测试面 26 个既有测试文件做回归网，漏改即路径断裂当场暴露。 - **次风险：混版本并发窗口**旧进程写根目录——迁移幂等 + prune 双路径兜底，窗口内最坏情况是文件短暂在旧位置（读点已切新会读不到）→ 迁移重入收敛；db 备份/日志无状态语义，风险趋零。 - 试过放弃的方案：①`state/<change>/` 按 change 建子目录（prune 可 rm -rf 单目录更优雅）——文件名构造面翻倍、迁移映射复杂化，弃；②只做归档回收不动布局——根目录仍混放单例/日志/脚本，用户"统一下一级+temp"诉求不满足，弃；③迁移 sillyspec.db 进子目录——doctor 候选路径/平台指针/WAL 侧车多点引用，单文件非乱源，收益小于风险，弃。

## D-unmapped-428@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-19-cross-repo-face-tool-filter
原编号：D-001@v1
锚点：未记录
最近确认：6049c3e03f039afa71dde0956f5600407e2ff129
理由：最大风险：跨仓 patch 与 totals 的既有读方（平台全屏预览/实时对账卡）看到的文件数变小——这是口径修正（模板本就不该计入交付），非数据丢失；模板改动仍在 git 历史与归档文档。放弃方案：①只过滤 patch 不过滤 rows——会造成 totals 与 patch 文件数不一致（生产 112 vs 110 的既有失真复刻）；②在 filterDeliverableFiles 层过滤——会改变 worktree apply 的交付语义（tool 档是软桶），影响面超出本变更。
