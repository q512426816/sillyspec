# 决策知识 — runtime

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-001@v1 方案A：复用现有管道（用户批准）
状态：implemented
锚点：src/docs-debt.js:1
最近确认：8aab190
理由：锚点触碰走 docs-debt facts 注入形态（纯函数+同一注入点）；漂移检测走 doctor 既有检查项形态（同"决策待复核检查"先例）；不新增占位符体系/新步骤结构/新命令
来源：2026-08-24-decision-touch-cli-drift

## D-003@v1 决策触碰注入必须覆盖 Wave 步 prompt
状态：implemented
锚点：src/run/prompt.js:502
最近确认：8aab190
理由：双渲染点：既有第 4 步注入（重入/reset 场景）+ Wave 步 prompt 追加渲染（buildWavePrompt 复用同一 facts 计算，changedFiles=porcelain ∪ baseline..HEAD），无新占位符
来源：2026-08-24-decision-touch-cli-drift
supersedes：无（修订 design 初稿注入时机）

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

## D-001@v1 : 载体=decisions.md 模块域字段增强，不新建 design.facts 文件
状态：implemented
变更：2026-09-07-ir-stage-p3c
锚点：未记录
最近确认：6c3509b
理由：种子稿原案 design.facts.yaml 不建——decisions.md 条目已含 type/question/answer/模块域/evidence（九字段+可选四字段），语义即「设计决定+影响模块+理由」；设计事实层=decisions.md 模块域字段从可选提升为推荐并加机器核验。判断层 design.md 散文不动。分析修正采纳：md 列表而非 YAML（agent 不易写坏，直进 docs-check 核验链）。

## D-002@v1 : 核验 gate=validateDecisionModuleRefs，ERROR 仅对不存在的模块 id
状态：implemented
变更：2026-09-07-ir-stage-p3c
锚点：未记录
最近确认：6c3509b
理由：用户预授权自主抉择：brainstorm「生成规范文件」步 --done gate 新增检查——decisions.md 各当前版本 D 条目模块域逐 id 核验：存在于 _module-map.yaml modules 键 或显式 NEW:<名> 前缀（规划中的新模块）→ 通过；不存在且无前缀=ERROR（模块幻觉）。design.md 文件清单×module-map paths 推导的实际模块集 vs 声明域并集差异=WARNING（声明面 vs 实改面提示）；模块域全缺失=WARNING 汇总（存量兼容不阻断）。

## D-003@v1 : 方案A 三件套——核验 gate + design-init 骨架 + _facts 注入
状态：implemented
变更：2026-09-07-ir-stage-p3c
锚点：未记录
最近确认：6c3509b
理由：方案A：①validateDecisionModuleRefs（纯函数+brainstorm 末步 gate 接线，D-002 语义）②design-init CLI 命令（design.md 十三章节骨架：决策追踪表从 decisions.md 当前版本 D 条目预填、文件变更清单表骨架；Step 6 prompt 卸责为填骨架、不强制——存量手写路径保留）③brainstorm Step2 注入 docs/<project>/scan/_facts.md（存在时全文注入，红线同 scan：禁止重新 grep 底稿覆盖的机械事实）。拒绝方案B（新 YAML 载体：agent 手写前科、与 decisions.md 双写漂移）。

## D-001@v1 : P3d 缩范围=delta 聚合器 + advisory 联动，端点 before 基线明确不做
状态：implemented
变更：2026-09-07-ir-stage-p3d
锚点：未记录
最近确认：f4db7c9
理由：核心缩为两件：①delta 聚合器——sillyspec delta --change <名> CLI 从前三期已就位的机器产物（P3a reconcile-result.json 的 touched/matched 三类差集、module-map 归属、P3b verify-facts.json 探针摘要、decisions.md 提炼清单）聚合生成 delta.md 落变更目录（archify Delta 的 Before/Delta/After 对应物，md 非 yaml 与全系列一致）；②advisory 联动——delta.md 尾部生成「下次 scan facts 建议刷新模块」段（受影响模块清单）。端点 before/after 基线明确不做（contract-matrix 只有事后快照，before 机制独立立项）；增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）；knowledge 自动沉淀已有 decision-distill（不重复）。

## D-001@v1 : 基线=execute 启动时幂等快照（首次落盘不覆盖），增删=归档时 delta 第五源
状态：implemented
变更：2026-09-07-endpoint-baseline
锚点：未记录
最近确认：99d255c
理由：用户指令立项（P3d 多次提示）。采集：sillyspec endpoints baseline --change <名>（幂等——已存在不覆盖，首次跑=变更前状态基线）落 .runtime/endpoint-baselines/<change>.json（endpoints[] method/path/source + baseCommit + generatedAt）；execute Step 3（worktree 确认步）prompt 指引 agent 跑一次（对齐 verify-probes --init 先例）。消费：归档时 archive-delta 增第五源——endpoint-extractor 现算当前端点集 × 基线 → diffEndpointSets 纯函数（added/removed）→ delta.md「端点增删」节（替代 P3d 的「独立立项提示」条件行）。provider 产物 endpoints.json 不动（contract-matrix 零改动）。

## D-001@v1 : 计划侧不做行数（含估算值），只做文件级三态
状态：implemented
变更：2026-09-10-change-scope-audit
锚点：未记录
最近确认：3f22d6b
理由：用户初始提议「计划侧行数没有的话给个大概也行」；讨论后收敛不做——design.md 清单是文件级声明无行数语义，LLM 估行数无法追责（估 50 实 300 分不清是计划错还是估算错），与本仓「每条数据要么机械真实要么明确是人的判断」门禁哲学冲突。规模感如需后续用 T-shirt 尺寸（明确是判断的粗粒度），不在本变更。

## D-002@v1 : 实际侧行数一律 git 真值（numstat 优先）
状态：implemented
变更：2026-09-10-change-scope-audit
锚点：未记录
最近确认：3f22d6b
理由：用户明确「实际改动的文件（+ - 行数，这个要真实的）」。tracked 改动用 `git diff --numstat`（与文件清单同基点，天然自洽）；untracked 新文件 numstat 不可得 → wc -l 记全 + 行；binary（numstat 为 `-`）显 BIN。

## D-003@v1 : 架构 = 纯函数单一真相 + 独立命令随时查 + 阶段点薄注入
状态：implemented
变更：2026-09-10-change-scope-audit
锚点：未记录
最近确认：3f22d6b
理由：用户提议「独立一个参数或者命令去展示，可以随时查看」。三层：computeChangeScopeAudit 纯函数（单一真相）；sillyspec scope-audit 命令（人类可读 + --json）；execute --done / verify --done / archive --confirm 三处薄注入调同一函数。对齐 verify-probes / module-impact 已验证的「纯函数 + 命令 + 阶段集成」三层模式。

## D-004@v1 : quick 流程纳入——复用 auditQuickCompletion 窗口归属，归属状态表而非三态
状态：implemented
变更：2026-09-10-change-scope-audit
锚点：未记录
最近确认：3f22d6b
理由：用户问「quick 的范围是否也能统计到呢」，评估后纳入。quick 无事前计划（--files 是事后声明），不做三态做归属状态表：已声明（--files）/ 软归属（同模块测试）/ ⚠️ 未声明 / 他者声明（排除面）。窗口归属复用 auditQuickCompletion（baseline 快照/他者退栈/软归属已存在）；随时查看依赖 guard.json 持久化 + locateQuickSessionGuard。quick 提交后窗口已 commit，降级读 QUICKLOG 条目文件行（记录态非实时）。

## D-006@v1 : ⚠️ 计划外/计划未动/未声明均为 advisory，不阻断
状态：implemented
变更：2026-09-10-change-scope-audit
锚点：未记录
最近确认：3f22d6b
理由：不阻断。多 agent 并行是本仓常态（AGENTS.md 核心前提），计划外文件可能是他者演进或 plan 后 design 漏更新（常态），硬拦会把正常流逼进 rescue 手动路径（diff 规模两档制先例同教训）。⚠️ 项给出明确出口：execute 时点补 design.md 声明或 --output 注明原因。

## D-001@v1 摩擦触发经验沉淀的触发器形态：CLI 结构化计数
状态：implemented
变更：2026-09-11-friction-signal-hint
锚点：未记录
最近确认：2a46c07
理由：**CLI 状态机埋点计数 + 收尾 advisory 提示**（方案 B）。埋点选摩擦事件流经 CLI 自身状态机的三个高信噪比位置：gate 失败回滚（rollbackCompletionAndReturn）、verify test/lint 实测失败、审查 verdict=fail；计数非零时在 quick/verify --done 收尾输出一行提示，建议按 现象/根因/护栏/证据 补 postmortem（与 verify.js/doctor.js 已有 advisory 同一落点链路，不新建命令）。

## D-002@v1 摩擦计数文件落点：.runtime 本机运行时区，禁止 changes/ 目录
状态：implemented
变更：2026-09-11-friction-signal-hint
锚点：未记录
最近确认：2a46c07
理由：**落 .sillyspec/.runtime/friction-tally-<changeName>.json**；quick 会话落 .runtime/quick-sessions/<sessionId>/friction-tally.json；平台模式跟随 specBase 解析与 lint tally 同落点。**禁止落 changes/<change>/**。

## D-003@v1 提示克制语义：全零静默、每收尾最多一行、提示后清零、可关默认开
状态：implemented
变更：2026-09-11-friction-signal-hint
锚点：未记录
最近确认：2a46c07
理由：照抄 teamai 的克制约束并适配：① 任何类型计数全零 → 收尾零输出（顺利会话零打扰）；② 每次收尾最多输出一行；③ 提示输出后计数清零（「每会话最多提示一次」的等价实现——同一段摩擦只提示一次）；④ 措辞保持「若其中有值得沉淀的坑」条件式（防 agent 为消除提示而制造记录）；⑤ local.yaml 新键 friction_hint.enabled，默认 true，可一键关。

## D-005@v1 隐私红线：只落结构化信号，不落内容
状态：implemented
变更：2026-09-11-friction-signal-hint
锚点：未记录
最近确认：2a46c07
理由：**只允许计数/类型/时间戳（+gate 来源标签、failure reason 摘要等结构化短字段）**；禁止落地提示词、对话原文、任务语义摘要。sillyspec 的信号从头到尾不接触对话内容，比 teamai（需对任务摘要脱敏）更干净。

## D-006@v1 Design Grill 修正包（independent 审查 3×P1 + 4×P2）
状态：implemented
变更：2026-09-11-friction-signal-hint
锚点：未记录
最近确认：2a46c07
理由：全部采纳修入 design.md——① CC-03（P1）verify 收尾 consume 补第二落点 complete.js continueStep ~1475（wait 解除完成路径，G-2 注释已记录该双路径陷阱）；② CC-04（P1）friction-tally.js 内部推导 specBase（platformOpts.specRoot || specDriftAnchor || cwd/.sillyspec，与 complete.js:125 同序），gates.js 尾参只带 type/detail；③ CC-05（P1）file-lifecycle.md 真实路径为仓根 docs/sillyspec/（.sillyspec/docs/ 下只有 modules/+scan/）；④ CC-02 调用点核正 16→13；⑤ CC-10 verify_run_failed 计入 advisory lint 失败（记录条件与 throw 条件解耦）；⑥ CC-11 标签图补 verify-lint@697；⑦ CC-12 归档时 pruneArchivedChangeRuntime 清 friction-tally，放弃变更残留接受（R-06）。

## D-001@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
状态：implemented
变更：2026-09-11-cross-change-decision-guard
锚点：未记录
文件：src/semantic-guard.js, src/run/prompt.js, src/run/quick-audit.js
最近确认：358af35
理由：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。

## D-002@v1 quick 出口分级门禁（L0/L1/L2 机械画像），不新增第三条车道
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：不新增 mid 车道（自选车道会被激励扭曲绕过：95% 超限 quick 本就是 agent 自选、独立完成绕过 full 仪式；新车道=新状态机+新 prompt 面，违背纯减法原则）。改为 quick --done 出口按 CLI 侧机械信号自动升级：L0=现状 test/lint 实测门；L1（跨≥2 模块 或 ≥4 文件）=+每文件注记非空+测试增量检查；L2（跨≥4 模块 或 风险特征命中）=+模块文档认领或显式 --no-docs 豁免留痕+运行时证据要求。判定输入用 CLI 自算 changedFiles×module-map，不用 --files 自声明（37.1% 超限条目存在未声明脏文件）。

## D-005@v1 未声明脏文件触发归属确认，不挂文档对账
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
锚点：未记录
最近确认：e84bc89
理由：未声明脏文件是归属问题（可能是并行会话改动或漏申报，审计行自述两种可能），不是文档同步问题——挂文档对账会罚错人。触发归属确认（要求声明/剔除归属），与 L2 文档认领门分离。

## D-002@v1 归档收口——worktree 有未 apply 交付物时归档硬拦
状态：implemented
变更：2026-09-14-change-ownership-guards
锚点：未记录
最近确认：ee966ed
理由：§65 护栏②：archive step3（确认归档）前检查 worktree 未 apply 交付面（复用 applyWorktree checkOnly）——非空即阻断归档并给两条出路：先跑 worktree apply 或 --skip-apply 显式跳过留痕（明确知道自己要手动处理）。归档与 apply 不自动串联（自动 apply 在有脏重叠时行为复杂，人确认更稳）。

## D-004@v1 归因源切换——worktree 模式 changedFiles 取 worktree 分支 diff
状态：implemented
变更：2026-09-14-change-ownership-guards
锚点：未记录
最近确认：ee966ed
理由：§65 护栏④：worktree 隔离模式的变更，其 review 草稿/changedFiles 归因一律取 worktree 分支 diff（git diff base..HEAD + worktree porcelain，现 verify 对账已用同口径）为唯一事实源；主仓脏窗口仅用于 in-place-fallback 模式。存量草稿归属逻辑（autoDraftAttribution）按模式分流。

## D-004@v1 勾选守卫 diff 集对齐 D-004@v1（库内）worktree 分支 diff+porcelain 口径，抽公共 helper
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
锚点：src/run/complete.js:prefetchDiffFileSet
最近确认：42cef77
理由：不降级。根因是 `prefetchDiffFileSet` 的 diffFileSet 只算 `git diff base..head`（worktree 已提交），而草稿归属（generateTaskReviewDrafts）并入了 porcelain 未提交 + merge-base committed 补齐——子代理默认不 commit 时 diffFileSet 恒空/缺文件，勾选守卫全部跳过。修法：把「worktree 改动文件集（porcelain ∪ committed merge-base 补齐）」抽成公共 helper，complete.js 勾选守卫与 task-review.js 草稿归因共用（两处既有「口径须同步改」注记正好收口）。同文件多 task 归属：`attributeSuspectTasks` 首中即止改全量多归属（map 值 string[]），③类报告渲染完整作者列表。
故障面：helper 对 meta 缺失/in-place 返回 [] → 守卫退回 base..head 现状（fail-open 不放大勾选面）；多归属渲染膨胀 → 截断展示
退役判据：review/勾选改为 per-task 锡点锚定（base/head 写进 task 卡）全量落地时

## D-003@v1 完成门「声明追赶重定价」——无摩擦可降、摩擦地板不退（「只升不降」契约修订）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
锚点：未记录
最近确认：7438d34
理由：escalateCeremonyTierAtGate 在档位文件在场时先用当前 design/plan 重跑 computeInitialCeremonyTierDoc，再跑摩擦升档。**transitions 为空且 ledger 摩擦未超阈：开跑价整档换成重算结果，可升可降**，reasons 留「声明追赶重定价」；**已有摩擦迁移：地板不退**，重算只更新 blast/span 分量，最终档=max(重算档, 摩擦地板)。懒 agent 靠删关键词把真 S3 写成 S0 仍由收口双跑按实际 diff 硬拦（verify-postcheck 事实面 detectChangeRisk 无声明通道）。
故障面：重定价抖动（design 反复改声明 → 档位反复横跳）——每次迁移留 transitions 审计痕，评审可见；摩擦地板保证已付仪式价不白付。
退役判据：若声明通道前移到定价时刻强制存在（如 brainstorm 门要求 frontmatter 先行），追赶重定价需求自然消失。

## D-004@v1 readDesignOwnFiles 认「## 文件变更清单」标题（解析器/模板漂移修复）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
锚点：未记录
最近确认：7438d34
理由：同时认 `## 6.` 数字标题与 `## 文件变更清单`（含带括注形态「## 文件变更清单（…）」）；阈值 SPAN_FILES_THRESHOLD=8 不动；旧数字标题行为不变。
故障面：标题形态再演进（如双语/别名）会再漂——接受双形态白名单，不做模糊匹配（宁窄勿宽，误解析面小于漏解析面）。
退役判据：design 迁结构化产物（yaml/json 清单）后文本标题解析整体退役。

## D-001@v2 重定范围——四件事编队（supersedes D-001@v1 五刀编队）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
锚点：未记录
最近确认：7438d34
理由：范围收成四件事（用户裁定原文「范围收成四件事：路径声明的 blast、追赶重定价、span 标题、高报记账」）：①blast 轴项目化（D-008）②追赶重定价（D-003 保留）③span 标题（D-004 保留）④高报记账（D-005 保留）。刀 1/5 作废（D-002/D-006 superseded）；变更名保留不改（内容重定，目录 churn 无收益）。
故障面：范围仍跨三模块+scan 文档——rebuild 保留手工字段（D-008）与九消费点切换是两大执行风险，分别以回归测试与逐点处置表对冲。
退役判据：若路径声明面实证维护成本过高（声明漂移没人管），重审是否引入 scan 自动推导建议（仍需人工确认落 map）。

## D-001@v1 范围与硬约束——六模式表迁项目声明，价目表/blast 段零改动
状态：implemented
变更：2026-09-19-span-risk-pattern-migration
锚点：未记录
最近确认：c796534
理由：迁移=六模式表自硬编码改项目声明（形态在方案步定），两消费面（①ceremony-tier.js:218 span 轴命中→至少 S2；②quick-gate-profile.js:148 computeGateProfile 默认 riskTable 命中→L2+runtimeEvidence advisory）按方案期决策切换。硬约束（用户原话逐条）：**价目表不动**（三轴 max 公式、阈值 8/2、force_tier 只升不降）；**blast 声明面（blast 段）不动**——只迁 span 的路径模式；quick 画像消费面与定价消费面口径**可以分开迁也可以一起**（design 定）；risk_level 先行纪律（design frontmatter 首次定价前声明）。
故障面：迁移中匹配语义漂移（口径变化伪装成迁移）——以「同 token 集 ⇒ 逐字节同命中」等价性钉对冲（方案步定）。
退役判据：若 span 轴整体改结构化输入（非路径模式），本机制随轴退役。

## D-003@v1 方案 A——map 顶层 span_risk 段（token 扁平列表）+ 空缺省 + 双消费面同刀 + 硬退役
状态：implemented
变更：2026-09-19-span-risk-pattern-migration
锚点：未记录
最近确认：c796534
理由：选 A（用户简报显式委托方案期定夺——原话「形态 brainstorm 定」「缺省行为、本仓自举表、两消费面切换、向后兼容（无声明项目）都在方案期落决策」；本条 agent 按委托选定，可 --reopen 否决）。理由：①与 blast 管道同构（D-008 先例：map 主声明进 git 可评审、modules rebuild --force 未知顶层段通用回插已覆盖 span_risk、装载容错立场「坏段跳过不拦截」现成）；②B 被等价问题显式否决过——local.yaml gitignore 每机一份当共享价目表（D-008 evidence 原文「local.yaml 当共享价目表」被否）；③C 与 blast「未配置禁止回退」（D-008）正面冲突且让全宇宙表活在缺省路径，违反知识库 conventions「判级/定价/门禁输入必须项目声明，禁全宇宙词表」口径真相源条目。覆盖决策：符合 D-001（价目表公式零改动）、不违 D-002（不触碰 blast 段）。
故障面：①无声明项目静默失去六域网（auth/billing 路径不再触发 span S2 / quick L2）——以 known-issues/文档登记 + 本仓自举表示范对冲，blast 迁移同款取舍；②token 写错（拼错/过宽）静默失配——token 为纯字面量可评审，装载数量进 reasons 审计。
退役判据：若 span 轴改结构化输入或 pattern 声明并入 blast 段 schema 升版，本段形态随之退役。

## D-001@v1 burst 缺省 OFF，本仓 local.yaml 自举开启
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：不翻。缺省 OFF（未配置即单步模式，既有行为零变化）；本仓 `.sillyspec/local.yaml` 手动加 `stage: burst: true` 自举 dogfood；env `SILLYSPEC_STAGE_BURST=1` 强制开 / `=0` 强制关（逃生阀）。全量默认翻转（测试面迁移）验收后另立变更。
故障面：用户误配 `burst: false` 之外的非法值按 false 处理（宽容缺省，不报错）。
退役判据：全量翻转变更落地后本配置读取保留（env 阀仍有效），local.yaml 自举行可删。

## D-005@v1 --step 意图断言仅 burst 首轮生效
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：断言只在第一轮透传（防读旧进度的并发错位，首轮 mismatch 照常 exit）；第二轮起从 options 剥离 stepAssert。burst 本身就是「一次收口全部剩余步」的显式声明，后续轮次无需重复断言。
故障面：无新增（首轮语义与单步完全一致）。
退役判据：无。

## D-006@v1 burst 作用域 = brainstorm/plan/execute 三主阶段
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：否。渲染与完成两侧的 burst 分支均以 `stageName ∈ {brainstorm, plan, execute}` 为门。排除理由：① verify/archive 任务书明确不动（--init --draft 与就绪度已压到 1-2 次调用）；② quick 末步四字段硬契约（validateQuickResult）与 P0-2 事实合成不兼容（src/run/complete.js:222-224 已把 quick 列为合成豁免），burst 每轮传 null 会在 quick 末步炸校验；③ scan/doctor/explore 辅助阶段不在本轮验收面。
故障面：无（白名单门控，未列阶段走原路径）。
退役判据：后续若要把 burst 推广到 verify/archive，改白名单即可（quick 永远除外）。

## D-007@v1 readStageBurst 走 readLocalYamlRaw + js-yaml 读 stage.burst
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：放 src/run/shared.js export `readStageBurst(cwd)`：复用既有 `readLocalYamlRaw(cwd)`（src/run/shared.js:1938-1946）+ js-yaml 动态 import 读 `doc?.stage?.burst === true`——与 resolveLivingDocs 读 `docs-check.living-docs` 同款范式（src/run/shared.js:1328），绕开 parseSimpleYaml 缩进坑（known-issues 实证）。env 覆写：`SILLYSPEC_STAGE_BURST=0` → false / `=1` → true，优先于配置；坏 YAML/读失败 → false。锚定 cwd 而非 specBase：burst 是仓库本地开发偏好（与 resolveLivingDocs 同锚定），不随平台/worktree specRoot 漂移。
故障面：js-yaml 动态 import 失败 → false（fail-safe 回缺省）。
退役判据：无。

## D-008@v1 burst 渲染侧 noAI 自动完成抽取 stage.js 分发为共用助手
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：不可接受，改为抽取。把 src/run/stage.js:592-629 的 _cliAction if-链抽为 stage.js 内局部助手 `executeNoAiCliAction({ cliAction, stageName, stepName, cwd, specBase, changeName, platformOpts, progress, pm, scanProfile })`，常规单步路径（stage.js noAI 分支）与 burst 渲染循环共同调用——单一事实源防三分叉。complete.js:437-472 的平行副本**不动**（"不改 completeStep 本体"承诺；该副本本就以"与 stage.js 对齐"注释维持平行维护，本轮不扩面）。
故障面：新增 _cliAction 只登记 stage.js 助手会在 complete.js 副本报"未知 _cliAction"——既有平行维护约束，非本轮新增。
退役判据：无。

## D-009@v1 agent 整体 --output 横幅打印，不落步记录
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：completeStepBurst 开打一行横幅（`📦 burst 收口摘要：<outputText>` 或省略时跳过），循环每轮 outputText 传 null 由 P0-2 事实合成（src/run/complete.js:224-227）逐步生成。不把整体摘要挂到末步 output——语义错归属（末步会记录与自身无关的整体叙述，污染步骤审计面）。
故障面：无持久化的整体语义摘要——语义说明进 decisions.md/proposal.md（本就有），步骤 output 面保持纯事实。
退役判据：无。

## D-011@v1 方案选择 = A（burst 交互折叠）
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：用户选 A（任务书冻结版）：渲染侧剩余步逐个调既有 outputStep + completeStepBurst 循环调 completeStep(printNext:false)，completeStep 本体零 diff；缺省 OFF 本仓自举。用户同时授权全程免询问（后续 requiresWait 决策点按任务书冻结口径自决并如实记录）。
故障面：无（方案选择记录）。
退役判据：无。

## D-002@v2 burst 渲染输出一致判据改「首访渲染形」
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：不可达（Grill P2 附注）：requiresWait 步被 --answer 恢复后，单步模式重渲染时 collectStageWaitHistory 已带 waitAnswer 记录而 burst 首渲染时为空——文本面结构性不同。判据改为「首访渲染形一致」：前置 waitAnswer 状态相同的前提下，burst 逐个 outputStep 的输出与单步模式调用该步时一致。核心架构面（复用 outputStep、渲染器零改动）v1 不变。
supersedes：D-002@v1
故障面：无（判据口径修正）。
退役判据：无。

## D-003@v2 completeStepBurst 补尾随 stale 拉回 + auto 路径跳过预合成
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：Grill P1-1：runStage 只拉回 currentIdx（首个非 completed/skipped）的 stale/blocked（src/run/stage.js:264-269），completeStep 谓词不含 stale（src/run/complete.js:165）——尾随 stale 步会被 burst 渲染打印说明书但 done 循环永不完成，退化为单步阶梯，破等价性目标。修正：completeStepBurst 每轮调 completeStep 前对首个非 completed/skipped 步做同语义 stale→pending 拉回（burst 新代码内，不触 completeStep 本体）。附带：auto 路径 burst 分支跳过 command.js:2064-2070 的 --output 预合成（防横幅重复）。v1 核心面（循环+printNext:false+completeStep 零 diff+50 轮上限+幂等断点）不变。
supersedes：D-003@v1
故障面：拉回写库失败 → 该轮 completeStep 落到其后的 pending 步（不卡死，重跑续）；与单步模式同故障语义。
退役判据：无。

## D-004@v2 --answer 消费检测改轮前后 waitAnswer 快照比对
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：会（Grill P2 附注）：--done --answer 落在已 waiting 步时 resolveWaitingStepWithAnswer 重定向 currentIdx（src/run/complete.js:190-193），实际完成的步 ≠ 轮前首个 pending 索引，固定索引检测漏判 → answer 未剥离 → 错配风险回归。修正：轮前快照全部步 waitAnswer、轮后比对，任一步 waitAnswer 新变为 === doneAnswer 即视为已消费并剥离。v1 核心面（单次消费语义、防双 requiresWait 错配）不变。
supersedes：D-004@v1
故障面：同 v1（文本巧合提前剥离，fail-safe 方向）。
退役判据：无。

## D-012@v1 STAGE_BURST_STAGES 白名单常量单一事实源落 shared.js（执行期裁决）
状态：implemented
变更：2026-09-22-stage-burst-fold
锚点：未记录
最近确认：9f9450d0
理由：放 src/run/shared.js export（readStageBurst 旁）：渲染门（stage.js renderStageBurst）与完成门（command.js 两处 --done 分发）共用同一常量，防两处字面量漂移。执行期越界披露：该裁决使 task-03 提交含 stage.js import 行切换与 shared.js 常量 export（两文件原属 task-01/02 的 allowed_paths）——非破坏性、可逆、不推翻任何 D，属主代理直写模式歧义裁决条款范围。
故障面：无（常量单一源）。
退役判据：无。
