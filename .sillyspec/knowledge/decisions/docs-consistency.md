# 决策知识 — docs-consistency

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-docs-consistency-006@v1 决策活跃库为文件型 knowledge/decisions/，不进 SQLite
状态：implemented
原编号：D-002@v1
锚点：未记录
最近确认：test123
理由：文件型，与 knowledge/ 同构；progress DB 仍是进度唯一权威，不扩表
来源：2026-08-23-adopt-harness-practices

## D-docs-consistency-007@v1 docs-check 决策规则 advisory 起步，稳定后升 error
状态：implemented
原编号：D-003@v1
锚点：未记录
最近确认：test123
理由：起步 advisory（warn 不阻断）；dogfood 一个稳定周期后另立小变更升 error
来源：2026-08-23-adopt-harness-practices

## D-docs-consistency-001@v1 decisions.md 记录契约扩展四字段，保纯函数提炼
状态：implemented
原编号：D-007@v1
锚点：未记录
最近确认：test123
理由：扩展 brainstorm Step6 决策记录模板，四字段在决策产生时写入（锚点：src/…:NN、模块域：module-id、否决理由/复潮条件：rejected 必填）；decision-distill 保持纯函数机械提炼。放弃备选「archive 时 agent 辅助补推」——归档时上下文陈旧、LLM 补推易错、不可确定性测试
来源：2026-08-23-adopt-harness-practices

## D-docs-consistency-002@v1 方案A：复用现有管道（用户批准）
状态：implemented
原编号：D-001@v1
锚点：src/docs-debt.js:1
最近确认：8aab190
理由：锚点触碰走 docs-debt facts 注入形态（纯函数+同一注入点）；漂移检测走 doctor 既有检查项形态（同"决策待复核检查"先例）；不新增占位符体系/新步骤结构/新命令
来源：2026-08-24-decision-touch-cli-drift

## D-docs-consistency-003@v1 : 载体=decisions.md 模块域字段增强，不新建 design.facts 文件
状态：implemented
变更：2026-09-07-ir-stage-p3c
原编号：D-001@v1
锚点：未记录
最近确认：6c3509b
理由：种子稿原案 design.facts.yaml 不建——decisions.md 条目已含 type/question/answer/模块域/evidence（九字段+可选四字段），语义即「设计决定+影响模块+理由」；设计事实层=decisions.md 模块域字段从可选提升为推荐并加机器核验。判断层 design.md 散文不动。分析修正采纳：md 列表而非 YAML（agent 不易写坏，直进 docs-check 核验链）。

## D-docs-consistency-004@v1 : 核验 gate=validateDecisionModuleRefs，ERROR 仅对不存在的模块 id
状态：implemented
变更：2026-09-07-ir-stage-p3c
原编号：D-002@v1
锚点：未记录
最近确认：6c3509b
理由：用户预授权自主抉择：brainstorm「生成规范文件」步 --done gate 新增检查——decisions.md 各当前版本 D 条目模块域逐 id 核验：存在于 _module-map.yaml modules 键 或显式 NEW:<名> 前缀（规划中的新模块）→ 通过；不存在且无前缀=ERROR（模块幻觉）。design.md 文件清单×module-map paths 推导的实际模块集 vs 声明域并集差异=WARNING（声明面 vs 实改面提示）；模块域全缺失=WARNING 汇总（存量兼容不阻断）。

## D-docs-consistency-008@v1 : 范围=提案摘果子五项，路径推断引擎与一站式 docs fix 本次不做
状态：implemented
变更：2026-09-08-docs-fix-capability
原编号：D-001@v1
锚点：未记录
最近确认：6db00e8
理由：用户确认按「有价值子集」立项：①解析修复（括号路径/省略号模糊引用/中文顿号拆分——消假阳性）；②`docs migrate --from/--to` 确定性批量路径迁移；③snapshot/archive 豁免；④`--json` 补 candidates 候选数组；⑤报告出口统一 stdout（用户同日新痛点实证添头，见 D-005）。路径推断引擎（置信度/上下文打分）、`docs fix` 一站式循环收敛、`--interactive`、`gate --delta-only` 明确不做——稳态（基线 0 + 行号重锚已有）无用武之地，YAGNI，等第二次批量事件再认领。

## D-docs-consistency-009@v1 : migrate 语义=确定性文本替换+替换后即校验，纯 file:line 引用面
状态：implemented
变更：2026-09-08-docs-fix-capability
原编号：D-002@v1
锚点：未记录
最近确认：6db00e8
理由：只做用户显式给定的 `--from/--to` 前缀/字面替换（确定性、零推断），改动面=docs check 所辖 .md 文件中的引用文本（file:line 记法）；默认 dry-run 列出计划，`--apply` 才写盘；写盘后自动跑一次 docs check 报告替换后失效数（防 from/to 给反）。不碰 git 历史、不改非引用文本。

## D-docs-consistency-010@v1 : 豁免双通道=目录约定优先 + frontmatter doc_type: snapshot
状态：implemented
变更：2026-09-08-docs-fix-capability
原编号：D-003@v1
锚点：未记录
最近确认：6db00e8
理由：双通道：①目录约定——路径含 `archive/` 或 `finished/` 段自动豁免（含平台仓 docs/sillyspec/finished/ 先例）；②frontmatter `doc_type: snapshot` 显式标注豁免。豁免=不计入 docs check 失效数（跳过校验），`--json` 的 skipped 汇总里可见。可 `--no-exempt` 关闭（排查用）。

## D-docs-consistency-011@v1 : 代码组织=方案A 薄新模块（migrate 复用 docs-check 提取器）
状态：implemented
变更：2026-09-08-docs-fix-capability
原编号：D-004@v1
锚点：未记录
最近确认：6db00e8
理由：方案A（薄新模块）：解析修复/豁免/candidates 全部改在 src/docs-check.js（提取与校验同文件，改解析不动提取器位置）；新增 src/docs-migrate.js 只做「复用 docs-check 导出的提取/校验 + 确定性替换 + dry-run/--apply」，CLI 接线仿 docs gate。理由：引用记法单一来源（顿号拆分/省略号跳过等解析规则若两处实现必漂移）；与 docs-gate.js 同构（薄判定+IO 分离）；方案B 独立实现 duplication 违 D-008 单一源精神，方案C 并入 docs-check.js 使该文件职责膨胀（已 1051 行）。用户预授权依据：立项前评估即按此形态描述并获"按有价值的内容帮我立项做吧"批准；纯代码组织细节不阻塞等待。

## D-docs-consistency-012@v1 : 报告出口统一 stdout——诊断文本走 stderr、报告走 stdout
状态：implemented
变更：2026-09-08-docs-fix-capability
原编号：D-005@v1
锚点：未记录
最近确认：6db00e8
理由：双轨出口规则：--json 模式保持 stdout 纯 JSON（已满足，不动）；非 JSON 模式下**报告内容（✅/❌ 失效清单/重锚报告/修复回执/修复指引）统一 stdout**（机器可捕获、可管道），stderr 仅留运行时诊断（⚠️ warnings、配置错误、内部异常）。docs gate 失败输出同样归一 stdout。采纳依据：用户实测新痛点，属解析修复项添头（第 5 小项）；不采纳「统一全 stderr」——报告是主输出、管道场景 stdout 才能进下一跳。

## D-docs-consistency-013@v1 : REF_RE 正则采用展开循环形，原子序列形 ReDoS 实证否决
状态：implemented
变更：2026-09-08-docs-fix-capability
原编号：D-006@v1
锚点：未记录
最近确认：6db00e8
理由：否决原子序列形，采用展开循环形 `[A-Za-z0-9_.\-\/]*(?:\([A-Za-z0-9_.\-\/]+\)[A-Za-z0-9_.\-\/]*)*`。否决理由：Design Grill 实证原子序列形为经典 `(a+)+` ReDoS——对无 `:N` 后缀的长 token 指数爆炸（n=24→1.2s、n=30→73.8s/token），GitHub 源码 URL/Java FQN 类常见文本即触发挂死 docs check；「两分支首字符不相交→无灾难回溯」推理不成立（只覆盖分支间歧义，未覆盖 plain 分支跨外层迭代的划分歧义）。展开循环形每次迭代必含括号段→划分唯一→线性（Grill 已验证 6 行为用例等价、evil 用例 0.01ms）。

## D-core-engine-005@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
状态：implemented
变更：2026-09-11-cross-change-decision-guard
原编号：D-001@v1
锚点：未记录
文件：src/decision-distill.js
最近确认：358af35
理由：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。

## D-core-engine-011@v1 范围=7 份 scan 文档刷新闭环，不碰模块卡/map 结构/knowledge（复潮边界记录）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-001@v1
锚点：未记录
最近确认：318e80c
理由：只做 scan 7 文档（docs/<project>/scan/*.md）。模块卡归 archive（sync-module-docs）、_module-map 结构归 `modules rebuild --force`（merge 语义，手动字段全保留）、knowledge 是人工追加域——refresh 越界会变成第三个写入方，重新打开 D-7 推迟方案 C 的双轨问题。知识库 decisions/core-engine.md D-001@v1（ir-stage-p3d）原句「增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）」是范围切割非方向否决——本变更即 scan 域立项，复潮条件满足。

## D-core-engine-012@v2 基线语义=per-doc bump + 消费方三方对齐（scan-diff 取最旧 / scan-staleness 取最旧 / worktree-guard 经 D-007 握手）
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-003@v2
锚点：未记录
最近确认：318e80c
理由：per-doc bump 不变（只推进本次核对过的文档）。v1 漏盘了第三个消费方 scan-staleness（src/scan-staleness.js:49-57「任一文档代表整批」break 首个命中——readdirSync 顺序决定读到新/旧基线，per-doc bump 后 advisory 会随机失真）；且 v1 对 worktree-guard 的论证有误：guard 写入用 40 位全哈希（src/run/stage.js:291 rev-parse HEAD）而 frontmatter 盖章 7 位短哈希（src/scan-postcheck.js:528 --short），worktree-guard.js:214 精确比对**恒不等**——「异基线触发保护、同基线放行」的前提不成立，实际是 guard 存在即恒拦。修正：①scan-diff readSourceCommit 聚合=最旧提交时间（v1 原案）；②scan-staleness 同口径改「收集全部 source_commit、按最旧（落后最多）计」——最坏情况口径，宁可多提醒不漏报；③worktree-guard 交互由 D-007@v1 握手机制解决，7/40 位错配作为存量 bug 在本变更顺带修复（归一化比对）。
supersedes：D-003@v1

## D-core-engine-014@v1 Grill 复核 P2 收口——聚合键改「落后最多」（拓扑）+ --done 内容比对门 + finalize specDir 口径
状态：implemented
变更：2026-09-14-scan-incremental-refresh
原编号：D-009@v1
锚点：未记录
最近确认：318e80c
理由：①聚合键从「提交时间最旧」改为「落后最多」：对去重基线集逐个 rev-list --count，取计数最大者（拓扑序免疫日期倒挂，且直接就是保守目标本体——落后最多=漂移窗最大）；N≤去重基线数，成本可忽略。②finalizeRefresh 内 specDir = platformOpts?.specRoot || null 再传 runScanPostCheck（对齐 scan-profile.js:356 executeScanFinalize 口径）。③①拍在 guard.refreshDocs 各条目记文档内容 sha256；--done 逐文档比对——内容未变者**默认不 bump**，打印「未编辑即盖章」提示，需显式 --docs 点名或 --force 才推进（工单零改动文档本就不该吃新基线）。附带 P3 措辞修正：①拍写面表述补 _facts.md；FR-5 ④dirty 明确 --force 不可越；staleness 聚合条目从 FR-7 挪入 FR-4；审计平台路径根=resolveRuntimeRoot(platformOpts, specBase)。

## D-core-engine-016@v2 重定范围——四件事编队（supersedes D-001@v1 五刀编队）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-001@v2
锚点：未记录
最近确认：7438d34
理由：范围收成四件事（用户裁定原文「范围收成四件事：路径声明的 blast、追赶重定价、span 标题、高报记账」）：①blast 轴项目化（D-008）②追赶重定价（D-003 保留）③span 标题（D-004 保留）④高报记账（D-005 保留）。刀 1/5 作废（D-002/D-006 superseded）；变更名保留不改（内容重定，目录 churn 无收益）。
故障面：范围仍跨三模块+scan 文档——rebuild 保留手工字段（D-008）与九消费点切换是两大执行风险，分别以回归测试与逐点处置表对冲。
退役判据：若路径声明面实证维护成本过高（声明漂移没人管），重审是否引入 scan 自动推导建议（仍需人工确认落 map）。

## D-docs-consistency-014@v2 rebuild 保留机制实证修正——--force 文本回插（supersedes D-008@v1 的 rebuild 表述，其余条款不变）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-008@v2
锚点：未记录
最近确认：7438d34
理由：修法改为：--force 重发射时从 existingMap 文本提取顶层 blast 段原样回插（未知顶层段通用回插）；回归钉断言「--force 写盘后 blast 段在场且字节不变」。v1 其余条款（map 主声明/local 只升/未命中 S1/禁回退词表/不留 legacy）不变。
故障面：文本回插对坏形态 blast 段（手写残缺 yaml）的容错——提取失败时警告并丢弃该段（rebuild 本就是重建语义，宁失勿错），回归钉覆盖健康段。
退役判据：同 D-008@v1。

## D-core-engine-018@v1 sillyspec 自举声明表口径——S3 钉真运行时域、门禁判定文件 S2、core-engine 不整模块标价
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-010@v1
锚点：未记录
最近确认：7438d34
理由：**S3+evidence 只钉真正的会话/租约/worktree/dispatch 路径**（runtime 会话域文件、worktree 模块、dispatch 域）；**门禁判定文件最多 S2**（stage-contract/verify-postcheck/verify-probes/ceremony-tier/review-tier/change-risk-profile/quick-gate-profile/probe7-anchor-check/run/gates 等）；**core-engine 不整模块标价**（datetime/constants/fs-atomic/taskcard 等零声明）。按此口径 api-matrix 类变更新架构下 = S2（8 文件 span），不是 S3——「改门禁判定白名单」与「改会话租约」不同价。具体路径清单在 design 落全量表。
故障面：声明表与模块演化脱节（新文件落错价）——map 评审流程可见，scan 层不自动改价（宁缺勿错）。
退役判据：无。

## D-docs-consistency-005@v1 非目标显式清单＋合规项
状态：implemented
变更：2026-09-19-review-material-pack
原编号：D-005@v1
锚点：docs/prompt/_extract.mjs
最近确认：7438d34
理由：非目标：不改评审轮次（S2/S3 菜单不动）、不改填卡步骤（plan.js:500 的 batch 子代理另立变更或明示非目标）、不动事实面计量（⑥ 另走 quick）、不吞 verify 级联死锁两轮（已有 postmortem ql-013）。**合规项（本变更触 src/stages/*.js prompt，CLAUDE.md 规则 19）**：改完必须重跑 `node docs/prompt/_extract.mjs` 并同步 docs/prompt/*.md——列入文件清单，防 doc-ref-check 层面返工。**自指纪律**：本变更在评审域，brainstorm 完成门按当时 design 定档且只升不降——risk_level 必须在该 --done 前写入 frontmatter（否则关键词定顶格、把要省的钱先花掉）。
故障面：无。
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

## D-docs-consistency-015@v1 本仓自举表——定制而非照抄六域（migration 族 + scheduling 族含 dispatch）
状态：implemented
变更：2026-09-19-span-risk-pattern-migration
原编号：D-004@v1
锚点：未记录
最近确认：c796534
理由：定制：migration 族（migrate/migration/migrations）+ scheduling 族（dispatch/scheduler/scheduling/cron/job/jobs），共 9 token。依据：①现行六域中 auth/permission/billing/lock 在本仓 src/ 零路径实体（grep 实证无 auth/billing/permission 命名文件；lock 无 lock 命名文件）——声明无实体的域是死配置，违反「项目自己的危险面自己声明」口径；②migration 族保住现行命中面（src/migrate.js、src/docs-migrate.js 今日即被 migrations?/migrate 命中——迁移工具/文档迁移是本仓真风险域）；③scheduling 族是本 dispatch/异步任务域的自 declaration（现行通用表 schedul(?:er|ing)|cron|jobs? 在本仓恰零命中，dispatch 词不在通用表——本仓按自身模块图补 declaration：src/dispatch/、src/review-dispatch.js），这是迁移的立意本身：声名面反映项目实况而非全宇宙猜测。行为面如实登记：本仓 dispatch 域文件自本变更起 span 命中→S2 / quick L2（比现行严）——这正是声明面该有的灵敏度。
故障面：dispatch 域灵敏度上升带来的误伤面（纯文档性 dispatch 改动也被 quick L2 提示）——L2 是 advisory 不阻断；dispatch 域确属异步任务风险域，误伤面可接受。
退役判据：本仓模块图重构使 dispatch/migration 域消亡时随 map 评审退役。

## D-unmapped-200@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-brainstorm-exit-thin-default
原编号：D-001@v1
锚点：未记录
最近确认：1f0ec6bae9a8c6daeda8f7925b88cbe9353d1c8e
理由：风险：① 拿不准默认 small 可能低估真复杂变更——兜底三层：实测失败自动升厚（既有）、--upgrade-thick 用户决策（既有）、收编后 thin 道自身门禁（实测/评审/patch）；② 模板标题下 agent 忘写 scale→null→默认收编，行为与 small 一致（符合设计）；③ premise-fail 型需求（前提不成立）仍要走满 8 步——行为演习发现的真实摩擦，属早期短路道新课题（记残留在变更报告）。行为级闭环验收：小白鼠带模糊中等规模需求（测试慢优化）走全链——入口选道进头脑风暴（负面信号命中）、Step 8 按新判据落 scale=small、CLI 指路 flow start 收编、下一步命令即收编命令——原始问题「头脑风暴后直奔五阶段」的反例实测成立。

## D-unmapped-254@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-wallclock-entry
原编号：D-001@v1
锚点：未记录
最近确认：9946796884354bfe0a55318aeb740575d61f4127
理由：最大风险：scan facts markdown 的 `generatedAt` 消费者（人读文档、快照 diff）看到值形状变化（UTC→本地）。已核实仓库内无测试断言 UTC 形、无机器按该字段做时间运算（git --since 消费的是 verify-facts.json），风险面收敛于人读显示。 放弃的方案：让 toWallClock 只接受 ISO 字符串并手写正则解析——放弃，正则白名单就是格式枚举，开放解析面应委托 Date 构造器；再如给 scan-facts 保留 UTC 但加后缀标注——放弃，与 datetime.js 既定的人读=本地墙钟约定冲突，制造两种并存形状。

## D-unmapped-255@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-module-map-list-leak
原编号：D-001@v1
锚点：未记录
最近确认：bb882b535e34e2a82d97f0324d0f88e4420bf591
理由：最大风险：依赖「泄漏项」的行为面——若有下游逻辑意外依赖污染数据（如某模块故意把单段 tag 当 path 用、或测试断言了污染形态），收紧后行为变化。已核：仓内测试 fixtures 均无 paths 后跟 tags 的块式写法（这正是泄漏长期不可见的原因）；泄漏项全是 tags/aliases/symbols/deps 值，语义上就不是路径。次风险：在场过滤把「动机里提到的未来新文件」token 滤掉致路由落空——已按「在场或图内」双判收敛（图内目标文件照常路由），落空走诚实提示（起点无依据），优于误路由冒充真域，取舍在设计里写明。量化口径注记（评审 P3 清偿）：早期粗计「950 条实路径」是修复前解析面计数（含 450 条带斜杠泄漏垃圾：入口注释/路由串/模块描述）；jsYaml ground truth 对账真实声明为 500 条，泄漏项合计 1375 条——test 头注释与本设计以 500/1375 为准，proposal 转写中的 950 为过程记录不再修正（历史镜像）。 放弃的方案：①parseModuleMapSimple 式字段名枚举白名单补全三解析器——放弃，开放世界字段集枚举不全即是本 bug 的成因（用户约束亦禁止）；②换 js-yaml 整体解析——放弃，三个解析器各有「只取平面子集、坏段不缺省不拦截」的容错立场（注释明示），整体解析改变坏段行为与性能面，超出本修复的刀口。

## D-unmapped-291@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-09-module-card-updated-at-iso
原编号：D-001@v1
锚点：未记录
最近确认：7cbdba1009a347093ab7be9d7d4309b86acd2c57
理由：最大风险：存量卡旧式戳（+08:00 标称、瞬间失真 8h）不迁移，基于 updated_at 做瞬间比较的下游（如 worktree-guard 对 scan 文档的手工编辑检测——它读的是 scan 文档不是模块卡）对旧卡仍是失真值——接受：worktree-guard 不消费模块卡 updated_at；模块卡 updated_at 当前无瞬间比较消费方，纯展示/溯源。试过放弃：①nowWallClock 本地墙钟裸形状——与人读 created_at 口径混同，且丢机器可比性（Date.parse 按本地解释，跨机歧义）；②本地时刻 + 真实机器偏移（如 +08:00 动态计算）——格式正确但需偏移计算逻辑，收益仅显示本地化，全量 Z + 展示端本地化是更简约定。

## D-unmapped-372@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-decision-id-p2-hardening
原编号：D-001@v1
锚点：未记录
最近确认：b8ab4be3713e53c344ae5ecda70994b775a62d6e
理由：- 最大风险：legacy 条目不再折叠 + 来源兜底使历史条目在注入/图/touch 面新增可见量（20 条来源条目 + 2 条隐身复现）——防复潮注入按 score/死路过滤，新增可见的是既存事实非噪声；回放断言（tests）锁定增量面。 - 死路（放弃）：把 20 行「来源：」数据一次性改写为「变更：」（数据迁移）——归档/知识文件是审计面，本单以读侧兼容达成同等可见性，零数据改写；后续重蒸馏自然收敛。 - 死路（放弃）：豁免键直接改语义砍掉裸键——消费仓既有配置静默失效（advisory 噪声复活），保留兼容 + 新形态并存。

## D-unmapped-373@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-14-decision-legacy-renumber
原编号：D-001@v1
锚点：未记录
最近确认：1cb2fc91c7a752bac7172540c9892efedc0b476b
理由：- 最大风险：真实库一次性重写 29 文件 701 节段——回退靠 git（迁移前状态已提交）；dry-run 对账先行（计划数=底数实测）；节段其余行逐字节保留 + 次序不变把改写面压到标题行与插入行两处。 - 平台向量索引：旧 anchor（局部号）在平台索引重建前不再命中——等值匹配下这些条目向量召回降级（本地词面检索不受影响），重建随平台 ingest 恢复；探针验证结果如实留档。 - 死路（放弃）：不做迁移只靠「自然收敛」——决策条目无跨变更承接机制，legacy 号永续共存（用户不接受永久双形态，裁决翻案）。 - 死路（放弃）：fanout 副本逐文件各自发号——违背单一身份铁律（FR 侧 R1 裁决同源），组内同号才保豁免键/引用/图节点一致性。

## D-unmapped-394@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-module-path-glob-match
原编号：D-001@v1
锚点：未记录
最近确认：13193a27324463c1d173b3a69645c7d73611a5de
理由：最大风险：命中面变宽可能把「脏卡/过宽 pattern」的路径吸进模块归属（如 `**` 过宽 pattern 吞全仓）——评估：pattern 质量是卡作者责任，历史精确条目语义逐字未变；过宽 pattern 在旧世界也会命中（前缀语义同样宽）。次风险：存量数据（平台仓 92 条伪域 + 444 条 unmapped 决策）不随本修复自动迁移——本变更止增量；存量清偿属消费仓数据治理（伪域可 tests --redomain 迁；unmapped 决策因 id 寻址含 file 键迁移需专门工具，与本仓 C5 同裁决缓办）。第三风险：head 注释再踩 `*/` 序列坑（模块注释曾因 `**/*.tsx`/`**/` 字面量提前闭合——两次实测）——已改措辞，留训于设计。放弃方案：①把 globMatch 复制进 modules.js（重复实现，违反单一源）；②改 sillyspec-scan 生成非 glob 卡（卡形态已散落消费仓存量 + scan 重扫成本，匹配器宽容化收益全局）；③只在 fr-index 单点修（decision/module-impact/docs-debt 等仍失效，治标不治本）。

## D-unmapped-435@v1 决策值集正典=写入白名单与蒸馏入选集并集（8 类 7 态单一源）
状态：implemented
变更：2026-10-20-decision-caliber-unify
原编号：D-001@v1
锚点：src/decision-values.js
最近确认：8227bd0a861f8d1e52aa56ce90ae7626b84c6a71
理由：正典集取并集（type 8 值=status quo 蒸馏 7 类加 scope；status 7 值照旧）且 implemented 计入蒸馏入选：蒸馏 7 类集是修 feasibility 漏选事故的既定意图、scope 排除是文档明载刻意设计；知识库入选输出值本叫「状态：implemented」，输入声明 implemented 却永不入选是遗留缺陷，纳入才写读闭合。单一源 src/decision-values.js，brainstorm 提示清单改常量插值（源头不可漂移）
