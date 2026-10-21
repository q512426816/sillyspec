# 决策知识 — runtime

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-docs-consistency-002@v1 方案A：复用现有管道（用户批准）
状态：implemented
原编号：D-001@v1
锚点：src/docs-debt.js:1
最近确认：8aab190
理由：锚点触碰走 docs-debt facts 注入形态（纯函数+同一注入点）；漂移检测走 doctor 既有检查项形态（同"决策待复核检查"先例）；不新增占位符体系/新步骤结构/新命令
来源：2026-08-24-decision-touch-cli-drift

## D-runtime-001@v1 决策触碰注入必须覆盖 Wave 步 prompt
状态：implemented
原编号：D-003@v1
锚点：src/run/prompt.js:502
最近确认：8aab190
理由：双渲染点：既有第 4 步注入（重入/reset 场景）+ Wave 步 prompt 追加渲染（buildWavePrompt 复用同一 facts 计算，changedFiles=porcelain ∪ baseline..HEAD），无新占位符
来源：2026-08-24-decision-touch-cli-drift
supersedes：无（修订 design 初稿注入时机）

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

## D-cli-entry-002@v1 : 方案A 三件套——核验 gate + design-init 骨架 + _facts 注入
状态：implemented
变更：2026-09-07-ir-stage-p3c
原编号：D-003@v1
锚点：未记录
最近确认：6c3509b
理由：方案A：①validateDecisionModuleRefs（纯函数+brainstorm 末步 gate 接线，D-002 语义）②design-init CLI 命令（design.md 十三章节骨架：决策追踪表从 decisions.md 当前版本 D 条目预填、文件变更清单表骨架；Step 6 prompt 卸责为填骨架、不强制——存量手写路径保留）③brainstorm Step2 注入 docs/<project>/scan/_facts.md（存在时全文注入，红线同 scan：禁止重新 grep 底稿覆盖的机械事实）。拒绝方案B（新 YAML 载体：agent 手写前科、与 decisions.md 双写漂移）。

## D-cli-entry-003@v1 : P3d 缩范围=delta 聚合器 + advisory 联动，端点 before 基线明确不做
状态：implemented
变更：2026-09-07-ir-stage-p3d
原编号：D-001@v1
锚点：未记录
最近确认：f4db7c9
理由：核心缩为两件：①delta 聚合器——sillyspec delta --change <名> CLI 从前三期已就位的机器产物（P3a reconcile-result.json 的 touched/matched 三类差集、module-map 归属、P3b verify-facts.json 探针摘要、decisions.md 提炼清单）聚合生成 delta.md 落变更目录（archify Delta 的 Before/Delta/After 对应物，md 非 yaml 与全系列一致）；②advisory 联动——delta.md 尾部生成「下次 scan facts 建议刷新模块」段（受影响模块清单）。端点 before/after 基线明确不做（contract-matrix 只有事后快照，before 机制独立立项）；增量 scan 引擎不做（scan facts 全量幂等，增量属 scan 域）；knowledge 自动沉淀已有 decision-distill（不重复）。

## D-cli-entry-001@v1 : 基线=execute 启动时幂等快照（首次落盘不覆盖），增删=归档时 delta 第五源
状态：implemented
变更：2026-09-07-endpoint-baseline
原编号：D-001@v1
锚点：未记录
最近确认：99d255c
理由：用户指令立项（P3d 多次提示）。采集：sillyspec endpoints baseline --change <名>（幂等——已存在不覆盖，首次跑=变更前状态基线）落 .runtime/endpoint-baselines/<change>.json（endpoints[] method/path/source + baseCommit + generatedAt）；execute Step 3（worktree 确认步）prompt 指引 agent 跑一次（对齐 verify-probes --init 先例）。消费：归档时 archive-delta 增第五源——endpoint-extractor 现算当前端点集 × 基线 → diffEndpointSets 纯函数（added/removed）→ delta.md「端点增删」节（替代 P3d 的「独立立项提示」条件行）。provider 产物 endpoints.json 不动（contract-matrix 零改动）。

## D-runtime-005@v1 : 计划侧不做行数（含估算值），只做文件级三态
状态：implemented
变更：2026-09-10-change-scope-audit
原编号：D-001@v1
锚点：未记录
最近确认：3f22d6b
理由：用户初始提议「计划侧行数没有的话给个大概也行」；讨论后收敛不做——design.md 清单是文件级声明无行数语义，LLM 估行数无法追责（估 50 实 300 分不清是计划错还是估算错），与本仓「每条数据要么机械真实要么明确是人的判断」门禁哲学冲突。规模感如需后续用 T-shirt 尺寸（明确是判断的粗粒度），不在本变更。

## D-runtime-006@v1 : 实际侧行数一律 git 真值（numstat 优先）
状态：implemented
变更：2026-09-10-change-scope-audit
原编号：D-002@v1
锚点：未记录
最近确认：3f22d6b
理由：用户明确「实际改动的文件（+ - 行数，这个要真实的）」。tracked 改动用 `git diff --numstat`（与文件清单同基点，天然自洽）；untracked 新文件 numstat 不可得 → wc -l 记全 + 行；binary（numstat 为 `-`）显 BIN。

## D-cli-entry-005@v1 : 架构 = 纯函数单一真相 + 独立命令随时查 + 阶段点薄注入
状态：implemented
变更：2026-09-10-change-scope-audit
原编号：D-003@v1
锚点：未记录
最近确认：3f22d6b
理由：用户提议「独立一个参数或者命令去展示，可以随时查看」。三层：computeChangeScopeAudit 纯函数（单一真相）；sillyspec scope-audit 命令（人类可读 + --json）；execute --done / verify --done / archive --confirm 三处薄注入调同一函数。对齐 verify-probes / module-impact 已验证的「纯函数 + 命令 + 阶段集成」三层模式。

## D-change-management-001@v1 : quick 流程纳入——复用 auditQuickCompletion 窗口归属，归属状态表而非三态
状态：implemented
变更：2026-09-10-change-scope-audit
原编号：D-004@v1
锚点：未记录
最近确认：3f22d6b
理由：用户问「quick 的范围是否也能统计到呢」，评估后纳入。quick 无事前计划（--files 是事后声明），不做三态做归属状态表：已声明（--files）/ 软归属（同模块测试）/ ⚠️ 未声明 / 他者声明（排除面）。窗口归属复用 auditQuickCompletion（baseline 快照/他者退栈/软归属已存在）；随时查看依赖 guard.json 持久化 + locateQuickSessionGuard。quick 提交后窗口已 commit，降级读 QUICKLOG 条目文件行（记录态非实时）。

## D-runtime-007@v1 : ⚠️ 计划外/计划未动/未声明均为 advisory，不阻断
状态：implemented
变更：2026-09-10-change-scope-audit
原编号：D-006@v1
锚点：未记录
最近确认：3f22d6b
理由：不阻断。多 agent 并行是本仓常态（AGENTS.md 核心前提），计划外文件可能是他者演进或 plan 后 design 漏更新（常态），硬拦会把正常流逼进 rescue 手动路径（diff 规模两档制先例同教训）。⚠️ 项给出明确出口：execute 时点补 design.md 声明或 --output 注明原因。

## D-runtime-008@v1 摩擦触发经验沉淀的触发器形态：CLI 结构化计数
状态：implemented
变更：2026-09-11-friction-signal-hint
原编号：D-001@v1
锚点：未记录
最近确认：2a46c07
理由：**CLI 状态机埋点计数 + 收尾 advisory 提示**（方案 B）。埋点选摩擦事件流经 CLI 自身状态机的三个高信噪比位置：gate 失败回滚（rollbackCompletionAndReturn）、verify test/lint 实测失败、审查 verdict=fail；计数非零时在 quick/verify --done 收尾输出一行提示，建议按 现象/根因/护栏/证据 补 postmortem（与 verify.js/doctor.js 已有 advisory 同一落点链路，不新建命令）。

## D-runtime-009@v1 摩擦计数文件落点：.runtime 本机运行时区，禁止 changes/ 目录
状态：implemented
变更：2026-09-11-friction-signal-hint
原编号：D-002@v1
锚点：未记录
最近确认：2a46c07
理由：**落 .sillyspec/.runtime/friction-tally-<changeName>.json**；quick 会话落 .runtime/quick-sessions/<sessionId>/friction-tally.json；平台模式跟随 specBase 解析与 lint tally 同落点。**禁止落 changes/<change>/**。

## D-runtime-002@v1 提示克制语义：全零静默、每收尾最多一行、提示后清零、可关默认开
状态：implemented
变更：2026-09-11-friction-signal-hint
原编号：D-003@v1
锚点：未记录
最近确认：2a46c07
理由：照抄 teamai 的克制约束并适配：① 任何类型计数全零 → 收尾零输出（顺利会话零打扰）；② 每次收尾最多输出一行；③ 提示输出后计数清零（「每会话最多提示一次」的等价实现——同一段摩擦只提示一次）；④ 措辞保持「若其中有值得沉淀的坑」条件式（防 agent 为消除提示而制造记录）；⑤ local.yaml 新键 friction_hint.enabled，默认 true，可一键关。

## D-runtime-010@v1 隐私红线：只落结构化信号，不落内容
状态：implemented
变更：2026-09-11-friction-signal-hint
原编号：D-005@v1
锚点：未记录
最近确认：2a46c07
理由：**只允许计数/类型/时间戳（+gate 来源标签、failure reason 摘要等结构化短字段）**；禁止落地提示词、对话原文、任务语义摘要。sillyspec 的信号从头到尾不接触对话内容，比 teamai（需对任务摘要脱敏）更干净。

## D-runtime-011@v1 Design Grill 修正包（independent 审查 3×P1 + 4×P2）
状态：implemented
变更：2026-09-11-friction-signal-hint
原编号：D-006@v1
锚点：未记录
最近确认：2a46c07
理由：全部采纳修入 design.md——① CC-03（P1）verify 收尾 consume 补第二落点 complete.js continueStep ~1475（wait 解除完成路径，G-2 注释已记录该双路径陷阱）；② CC-04（P1）friction-tally.js 内部推导 specBase（platformOpts.specRoot || specDriftAnchor || cwd/.sillyspec，与 complete.js:125 同序），gates.js 尾参只带 type/detail；③ CC-05（P1）file-lifecycle.md 真实路径为仓根 docs/sillyspec/（.sillyspec/docs/ 下只有 modules/+scan/）；④ CC-02 调用点核正 16→13；⑤ CC-10 verify_run_failed 计入 advisory lint 失败（记录条件与 throw 条件解耦）；⑥ CC-11 标签图补 verify-lint@697；⑦ CC-12 归档时 pruneArchivedChangeRuntime 清 friction-tally，放弃变更残留接受（R-06）。

## D-core-engine-005@v1 跨变更语义护栏的强制级别：advisory 注入系，不做硬阻断
状态：implemented
变更：2026-09-11-cross-change-decision-guard
原编号：D-001@v1
锚点：未记录
文件：src/semantic-guard.js, src/run/prompt.js, src/run/quick-audit.js
最近确认：358af35
理由：**方案 A——三层 advisory**：①决策条目增机械可解析「文件：」字段（存量条目用锚点路径提取兼容，零迁移）②quick 进场按候选文件（--files+脏文件）反查知识库 implemented/rejected 决策 + git log 近 7 天他者变更交付归因，命中注入 advisory、零命中静默 ③quick --done 对「他者交付的测试文件断言行被改」输出 WARNING 级点名（具体断言+交付变更+决策指针），建议理由写进 quicklog --solution。全部非阻断，单开关 semantic_guard.enabled 默认开。

## D-core-engine-009@v1 quick 出口分级门禁（L0/L1/L2 机械画像），不新增第三条车道
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-002@v1
锚点：未记录
最近确认：e84bc89
理由：不新增 mid 车道（自选车道会被激励扭曲绕过：95% 超限 quick 本就是 agent 自选、独立完成绕过 full 仪式；新车道=新状态机+新 prompt 面，违背纯减法原则）。改为 quick --done 出口按 CLI 侧机械信号自动升级：L0=现状 test/lint 实测门；L1（跨≥2 模块 或 ≥4 文件）=+每文件注记非空+测试增量检查；L2（跨≥4 模块 或 风险特征命中）=+模块文档认领或显式 --no-docs 豁免留痕+运行时证据要求。判定输入用 CLI 自算 changedFiles×module-map，不用 --files 自声明（37.1% 超限条目存在未声明脏文件）。

## D-runtime-012@v1 未声明脏文件触发归属确认，不挂文档对账
状态：implemented
变更：2026-09-14-quick-exit-tiered-gates
原编号：D-005@v1
锚点：未记录
最近确认：e84bc89
理由：未声明脏文件是归属问题（可能是并行会话改动或漏申报，审计行自述两种可能），不是文档同步问题——挂文档对账会罚错人。触发归属确认（要求声明/剔除归属），与 L2 文档认领门分离。

## D-runtime-003@v1 归档收口——worktree 有未 apply 交付物时归档硬拦
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-002@v1
锚点：未记录
最近确认：ee966ed
理由：§65 护栏②：archive step3（确认归档）前检查 worktree 未 apply 交付面（复用 applyWorktree checkOnly）——非空即阻断归档并给两条出路：先跑 worktree apply 或 --skip-apply 显式跳过留痕（明确知道自己要手动处理）。归档与 apply 不自动串联（自动 apply 在有脏重叠时行为复杂，人确认更稳）。

## D-runtime-004@v1 归因源切换——worktree 模式 changedFiles 取 worktree 分支 diff
状态：implemented
变更：2026-09-14-change-ownership-guards
原编号：D-004@v1
锚点：未记录
最近确认：ee966ed
理由：§65 护栏④：worktree 隔离模式的变更，其 review 草稿/changedFiles 归因一律取 worktree 分支 diff（git diff base..HEAD + worktree porcelain，现 verify 对账已用同口径）为唯一事实源；主仓脏窗口仅用于 in-place-fallback 模式。存量草稿归属逻辑（autoDraftAttribution）按模式分流。

## D-core-engine-015@v1 勾选守卫 diff 集对齐 D-004@v1（库内）worktree 分支 diff+porcelain 口径，抽公共 helper
状态：implemented
变更：2026-09-15-worktree-dual-truth-gates
原编号：D-004@v1
锚点：src/run/complete.js:prefetchDiffFileSet
最近确认：42cef77
理由：不降级。根因是 `prefetchDiffFileSet` 的 diffFileSet 只算 `git diff base..head`（worktree 已提交），而草稿归属（generateTaskReviewDrafts）并入了 porcelain 未提交 + merge-base committed 补齐——子代理默认不 commit 时 diffFileSet 恒空/缺文件，勾选守卫全部跳过。修法：把「worktree 改动文件集（porcelain ∪ committed merge-base 补齐）」抽成公共 helper，complete.js 勾选守卫与 task-review.js 草稿归因共用（两处既有「口径须同步改」注记正好收口）。同文件多 task 归属：`attributeSuspectTasks` 首中即止改全量多归属（map 值 string[]），③类报告渲染完整作者列表。
故障面：helper 对 meta 缺失/in-place 返回 [] → 守卫退回 base..head 现状（fail-open 不放大勾选面）；多归属渲染膨胀 → 截断展示
退役判据：review/勾选改为 per-task 锡点锚定（base/head 写进 task 卡）全量落地时

## D-core-engine-017@v1 完成门「声明追赶重定价」——无摩擦可降、摩擦地板不退（「只升不降」契约修订）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-003@v1
锚点：未记录
最近确认：7438d34
理由：escalateCeremonyTierAtGate 在档位文件在场时先用当前 design/plan 重跑 computeInitialCeremonyTierDoc，再跑摩擦升档。**transitions 为空且 ledger 摩擦未超阈：开跑价整档换成重算结果，可升可降**，reasons 留「声明追赶重定价」；**已有摩擦迁移：地板不退**，重算只更新 blast/span 分量，最终档=max(重算档, 摩擦地板)。懒 agent 靠删关键词把真 S3 写成 S0 仍由收口双跑按实际 diff 硬拦（verify-postcheck 事实面 detectChangeRisk 无声明通道）。
故障面：重定价抖动（design 反复改声明 → 档位反复横跳）——每次迁移留 transitions 审计痕，评审可见；摩擦地板保证已付仪式价不白付。
退役判据：若声明通道前移到定价时刻强制存在（如 brainstorm 门要求 frontmatter 先行），追赶重定价需求自然消失。

## D-runtime-013@v1 readDesignOwnFiles 认「## 文件变更清单」标题（解析器/模板漂移修复）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-004@v1
锚点：未记录
最近确认：7438d34
理由：同时认 `## 6.` 数字标题与 `## 文件变更清单`（含带括注形态「## 文件变更清单（…）」）；阈值 SPAN_FILES_THRESHOLD=8 不动；旧数字标题行为不变。
故障面：标题形态再演进（如双语/别名）会再漂——接受双形态白名单，不做模糊匹配（宁窄勿宽，误解析面小于漏解析面）。
退役判据：design 迁结构化产物（yaml/json 清单）后文本标题解析整体退役。

## D-core-engine-016@v2 重定范围——四件事编队（supersedes D-001@v1 五刀编队）
状态：implemented
变更：2026-09-19-ceremony-pricing-five-cuts
原编号：D-001@v2
锚点：未记录
最近确认：7438d34
理由：范围收成四件事（用户裁定原文「范围收成四件事：路径声明的 blast、追赶重定价、span 标题、高报记账」）：①blast 轴项目化（D-008）②追赶重定价（D-003 保留）③span 标题（D-004 保留）④高报记账（D-005 保留）。刀 1/5 作废（D-002/D-006 superseded）；变更名保留不改（内容重定，目录 churn 无收益）。
故障面：范围仍跨三模块+scan 文档——rebuild 保留手工字段（D-008）与九消费点切换是两大执行风险，分别以回归测试与逐点处置表对冲。
退役判据：若路径声明面实证维护成本过高（声明漂移没人管），重审是否引入 scan 自动推导建议（仍需人工确认落 map）。

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

## D-runtime-014@v1 burst 缺省 OFF，本仓 local.yaml 自举开启
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-001@v1
锚点：未记录
最近确认：9f9450d0
理由：不翻。缺省 OFF（未配置即单步模式，既有行为零变化）；本仓 `.sillyspec/local.yaml` 手动加 `stage: burst: true` 自举 dogfood；env `SILLYSPEC_STAGE_BURST=1` 强制开 / `=0` 强制关（逃生阀）。全量默认翻转（测试面迁移）验收后另立变更。
故障面：用户误配 `burst: false` 之外的非法值按 false 处理（宽容缺省，不报错）。
退役判据：全量翻转变更落地后本配置读取保留（env 阀仍有效），local.yaml 自举行可删。

## D-runtime-015@v1 --step 意图断言仅 burst 首轮生效
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-005@v1
锚点：未记录
最近确认：9f9450d0
理由：断言只在第一轮透传（防读旧进度的并发错位，首轮 mismatch 照常 exit）；第二轮起从 options 剥离 stepAssert。burst 本身就是「一次收口全部剩余步」的显式声明，后续轮次无需重复断言。
故障面：无新增（首轮语义与单步完全一致）。
退役判据：无。

## D-runtime-016@v1 burst 作用域 = brainstorm/plan/execute 三主阶段
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-006@v1
锚点：未记录
最近确认：9f9450d0
理由：否。渲染与完成两侧的 burst 分支均以 `stageName ∈ {brainstorm, plan, execute}` 为门。排除理由：① verify/archive 任务书明确不动（--init --draft 与就绪度已压到 1-2 次调用）；② quick 末步四字段硬契约（validateQuickResult）与 P0-2 事实合成不兼容（src/run/complete.js:222-224 已把 quick 列为合成豁免），burst 每轮传 null 会在 quick 末步炸校验；③ scan/doctor/explore 辅助阶段不在本轮验收面。
故障面：无（白名单门控，未列阶段走原路径）。
退役判据：后续若要把 burst 推广到 verify/archive，改白名单即可（quick 永远除外）。

## D-runtime-017@v1 readStageBurst 走 readLocalYamlRaw + js-yaml 读 stage.burst
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-007@v1
锚点：未记录
最近确认：9f9450d0
理由：放 src/run/shared.js export `readStageBurst(cwd)`：复用既有 `readLocalYamlRaw(cwd)`（src/run/shared.js:2060）+ js-yaml 动态 import 读 `doc?.stage?.burst === true`——与 resolveLivingDocs 读 `docs-check.living-docs` 同款范式（src/run/shared.js:1459），绕开 parseSimpleYaml 缩进坑（known-issues 实证）。env 覆写：`SILLYSPEC_STAGE_BURST=0` → false / `=1` → true，优先于配置；坏 YAML/读失败 → false。锚定 cwd 而非 specBase：burst 是仓库本地开发偏好（与 resolveLivingDocs 同锚定），不随平台/worktree specRoot 漂移。
故障面：js-yaml 动态 import 失败 → false（fail-safe 回缺省）。
退役判据：无。

## D-runtime-018@v1 burst 渲染侧 noAI 自动完成抽取 stage.js 分发为共用助手
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-008@v1
锚点：未记录
最近确认：9f9450d0
理由：不可接受，改为抽取。把 src/run/stage.js:592-629 的 _cliAction if-链抽为 stage.js 内局部助手 `executeNoAiCliAction({ cliAction, stageName, stepName, cwd, specBase, changeName, platformOpts, progress, pm, scanProfile })`，常规单步路径（stage.js noAI 分支）与 burst 渲染循环共同调用——单一事实源防三分叉。complete.js:437-472 的平行副本**不动**（"不改 completeStep 本体"承诺；该副本本就以"与 stage.js 对齐"注释维持平行维护，本轮不扩面）。
故障面：新增 _cliAction 只登记 stage.js 助手会在 complete.js 副本报"未知 _cliAction"——既有平行维护约束，非本轮新增。
退役判据：无。

## D-runtime-019@v1 agent 整体 --output 横幅打印，不落步记录
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-009@v1
锚点：未记录
最近确认：9f9450d0
理由：completeStepBurst 开打一行横幅（`📦 burst 收口摘要：<outputText>` 或省略时跳过），循环每轮 outputText 传 null 由 P0-2 事实合成（src/run/complete.js:224-227）逐步生成。不把整体摘要挂到末步 output——语义错归属（末步会记录与自身无关的整体叙述，污染步骤审计面）。
故障面：无持久化的整体语义摘要——语义说明进 decisions.md/proposal.md（本就有），步骤 output 面保持纯事实。
退役判据：无。

## D-cli-entry-009@v1 方案选择 = A（burst 交互折叠）
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-011@v1
锚点：未记录
最近确认：9f9450d0
理由：用户选 A（任务书冻结版）：渲染侧剩余步逐个调既有 outputStep + completeStepBurst 循环调 completeStep(printNext:false)，completeStep 本体零 diff；缺省 OFF 本仓自举。用户同时授权全程免询问（后续 requiresWait 决策点按任务书冻结口径自决并如实记录）。
故障面：无（方案选择记录）。
退役判据：无。

## D-runtime-020@v2 burst 渲染输出一致判据改「首访渲染形」
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-002@v2
锚点：未记录
最近确认：9f9450d0
理由：不可达（Grill P2 附注）：requiresWait 步被 --answer 恢复后，单步模式重渲染时 collectStageWaitHistory 已带 waitAnswer 记录而 burst 首渲染时为空——文本面结构性不同。判据改为「首访渲染形一致」：前置 waitAnswer 状态相同的前提下，burst 逐个 outputStep 的输出与单步模式调用该步时一致。核心架构面（复用 outputStep、渲染器零改动）v1 不变。
supersedes：D-002@v1
故障面：无（判据口径修正）。
退役判据：无。

## D-runtime-021@v2 completeStepBurst 补尾随 stale 拉回 + auto 路径跳过预合成
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-003@v2
锚点：src/run/complete.js:165
最近确认：9f9450d0
理由：Grill P1-1：runStage 只拉回 currentIdx（首个非 completed/skipped）的 stale/blocked（src/run/stage.js:264-269），completeStep 谓词不含 stale（src/run/complete.js:165）——尾随 stale 步会被 burst 渲染打印说明书但 done 循环永不完成，退化为单步阶梯，破等价性目标。修正：completeStepBurst 每轮调 completeStep 前对首个非 completed/skipped 步做同语义 stale→pending 拉回（burst 新代码内，不触 completeStep 本体）。附带：auto 路径 burst 分支跳过 command.js:2064-2070 的 --output 预合成（防横幅重复）。v1 核心面（循环+printNext:false+completeStep 零 diff+50 轮上限+幂等断点）不变。
supersedes：D-003@v1
故障面：拉回写库失败 → 该轮 completeStep 落到其后的 pending 步（不卡死，重跑续）；与单步模式同故障语义。
退役判据：无。

## D-runtime-022@v2 --answer 消费检测改轮前后 waitAnswer 快照比对
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-004@v2
锚点：未记录
最近确认：9f9450d0
理由：会（Grill P2 附注）：--done --answer 落在已 waiting 步时 resolveWaitingStepWithAnswer 重定向 currentIdx（src/run/complete.js:190-193），实际完成的步 ≠ 轮前首个 pending 索引，固定索引检测漏判 → answer 未剥离 → 错配风险回归。修正：轮前快照全部步 waitAnswer、轮后比对，任一步 waitAnswer 新变为 === doneAnswer 即视为已消费并剥离。v1 核心面（单次消费语义、防双 requiresWait 错配）不变。
supersedes：D-004@v1
故障面：同 v1（文本巧合提前剥离，fail-safe 方向）。
退役判据：无。

## D-runtime-023@v1 STAGE_BURST_STAGES 白名单常量单一事实源落 shared.js（执行期裁决）
状态：implemented
变更：2026-09-22-stage-burst-fold
原编号：D-012@v1
锚点：src/run/shared.js
最近确认：9f9450d0
理由：放 src/run/shared.js export（readStageBurst 旁）：渲染门（stage.js renderStageBurst）与完成门（command.js 两处 --done 分发）共用同一常量，防两处字面量漂移。执行期越界披露：该裁决使 task-03 提交含 stage.js import 行切换与 shared.js 常量 export（两文件原属 task-01/02 的 allowed_paths）——非破坏性、可逆、不推翻任何 D，属主代理直写模式歧义裁决条款范围。
故障面：无（常量单一源）。
退役判据：无。

## D-unmapped-151@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-verify-gate-restrictfiles
原编号：D-001@v1
锚点：未记录
最近确认：bf1d0f2db9ee166f83ef1cce9f4c8cdc07c1a715
理由：最大风险=restrictFiles 收窄后模块选择漏测（文件面解析错变更文件→选错模块子集）——与 quick 门同函数同风险面，quick 侧长期实证可接受；空清单防御分支保住「宁全量不假 skip」的 fail-closed 底线。死路：空清单也传（restrict []）——正是本变更要修的假 skip 形态的反面制造，弃。

## D-unmapped-163@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-full-autopilot-parity
原编号：D-001@v1
锚点：未记录
最近确认：0bd1fe6fbfb3d9954c2a476ffe27e13ab951d733
理由：最大风险=auto-tick 的近 20 提交窗口可能捕到其他变更的 task token（多 agent 共享仓）——窗口缩小到 run 范围更精确但 runId 解析复杂度高；20 窗口是 pragmatic 平衡，误勾由 checkExecuteCodeEvidence 兜底。auto-bind 的 test-result 路径在平台模式（runtime 分离根）可能读不到——fail-soft 跳过不阻断，与 thin 同风险面。死路：GWT 预填直接迁移（用 input 文本推导 full 的 FR）——full 的 requirements 来自对话演化，input 只是起点；直接迁移会产出生成式填空题质量低于 thin（无对话上下文），弃。

## D-unmapped-165@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-gate-face-binding-parity
原编号：D-001@v1
锚点：未记录
最近确认：978beb6e8799b986d5a63c7ce2b8a10fa12c17aa
理由：最大风险：faceOverride 旁路了快照 diff 的二次校验——若调用方面过声明（含未真改文件），动态子集可能多跑（宁多勿漏，方向安全）；权威面上游已过 foreign 归因收窄（splitOwnVsForeignDiffFiles），过声明面受双保险。次风险：brainstorm --done 追加槽改变 full 流程 requirements 形态，下游消费者（索引/对账）按 AGENT 槽注释扫描——槽是注释面不进指纹，verifyFlowDrafts 不校验 full 侧。放弃方案：快照锚 baseline commit（改 createGateSnapshot 全局面，波及 verify 门与 quick 通道）——影响面大且 thin 权威面已现成，不值。

## D-unmapped-180@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：roadmap-copy-purge
原编号：D-001@v1
锚点：未记录
最近确认：6d467b738d6c732f7076e3f65283a57ba78053a8
理由：最大风险：误判「无消费」——已全源码 grep 复核（ROADMAP 在 src/ 共 8 处：worktree.js×2 注释、complete-handlers×2 lite 豁免措辞、next.js×2 绿地探测、archive.js×1 条件指令、status.js×1 cat），无任何写侧、无条件不成立的读侧；.claude/skills 两处文案提及（archive 描述「+ 更新 ROADMAP」、explore cat 行）属提示面非行为面，文件缺席后自失活，留待后续产品级变更一并出清（不在本次批准面）。放弃的方案：保留但机器化维护—— lite/thin 归档豁免使其永远缺主力通道数据，且三套真源已覆盖，不值得维护。

## D-unmapped-182@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-flow-date-gate
原编号：D-001@v1
锚点：未记录
最近确认：31d2f81eb57cd7385ccff82207f9717fcf42c806
理由：最大风险：既有 ~46 处 flow start 测试调用点用非日期名（fc-1 / flow-h2-t1 / sw-fake 等），过门后假红——逐文件把名字适配为日期前缀形态（固定 2026-09-01- 前缀，日期不验当天）。次风险：报错文案被测试断言（validateChangeName 非法名用例仍先触发、文案不变）。试过放弃：自动补前缀（名字漂移见槽1）；门放 cmdFlowStart 内部（会拦 mcp/平台工具直调与库调用，违背「门只在 CLI 边界」既定决策）。

## D-unmapped-183@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-split-guard-and-gate-report
原编号：D-001@v1
锚点：未记录
最近确认：0380b797dc3fadebcfaeb3e51366083aa5989fd4
理由：最大风险：谓词词表漏词导致该拆的不拆（标准粒度变粗）——保守方向（不拆优于误拆，误拆需人工重写 FR，不拆只是粒度粗），词表可增量扩。放弃方案：取消斜杠拆分（推翻 2026-09-25 刻意决策且有测试锁定——评审否决）；全仓 env 白名单清洗（Windows 砍系统变量风险，归 P1 变更处理）。

## D-unmapped-196@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-knowledge-gate-denoise
原编号：D-001@v1
锚点：未记录
最近确认：1217e82b1b9a53594b9b0e41fdfc08a990eff6cf
理由：风险：① 零分过滤可能压掉「标题与查询零重叠但语义相关」的真 rejected——防复潮面本就靠词面路由，标题零重叠即零证据，可接受（宁少勿噪，与狼来了面取舍一致）；② 已回应静默的共现判据有误静默面（正文恰含同 id＋域名但非回应语境）——误静默有界：仅损失门 warn 信号（flow 注入段与 {DECISION_HITS} 两面不套用静默，冗余在场；正文 token 变动后自然恢复）；③ score 透出让消费方各取所需，若未来消费方误当阈值语义用需文档化。退役判据=噪音投诉消失后若出现「真命中被漏弹」实证，回退为仅死路优先。

## D-unmapped-213@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-30-quality-scan-passed-idempotent
原编号：D-001@v1
锚点：未记录
最近确认：27fde6b4cec5a73c2b80cf1b9c8970f2129c88ea
理由：最大风险：幂等闸吞真实重测需求。三层防线：①passedKey 内容敏感（dedupKey 的文件集口径对同文件未提交修改是盲的——开发中被既有 noAI 动作测试当场抓住：fixture 同文件翻转失败版，dedupKey 全等闸误命中；内容键正是为此存在，测试第五轮钉死）②lint failed 记录不入闸（保 lint 阻断发声）③RERUN=1/force 逃生阀与失败闸同阀。已放弃方案：a) 闸键直接用 dedupKey——同文件未提交内容修改盲区会吞真实代码修改（实证如上），弃；b) 闸键用 rerunSignature——其内容敏感面只覆盖 test/ 目录（computeTestFaceDigest(join(cwd,'test'))），仓根/子目录源文件同文件修改仍盲，弃；c) execute 侧复用 loadReusableQualityScan（--done 读侧）——它只校验 fingerprint（文件集口径），同盲区，弃。已知残留：git() 缺省 trim 吃 porcelain 首行前导空格是既有全局行为（影响所有经 porcelainCodeLines 的路径解析首行），本变更只在自己调用点传 trim:false 修正，未动 git-helper 公共行为（影响面大，若修应独立变更）。

## D-unmapped-214@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-30-snapshot-symlink-store-subdir
原编号：D-001@v1
锚点：未记录
最近确认：2d8dcccd2156a866506da055f7bd9dbd0e847a77
理由：最大风险：误报面扩大——子目录有 bun.lock 但根是标准 npm 且快照本可用 → 被跳快照回主仓（牺牲隔离性换布局安全）。裁决为可接受：与既有「宁可主仓口径」同向（本仓 sillyspec 自身即 pnpm 根判据跳快照运行，主仓口径+污染归属鉴定兜底是已验证形态）；且 apps 型子目录 lockfile 意味着该 app 的 node_modules 符号链接网在 junction 快照内跨根失效，跳过是正确方向。已放弃方案：a) 递归扫两层——packages/* workspace 型 lockfile 在根、一层已覆盖 apps 型，递归徒增误报面与 I/O，弃；b) 探测 node_modules/.pnpm 目录存在性代替 lockfile——node_modules 是 gitignored 可变面（装/卸依赖瞬时态），lockfile 是 tracked 稳定判据，弃。残留边界：子目录仅 yarn（无 pnpm/bun/lerna 判据）不命中——yarn classic 无 symlink store 坑（PnP 另算），维持现状。

## D-unmapped-232@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-guidance-consistency
原编号：D-001@v1
锚点：未记录
最近确认：7d5e3de151ca53ff4b4ed2d6a185e510347bf8df
理由：最大风险：AGENTS.md 格式要点若与 flow start 格式门未来演进不同步会变成第二份漂移文档——以「要点级」而非「全文复制」表述（只写行形态不复制报错全文），漂移面最小化。放弃的方案：把格式说明同时写进 flow start 的 --help 输出（入口更近）——该输出文案在 flow.js（并行会话在途），本轮不可触碰；AGENTS.md 已是可动的最近入口，help 面留给在途落盘后。

## D-unmapped-249@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-06-agent-log-detect-hint
原编号：D-001@v1
锚点：未记录
最近确认：a39154be47e8c14fb3b00b2935218208c46400fb
理由：最大风险：展示名映射 HARNESS_DISPLAY_NAMES 成为新的次要漂移点（新 harness 忘加映射→展示退化为 name 原样）。已用缺省回退消解——退化形态仍含全部家数，只是不美化，且测试遍历断言按「映射名或 name 原样」命中，两种形态都受覆盖。 试过放弃：① 仅更新硬编码文案为 8 家——不解决根因，注册表再扩仍漂移，放弃；② 提示全部用 name 原样拼接（claude-code / deepseek-dsh）——零映射零漂移但可读性差（品牌大小写混乱），放弃，取映射+回退折中。

## D-unmapped-293@v1 方案架构——单变更四 Wave（brainstorm step4 裁决存档）
状态：implemented
变更：2026-10-09-verify-reuse-friction
原编号：D-001@v1
锚点：未记录
最近确认：84407be4
理由：单变更 2026-10-09-verify-reuse-friction 分四 Wave（W1 快照口径死循环+可见性 / W2 指纹树键化+观测 / W3 便宜门前移 / W4 跨仓 per-repo）。evidence：multi-agent-platform 2026-10-09 tombstone 取证（.runtime 质量扫描记录 usedSnapshot=false + 13 份 test-result + sqlite 会话命令时间线交叉归因，四机制实证独立可并行修）。放弃方案：A 五变更拆分（流程开销×5，gates.js/verify-quality-scan.js 共触文件串行依赖强）；C 只修两大头（与用户拍板的全清单不符）。

## D-unmapped-294@v1 复用指纹的代码面分量=代码树内容键（git ls-tree 过滤哈希），非 HEAD、非最近触码提交
状态：implemented
变更：2026-10-09-verify-reuse-friction
原编号：D-002@v1
锚点：未记录
最近确认：84407be4
理由：HEAD 换 `git ls-tree -r HEAD` 按既有非代码路径口径过滤后的内容哈希；整树 oid 相同走快路径沿用上次键。纯文档提交不击穿、代码提交必击穿；git 原生对象哈希天然内容寻址，无语言/框架枚举（红线合规）。evidence：本案 13:35-14:10 五笔提交（多为纯文档）每笔击穿两类缓存实证；13:31-13:33 纯文档未提交态秒过对照。放弃方案：最近触码提交（git log 对 revert/merge/cherry-pick 语义不可靠）；mtime（非 git 事实、跨平台不可靠）；整树 oid 直接作键（文档提交也变树 oid，治不了本病——只能当快路径缓存用）。

## D-unmapped-295@v1 快照口径复用闸比对「实际口径」——先建快照后判复用
状态：implemented
变更：2026-10-09-verify-reuse-friction
原编号：D-003@v1
锚点：未记录
最近确认：84407be4
理由：executeVerifyQualityScan 把 shouldReuseLastPassedScan 移到快照创建之后，plannedSnapshot 参数改 actualScope=Boolean(snap)。连续失败（false==false）收敛命中；口径真实切换仍失配。evidence：本案记录 usedSnapshot=false × planned=true 恒失配 → 4 轮 × 3.5min 纯浪费实证。放弃方案：快照可行性探测预判（探测与真建两套口径会再分叉）；删掉口径守卫（主仓/快照口径混用会吞真实代码差异——防作弊语义不能丢）。

## D-unmapped-296@v1 门序前移的安全边界——只移纯事实门，实测依赖门不动
状态：implemented
变更：2026-10-09-verify-reuse-friction
原编号：D-004@v1
锚点：未记录
最近确认：84407be4
理由：仅 required-evidence 与 target_files 对账两门（纯 git/文档事实）前移到实测门前并入 R16 聚合；PASS 封顶/parity/超时降档等消费实测结果的门不动。evidence：本案 13:33 与 14:00-14:10 每轮先付 3.5 分钟实测再被对账门拦实证；两门调用链已核对无实测数据依赖。风险护栏：执行期调用链复核，发现隐藏依赖即回退该门原位记录在案。

## D-unmapped-399@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-lint-triage-path-unify
原编号：D-001@v1
锚点：未记录
最近确认：0a916a84b0c0132c85eced89d8c487010ff1a006
理由：最大风险：降档被滥用掩盖真失败——unattributable（输出无可识别路径）与鉴定链异常都保守返回 false 硬拦，且降档仅在「lint 单独失败」时生效（testFailed 优先 throw），配合降档 warning 三行提示（含存量债文件清单与清偿建议），滥用面可控。试过放弃：①只在 quality-scan 复制一份 triage 代码——制造第二实现即复发原缺陷（两路径分叉），放弃；②把降档判定塞进 verify-postcheck.js——该文件正被并行会话在途迭代（active WIP），编辑即 interleaved 提交风险，放独立新模块避开。

## D-unmapped-401@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-15-decision-anchor-backfill
原编号：D-001@v1
锚点：未记录
最近确认：2d8d863e368470f4c81b5502763a84de31741701
理由：最大风险：自动回填错锚（文本唯一路径非落点，如对比方案文件）——保守三闸：恰一唯一判定 + 黑名单（自引用/工件/互引）+ 存量人工全清单裁决（坏锚 15 行还原实测）；蒸馏端多候选直接弃回填。次风险：回填锚点使 docs-check 规则开始校验这些条目（原「未记录」静默跳过）→ advisory 量增加——这是功能按设计工作（回填路径存在性有保障：来自真实文本/交付面）。放弃方案：①域过滤口径（探针 1-3% 弃用）；②裸文件名基名解析回填（歧义面大，口径 C 不启用）；③存量全量回填含低置信（本变更只回填恰一路径高置信，其余留未记录诚实态）。

## D-unmapped-414@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-16-fix-downstream-tool-defects
原编号：D-001@v1
锚点：未记录
最近确认：a83f1df472d8dce375b3a5796cef77d9f92183f5
理由：- **最大风险（FR-01）**：抑制面误伤——不可能误伤基线外文件（抑制集=基线键∩盘面缺失，交集定义）；真实风险是「用户删除文件后本想借 pull 恢复」，由 `--restore-deleted` 显式通道兜底，默认安全方向与「删除尚未上行成功」的事实一致。 - **FR-03 风险**：手写报告表头措辞变体不被「表头武装」识别 → 该表数据行从「按锚归属计数」变为「孤行报错」。两者都是阻断性报错，从误归属+误计 unfilled 变为准确孤行提示，误报面收敛；渲染器（renderProbe7Lines）是报告唯一生产者，表头字面稳定，回归用例钉「正常渲染零行为变化」。 - **FR-04 弃案**：改返回形态 null→`{error}` 哨兵对象——17+ 处调用与 gate-snapshot-layout-guard / verify-gate-snapshot 两测试文件的 null 断言全要动，收益（类型显式）不抵破坏面；failRef 出参零破坏。**B 档弃案**：让 pnpm 布局真能建快照（pnpm deploy/快照内离线 install/拷贝 node_modules）——新机制非修 bug，且团队已三次实证 junction 跨根失效在先，留待独立立项。 - **FR-02 弃案**：spec 树同步挪到 progress push 之前/并行——改变「progress 成功后顺带推文档与 spec 树」的既有顺序契约（2026-08-16-auto-sync-from-repo / 2026-08-17-spec-file-incremental-sync 锚定），且并行发请求加重熔断窗口竞争；抑制分支补跑是纯增量、无网络请求时零成本。 - **残差（显式不修）**：熔断窗口内 in-flight abort 仍会中断当轮 spec 树同步——无状态重算 + 下轮重试是既有设计（HUB-09 预算语义），本变更只根治「冲突文件长期封锁」这一确定性死锁面；daemon 侧同款复活路径跨仓另修。

## D-unmapped-419@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-17-strict-sync-signal-shape
原编号：D-001@v1
锚点：未记录
最近确认：560af6a23a038e6ee6118a7bcce7b6b3d2481e22
理由：最大风险：无——单行形状修复 + 回归钉；已放弃方案：改 raceWithAbort 传裸 AbortSignal（将破坏既有 triggerSync 内联用法 `sync(name, cwd, sig)` 的 opts 形状契约，面大不用）。

## D-unmapped-431@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-20-gate-snapshot-carried-deps
原编号：D-001@v1
锚点：未记录
最近确认：4badee475860d096a9770d50d1f936f922715640
理由：最大风险：他者声明文件自身是坏半态时（他者 quick 正改到一半），携带进快照可能弄红本变更的门（隔离原教旨的反向代价）。缓解：①携带必伴随控制台清单（假红可归因到具体他者文件）；②携带面同受 import 冒烟保护（.py 坏半态回退 HEAD）；③对比现状——本变更依赖他者文件时现状是**必**假红（坑文场景），不依赖时携带才**可能**假红（他者恰好坏半态且影响本变更测试路径）——期望值严格改善；④SNAPSHOT_OFF 逃生通道不变。放弃的方案：①主仓全部脏文件并入快照——未声明脏文件无归属，假红不可归因，违背隔离立命之本（test:77 防弄红断言）；②declared 集静态依赖闭包拷贝——跨语言 import 图静态分析不可靠（JS/TS 动态 import、Python 延迟导入），漏判仍假红、误判扩大携带面；③快照内真失败自动回退主仓——放宽污染归属鉴定（主仓失败可能是并行污染），且与「快照失败先 SNAPSHOT_OFF 对照」的既有排障纪律冲突。
