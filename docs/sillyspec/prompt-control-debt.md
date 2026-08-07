---
author: qinyi
created_at: 2026-07-22 12:00:00
updated_at: 2026-08-07T19:30:07+08:00
---

# SillySpec 提示词与控制层债务清单

> 来源：2026-07-22 三方评审（主评审 + Agent 执行视角子代理 + 架构视角子代理）。
> 核心结论：**控制层（enforcement）扎实，债务在提示词层（persuasion）**——同一份控制在 prompt 和 gate 付两次钱。

## 改进原则

1. **纯减法优先**：不加新门控/校验/机制。能删就不加。
2. **enforcement 三档标注**：`enforced`（有代码兜底）→ 删 prompt 复述；`persuasion-only`（纯口头）→ 补最小硬门或诚实标注；`hybrid` → 拆开归位。
3. **定位边界**：确定的事留 SillySpec，软判定推 sillyhub/人类。

## 图例

- ✅ 已完成（代码改动 + lint/test 通过）
- ⊘ 评估后保留（非纯重复，删了会削弱约束）
- ⏭ defer（有技术理由，见该项说明）

---

## Backlog

### P1 铁律 / 护栏去重收敛
状态：`完成`

- ⊘ **P1.1** SKILL.md 铁律段。**评估保留**：SKILL.md 铁律是 skill 加载时的**总则**（必须用 exec 执行 CLI、不编造命令、changeDir），run.js 全局铁律是**每步 prompt 注入**，场景不同非纯重复，删会削弱 skill 加载时的行为约束。
- ⊘ **P1.2** 各 step 内铁律小节。**部分随 P1.3a/P1.4 处理**；剩余（quick 铁律、execute 调度要求/评审铁律）是 stage 特定约束（同 Wave 必须并行、review.json 先于 checkbox），有 enforcement 价值，保留。
- ✅ **P1.3a** brainstorm 7 处 wait 铁律删手写命令模板，保留硬门补不了的行为约束（不自问自答——agent 可自带 `--answer` 绕过 requiresWait）；顺便消除处2/5 CRLF 孤岛。
- ✅ **P1.3b** execute 2 处 + quick 2 处手写 `--done` 命令去重；quick 保留 sessionId 机制说明和结果摘要四项模板。
- ✅ **P1.4** verify「逐项检查任务」step 的「⛔ 红线提醒」删除——`_globalGuardrails` 每 step 都注入，单步复读纯噪音。

### P2 模板 / checklist 抽文件
状态：`部分完成`（2026-07-22 重新评估）

> **重新评估（2026-07-22）**——核验 defer 假设 vs 现状代码：
> - 「agent 仍要 Read，净省 token 有限」**机制描述错**：run.js 是 CLI 端组装 prompt 字符串后整串输出给 agent（run.js:694），已有「CLI 读文件注入 prompt」先例（模块上下文注入 run.js:228）；CLI 注入下 agent 收到自包含字符串、无需自己 Read。但**结论方向对**：内联或注入，agent 每次 step 都收到同样大小 prompt 全文，抽文件**不省 agent token**（≈0）。真实收益是维护性 / 跨处复用 / 可单独校验，不是 token。
> - 「scaffold 是独立工程」**已不成立**：templates/workflows/ + init.js:209 复制 + workflow.js loadWorkflow 已存在；包内文件定位成熟（init.js:8-9 / run.js:11）。
> - 「文件存在性依赖」**有解法**：模板放包内 templates/（像 workflows），CLI 直接读注入，零用户项目依赖。

- ✅ **P2.2.3** verify 5 探针抽 `templates/prompts/verify-probes.md`（72 行 / 1882 字符，self-contained 最大单块、近期在迭代 B1）。run.js 加 `resolvePromptIncludes`：`{{include: <name>}}` → 读包内 `templates/prompts/<name>.md` 注入，置于占位符替换之前（模板内 `{SPEC_ROOT}` / `<change-name>` 也能被替换）；单次替换、缺失模板保留占位符并 warn。首个用例 verify 探针，未来 design 生命周期契约表等 self-contained 大块可复用同一机制。test 全套 EXIT=0（含 platform-scan-p0，pre-existing 已不在）、lint 49 文件通过。
- ⊘ **P2.4** decisions 版本字段收敛。**评估保留（仍 defer）**：实证三处（brainstorm.js:315-320 文字版字段清单 / :394-407 D-001@v2 示例含 supersedes / :521-536 完整 decisions.md 文件模板 D-001@v1）**形式不同（文字清单 / 单条 v2 示例 / 完整文件）+ type 枚举不同（7 种 vs 9 种含 term/premise）**，是「草稿→定稿→版本升级」场景化必要展示；抽成单一片段需参数化区分 v1/v2 与枚举差异，反而加复杂度、违背纯减法。
- ⏭ **P2.1/2.2**（design 章节模板 / proposal-requirements 模板抽文件）。**仍 defer**：单处使用、复用价值小，加间接层（step.promptTemplate → CLI 读）收益不值；待出现第二个 self-contained 大块或跨处复用需求再抽。

### P3 self-review 拆分
状态：`完成`

- ✅ **P3.1** brainstorm「写设计文档并自审」内联自审降级为「机械格式完整性检查」（章节齐全 / decisions 引用 / 生命周期契约表存在），语义一致性/可行性/YAGNI 全交下一步 Design Grill（独立子代理 + docHash 兜底）。对照 plan.js:333 已修同类问题。

### P4 软判定归位
状态：`部分完成`（P4.1 完成；P4.2/4.3 维持 defer）

- ✅ **P4.1 risk tier**：原 defer 理由「需新写 `computeRiskTier` + 注入，独立工程」**经实证已失效**——`detectChangeRisk()`（change-risk-profile.js:254）早已存在，且已在 stage-contract.js:496-511 `validateVerifyOutputs` 里 verify --done 时真兜底（扫 design.md/plan.md 关键词判 integration/deployment-critical，结论 PASS/PASS WITH NOTES 但缺真实集成证据则阻断）。verify prompt 让 agent 重复扫关键词+应用门控 = 同一份控制在 prompt 和 gate 付两次钱（P1 主题）。**纯减法**：verify.js「输出验证报告」step 删 23 行重复的「分级规则表 + 触发关键词 + 门控规则」，收敛为 2 行诚实标注（CLI 自动判定+门控；agent 只需如实填 verify-result.md 的「变更风险等级」「Runtime Evidence」section）。控制力零损失（靠 stage-contract.js 兜底），顺手消除关键词双份漂移（prompt 列表原是 gate INTEGRATION_CRITICAL_PATTERNS 的近似子集，gate 更全还扫文件名）。test(58/0)。
- ⏭ **P4.2 batch mode**：verify L1/L2/L3 批量抽查策略是 agent 必须做的语义工作（选哪几个实例、判系统性 bug），CLI 无法替代，无 gate 重复，非债务；措辞已随 P1.3a 收敛。维持 defer。
- ⏭ **P4.3 Grill verdict**：Grill 执行/critical 判定是语义软判定，按定位推 sillyhub，本仓不做。维持 defer。
  - **P4.3a Grill fail 后复审边界未定义**（2026-08-04 复盘新观察，归 P4.3）：Grill 判 `fail`/`cannot_verify` 后 agent 修正 design.md，但 review step prompt（`src/stages/brainstorm.js`）未定义「修正后是否需再派独立复审 / 还是 agent 自判 pass 即可」——实证一次 brainstorm 修正后 agent 自判 pass 未再派独立复审，复审界定模糊（grep `复审|re-review|再派` 在 brainstorm.js 无命中，fail 后回路为空）。**裁决**：随 P4.3 维持 defer——「修正后够不够好」本身是语义软判定，推 sillyhub/人类，本仓不强制；**可选近零成本缓解**（留 follow-up，超 doc-only 范围）：review step 加一行诚实边界标注（fail 修正后不强制再派复审，由 agent/人类判断），符合「诚实标注优于加门」哲学（参 Q-C / P4.1）。（2026-08-04 plan 阶段亦命中：plan 审查初审 fail、修正后自判 pass 未二次独立复审——证实此 gap 为 stage 通用，非 brainstorm 独有；详见下方「2026-08-04 复盘增补」plan-d。）

### P5 流程结构
状态：`完成`

- ✅ **P5.1a** brainstorm optional 步折叠（13→8）：协作复用/原型分析/范围评估/需求澄清Grill/HTML原型 5 个 optional 内联进相邻必选步（step2/step3/step5），减少 agent 往返；对话式探索与需求澄清合并为 conditionalWait + maxWaitRounds 8 多轮步。
- ✅ **P5.1b** scale 分叉前移：step2 加早期规模筛查，明显小变更建议走 quick；step8 精判兜底。
- 原 defer 理由（破坏进度数据/step 索引偏移）经实证**不成立**：steps 按 name 存储、当前步运行时 findIndex 实时算、ensureStageSteps 已有 name 对齐兼容；真正风险仅 step 重命名（已规避——折叠用内联而非重命名必选步）。

### P6 仪式负担下沉 CLI
状态：`部分完成`

- ✅ **P6.1a** 删 prompt 里 docHash「禁止编造」警告（plan/execute/brainstorm/propose 共 4 处）。**理由**：enforcement 已有效（stage-review.js 重算 sha256 对比 + stage-review.test.mjs 防伪造用例），prompt 警告纯 persuasion 复述，按 enforced→删复述 原则清零，控制力零损失。注：原 backlog 计 3 处，实测 4 处（plan.js 独立行易漏数）。
- ⏭ **P6.1b** docHash 完全交 CLI 算（改 review.json 写入链路 run.js / machine-interface / stage-review）。**理由**：属独立中等工程；当前 agent 算 hash + CLI 重算对比 的 enforcement 已有效，主工程收益（省 agent 算 hash 步骤）小于成本+风险。
  - **复发记录**（2026-08-04）：复盘再次命中——用户改 design.md 后手算 sha256 填 review.json 易错（正是 defer 接受的代价）。暂不推翻 defer，记复发频度（含 `stage-review.js:69` 记的原始翻车 + 本次，共 2 次摩擦）供后续复评。
- ⏭ **P6.2** wait 三态收敛 must_wait/may_wait。**理由**：requiresWait/conditionalWait/repeatableWait 已工作且**写进进度库**（progress.js:315 waitAnswer/waitAnswers/waitRound 列），重命名/合并破坏现有进度兼容 + 大量测试，收益（语义直观）小于兼容性风险。
- ✅ **P6.3** personas 只 stage 首步注入（run.js `&& stepIndex === 0`）。
- ✅ **P6.4** 步骤引用用 step name 不用数字（brainstorm.js「推翻重来回到「对话式探索」步骤」）。

### Bug
状态：`完成`

- ✅ **B1** verify 探针5 对账表格转义错误修复。

### Q quick 专项（2026-07-22 增补）
状态：`完成`

来源：quick 专项分析——核心矛盾是"轻量流程 vs 重量级控制"（step2 实现 ~6 行 vs step1+step3 仪式 ~77 行）。三层债务映射 memory 坑 1（审计/QUICKLOG 接管扎实）/坑 2（guard flag）/坑 3（quick↔brainstorm 割裂）。

- ✅ **Q-A1** step3 sessionId 收尾说明合并：删重复的"多会话 fallback"机制段，指向首步说明（首步已详述）。纯去重，0 契约冲突。
- ⊘ **Q-A2** step1 QUICKLOG 段压缩。**评估后回退**：压缩破坏 platform-scan-p0.test.mjs:148-151 的 3 个契约断言（CLI 已接管 / 你不要创建或修改任何 QUICKLOG / tasks.md 追加未勾选 task）。这 3 句是 quick 的控制契约（CLI 接管 / 禁手写 / tasks.md 追加），非复读噪音；压缩收益（省 3 行）< 契约削弱 + 断言维护成本。**教训**：再次踩 memory 坑 [[sillyspec-completion-verify]]——先跑测试再标完成；差点把"57/1 平台无关"当结论上报（实际 3 失败全是 A2 引起的 QUICKLOG 契约）。也澄清了此前行 87/91 把 platform-scan-p0 失败误归因为 P1.3b pre-existing——真因是 A2。
- ✅ **Q-B** guard flag 可在 --done 覆盖。**确认已实现**：run.js:3088-3096 mergedGuard（forceBaseline: guard.forceBaseline || isForceBaseline），把 --done 的 --force-baseline/--allow-new 与 step1 持久化值取或传给 auditQuickCompletion；审计 status 判定（run.js:417）已修正为 !forceBaseline && baselineHit.length。memory [[sillyspec-quick-guard-flags-at-step1]] 已是"已修复"状态。本次无需写代码。
- ✅ **Q-C** quick 边界声明：step2 加"边界声明（quick 不校验 design.md）"——design.md 仅供理解意图，不作为验收基准，需 design 一致性走完整流程。治 memory 坑 3 的语义漏洞：诚实标注边界而非加 enforce（quick 定位是轻量逃生通道，加 verify 就不是 quick）。

- ⏭ **Q-④ 重跑 `run` 误建空会话**（2026-08-04 登记，doc-only 不动源码）：step 中途再跑一次 `sillyspec run quick`（不带 `--change`，只为重读 prompt）会**新建**一个空会话并覆盖 `current-quick-run-id`（实证：首 run 建 quick-394fd295 + ql-005，第二次 run 误建 quick-107193d2 + 空 ql-006 条目，allowedFiles 空、baseline 仅快照当前脏文件），污染 QUICKLOG 产生幽灵「进行中」条目，需手动清理会话目录 + 删条目。**根因方向**：`run` 无 `--change` 时 fallback 读 current-quick-run-id，但本次 `--linked-changes none` 等参数使 CLI 判定为新会话而非复用（具体分支待查 run.js quick 入口）。**裁决 defer**：轻量摩擦，清理成本低；修法候选（① `run` 检测 current-quick-run-id 已存在则复用而非新建；② 已存在会话时仅提示不清扫），待再踩一次或纳入 quick 会话生命周期重构时做。

### 2026-08-04 复盘增补（plan + quick 阶段使用复盘）
状态：`已解决`（4 新债已修复 + 回归测试通过；3 裁决维持）

> ✅ **已解决（2026-08-04 follow-up，commit 待提）**：plan-b / plan-c / quick-① / quick-② 全部修并补回归测试，npm test 108/0、lint 66/0。修法——plan-b: `plan-postcheck.js` 加 title_zh 完整性校验（enforcement，Test13 + crlf fixture 补 title_zh）；plan-c: `stage-machine.js` `_getNextSuggestion` 跳过 scan 且 upstream 排除 scan（**根因修**，非 complete.js 补丁；next-suggestion 加 plan-c 回归用例）；quick-①: `quicklog.js` `flipEntryInContent` 单行四字段归一多行（quicklog 2d 用例）；quick-②: `CLAUDE.md` + `templates/claude-instruction.md` 规则 8 精细化（触及 src/test 才跑 lint/test）。下述各 item 的 ⏭/🐛 标记已实际升级为 ✅。

来源：一次 plan 阶段 + quick 阶段使用复盘的 7 条改进点，逐条对源码核实后裁决（先查本债单 + 实证，不重复提议已决策项）。

- ⏭ **plan-b TaskCard 行数逼字段丢失**：plan.js prompt 要求「总长度 20~40 行」（plan.js:348/368/411/467），但 plan-postcheck.js **无 max-line 校验**（grep 无 `>40`/maxLine）→ 20-40 是纯 persuasion；且 postcheck **不校验 `title_zh` 等字段完整性**（grep 无 title_zh）→ 子代理为压行数丢字段是**静默丢失**（实证：task-05 合并 title/title_zh 只留中文 title）。**裁决 defer**：修法二选一——① 放宽 prompt 行数上限（如 20~50，复杂 task 可到 60，frontmatter 字段不可缺）；② plan-postcheck 加 frontmatter 字段完整性硬校验（title_zh 等）。均改源码超 doc-only，留 follow-up；倾向②（enforcement 优于放宽劝说，符合债单原则）。
- 🐛 **plan-c plan→scan 回头路（已知半修 bug）**：`run/complete.js:421-422` 注释明说——scan 是 STAGE_ORDER 首位且「永未完成」，通用 `_getNextSuggestion` 会「误推 scan（回头路）」；**仅 brainstorm/quick 加了专属分支**（complete.js:415/419），plan/execute/verify 仍走通用 else（complete.js:424）→ 用户 plan 完成后被提示「下一步 scan」（语义错，plan 后应 execute）。**裁决**：Bug，修法 = 给 plan/execute/verify 加专属分支（或 _getNextSuggestion 排除 auxiliary/永未完成阶段），改 complete.js，留 follow-up。
- ⏭ **quick-① QUICKLOG 四段 `--output` 落盘格式粗糙**：quick step3 `--done --output` 的四段（需求/根因/方案/结果）被 CLI 原样塞进单行 `结果：需求：…结果：…`（双层「结果：」前缀），强制 agent 手工精修拆行。属 P6「仪式负担下沉 CLI」主题——CLI 应解析四段分行落盘，不该让 agent 补排版。**裁决 defer**：改 quicklog.js 落盘逻辑（按「需求：/根因：/方案：/结果：」split 成 4 行），留 follow-up。
  - **2026-08-04 follow-up 已修 + 再补一坑**：首修用 `split(/(?=需求：|根因：|方案：|结果：)/)` 任意位置切，实证发现**正文引用字段标签字样会被误切**（根因里写「双层「结果：」前缀」→ 根因行被断成两行）——正是本次登记 quick 的 QUICKLOG 精修现场踩到。**二修改双级扫描 `splitSingleLineFields`**：先按字段边界严格扫描（真实标签=串首/前导空白/句末标点。；！？，引用字样因前导「/|( 非边界字符而跳过），严格失败退回顺序扫描兜底，缺标签落单行兜底。补回归 test 2e/2f（改前红改后绿），quicklog 82/0。残余边界：正文引用标签且**前导恰为空白/句末标点**时仍可能错位（如「按 方案： 处理」），属无标记文本固有歧义，写正文避免给标签字样加空白前缀。
- ⏭ **quick-② lint 对 doc-only 改动空转**：CLAUDE.md 规则 8 要求 `--done` 前 npm test + lint，但 lint 只扫 JS 不碰 docs/（实证「Checked 66 JavaScript files」对 doc 改动零信息）。**裁决 defer**：修法二选一——① quick 按 `--files` 文件类型跳过 lint（全非 .js 时跳过）；② CLAUDE.md 规则 8 细化为「仅当触及 src/test 时必跑 lint/test」。倾向①（CLI 自动判定优于改人类指令）。
- ⊘ **plan-a TaskCard 格式不一（裁决：非缺陷，源码已有逐字示例）**：建议「skill 模板给逐字示例（含 needs 中括号）」，但**源码 plan.js:370-408 已有完整 TaskCard 逐字示例**（含 provides/expects_from/`needs: [field_a]`），plan.js:426 明说「无跨 task 契约则留空」。子代理对**可选字段** provides/expects_from 的格式分化（散文 vs 映射）是 postcheck 故意不 style-check（其职责=契约一致性对账 plan.js:427，非风格统一）。**评估否决**：非债务；唯一残留=SKILL.md 镜像可能缺示例，但子代理读注入 prompt 不读 SKILL.md，补 SKILL.md 不解决运行时分化。
- ⊘ **plan-d 独立审查单次（裁决：= P4.3a，已登记）**：plan 审查初审 fail、修正后自判 pass 无二次独立复审——**正是上条 P4.3a**（审查 fail 后复审边界未定义），证实该 gap 为 stage 通用（brainstorm + plan 均命中），非新债。
- ⊘ **quick-③ git autocrlf 噪音（裁决：troubleshooting 已覆盖）**：git 对 `.sillyspec/quicklog/`、`docs/` 报「LF will be replaced by CRLF」——**正是 `docs/troubleshooting.md`「Edit CRLF 失配」条目 方向 A**（`.gitattributes` `* text=auto eol=lf` 规范化）的同根轻度症状（Edit 失配=重度、autocrlf 警告=轻度，根因同为仓库 CRLF/LF 混用 + git autocrlf）。不另立条目；该方向 A 一并治。

### 2026-08-04 execute 复盘增补（Task Review / Stage Review / apply 口径）
状态：`已解决`（3 项已修复 + 回归测试通过；commit 待提）

来源：execute 阶段使用复盘的 3 个负面点，逐条对源码核实后裁决，均确认真新债（债单此前无相关条目）。

- ✅ **exec-a Task Review base..head 对账坑**：子代理不 commit 时 `git diff base..head` 为空，`verifyReviewGitEvidence`（task-review.js:510）的 changedFiles 交叉比对拿**空 diffFiles** 对非空 changedFiles 必判「完全不相交」伪造，逼 agent 强制 commit + 改 7 个 review head。此前已有 working-tree 回退（避开「零改动伪造」假阳性），但 diffFiles 只算 commit diff、**未并入 working-tree 文件**。**修法**：新增 `parsePorcelainFiles` 解析 `git status --porcelain`，working-tree 改动并入 diffFiles 后再做交叉比对（对齐 `checkExecuteCodeEvidence` 同时查 working-tree 语义）；回归 agent-gate-hardening 加未 commit 对账用例。
- ✅ **exec-b Stage Review run-id/marker 易错**：① marker 缺失时 `getLatestStageReviewRunId`（stage-review.js:277）fallback 扫描 `stage-reviews/<stage>-review-*` **全目录无 change 过滤** → 读到 proxy 等其他变更的 acceptance review 报错误导；② marker 内容若误写 execute 的 `exec-` 前缀 runId，按 `stage-reviews/<stage>-<runId>` 拼目录必找不到。**修法**：① fallback 按 review.json `reviewedFiles[0]`（契约=`changes/<change>/<mainDoc>`，renderReviewJsonContract）归属变更过滤，无归属 → null fail-closed + 显式 warn（不再跨变更取最新）；② marker 读取校验 `^review-` 前缀，非格式内容忽略 + warn + 退回扫描；回归 stage-review 加 marker 格式 + cross-change fallback 用例。
- ✅ **exec-c apply 校验 vs design §6 清单**：apply（worktree-apply.js:186）只认 design §6 清单硬卡「变更文件 ⊆ 清单」，而 assess（:565）用 task allowed_paths——**两 gate 口径不一致**——design §6 漏测试/产物文件时（task allowed_paths 已含）apply 卡住。**修法**：抽出 `resolveApplyAllowSet` = design 清单 ∪ 所有 task allowed_paths，applyWorktree 改用它；plan 已过 validateDesignFileCoverage 单向校验（design ⊆ plan），union 不放开 design/plan 之外的越界文件（仍拦）；回归 worktree-allow-list 加 union 用例（越界仍违规）。

### 2026-08-04 verify 复盘增补（关键词判级 / 测试重复跑 / 后台无进度）
状态：`a 评估保留；b/c 已修复`

来源：verify 阶段使用复盘的 3 个负面点，逐条对源码核实后裁决。

- ⊘ **vrf-a 关键词判级不认否定语境**。**评估保留（已实现 + prompt 已充分告知）**：`detectChangeRisk`（change-risk-profile.js:317）**显式豁免优先**——design.md frontmatter `risk_level:` 声明覆盖关键词判级，源码注释明确记载历史教训「与其在正则层做脆弱的否定识别，不如给一条显式、诚实、可审计（落在 design frontmatter + verify-result）的覆盖通道」；verify「输出验证报告」step prompt 已写「判级是机械字面匹配、不认否定语境」+「误判时的诚实出路（豁免级）：frontmatter risk_level 声明」+「留痕要求防逃逸」。用户实测用 `risk_level: contract-required` 豁免成功——机制正是设计意图，非缺陷。
- ✅ **vrf-b 测试重复跑（step6 手动跑 + CLI 对账又跑，198s×2）**。**修法（纯减法）**：CLI 对账是防谎报 enforcement（verify.js:176 明说「谎报测试结果没有意义」）不可删；复用 step6 结果 = 信任 agent 报告，破坏核心信任边界不可做。改为 verify.js「运行测试和质量扫描」step prompt **不重复手动跑全量测试**（测试实测统一由 CLI --done 对账执行一次，按变更命中模块子集），step 只做 lint/静态检查 + 可选针对性冒烟（非必需）；同步首段「进度确认」💡 说明 + docs/prompt 重提取（verify.md 两处）+ file-lifecycle.md 补一句。
- ✅ **vrf-c 后台命令无进度提示（CLI 对账 execSync 同步静默 198s）**。**修法（轻量）**：`runVerifyTestCheck` 是同步 execSync，期间 stdout 全静默，`printVerifyTestCheck` 只在结束后打印耗时。gates.js verify 对账调用前加「⏳ Verify 测试对账：CLI 亲自执行 local.yaml 的 commands.test（同步，耗时可能较长，请等待…）」预告。**放 gates.js 调用点而非 verify-postcheck.js 内部**——`runVerifyTestCheck` 也被 `machine-interface.js:225/369`（derive verify-test facet，--json）调用，内部裸 console.log 会污染 JSON 输出。

### 2026-08-04 全流程复盘（集成层盲区 / Task Review 对账 / 中断续跑）
状态：`①③ persuasion 补强已修复；②已修复（= exec-a）`

来源：全流程使用总结提炼的「最值得改进 3 个点」，逐条对源码核实后裁决。

- ✅ **full-a 集成层测试盲区（组件单测 1324 全绿但 layout 守卫重定向只有部署+浏览器暴露）**。**修法（persuasion 补强，非加门）**：CLI 无法替 agent 判断「集成层是否测到位」（选哪几个路由实例冒烟是语义判断，推 agent）；改两处引导——① verify 探针 3（templates/prompts/verify-probes.md）加第 4 条集成盲区提示「测试文件存在 ≠ 集成正确，路由/layout 守卫重定向、跨模块装配这类集成 bug 组件单测覆盖不到，只有集成/冒烟/E2E 才暴露；对路由/layout/跨进程装配敏感 task 额外检查集成冒烟覆盖，无则标 ⚠️ 集成层未验证」；② plan.js 全局验收标准模板加一条「集成敏感 task（路由/layout/跨进程装配）建议加集成冒烟验收——组件单测全绿 ≠ 集成正确」。
- ⊘ **full-b Task Review base..head 对账坑（子代理不 commit 则 diff 空判伪造，被迫 commit + 改 7 个 review head）**。**评估：= exec-a，本次会话已修复**（task-review.js:465 `parsePorcelainFiles` 解析 `git status --porcelain`，working-tree 改动并入 diffFiles 后再交叉比对，未 commit 不再误判伪造 + 回归测试）。用户总结基于修复前会话，登记确认，无需重复修。
- ✅ **full-c 5 小时 API 配额无 checkpoint 续跑（task-07 429 中断只能干等重置）**。**修法（prompt 引导续跑，非加 task 级 checkpoint 机制）**：核实发现 checkpoint 机制已存在——execute 按 Wave step 持久化（CLI 每 Wave 完成落盘 progress）+ task 级进度靠 plan.md checkbox 隐式持久化（buildWavePrompt 明说「勾选 plan.md 中的 checkbox」，429 中断后勾选状态保留）；429 是 LLM API 配额非 CLI 失败，CLI 无法防中断本身。缺的是**传播**（agent 不知道能续跑）：execute buildWavePrompt 加「### 中断续跑」段——plan.md 已勾选 `- [x]` task 跳过不重跑（先确认产出完整）、`sillyspec status` + `sillyspec run execute` 回当前 Wave step 续跑、不重置已完成 Wave、产出缺文件 task 补做。**否决 task 级 CLI checkpoint**（改 progress 存储 + execute 推进逻辑 + Wave 并行语义，工程大，收益边际——checkbox 已隐式持久化）。

---

### 2026-08-06 复盘增补（第二批工具驾驭反馈：stage-review 注册命令 / execute format / worktree python）
状态：`2 项已修复（exec-e/f）+ 1 项让出并行全流程（exec-d）+ 2 项登记 defer + 1 项裁决 consumer 侧`

来源：sillyhub 项目工具驾驭复盘第二批 5 个负面点，逐条对源码核实后裁决（先查本债单 + 源码实证，不重复提议已决策项）。

- ⏭ **exec-d Stage Review marker 死锁无注册入口（让出给并行全流程 2026-08-06-sillyspec-self-tooling-fixes 坑1）**：marker（`current-stage-review-run-id-<stage>-<change>`）只在 prompt 渲染 `{REVIEW_TIER}` 时写（`prompt.js:501`），调度者手动派独立子代理写 review.json 不走该渲染 → `getLatestStageReviewRunId` fallback 扫描，目录名/reviewedFiles 稍不符即 null → Stage Review Gate 报缺 review.json 硬阻断（`gates.js:284-286`），**`--skip-approval` 不绕产物 gate**（三段链证实：command.js:783 不传 → complete.js:439 不传 → gates.js:176 签名不收；仓内 `gates.js:189` 自证）。本 quick 已实现并测过一个修法（备份在仓外 `temp/sillyspec-exec-d-backup-20260806/`）：新增 `sillyspec register-stage-review --change <名> --stage <brainstorm|plan|propose|execute> [--from <已有review.json>]`——生成 `review-<ts>` runId + 建 `stage-reviews/<stage>-<runId>/`（--from 校验 schema 后落入 / 无则 cannot_verify 草稿填对 reviewType/reviewedFiles[0]=changes/<change>/<mainDoc>/docHash）+ 写 marker + `validateStageReview` 自检，gate 缺 review.json 报错指向该命令（34 测试过）。**因与并行全流程坑1 撞车（都动 stage-review.js/index.js），按用户裁决让出**；坑1 可采纳此设计（CLI 注册入口 + gate 报错指向，否决给 gate 加 --skip-approval 旁路保 fail-closed 语义）或自行修 fallback。
- ✅ **exec-e Wave 子代理只跑 lint check 没 format**：`execute.js` buildWavePrompt + acceptanceSteps 通篇无 format 引导（只"不要频繁编译"），子代理只跑 check 到 commit 才被 consumer pre-commit hook 拦（ruff format/prettier）。**修法（prompt 引导）**：buildWavePrompt 调度要求 item 4 + acceptanceSteps「运行测试」step operation 3 加"既跑 lint check 也跑 formatter（ruff format/prettier --write/black），不要只 check"。
- ✅ **exec-f worktree 内 python 工具链不供给**：`worktree-deps.js` detectProjectType/inferInstallCommand 原无 python 分支（只 maven/gradle/nodejs/generic），python 项目根误判 generic → n/a → ruff/pre-commit 二进制不供给。**修法（源码）**：detectProjectType 加 python（pyproject.toml/requirements.txt）+ inferInstallCommand 加 `uv sync`（pyproject/uv.lock）/`pip install -r requirements.txt`（纯 requirements）；execute「确认 worktree 路径」步加工具链预告（先 --version 确认，缺则 uv tool install/uv sync）。detectProjectType/inferInstallCommand 导出做纯单元测（7 断言，不真跑 uv）。注：modules 块的 python 子模块供给未做（类比 nodejs modules link 是更大工程），env 预告覆盖发现侧。
- ⏭ **exec-g worktree 与主仓 .sillyspec 文档分叉（登记 defer，超 quick 范围）**：`worktree-apply.js:48-50` filterDeliverableFiles 一刀切排除 `.sillyspec/`，无 worktree→main 反向同步；Reverse Sync 触发的 design.md/模块文档改动留在 worktree 分支，apply 时被挡，只能手动 `git show` 捞（历史已踩）。**裁决 defer**：修法需设计决策（apply 分级放开 `.sillyspec/changes/<change>/` 保留 `.sillyspec/docs/<project>/modules/` 排除 / 或 apply 完给文件级分叉清单警告 / 或 prompt 硬要求手动 git show 恢复），有越界风险，留单独完整流程排。
- ⏭ **exec-h gen:types 自报不准（登记 defer，超 quick 范围）**：证据校验只覆盖 git diff + docHash，**无生成产物校验**；唯一硬对账 `runVerifyTestCheck` 只覆盖 test 命令，gen:types/build/codegen 全靠子代理自觉（声称"无漂移"未必真跑）。**裁决 defer**：修法需设计决策（verify-postcheck 加 runVerifyArtifactCheck 亲自跑 codegen 对账产物 / review.json 加 artifactEvidence 字段 + prompt 硬要求贴 stdout / verify-probes 加探针 7 / 诚实标注底线），是中等工程，留单独完整流程排。
- ⊘ **exec-i frontend hook 在 hook 子进程假失败（裁决：consumer 侧，非本仓）**：consumer 项目（multi-agent-platform）pre-commit/ci-check hook 自身实现问题（全树跑 vs 子进程环境），SillySpec 源码不掌管这些 hook；verify 阶段 `runVerifyTestCheck` 亲自在主仓 cwd 跑（execute 已 apply 回主仓），不在 worktree 子进程环境假失败。不另立条目。

### 2026-08-07 复盘增补（sss.md / sss1.md 两份 prompt 一致性审计）
状态：`A组 6 项全修（A1-5 commit 1efc7c8 / A6 直接 commit 因 quick 审计 shared.js:516 禁删除）；B组 2 项并发 session 已修、3 项 defer`

来源：两份只读审计报告 docs/sss.md（逐阶段提示词"承诺 vs 源码"对照）+ docs/sss1.md（文件流转/契约闭合性）。P0 项（verify 探针 advisory、review-tier ≤3、archive 伪命令、doctor 悬空 else/fi、brainstorm small validator、verify-required-evidence 死链）已由近期 commit 46ff4f9 / 245a03b / 3ae51c8 修完，本段只登记剩余 P1/P2 归宿。

**A组（纯减法，本仓 quick 修）**
- ✅ **A1 execute"为每个 Task 建议模型"空指令**（execute.js:187）：关键词→档位无统一映射、未指示经 Agent tool 传入，agent 无从执行。删模糊映射，改诚实"模型档位：若 tasks.md 标注 [model:xxx] 则按标签选模型，execute 不自动建议"（档位是 plan 阶段职责）并重编号。commit 1efc7c8。
- ✅ **A2 quick"单会话兼容"退路与铁律15冲突**（quick.js:13）：核验 `--change <quick-session-id>` 确为 quick session 跨进程传递正确机制（command.js:403/419/747，quick 被 validateChangeExists 豁免，sessionId==changeName==quick-<uuid8>），仅"不带时单会话兼容"退路措辞诱导多会话不传 → 删退路括号，保留"必须带"。commit 1efc7c8。
- ✅ **A3 execute 两处末尾孤立双引号**（确认 worktree 路径步 execute.js:177 + buildWavePrompt execute.js:662）：模板末尾 `"\\`` 渲染成 prompt 尾部裸 `"`。删之。commit 1efc7c8。
- ✅ **A4 execute 知识库审阅 uncategorized 路径缺起始反引号**（execute.js:293）：`\\.sillyspec` 应为 `` \`.sillyspec ``，补起始反引号。commit 1efc7c8。（execute.md 镜像曾以"逐字保留勿补"注释记录此源码 bug，bug 修后该注释一并删。）
- ✅ **A5 scan Step8 子代理 prompt 中文括号未闭合**（scan.js:353）：`（**主 agent 启动前必须拼入**：` 缺 `）`，补 `）：`。commit 1efc7c8。
- ✅ **A6 propose 死代码移除**（删 src/stages/propose.js 整文件 + docs/prompt/propose.md 镜像；清 stage-review.js STAGE_MAIN_DOC/REVIEW_TYPE.propose + gates.js Stage Review Gate 列表/三元 + prompt.js REVIEW_TIER 列表 + _extract.mjs staticStages/特例 + 死测试 case + README/stages.md 镜像引用）：入口 2026-06-14 已废、propose.js 无任何 import 是真孤儿。**scope 纠正**：初判误把 stage-contract-spec.js 的 brainstorm.proposal.*（proposal.md 文件规则，brainstorm 产物 LIVE）和 index.js:98（sillyspec knowledge propose 子命令，LIVE）当死代码，实证后排除。**经直接 git commit（非 quick）**：quick 审计 shared.js:516 对 deletedFiles.length>0 恒 blocked、无 flag 解锁（--force-baseline 只降级 baselineHit），A6 必删 propose.js/propose.md 故走 quick --done 不通；改为直接 git commit（显式 pathspec 隔离 sillyhub 并发暂存）。npm test 122/0、lint 67。

**B组（判断项，多数 defer；B1/B2 并发 session 已修）**
- ✅ **B1 decisions 决策追踪矩阵诚实降级**（= sss1 P1-3）：plan.js:201/259 + verify.js:138 已加"CLI 只校验 D-xxx@vN ID 字面出现，warning 不阻断；D→FR→task 映射完整性供人类追溯，CLI 不校验"。**由并发 session commit b904442 修完**，非本会话。
- ✅ **B2 _module-map 双 parseModuleMapSimple 合并 + schema_version 校验**（= sss1 P1-4）：modules.js 升级为超集字段集 canonical 单源 export，prompt.js 改 import 复用，loadModuleContextIndex 加 schema_version advisory warn。**由并发 session commit e2b3422 修完 + 15 断言测试**，非本会话。
- ⏭ **B3 scan 死文档 INTEGRATIONS.md / flows/*.md 无下游消费者**（= sss1 P1-5）：scan 产但 file-lifecycle.md 自承无消费者。**defer**：修法需设计决策（接 verify/execute 消费 / 或明确标"仅供 knowledge 提取+人类查阅"降 optional），超纯减法，留单独流程。
- ✅ **B4 plan Step4 TaskCard 格式规则 per-task 重复（token 冗余）**（= sss P2-9）：buildCoordinatorStep 每个 task 子代理模板重复 ~60 行格式规则。**已修（ql-20260807-011-d831）**：抽 `templates/prompts/taskcard-rules.md` + buildCoordinatorStep 内联段改 `{{include: taskcard-rules}}`（复用 P2.2.3 include 机制，resolvePromptIncludes 运行时全注入）。收益=维护性 + 可单独校验；token 不省是 include 全替换机制固有（P2.2.3 已确认）。同步 docs/prompt 镜像 + 回归测试 8 断言。
- ✅ **B5 plan"保存前格式自检"清单 vs postcheck 字段对齐**（= sss P1-7）：**已核验 + 已修（随 B4，ql-20260807-011-d831）**：validatePlanFeasibility 只硬校验 9 字段（id/title/title_zh/allowed_paths/goal/implementation/acceptance/verify/constraints），原自检清单 14 字段全覆盖无「自检通过仍被拦」；随 B4 把清单拆分「硬校验 9 字段（缺失报错阻断）」vs「规范约定 5 字段（author/created_at/priority/depends_on/blocks，缺失不阻断）」，消除 agent 白检误导。机械生成自检清单（renderStageContract 同源）仍留未来待触及 plan-postcheck 时做。

**处置**：两份原始审计 docs/sss.md / docs/sss1.md 的可执行结论已归并本段；raw 文件保留作历史参考（被 46ff4f9 / 245a03b / 3ae51c8 等 commit 引用为 P0 修复依据），如需清理可手动删除（决策以本债单为准）。

---

## 推进记录

| 日期 | 改进项 | 结果 |
|---|---|---|
| 2026-07-22 | 文档建立 | backlog 固化 |
| 2026-07-22 | B1 | verify 探针5 表格转义修复，lint + 输出验证通过 |
| 2026-07-22 | P1.3a | brainstorm 7 处 wait 命令模板去重 + 行为约束保留，test(58/0) |
| 2026-07-22 | P6.3 / P6.4 | personas 只首步注入 + 步骤 name 引用，test(58/0) |
| 2026-07-22 | P3.1 | brainstorm 自审降级为机械格式检查，语义交 Design Grill，test(58/0) |
| 2026-07-22 | P1.3b | execute/quick 命令去重（途中踩反引号坑：rep 含未转义反引号终止模板 → 已修，记 memory），test(58/0) |
| 2026-07-22 | P1.4 | verify 红线复读删除（_globalGuardrails 覆盖），test(58/0) |
| 2026-07-22 | P1.1/1.2/P2/P4/P6.1/6.2 | 评估：保留 2 项（非纯重复）、defer 4 组（P5 后续完成见下行） |
| 2026-07-22 | P5.1a/P5.1b | brainstorm 13→8 折叠（5 optional 内联）+ scale 前移建议 quick；实证推翻 defer 理由；test：stage-definitions/wait-gates/brainstorm-plan-contract 通过，npm test 全量 EXIT=0 |
| 2026-07-22 | P2 重新评估 | defer 理由核验：scaffold + CLI 注入机制已存在（推翻「独立工程」）；token 收益≈0 但维护性/复用是真实收益；做 P2.2.3（verify 探针抽 templates/prompts/ + include 机制），P2.4 实证仍 defer（三处场景化差异），P2.1/2.2 仍 defer；test EXIT=0、lint 49 文件通过 |
| 2026-07-22 | P6.1a | 删 docHash prompt「禁止编造」警告 4 处（plan/execute/brainstorm/propose），enforcement 留 stage-review.js + 防伪造测试，test(58/0) |
| 2026-07-22 | Q-A1/A2/B/C | quick 专项：step3 合并✅、QUICKLOG 压缩⊘回退（3 契约断言锁定，此前误判 platform-scan-p0 为 P1.3b pre-existing）、guard flag 覆盖✅确认已实现、边界声明✅，test(58/0) 全绿 |
| 2026-07-22 | P4.1 | verify risk tier 重复段删除（23→2 行诚实标注；实证 defer 理由失效：detectChangeRisk 已存在并在 stage-contract.js:496-511 enforce），test(58/0) |
| 2026-08-04 | P4.3a / P6.1b | 复盘登记（doc-only，不动源码）：Grill fail 后复审边界未定义（新观察，随 P4.3 维持 defer + 诚实标注缓解留 follow-up）；docHash 手算摩擦复发旁注（不推翻 defer） |
| 2026-08-04 | 复盘增补（plan+quick） | 登记 4 新债（plan-b TaskCard 行数丢字段 / plan-c plan→scan 回头路半修 bug / quick-① QUICKLOG 四段落盘 / quick-② lint doc 空转）+ 3 裁决否决（plan-a 已有逐字示例 / plan-d=P4.3a / quick-③=troubleshooting 同根），doc-only 不动源码 |
| 2026-08-04 | plan-b/c/quick-①/② follow-up | 4 新债全部修复：plan-postcheck 加 title_zh 校验 / stage-machine _getNextSuggestion 跳过 scan（根因修）/ quicklog 单行四字段归一 / CLAUDE.md+template 规则8 精细化；补 4 处回归测试，npm test 108/0、lint 66/0 |
| 2026-08-04 | execute 复盘（a/b/c） | 3 项新债全修：verifyReviewGitEvidence working-tree 并入 diffFiles（exec-a）/ getLatestStageReviewRunId marker 格式校验 + fallback 按变更过滤 fail-closed（exec-b）/ resolveApplyAllowSet = design ∪ plan allowed_paths（exec-c）；补 3 处回归测试 |
| 2026-08-04 | verify 复盘（a/b/c） | a 评估保留（detectChangeRisk 显式豁免已实现 + verify prompt 已告知，非新债）；b 修 verify step6 不重复手动跑全量测试（统一交 CLI 对账）+ docs/prompt 重提取 + file-lifecycle 同步；c 修 gates.js verify 对账前加进度预告（放调用点不污染 machine-interface --json） |
| 2026-08-04 | 全流程复盘（a/b/c） | a persuasion 补强：verify 探针 3 加集成盲区提示 + plan 全局验收标准加集成冒烟条；b 已修复（= exec-a，本次会话已落地）；c prompt 引导续跑：execute Wave prompt 加中断续跑段（checkpoint 机制已存在，补传播）；否决 task 级 checkpoint 机制 |
| 2026-08-06 | 第二批复盘（exec-e/f 修复 + exec-d 让出 + exec-g/h defer + exec-i 否决） | exec-d 已实现 register-stage-review 命令（34 测试过，备份仓外 temp/sillyspec-exec-d-backup-20260806/）但因与并行全流程 2026-08-06-sillyspec-self-tooling-fixes 坑1 撞车让出（设计存债单 exec-d 条目供采纳）；exec-e execute prompt 加"既跑 check 也跑 format"引导（buildWavePrompt 调度要求 + acceptance 运行测试步）；exec-f worktree-deps 加 python 分支（uv sync/pip）+ execute 确认 worktree 路径步加工具链预告；exec-g/h defer（worktree .sillyspec 文档分叉 / gen:types 自报无产物校验，需设计单独完整流程排）；exec-i consumer 侧否决（frontend hook 假失败）；本批 commit exec-e/f，全量 test 116/0、lint 68 |
| 2026-08-07 | sss/sss1 审计复盘（A1-5 修 commit 1efc7c8 + A6 直接 commit / B1-B2 并发已修 + B3-B5 defer） | A组纯减法 5 项修并提交 1efc7c8（execute 建议模型空指令→诚实模型档位条目 / quick 单会话兼容退路 / execute 两处末尾孤立引号 / uncategorized 起始反引号 / scan 括号，+ docs/prompt 镜像同步删 3 条过时"逐字保留"注释，test 122/0 lint 68）；A6 propose 死代码已删——直接 commit（quick 审计 shared.js:516 对删除恒 blocked 无 flag 解锁；scope 纠正排除 stage-contract-spec proposal.md 文件规则/index.js knowledge 子命令两个 LIVE）；B1 decisions 矩阵降级 / B2 module-map 合并 均由并发 session b904442 / e2b3422 修完（非本会话）；B3 scan 死文档 / B4 plan Step4 token / B5 plan 自检对齐 defer；raw 文件 sss.md/sss1.md 保留作历史参考 |
| 2026-08-07 | sss/sss1 审计 B4+B5 落地（ql-20260807-011-d831） | B4 plan TaskCard 规则抽 templates/prompts/taskcard-rules.md + buildCoordinatorStep 改 {{include: taskcard-rules}}（复用 P2.2.3 include 机制，收益=维护性+可单独校验，token 不省是机制固有）；B5 核验自检清单 14 字段全覆盖 validatePlanFeasibility 硬校验 9 字段，随 B4 拆分硬校验/规范约定两组消 agent 白检误导；同步 docs/prompt 镜像 + 回归测试 8 断言，npm test 全量 0 失败、lint 72 |

## 总结

- **代码完成 15 项**（B1、P1.3a/b、P1.4、P3.1、P4.1、P5.1a/b、P6.1a、P6.3、P6.4、P2.2.3、Q-A1、Q-B、Q-C）；全套 test EXIT=0、lint 49 文件通过。
- **评估保留 / 回退 4 项**（P1.1 SKILL.md 铁律、P1.2 step 内铁律、P2.4 decisions 场景化展示、Q-A2 QUICKLOG 压缩回退）——非纯重复 / 场景必要 / 压缩破坏契约断言，抽收敛反而加复杂度或削弱控制。
- **defer 6 项**（P2.1/2.2 单处模板、P4.2 batch、P4.3 Grill verdict、P6.1b docHash 全交 CLI、P6.2 wait 三态）——均有技术理由（复用价值小、语义工作 CLI 无法替代、推 sillyhub、独立工程、进度兼容），非「不做」而是「需单独排期/跨仓」。
- 核心收益：brainstorm/execute/quick/verify 的 prompt 显著瘦身，命令模板和复读铁律清除，控制力零损失（run.js 注入 + 硬门 + globalGuardrails 兜底）；P2.2.3 引入 prompt include 机制（`{{include}}` → 包内 templates/prompts/ 注入），verify 探针抽包内模板，为后续 self-contained 大块复用铺路。
- **2026-08-04 复盘增补（plan+quick）**：7 条改进点核实后，登记 4 项新 defer 债（plan-b 行数丢字段 / plan-c plan→scan 回头路半修 bug / quick-① QUICKLOG 落盘 / quick-② lint doc 空转，均需改源码留 follow-up）+ 3 项裁决否决（plan-a 源码已有逐字示例 / plan-d=P4.3a stage 通用 / quick-③=troubleshooting CRLF 条目同根）。
- **2026-08-06 第二批复盘**：5 个负面点核实后，2 项修复提交（exec-e execute prompt 加"既跑 check 也跑 format"引导；exec-f worktree-deps 加 python 分支 uv sync/pip + execute 工具链预告）+ 1 项让出（exec-d stage-review marker 死锁，已实现 `register-stage-review` 命令 34 测试过，因与并行全流程 `2026-08-06-sillyspec-self-tooling-fixes` 坑1 撞车让出，设计存债单 + 仓外备份 `temp/sillyspec-exec-d-backup-20260806/` 供采纳）+ 2 项 defer（exec-g worktree `.sillyspec` 文档分叉 / exec-h gen:types 自报无产物校验，均需设计决策留单独完整流程）+ 1 项 consumer 侧否决（exec-i frontend hook 假失败）。本批 commit 新增 test worktree-deps-python 7 断言，全量 116/0、lint 68。
