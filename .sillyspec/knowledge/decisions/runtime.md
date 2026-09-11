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
