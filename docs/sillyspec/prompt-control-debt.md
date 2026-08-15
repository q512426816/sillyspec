---
author: qinyi
created_at: 2026-07-22 12:00:00
updated_at: 2026-08-14T22:20:00+08:00
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
> - 「agent 仍要 Read，净省 token 有限」**机制描述错**：run.js 是 CLI 端组装 prompt 字符串后整串输出给 agent（prompt.js:136 outputStep），已有「CLI 读文件注入 prompt」先例（模块上下文注入 prompt.js:30 loadModuleContextIndex）；CLI 注入下 agent 收到自包含字符串、无需自己 Read。但**结论方向对**：内联或注入，agent 每次 step 都收到同样大小 prompt 全文，抽文件**不省 agent token**（≈0）。真实收益是维护性 / 跨处复用 / 可单独校验，不是 token。
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

- ✅ **P4.1 risk tier**：原 defer 理由「需新写 `computeRiskTier` + 注入，独立工程」**经实证已失效**——`detectChangeRisk()`（change-risk-profile.js:273）早已存在，且已在 stage-contract.js:466 detectChangeRisk `validateVerifyOutputs` 里 verify --done 时真兜底（扫 design.md/plan.md 关键词判 integration/deployment-critical，结论 PASS/PASS WITH NOTES 但缺真实集成证据则阻断）。verify prompt 让 agent 重复扫关键词+应用门控 = 同一份控制在 prompt 和 gate 付两次钱（P1 主题）。**纯减法**：verify.js「输出验证报告」step 删 23 行重复的「分级规则表 + 触发关键词 + 门控规则」，收敛为 2 行诚实标注（CLI 自动判定+门控；agent 只需如实填 verify-result.md 的「变更风险等级」「Runtime Evidence」section）。控制力零损失（靠 stage-contract.js 兜底），顺手消除关键词双份漂移（prompt 列表原是 gate INTEGRATION_CRITICAL_PATTERNS 的近似子集，gate 更全还扫文件名）。test(58/0)。
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
- ⏭ **P6.1b** docHash 完全交 CLI 算（改 review.json 写入链路 run.js / machine-interface / stage-review）。**理由**：属独立中等工程；当前 agent 算 hash + CLI 重算对比 的 enforcement 已有效，主工程收益（省 agent 算 hash 步骤）小于成本+风险。**第 5-6 次复发缓解**（2026-08-12 quick ql-20260812-003）：用户报「审查通过后补 frontmatter/自审章节 → docHash 漂移 → review.json 失效 → design 改4次子代理跑4趟」。根因是 brainstorm step7 自检清单（brainstorm.js:330）只查必填章节/decisions引用/生命周期契约表 3 条，**缺 frontmatter 字段齐全 + 「自审」字面命中**——这两条 step8 完成契约硬要求（brainstorm.design.self-review + frontmatter 模板）但 step7 没预检，agent 审查时不知要补，到 step8/Grill 才暴露，design 已定 docHash 再补就漂移。**低成本缓解**（P6.1b 中等工程 defer 维持）：step7 自检清单补 2 条（frontmatter 字段齐全 + 「自审」字面命中），审查前就补齐，docHash 一次定。治「审查后补→漂移」这一复发路径，但不治「Grill 改实质设计→漂移」（后者只能靠 P6.1b 完全 CLI 算或 register-stage-review --from 重算）。同步 docs/prompt/brainstorm.md 镜像。
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
- ⊘ **Q-A2** step1 QUICKLOG 段压缩。**评估后回退**：压缩破坏 test/platform-scan-p0.test.mjs:148-151 的 3 个契约断言（CLI 已接管 / 你不要创建或修改任何 QUICKLOG / tasks.md 追加未勾选 task）。这 3 句是 quick 的控制契约（CLI 接管 / 禁手写 / tasks.md 追加），非复读噪音；压缩收益（省 3 行）< 契约削弱 + 断言维护成本。**教训**：再次踩 memory 坑 [[sillyspec-completion-verify]]——先跑测试再标完成；差点把"57/1 平台无关"当结论上报（实际 3 失败全是 A2 引起的 QUICKLOG 契约）。也澄清了此前行 87/91 把 platform-scan-p0 失败误归因为 P1.3b pre-existing——真因是 A2。
- ✅ **Q-B** guard flag 可在 --done 覆盖。**确认已实现**：run/command.js:1144 mergedGuard（原 run.js，W6 拆分后迁 command.js）（forceBaseline: guard.forceBaseline || isForceBaseline），把 --done 的 --force-baseline/--allow-new 与 step1 持久化值取或传给 auditQuickCompletion；审计 status 判定（run/shared.js:610 auditQuickCompletion 内）已修正为 !forceBaseline && baselineHit.length。memory [[sillyspec-quick-guard-flags-at-step1]] 已是"已修复"状态。本次无需写代码。
- ✅ **Q-C** quick 边界声明：step2 加"边界声明（quick 不校验 design.md）"——design.md 仅供理解意图，不作为验收基准，需 design 一致性走完整流程。治 memory 坑 3 的语义漏洞：诚实标注边界而非加 enforce（quick 定位是轻量逃生通道，加 verify 就不是 quick）。

- ⏭ **Q-④ 重跑 `run` 误建空会话**（2026-08-04 登记，doc-only 不动源码）：step 中途再跑一次 `sillyspec run quick`（不带 `--change`，只为重读 prompt）会**新建**一个空会话并覆盖 `current-quick-run-id`（实证：首 run 建 quick-394fd295 + ql-005，第二次 run 误建 quick-107193d2 + 空 ql-006 条目，allowedFiles 空、baseline 仅快照当前脏文件），污染 QUICKLOG 产生幽灵「进行中」条目，需手动清理会话目录 + 删条目。**根因方向**：`run` 无 `--change` 时 fallback 读 current-quick-run-id，但本次 `--linked-changes none` 等参数使 CLI 判定为新会话而非复用（具体分支待查 run.js quick 入口）。**裁决 defer**：轻量摩擦，清理成本低；修法候选（① `run` 检测 current-quick-run-id 已存在则复用而非新建；② 已存在会话时仅提示不清扫），待再踩一次或纳入 quick 会话生命周期重构时做。

### 2026-08-04 复盘增补（plan + quick 阶段使用复盘）
状态：`已解决`（4 新债已修复 + 回归测试通过；3 裁决维持）

> ✅ **已解决（2026-08-04 follow-up，commit 待提）**：plan-b / plan-c / quick-① / quick-② 全部修并补回归测试，npm test 108/0、lint 66/0。修法——plan-b: `plan-postcheck.js` 加 title_zh 完整性校验（enforcement，Test13 + crlf fixture 补 title_zh）；plan-c: `stage-machine.js` `_getNextSuggestion` 跳过 scan 且 upstream 排除 scan（**根因修**，非 complete.js 补丁；next-suggestion 加 plan-c 回归用例）；quick-①: `quicklog.js` `flipEntryInContent` 单行四字段归一多行（quicklog 2d 用例）；quick-②: `CLAUDE.md` + `templates/claude-instruction.md` 规则 8 精细化（触及 src/test 才跑 lint/test）。下述各 item 的 ⏭/🐛 标记已实际升级为 ✅。

来源：一次 plan 阶段 + quick 阶段使用复盘的 7 条改进点，逐条对源码核实后裁决（先查本债单 + 实证，不重复提议已决策项）。

- ⏭ **plan-b TaskCard 行数逼字段丢失**：plan.js prompt 要求「总长度 20~40 行」（plan.js:400/368/411/467），但 plan-postcheck.js **无 max-line 校验**（grep 无 `>40`/maxLine）→ 20-40 是纯 persuasion；且 postcheck **不校验 `title_zh` 等字段完整性**（grep 无 title_zh）→ 子代理为压行数丢字段是**静默丢失**（实证：task-05 合并 title/title_zh 只留中文 title）。**裁决 defer**：修法二选一——① 放宽 prompt 行数上限（如 20~50，复杂 task 可到 60，frontmatter 字段不可缺）；② plan-postcheck 加 frontmatter 字段完整性硬校验（title_zh 等）。均改源码超 doc-only，留 follow-up；倾向②（enforcement 优于放宽劝说，符合债单原则）。
- 🐛 **plan-c plan→scan 回头路（已知半修 bug）**：`run/complete.js:410-417` 注释明说——scan 是 STAGE_ORDER 首位且「永未完成」，通用 `_getNextSuggestion` 会「误推 scan（回头路）」；**仅 brainstorm/quick 加了专属分支**（complete.js:415/419），plan/execute/verify 仍走通用 else（complete.js:417）→ 用户 plan 完成后被提示「下一步 scan」（语义错，plan 后应 execute）。**裁决**：Bug，修法 = 给 plan/execute/verify 加专属分支（或 _getNextSuggestion 排除 auxiliary/永未完成阶段），改 complete.js，留 follow-up。
- ⏭ **quick-① QUICKLOG 四段 `--output` 落盘格式粗糙**：quick step3 `--done --output` 的四段（需求/根因/方案/结果）被 CLI 原样塞进单行 `结果：需求：…结果：…`（双层「结果：」前缀），强制 agent 手工精修拆行。属 P6「仪式负担下沉 CLI」主题——CLI 应解析四段分行落盘，不该让 agent 补排版。**裁决 defer**：改 quicklog.js 落盘逻辑（按「需求：/根因：/方案：/结果：」split 成 4 行），留 follow-up。
  - **2026-08-04 follow-up 已修 + 再补一坑**：首修用 `split(/(?=需求：|根因：|方案：|结果：)/)` 任意位置切，实证发现**正文引用字段标签字样会被误切**（根因里写「双层「结果：」前缀」→ 根因行被断成两行）——正是本次登记 quick 的 QUICKLOG 精修现场踩到。**二修改双级扫描 `splitSingleLineFields`**：先按字段边界严格扫描（真实标签=串首/前导空白/句末标点。；！？，引用字样因前导「/|( 非边界字符而跳过），严格失败退回顺序扫描兜底，缺标签落单行兜底。补回归 test 2e/2f（改前红改后绿），quicklog 82/0。残余边界：正文引用标签且**前导恰为空白/句末标点**时仍可能错位（如「按 方案： 处理」），属无标记文本固有歧义，写正文避免给标签字样加空白前缀。
- ⏭ **quick-② lint 对 doc-only 改动空转**：CLAUDE.md 规则 8 要求 `--done` 前 npm test + lint，但 lint 只扫 JS 不碰 docs/（实证「Checked 66 JavaScript files」对 doc 改动零信息）。**裁决 defer**：修法二选一——① quick 按 `--files` 文件类型跳过 lint（全非 .js 时跳过）；② CLAUDE.md 规则 8 细化为「仅当触及 src/test 时必跑 lint/test」。倾向①（CLI 自动判定优于改人类指令）。
- ⊘ **plan-a TaskCard 格式不一（裁决：非缺陷，源码已有逐字示例）**：建议「skill 模板给逐字示例（含 needs 中括号）」，但**源码 plan.js:370-408 已有完整 TaskCard 逐字示例**（含 provides/expects_from/`needs: [field_a]`），plan.js:426 明说「无跨 task 契约则留空」。子代理对**可选字段** provides/expects_from 的格式分化（散文 vs 映射）是 postcheck 故意不 style-check（其职责=契约一致性对账 plan.js:427，非风格统一）。**评估否决**：非债务；唯一残留=SKILL.md 镜像可能缺示例，但子代理读注入 prompt 不读 SKILL.md，补 SKILL.md 不解决运行时分化。
- ⊘ **plan-d 独立审查单次（裁决：= P4.3a，已登记）**：plan 审查初审 fail、修正后自判 pass 无二次独立复审——**正是上条 P4.3a**（审查 fail 后复审边界未定义），证实该 gap 为 stage 通用（brainstorm + plan 均命中），非新债。
- ⊘ **quick-③ git autocrlf 噪音（裁决：troubleshooting 已覆盖）**：git 对 `.sillyspec/quicklog/`、`docs/` 报「LF will be replaced by CRLF」——**正是 `docs/troubleshooting.md`「Edit CRLF 失配」条目 方向 A**（`.gitattributes` `* text=auto eol=lf` 规范化）的同根轻度症状（Edit 失配=重度、autocrlf 警告=轻度，根因同为仓库 CRLF/LF 混用 + git autocrlf）。不另立条目；该方向 A 一并治。

### 2026-08-04 execute 复盘增补（Task Review / Stage Review / apply 口径）
状态：`已解决`（3 项已修复 + 回归测试通过；commit 待提）

来源：execute 阶段使用复盘的 3 个负面点，逐条对源码核实后裁决，均确认真新债（债单此前无相关条目）。

- ✅ **exec-a Task Review base..head 对账坑**：子代理不 commit 时 `git diff base..head` 为空，`verifyReviewGitEvidence`（task-review.js:558）的 changedFiles 交叉比对拿**空 diffFiles** 对非空 changedFiles 必判「完全不相交」伪造，逼 agent 强制 commit + 改 7 个 review head。此前已有 working-tree 回退（避开「零改动伪造」假阳性），但 diffFiles 只算 commit diff、**未并入 working-tree 文件**。**修法**：新增 `parsePorcelainFiles` 解析 `git status --porcelain`，working-tree 改动并入 diffFiles 后再做交叉比对（对齐 `checkExecuteCodeEvidence` 同时查 working-tree 语义）；回归 agent-gate-hardening 加未 commit 对账用例。
- ✅ **exec-b Stage Review run-id/marker 易错**：① marker 缺失时 `getLatestStageReviewRunId`（stage-review.js:269）fallback 扫描 `stage-reviews/<stage>-review-*` **全目录无 change 过滤** → 读到 proxy 等其他变更的 acceptance review 报错误导；② marker 内容若误写 execute 的 `exec-` 前缀 runId，按 `stage-reviews/<stage>-<runId>` 拼目录必找不到。**修法**：① fallback 按 review.json `reviewedFiles[0]`（契约=`changes/<change>/<mainDoc>`，renderReviewJsonContract）归属变更过滤，无归属 → null fail-closed + 显式 warn（不再跨变更取最新）；② marker 读取校验 `^review-` 前缀，非格式内容忽略 + warn + 退回扫描；回归 stage-review 加 marker 格式 + cross-change fallback 用例。
- ✅ **exec-c apply 校验 vs design §6 清单**：apply（worktree-apply.js:208）只认 design §6 清单硬卡「变更文件 ⊆ 清单」，而 assess（:565）用 task allowed_paths——**两 gate 口径不一致**——design §6 漏测试/产物文件时（task allowed_paths 已含）apply 卡住。**修法**：抽出 `resolveApplyAllowSet` = design 清单 ∪ 所有 task allowed_paths，applyWorktree 改用它；plan 已过 validateDesignFileCoverage 单向校验（design ⊆ plan），union 不放开 design/plan 之外的越界文件（仍拦）；回归 worktree-allow-list 加 union 用例（越界仍违规）。

### 2026-08-04 verify 复盘增补（关键词判级 / 测试重复跑 / 后台无进度）
状态：`a 评估保留；b/c 已修复`

来源：verify 阶段使用复盘的 3 个负面点，逐条对源码核实后裁决。

- ⊘ **vrf-a 关键词判级不认否定语境**。**评估保留（已实现 + prompt 已充分告知）**：`detectChangeRisk`（change-risk-profile.js:317）**显式豁免优先**——design.md frontmatter `risk_level:` 声明覆盖关键词判级，源码注释明确记载历史教训「与其在正则层做脆弱的否定识别，不如给一条显式、诚实、可审计（落在 design frontmatter + verify-result）的覆盖通道」；verify「输出验证报告」step prompt 已写「判级是机械字面匹配、不认否定语境」+「误判时的诚实出路（豁免级）：frontmatter risk_level 声明」+「留痕要求防逃逸」。用户实测用 `risk_level: contract-required` 豁免成功——机制正是设计意图，非缺陷。
- ✅ **vrf-b 测试重复跑（step6 手动跑 + CLI 对账又跑，198s×2）**。**修法（纯减法）**：CLI 对账是防谎报 enforcement（verify.js:176 明说「谎报测试结果没有意义」）不可删；复用 step6 结果 = 信任 agent 报告，破坏核心信任边界不可做。改为 verify.js「运行测试和质量扫描」step prompt **不重复手动跑全量测试**（测试实测统一由 CLI --done 对账执行一次，按变更命中模块子集），step 只做 lint/静态检查 + 可选针对性冒烟（非必需）；同步首段「进度确认」💡 说明 + docs/prompt 重提取（verify.md 两处）+ file-lifecycle.md 补一句。
- ✅ **vrf-c 后台命令无进度提示（CLI 对账 execSync 同步静默 198s）**。**修法（轻量）**：`runVerifyTestCheck` 是同步 execSync，期间 stdout 全静默，`printVerifyTestCheck` 只在结束后打印耗时。gates.js verify 对账调用前加「⏳ Verify 测试对账：CLI 亲自执行 local.yaml 的 commands.test（同步，耗时可能较长，请等待…）」预告。**放 gates.js 调用点而非 verify-postcheck.js 内部**——`runVerifyTestCheck` 也被 `machine-interface.js:250/369`（derive verify-test facet，--json）调用，内部裸 console.log 会污染 JSON 输出。

### 2026-08-04 全流程复盘（集成层盲区 / Task Review 对账 / 中断续跑）
状态：`①③ persuasion 补强已修复；②已修复（= exec-a）`

来源：全流程使用总结提炼的「最值得改进 3 个点」，逐条对源码核实后裁决。

- ✅ **full-a 集成层测试盲区（组件单测 1324 全绿但 layout 守卫重定向只有部署+浏览器暴露）**。**修法（persuasion 补强，非加门）**：CLI 无法替 agent 判断「集成层是否测到位」（选哪几个路由实例冒烟是语义判断，推 agent）；改两处引导——① verify 探针 3（templates/prompts/verify-probes.md）加第 4 条集成盲区提示「测试文件存在 ≠ 集成正确，路由/layout 守卫重定向、跨模块装配这类集成 bug 组件单测覆盖不到，只有集成/冒烟/E2E 才暴露；对路由/layout/跨进程装配敏感 task 额外检查集成冒烟覆盖，无则标 ⚠️ 集成层未验证」；② plan.js 全局验收标准模板加一条「集成敏感 task（路由/layout/跨进程装配）建议加集成冒烟验收——组件单测全绿 ≠ 集成正确」。
- ⊘ **full-b Task Review base..head 对账坑（子代理不 commit 则 diff 空判伪造，被迫 commit + 改 7 个 review head）**。**评估：= exec-a，本次会话已修复**（task-review.js:529 `parsePorcelainFiles` 解析 `git status --porcelain`，working-tree 改动并入 diffFiles 后再交叉比对，未 commit 不再误判伪造 + 回归测试）。用户总结基于修复前会话，登记确认，无需重复修。
- ✅ **full-c 5 小时 API 配额无 checkpoint 续跑（task-07 429 中断只能干等重置）**。**修法（prompt 引导续跑，非加 task 级 checkpoint 机制）**：核实发现 checkpoint 机制已存在——execute 按 Wave step 持久化（CLI 每 Wave 完成落盘 progress）+ task 级进度靠 plan.md checkbox 隐式持久化（buildWavePrompt 明说「勾选 plan.md 中的 checkbox」，429 中断后勾选状态保留）；429 是 LLM API 配额非 CLI 失败，CLI 无法防中断本身。缺的是**传播**（agent 不知道能续跑）：execute buildWavePrompt 加「### 中断续跑」段——plan.md 已勾选 `- [x]` task 跳过不重跑（先确认产出完整）、`sillyspec status` + `sillyspec run execute` 回当前 Wave step 续跑、不重置已完成 Wave、产出缺文件 task 补做。**否决 task 级 CLI checkpoint**（改 progress 存储 + execute 推进逻辑 + Wave 并行语义，工程大，收益边际——checkbox 已隐式持久化）。

---

### 2026-08-06 复盘增补（第二批工具驾驭反馈：stage-review 注册命令 / execute format / worktree python）
状态：`2 项已修复（exec-e/f）+ 1 项让出并行全流程（exec-d）+ 2 项登记 defer + 1 项裁决 consumer 侧`

来源：sillyhub 项目工具驾驭复盘第二批 5 个负面点，逐条对源码核实后裁决（先查本债单 + 源码实证，不重复提议已决策项）。

- ✅ **exec-d Stage Review marker 死锁无注册入口（已落地 b5844c9 + 本次补 gate 报错指向闭环）**：marker（`current-stage-review-run-id-<stage>-<change>`）只在 prompt 渲染 `{REVIEW_TIER}` 时写（`prompt.js:563`），调度者手动派独立子代理写 review.json 不走该渲染 → `getLatestStageReviewRunId` fallback 扫描，目录名/reviewedFiles 稍不符即 null → Stage Review Gate 报缺 review.json 硬阻断（`gates.js:302`），**`--skip-approval` 不绕产物 gate**（三段链证实：command.js 不传 → complete.js 不传 → runStageCompletionGates（gates.js 的 runStageCompletionGates 定义段）签名不收）。**落地**：`sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute> [--from <已有review.json>]` 已由 commit b5844c9 合入 main（registerStageReview（stage-review.js 的 registerStageReview 段） + index.js 的 register-stage-review caseregister-stage-review case + `stage-review-register.test.mjs` 11 测试）——生成 `review-<ts>` runId + 建 `stage-reviews/<stage>-<runId>/`（--from 校验 schema 后落入 / 无则 cannot_verify 草稿填对 reviewType/reviewedFiles[0]=changes/<change>/<mainDoc>/docHash）+ 写 marker + `validateStageReview` 自检。**本次补闭环**（2026-08-12 quick ql-20260812-002）：`printStageReviewResult`（stage-review.js:416）errors 分支补一行指引「可用 sillyspec register-stage-review --change <名> --stage <当前stage> [--from] 一步生成 run目录+review.json骨架+写marker+自检」，controller 阻断后即知有此命令（原报错只写「补全后重新 --done」不引导）。加 Case 12 测报错文案含命令名。否决给 gate 加 --skip-approval 旁路保 fail-closed 语义。
- ✅ **exec-e Wave 子代理只跑 lint check 没 format**：`execute.js` buildWavePrompt + acceptanceSteps 通篇无 format 引导（只"不要频繁编译"），子代理只跑 check 到 commit 才被 consumer pre-commit hook 拦（ruff format/prettier）。**修法（prompt 引导）**：buildWavePrompt 调度要求 item 4 + acceptanceSteps「运行测试」step operation 3 加"既跑 lint check 也跑 formatter（ruff format/prettier --write/black），不要只 check"。
- ✅ **exec-f worktree 内 python 工具链不供给**：`worktree-deps.js` detectProjectType/inferInstallCommand 原无 python 分支（只 maven/gradle/nodejs/generic），python 项目根误判 generic → n/a → ruff/pre-commit 二进制不供给。**修法（源码）**：detectProjectType 加 python（pyproject.toml/requirements.txt）+ inferInstallCommand 加 `uv sync`（pyproject/uv.lock）/`pip install -r requirements.txt`（纯 requirements）；execute「确认 worktree 路径」步加工具链预告（先 --version 确认，缺则 uv tool install/uv sync）。detectProjectType/inferInstallCommand 导出做纯单元测（7 断言，不真跑 uv）。注：modules 块的 python 子模块供给未做（类比 nodejs modules link 是更大工程），env 预告覆盖发现侧。
- ⏭ **exec-g worktree 与主仓 .sillyspec 文档分叉（登记 defer，超 quick 范围）**：`task-review.js:558` filterDeliverableFiles 一刀切排除 `.sillyspec/`，无 worktree→main 反向同步；Reverse Sync 触发的 design.md/模块文档改动留在 worktree 分支，apply 时被挡，只能手动 `git show` 捞（历史已踩）。**裁决 defer**：修法需设计决策（apply 分级放开 `.sillyspec/changes/<change>/` 保留 `.sillyspec/docs/<project>/modules/` 排除 / 或 apply 完给文件级分叉清单警告 / 或 prompt 硬要求手动 git show 恢复），有越界风险，留单独完整流程排。
- ⏭ **exec-h gen:types 自报不准（登记 defer，超 quick 范围）**：证据校验只覆盖 git diff + docHash，**无生成产物校验**；唯一硬对账 `runVerifyTestCheck` 只覆盖 test 命令，gen:types/build/codegen 全靠子代理自觉（声称"无漂移"未必真跑）。**裁决 defer**：修法需设计决策（verify-postcheck 加 runVerifyArtifactCheck 亲自跑 codegen 对账产物 / review.json 加 artifactEvidence 字段 + prompt 硬要求贴 stdout / verify-probes 加探针 7 / 诚实标注底线），是中等工程，留单独完整流程排。**2026-08-15 复盘补充（用户负面 ③）**：gen:types 与 worktree 配合仍有坑——新端点类型重复标识符在主仓 commit 时才被 CI hook 拦住（worktree 收尾时不跑）。用户建议 gate 在 worktree 收尾时预跑 gen:types+tsc。**通用化思路（符合定位：CLI 不认识 consumer 命令）**：local.yaml `commands.build` 键已登记（config-schema.js）但无收尾消费方——可在 execute wave 收尾 gate / verify 前置步加「预跑 commands.build（worktree 内）」硬门，谁配谁知道命令内容，SillySpec 只负责在收尾时机强制执行 + 失败阻断。与 cc-③（gen:types worktree dump 主仓 backend，consumer 侧）联动：若 build gate 落地，consumer 需先给 gen-api-types.mjs 加 `--backend <path>` 支持。仍 defer，归 exec-h 范畴一起设计。
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

### 2026-08-08 候选增补（多 agent 并发写预检）→ 已实现
状态：`✅ 已实现（2026-08-08 主会话 in-place execute，task-01..05 全完成，npm test 全量 EXIT=0 + lint 73 文件；详见下方「实现落地」）`

来源：2026-08-08 自审收尾 + multi-agent-review 同步推进中，主会话与并行会话在同一仓库实打实撞车（俩 session 都要动 `quick-audit.js` / `shared.js` / `complete.js`）。复盘暴露**真实功能缺口**：CLAUDE.md 第一段立身之本就是「多 agent 同时操作代码」，但 SillySpec 无任何命令让 agent 感知「工作树里有他者未提交改动 / 存在其他活跃 change 目录」——`src/run/shared.js:425` 已在 quick-audit 内部识别出「并发他者会话的工作」，却作为元数据噪音整体放行（「非关联变更目录整体视为元数据放行」），agent 完全无从知情。对应记忆坑：git commit 扫入预暂存并行工作、并发 session 撞重叠 change。

**钩子点（用户指定设计约束）**：并发检测应在 **quick / execute 写操作前**预检（`quick --done` 前、`execute --done` 前），而非仅作独立诊断命令——写操作是撞车高发点，预检才有拦截价值。

**设计草案**：
- **信号**：① `git status --porcelain` 脏文件分类——在当前 change 关联范围（allowed_paths / change 目录）内 vs 他者；② `.sillyspec/changes/` 下其他活跃 change 目录（他者会话）；③（可选）quick session marker。
- **复用**：`shared.js:406` 的「关联 vs 他者」分类逻辑（已存在，仅需从静默放行改为对外报告）。
- **行为（关键决策）**：**非阻塞 advisory（WARN）**，不放硬门——打印「⚠️ 检测到 N 个非本变更关联的他者未提交改动，可能并发撞车：[files]；提交请用显式 pathspec 隔离」。**否决硬阻断**：项目立身前提就是合法并发多 agent 协作，阻断会破坏正常工作流；且「是否撞车」属软 / 意图判定，按 P4.3 / sillyhub 语义边界归 advisory，不归 SillySpec 确定性 gate。

**待决策项**：① 覆盖哪些命令（仅 `--done` 写入点，还是连 `quick` / `execute` 启动也检？）；② 检测范围（仅他者脏文件 vs 含活跃 change 目录，或两者）；③ 是否同时实现只读 `sillyspec doctor`/`runtime list` 子命令供 agent 主动查询（预检 + 主动查询两条路）。

**规模 / 流程**：跨 quick 与 execute 多写路径的行为语义变更，判 **large，应走完整流程**（brainstorm → plan → execute），不走 quick。

**实现归属 / 让出**：实现触及 `quick-audit.js` / `shared.js` / `complete.js` / `gates.js`——**当前全部由并行 session（multi-agent-review-2026-08-08.md §6 行动列表）活跃占用**。本会话仅登记候选 + 设计草案，不动源码不撞车；待并行 session 完成，或另起 `YYYY-MM-DD-concurrent-write-preflight` 变更实现。

**实现落地（2026-08-08，in-place execute，change `2026-08-08-concurrent-write-preflight`）**：并行 session 完成后，本变更走完整 brainstorm→plan（四件套 + Design Grill D-001..D-008 全 accepted），execute 阶段主仓 in-place 实现。worktree 半截 execute 的 baseline checkpoint + task-01..03 草稿被采纳复用（避免重写）——采纳时发现并修正 task-03 钩子位置（见下）。
- **task-01** `src/run/concurrent-detect.js`：detectConcurrentChanges + formatConcurrentWarning 纯函数（复用 isQuickMetadata 分类，D-004 trim:false / D-005「脏变更目录」文案 / D-008 内联 extractChangeDir）+ 单测 30 断言。
- **task-02** `src/run/complete-handlers.js`：quick --done 钩子（auditQuickCompletion 后，ownFiles = review.changedFiles ∪ mergedGuard.baselineFiles，D-001 并入 baseline / D-003 null 兜底）。
- **task-03** `src/run/gates.js`：execute --done 钩子——**关键修正：挂在 completeStageGates 入口（design §5/plan task-03 原文），非 runStageCompletionGates**（后者在 runValidators/Stage Review 之后，前置 gate 失败时钩子不触发，削弱「完成时报告」价值）。采纳 worktree 实现的 completeStageGates 入口位置（覆盖所有 completeStageGates 调用路径含 continueStep/completeStep）+ readDesignOwnFiles 状态机解析 design §6 清单（D-002 in-place ownFiles）。
- **task-04** `test/concurrent-preflight-hooks.test.mjs`：25 断言（钩子真实行为 + 挂载契约，B-004 诚实降级标注——完整 E2E 驱动需造 runValidators 全套 execute 产物 + Stage Review tier fixture，偏离钩子焦点）。
- **task-05**：npm test 全量 EXIT=0（含 2 新测试文件 30+25 断言）+ lint 73 文件；文档同步评估=**无需**（无 stages/prompt/SKILL 改动，advisory warn 不落盘、不引入新运行时文件类型，AC-10）。

非阻塞 advisory + fail-open 落实：两钩子均 try/catch 兜底，console.warn 后照常推进，不改 audit status / gate 通过性 / isQuickMetadata 语义（FR-07 回归守护）。dogfood 天然 E2E：本变更 quick --done 收尾时若工作树有他者文件即触发 warn（当前主仓工作树仅本 change 文件，干净仓零输出，验证 AC-08）。

**worktree cleanup 踩坑复发（更新 memory）**：execute 收尾 `git worktree remove --force` 删孤儿 worktree 时，递归删了 junction 目标——**主仓整个 node_modules 被删空**（memory `sillyspec-worktree-cleanup-deletes-node-modules` 记录的坑，本次比记录更严重：全删而非部分误删）。恢复遇 npm 12 EALLOWREMOTE（package-lock 里 yoctocolors-cjs 的 resolved 指向 npmmirror 镜像，但项目 registry=npmjs.org，npm 12 视 remote tarball 拒绝；`allowed-hosts`/`fetch-allowed` 均非 npm 12 有效配置）→ 解法 `npm install --registry=https://registry.npmmirror.com`（registry 匹配 lock URL，remote 包降级为正常 registry 解析）。已更新 memory `sillyspec-worktree-cleanup-deletes-node-modules`。

### 2026-08-09 增补（execute run marker 漂移致 enforceReviewJsonGate 误报，对称缺口）
状态：`✅ 已落地（2026-08-10，quick ql-20260810-003-866c）`——按原 defer 前提（complete-gate-atomicity 已归档 + 主仓干净）落。**注意：实现用的是「无视 marker 扫 execute-runs 取含 tasks/ 真实 run」（新 helper `resolveLatestExecuteRunIdWithTasks`），非下文方案 A 的 `resolveLatestExecuteRunId` fallback**——后者见 marker 非空即原样返回（不校验目录）、且 :333-343 只在 marker 为空时兜底，都接不住「marker 非空指向坏目录」场景；方案 A 经核实不成立，落地时改用扫描修法。

来源：complete-gate-atomicity 变更 execute --done 卡「review.json 字段校验阻断」，诊断发现是 marker 漂移（非 review.json 真缺）。

- ⏭ **gate-atom-a enforceReviewJsonGate 漏 resolveLatestExecuteRunId fallback**：`current-execute-run-id-<change>` marker 与 run 目录可脱节——`generateExecuteRunId`（task-review.js:660）只生成时间戳字符串写 marker，run 目录由 `ensureTaskReviewDir`（task-review.js:976）在写 review.json 时才建。marker 在 stage.js:92 / prompt.js:515 / gates.js:377 / task-review.js:660 任一处被判「缺失」即 generate 新 ID 写盘（旧 marker 被删 / 格式迁移 / 并行 cleanup 时触发），新 run 目录隔离不继承旧 review.json → marker 漂移 = 旧 review 全部失联。**enforceReviewJsonGate（gates.js:112-133，每次 execute --done 早跑）直接 `readFileSync(marker)` 拿值就用，不校验目录存在、不 fallback**；而同文件阶段级 Task Review Gate（gates.js:374-380）marker 为空时已 fallback `resolveLatestExecuteRunId`（task-review.js:702，扫 mtime 最新真实目录）。**self-audit-2026-08-07.md:103/107 当年修了后者漏了前者——同一兜底两处口径不一致**。实证：marker=`exec-2026-08-09-141248`（14:12:48 写），141248 目录 14:21:22 才建出，--done 落在中间 → 去 141248 找 task-01 review.json 报「不存在」，而真实齐备的 review.json 在 `exec-2026-08-09-112734`（task-01~06 全有）。**修法（方案 A，最小正确）**：enforceReviewJsonGate 读 marker 后，若 `execute-runs/<executeRunId>/tasks/` 不存在，fallback `resolveLatestExecuteRunId({ runtimeRoot, changeName })`（对齐 gates.js:374-380）；补测试（marker 指向不存在目录 + 旧 run 含完整 review.json 时 --done 不误报）。**否决方案 B**（generateExecuteRunId 写 marker 时同步 mkdir 空目录）：只保证目录存在不保证 review.json 存在，marker 漂到新 run 后空目录照样报「review.json 不存在」，治标不治本。当前 complete-gate-atomicity 因 141248 事后补齐 task-01~04 review.json 不再被阻塞；待该 change 归档 + 主仓工作区干净（现有无关 staged brainstorm 改动需先厘清归属）后开独立 quick 落 A。

---

### 2026-08-11 复盘增补（brainstorm + plan 工具驾驭：6 条裁决）
状态：`1 项已修（bs-c）+ 2 项可低成本修待 quick（plan-a/plan-c）+ 2 项登记 defer（bs-b/plan-b）+ 1 项搁置待复现（bs-a）`

来源：两轮工具驾驭复盘（brainstorm 跑通 + plan 跑通），6 条逐条对源码核实裁决（先查本债单 + 实证，不重复已决策项）。

**brainstorm 复盘**
- ⊘ **bs-a step7 四件套门时机错配（裁决：用户误判，代码无此 gate）**。`validateFileLocations`（gates.js:457-503）= advisory 打印不阻断（gates.js:498 注释 + stage-artifacts.md:57），守卫 `settledCount===total && total>0`（gates.js:653）仅阶段全部步骤完成时跑，step7（Design Grill）--done 时 step8 还 pending 不触发。「step7 被拦补三件」与代码不符，疑似把 step8（生成规范文件）--done 的 advisory `⬜ 未找到` 误读为硬拦 / 混淆 Stage Review Gate（查 design.md docHash 不查四件套）。**搁置**：待用户贴现场 CLI 输出（⚠️/❌/⬜ 标记 + exit code）再定 advisory 可读性优化（⬜→ℹ️ 提示不阻断）。
- ⏭ **bs-b platform sync 10s 超时反复 warn（登记 defer）**。`sync.js:28` REQUEST_TIMEOUT_MS=10_000 + `:204-208` 超时 console.warn。契约 sillyhub-progress-sync-contract.md §10 明确「超时 → warn 不阻断」intentional（网络失败可见性，否决静默）。根因 sillyhub 后端 POST progress 端点未就绪（契约 §11 P0 待排期）→ 每步完成触发 sync 干等 10s + warn。**真新建议（债单+契约均无）**：客户端连续失败 N 次后该 session 退避降频（首失败仍 warn 保可见性）。defer——根治在 sillyhub 后端落地，客户端降频是缓解候选单独排。
- ✅ **bs-c _module-map.yaml schema_version warn 缺升级路径（已修 ql-20260811-006-a73f）**。`prompt.js:44-46` 两行 warn（B2 advisory）只报问题不给 CLI 出路，预存 v1 漂移文件每个读 map 的 step（brainstorm step2/3/7）都刷屏。修法（纯文案）：两行各追加「跑 sillyspec modules rebuild 升级到 schema_version: 2 可消除此警告」。node --check + lint 250 文件 + npm test（除 pre-existing db-concurrency 无关失败）全绿。

**plan 复盘**
- ⏭ **plan-a 门控时机错配（blueprint 共享文件 + 连续 id 全堆 postcheck，可低成本修 persuasion）**。`validateBlueprintConsistency`（plan-postcheck.js:1071-1114，同 Wave 共享 allowed_path → error）+ `validatePlanFeasibility`（:724-738，task id 不连续 → error）均在 `executePlanPostcheck`（末步）跑。用户先写 8 张 TaskCard（step4）才在 postcheck（step5）被拦，两轮返工（合并 + 重编号）。**真新**（债单 plan-b 行数丢字段 / plan-c plan→scan 回头路 均不同维度）。修法（persuasion 前置，非加门）：plan.js step4「生成 TaskCard」prompt 加前置提示「多 task 共享 allowed_path → plan.md 须分 Wave（否则 postcheck 拦同 Wave 并行覆盖）；task id 从 1 连续（否则 postcheck 拦重编号）」+ light plan 模板（plan-light-needs-wave-heading.md 关联）同步。注：「step2 生成 plan 后预检」不可行——blueprint 校验需 tasks/ 卡片 + plan.md Wave 划分，step4 才齐；前置点只能在 step4 prompt。留 quick 修。
- ⏭ **plan-b docHash 失效连踩两次（= P6.1b 第 3-4 次复发，不推翻 defer）**。`stage-review.js:71` prompt 已警告「review.json 写入后若 mainDoc 再被改必须重算 docHash，gate 重算 sha256 比对不符判伪造」。用户 plan v2（改 plan）+ v3（重编号）各重算一次。**= P6.1b 复发**（债单 defer：独立中等工程，agent 算 hash + CLI 重算对比 enforcement 已有效；2026-08-04 记第 2 次摩擦 stage-review.js:69）。本次第 3-4 次，**更新 P6.1b 复发频度，暂不推翻 defer**。候选缓解：① 落地 exec-d 的 `register-stage-review --from <已有review.json>` 命令（重算 docHash 落入，给 agent 一条改文档后重算命令，非手算 sha256）；② 长期 P6.1b（review.json 写入链路 CLI 算 hash）。
- ⏭ **plan-c review.json run-id 路径易拼错（部分新，exec-b 相关，可低成本修）**。用户「plan-review-YYYY-MM-DD-HHMMSS 漏连字符给子代理」。`stage-review.js:56` 路径 = `{SPEC_ROOT}/.runtime/stage-reviews/<stage>-<runId>/review.json`，agent 自拼易漏连字符。exec-b 已修 marker 格式校验（^review- 前缀）+ fallback 按变更过滤，但**未解决 agent 拼路径错**。**真新建议**：prompt.js 注入时除 `{STAGE_REVIEW_RUN_ID}` 外加完整目录路径占位符（如 `{STAGE_REVIEW_DIR}`），agent 直接用不拼。留 quick 修（先确认 prompt.js runId 注入点）。

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
| 2026-07-22 | P4.1 | verify risk tier 重复段删除（23→2 行诚实标注；实证 defer 理由失效：detectChangeRisk 已存在并在 stage-contract.js:466 detectChangeRisk enforce），test(58/0) |
| 2026-08-04 | P4.3a / P6.1b | 复盘登记（doc-only，不动源码）：Grill fail 后复审边界未定义（新观察，随 P4.3 维持 defer + 诚实标注缓解留 follow-up）；docHash 手算摩擦复发旁注（不推翻 defer） |
| 2026-08-04 | 复盘增补（plan+quick） | 登记 4 新债（plan-b TaskCard 行数丢字段 / plan-c plan→scan 回头路半修 bug / quick-① QUICKLOG 四段落盘 / quick-② lint doc 空转）+ 3 裁决否决（plan-a 已有逐字示例 / plan-d=P4.3a / quick-③=troubleshooting 同根），doc-only 不动源码 |
| 2026-08-04 | plan-b/c/quick-①/② follow-up | 4 新债全部修复：plan-postcheck 加 title_zh 校验 / stage-machine _getNextSuggestion 跳过 scan（根因修）/ quicklog 单行四字段归一 / CLAUDE.md+template 规则8 精细化；补 4 处回归测试，npm test 108/0、lint 66/0 |
| 2026-08-04 | execute 复盘（a/b/c） | 3 项新债全修：verifyReviewGitEvidence working-tree 并入 diffFiles（exec-a）/ getLatestStageReviewRunId marker 格式校验 + fallback 按变更过滤 fail-closed（exec-b）/ resolveApplyAllowSet = design ∪ plan allowed_paths（exec-c）；补 3 处回归测试 |
| 2026-08-04 | verify 复盘（a/b/c） | a 评估保留（detectChangeRisk 显式豁免已实现 + verify prompt 已告知，非新债）；b 修 verify step6 不重复手动跑全量测试（统一交 CLI 对账）+ docs/prompt 重提取 + file-lifecycle 同步；c 修 gates.js verify 对账前加进度预告（放调用点不污染 machine-interface --json） |
| 2026-08-04 | 全流程复盘（a/b/c） | a persuasion 补强：verify 探针 3 加集成盲区提示 + plan 全局验收标准加集成冒烟条；b 已修复（= exec-a，本次会话已落地）；c prompt 引导续跑：execute Wave prompt 加中断续跑段（checkpoint 机制已存在，补传播）；否决 task 级 checkpoint 机制 |
| 2026-08-06 | 第二批复盘（exec-e/f 修复 + exec-d 让出 + exec-g/h defer + exec-i 否决） | exec-d 已实现 register-stage-review 命令（34 测试过，备份仓外 temp/sillyspec-exec-d-backup-20260806/）但因与并行全流程 2026-08-06-sillyspec-self-tooling-fixes 坑1 撞车让出（设计存债单 exec-d 条目供采纳）；exec-e execute prompt 加"既跑 check 也跑 format"引导（buildWavePrompt 调度要求 + acceptance 运行测试步）；exec-f worktree-deps 加 python 分支（uv sync/pip）+ execute 确认 worktree 路径步加工具链预告；exec-g/h defer（worktree .sillyspec 文档分叉 / gen:types 自报无产物校验，需设计单独完整流程排）；exec-i consumer 侧否决（frontend hook 假失败）；本批 commit exec-e/f，全量 test 116/0、lint 68 |
| 2026-08-07 | sss/sss1 审计复盘（A1-5 修 commit 1efc7c8 + A6 直接 commit / B1-B2 并发已修 + B3-B5 defer） | A组纯减法 5 项修并提交 1efc7c8（execute 建议模型空指令→诚实模型档位条目 / quick 单会话兼容退路 / execute 两处末尾孤立引号 / uncategorized 起始反引号 / scan 括号，+ docs/prompt 镜像同步删 3 条过时"逐字保留"注释，test 122/0 lint 68）；A6 propose 死代码已删——直接 commit（quick 审计 shared.js:516 对删除恒 blocked 无 flag 解锁；scope 纠正排除 stage-contract-spec proposal.md 文件规则/index.js knowledge 子命令两个 LIVE）；B1 decisions 矩阵降级 / B2 module-map 合并 均由并发 session b904442 / e2b3422 修完（非本会话）；B3 scan 死文档 / B4 plan Step4 token / B5 plan 自检对齐 defer；raw 文件 sss.md/sss1.md 保留作历史参考 |
| 2026-08-07 | sss/sss1 审计 B4+B5 落地（ql-20260807-011-d831） | B4 plan TaskCard 规则抽 templates/prompts/taskcard-rules.md + buildCoordinatorStep 改 {{include: taskcard-rules}}（复用 P2.2.3 include 机制，收益=维护性+可单独校验，token 不省是机制固有）；B5 核验自检清单 14 字段全覆盖 validatePlanFeasibility 硬校验 9 字段，随 B4 拆分硬校验/规范约定两组消 agent 白检误导；同步 docs/prompt 镜像 + 回归测试 8 断言，npm test 全量 0 失败、lint 72 |
| 2026-08-08 | concurrent-write-preflight 落地（债单末尾候选→实现） | 多 agent 并发写预检 in-place execute（change 2026-08-08-concurrent-write-preflight）：task-01 src/run/concurrent-detect.js 检测核心（detectConcurrentChanges+formatConcurrentWarning 纯函数，复用 isQuickMetadata「关联 vs 他者」分类，D-004 trim:false/D-005 脏变更目录文案/D-008 内联 extractChangeDir，fail-open）+ 单测 30；task-02 complete-handlers.js quick --done 钩子（D-001 ownFiles 并入 baselineFiles/D-003 null 兜底）；task-03 gates.js execute --done 钩子——采纳 worktree 实现修正位置（completeStageGates 入口=design 原文，非初版误挂的 runStageCompletionGates）+ readDesignOwnFiles 状态机解析 design §6（D-002）；task-04 集成测 25 断言（B-004 诚实降级标注）；task-05 npm test 全量 EXIT=0（+2 文件 55 断言）+ lint 73，文档评估无需同步；worktree cleanup 坑复发（node_modules 全删）→ npmmirror registry 恢复 + memory 更新 |

| 2026-08-09 | execute run marker 漂移（enforceReviewJsonGate 漏 resolveLatestExecuteRunId fallback 对称缺口） | 登记 defer（方案 A 已定：gates.js:112-133 加 fallback 对齐 :333-343；否决 B 空目录）；self-audit-2026-08-07 修了 Task Review Gate 漏了 enforceReviewJsonGate；complete-gate-atomicity 因 141248 事后补齐 task-01~04 review.json 不再阻塞；doc-only 不动源码 |

---

### 2026-08-11 复盘增补（sillyhub 进度同步项目工具驾驭反馈：4 负面点归宿裁决 + 1 真新债立项）
状态：`3 项已有归宿/已有缓解 + 1 项真新债（跨仓 task）→ 用户拍板走完整流程`

来源：sillyhub 项目（multi-agent-platform 仓）平台进度同步 change（13 task execute）的驾驭复盘 4 个负面点。逐条对照本债单 + 源码实证后裁决，先查已决策项避免重复提议。

- 🔴 **cc-① 跨仓 task：CLI 查不到跨仓 commit 判伪造（真新债，用户拍板立项 → 完整流程 brainstorm）**：task-09/10 改 sillyspec 仓代码，CLI 在主仓（multi-agent-platform）`git` 查不到 sillyspec 仓的 commit → `verifyReviewGitEvidence`（`src/task-review.js:512-562`）判 base/head 非真实 commit 或 changedFiles 与主仓 git diff 完全不相交 → 判 review.json 疑似伪造 → Task Review Gate 阻断；changedFiles 非空时强要主仓 working-tree 对账相交。workaround：base=head 主仓空 commit + changedFiles=[] 空数组走 WARNING。**用户范围拍板：task 级 + apply/verify 全链路**（非仅 task 级校验）。涉及面：① task 声明 `repo:` 字段（plan TaskCard 协议 + plan.js 解析）；② CLI 跨仓 git 探测（worktree.js/progress 已有 `--git-common-dir` 祖先链探测可复用，注意 `[[sillyspec-worktree-spec-drift-blindspot]]` worktree 副本漂移硬阻断边界）；③ `verifyReviewGitEvidence` 支持多仓（每仓独立 base/head/changedFiles/diff 对账，非合并 diff）；④ `task-review.js:558` filterDeliverableFiles 一刀切排除 `.sillyspec/` 需分级放开跨仓交付（exec-g defer 同源，合并立项）；⑤ `runVerifyTestCheck`（gates.js:225）跨仓 cwd 对账。留 brainstorm 细化「跨仓 task 声明协议 / 仓库解析锚点 / apply 分级 / verify 跨仓对账」四象限。
- ⏭ **cc-② Design Grill 漏掉 PK NOT NULL vs None 可写矛盾（= P4.3 已 defer 复述，不重复登记）**：design §8.2 PK NOT NULL 与 §9 兼容策略 None 可写矛盾到 execute 跑测试才暴露，浪费 W1 commit + 回退。**归宿**：Design Grill 的语义一致性/可行性判定 = P4.3 已 defer 推 sillyhub（本债单 :59/:264），本仓 Grill 仅机械格式检查（P3.1 done）。若未来本地 Grill 保留，可加「model 约束 vs 兼容策略」一致性子项作为 P4.3 的旁注 follow-up，**不另立条目**（语义工作 CLI 无法替代是 defer 既定理由）。
- 🔶 **cc-③ gen:types worktree 模式 dump 主仓 backend（部分已登记 + consumer 侧剥离）**：`gen-api-types.mjs` 内部 dump 主仓 backend 覆盖 worktree openapi，需手动绕过。**归属核实**：`gen-api-types.mjs` 在 multi-agent-platform 仓 `frontend/scripts/` + `sillyhub-daemon/scripts/`（consumer 侧，非 sillyspec 仓）。sillyspec 侧相关债 = exec-h（verify 不验生成产物，defer，:150/:267）。**裁决**：gen:types 的 worktree 友好性（`--backend <path>` / worktree 自动检测）属 consumer 侧脚本改进，SillySpec 仓做不完；若 cc-① 全链路落地触及 verify codegen 对账，可在 exec-h 范畴内一并设计，否则 consumer 侧另起。
- ✅ **cc-④ stage review + task review 双手写负担重（已有缓解，记录改进空间）**：13 个 review.json 手写负担重，implementer 自审难达 tier=independent 本意。**归宿**：exec-d `sillyspec register-stage-review`（`src/index.js:464`，生成 stage 级 review.json + docHash + marker，治 tier=independent marker 死锁）+ `sillyspec backfill-reviews`（`src/index.js:426`，为 task 补 cannot_verify 草稿）**已落地**，缓解了 stage review marker 死锁 + task 草稿自动补。**改进空间**（非硬阻断，留 follow-up）：① tier=independent 的 task review 仍需独立子代理手写（草稿是 cannot_verify 不是 pass/fail）；② 13 个 review 的协调器/批量生成命令（类 register-stage-review 的 task 级等价物，exec-d 让出时已设计过 task 级 register-task-review 思路）可评估是否值得做。

### 2026-08-12 复盘增补（sillyhub 第二批工具驾驭反馈：quick 边界 + checkApproval fail-open）
状态：`1 项真缺陷已修（quick ql-20260812-004）+ 1 项设计边界登记活跃坑`

来源：sillyhub 项目 platform_sync change 的 quick 流程驾驭复盘 2 个负面点。sillyhub 视角「CLI 是全局安装包本仓修不了」，但**实际在 sillyspec 本仓即可修**（发布版 sillyspec 即 sillyhub 用的那个）。

- ✅ **cc-⑤ checkApproval fail-open 粒度过粗（真缺陷，已修 ql-20260812-004）**：`sync.js:502` `fetchJson` 返回 null（404/断网/超时/非JSON）时 `checkApproval` 套 `{status:'pending'}`，与真 pending（审批中）+ 未连接平台（合法本地）三者混为一谈；`command.js` 3 处调用点（execute 启动审批门控）只识 rejected/pending，请求失败走 pending 分支误报 `⏳ 审批待处理中... 提示 --skip-approval`，agent 误以为要等审批。用户报「CLI 把 404/null 误判 pending，危险默认值，别的项目/别的端点缺失还会踩」。**修法**：`sync.js:502` 请求失败返回 `{status:'unknown', reason:'请求失败（404/断网/超时），无法核实审批状态'}`，`command.js` 3 处加 unknown 分支 warn「审批状态未知，按本地模式放行（非审批中，无需等待）」。approved/rejected/pending（未连接平台/未指定 changeName 的合法本地降级）语义不变，**fail-open 本地优先语义零回归**（sync.js:30 设计意图保留：未连接平台是本地独立用户合法默认）。新增 `test/check-approval-status.test.mjs` 5 断言（未连接平台 pending / 请求失败 unknown / fetch 抛错 unknown / approved 透传 / 未指定 changeName pending）。
- 🔶 **cc-⑥ quick --files 边界 vs monorepo gen:types 多消费方派生产物（设计边界，登记活跃坑，不改代码）**：monorepo backend 改一处 → frontend + daemon 两份 `api-types.ts` 都该 gen:types 同步，但 quick `--files` 启动时锁定边界，跑 daemon gen:types 触发 `auditQuickCompletion`（`run/shared.js:610` allowedFiles 校验）拦边界外文件，只能同步一份另一份留债。用户建议「启动时列全所有 gen:types 产物」或「审计把 gen:types 派生产物设白名单」。**裁决登记不改代码**：① 白名单不可行——SillySpec 是流程控制器，不该认识 gen:types/api-types.ts 这类 consumer 业务产物（违反定位，memory sillyspec-positioning-not-features）；② 根因是 monorepo 多消费方派生产物同步**本就不适合 quick**（quick 设计假设 ≤3 文件、范围明确），跨模块联动该走 execute 或 consumer 侧自己的脚本（gen-api-types.mjs 在 multi-agent-platform 仓 frontend/scripts + sillyhub-daemon/scripts，consumer 侧）；③ 关联 cc-③（gen:types worktree dump）+ exec-h（verify 不验生成产物）同属 gen:types 系列债，均 defer。**结论**：quick --files 边界设计正确（fail-closed 防越界），gen:types 多消费方同步是 consumer 侧 monorepo 工程问题，非 SillySpec 缺陷。

### 2026-08-14 增补（全仓安全审查：P1 已修 + P2 遗留登记）
状态：`P1 第一批已修（quick ql-20260814-009-1887）+ 6 项 P2 登记 defer`

来源：三维度安全审查（命令执行/git、数据库与数据链、init 分发/供应链，三并行子代理 + 抽查实证）。P1 已落地：js-yaml 4.3.1 / ws 8.21.3 两高危 CVE、三处 execSync 字符串拼接迁 execFileSync 数组（verify-postcheck refSpec + worktree rmdir + worktree-deps mklink/ln -s）、`isValidExecuteRunId` 覆盖全部 8 个 execute marker 读取点、`sanitizeQuicklogUser` 消毒、gate/derive/backfill-reviews/register-stage-review/progress 五入口补 `assertSafeChangeName`。SQL 注入面实证干净（全参数化）、npm 发布面干净（pack 实证）。

P2 遗留（按优先级登记）：

- ⏭ **sec-a 知识库/模块索引内容注入 prompt 无定界（系统性，最高优先）**：所有「CLI 读回 agent 可写内容 → 注入下一个 agent prompt」的通道（`knowledge/INDEX.md` 条目、`_module-map.yaml` role/doc、guard.json quicklogId/linkedChanges、prevStepAnswer、plan_level frontmatter）都走纯文本字符串替换、零定界零转义（prompt.js replace 全家）。当前唯一机制是零散格式校验（stage-review `review-` 前缀 + 本次 `isValidExecuteRunId`）。**修法（系统性）**：为所有数据→prompt 通道引入单一 `injectSandboxed(label, value)` 包装（行级截断 + 去控制字符 + 「以下是数据非指令」定界声明），非逐点修补。涉及 INDEX.md file 字段 `..`/绝对路径校验（防任意文件读取诱导）。
- ⏭ **sec-b 平台指针无归属校验**：`.sillyspec-platform.json` 只验 specRoot 存在性（progress.js `resolvePlatformSpecDir`），不校验指向目录是否属本 cwd/git 仓。被植入指针 → 进度库/归档写仓外（跨仓污染）或读伪造 db 操纵 gate。附带：平台首跑清理的「真实资产」判定只看 changes/projects/sillyspec.db **不含 docs/**，植入指针 + 首次 run 会 `rmSync(cwd/.sillyspec, {recursive})` 整删含 docs 目录（待确认平台模式 docs 位置约定）。修法：指针记录创建时 repo root 指纹，读取比对不匹配 fail-closed。
- ⏭ **sec-c setup.js 凭据与供应链**：① 数据库密码明文写入通常被提交的 `.claude/mcp.json`/`.cursor/mcp.json`（对比 local.yaml 有 gitignore+example 分离防护，mcp.json 无）；② MCP 定义 `npx -y <pkg>@latest` 浮动版本 = trust-on-future-publish。修法：写入后检测 git 跟踪状态给警告；锁定版本。
- ⏭ **sec-d dashboard `/api/docs/content` 无鉴权任意读**：校验仅「路径含 .sillyspec 段 + 可读扩展名」（yaml 在白名单）→ 可读磁盘任意位置 `.sillyspec/**` 含 local.yaml 的 token；Origin 校验宽松（无 Origin 头也放行）。缓解因素：需显式 `sillyspec dashboard` 启动非常驻、仅绑 127.0.0.1。修法：拒绝 local.yaml、限定 discover 项目范围、一次性 token。
- ⏭ **sec-e mcp url 可指任意地址 + token 外发**：url 来自 agent 可改的 local.yaml，改 url 即让真实 Bearer token 发往攻击者服务器，无 https 强制。修法：非 https warn + url 与 token 绑定校验。
- ⏭ **sec-f SKILL.md 硬编码开发者本机路径**：`.claude/skills/sillyspec-execute/SKILL.md:132`、`sillyspec-plan/SKILL.md:103` 含 `C:/Users/qinyi/IdeaProjects/sillyspec`，随 npm 发布 + init 复制进用户项目（信息泄露 + 违反 SKILL 对外纯净性规则）。修法：改相对路径示例。改动触及 SKILL 需按规则 19 同步。
- 低优先杂项：sync.js changeName 拼 URL 三处未 encode（:397/:481/:516，对比 :673/:960 已 encode）；fs-atomic tmp 文件名可预测（pid）无 symlink 防护；worktree-apply rescue 命令打印未转义 shell 字符串（agent 会照抄执行）；YAML 写 token 未引号包裹；quicklog note 可换行伪造条目结构；`.husky/pre-push` 进 npm 包。

### 2026-08-16 复盘增补（sillyhub 第三批工具驾驭反馈：execute 批量 + worktree + token 成本）
状态：`3 正面确认 + ①登记 defer（主仓 task 草稿锡点缺失）+ ②已修（ql-20260816-002-1506）+ ③登记 defer`

来源：sillyhub 项目工具驾驭复盘第三批。正面——execute 批量完成机制高效（8 task 勾完+代码核验过后一次性补完剩余 step）、worktree apply 顺畅（46 文件一次到位）、各类 Gate 真实拦错（task review base/head 与 git 拦扯对账拦住并行 commit 到达序写反的问题；主仓 commit 的 Local CI 拦住 node_modules 半坏，修复后过）。3 个负面点逐条对照债单 + 源码实证裁决：

- ⏭ **neg-① CLI 自动生成的 task review 草稿用错 base/head（多 task 错配形态，登记 defer）**：`generateTaskReviewDrafts`（task-review.js:769）主仓 task 分支（:809-834、:888-895）的 base/head 是 **change 级**（meta baselineCommit→worktree/in-place HEAD），每 task 相同；跨仓 task 分支（:864-887）已支持 task 卡双锡点（parseBaseCommit/parseHeadCommit，cc-① W3 落地），但**主仓 task 未用锡点**——多 task 并行各自 commit 时，task-08 草稿拿的是 task-01 时的范围快照（用户实测「拿 task-01 的范围生成」），Task Review Gate 对账时才发现，需人工覆盖。memory `execute-done-auto-draft-pitfall` 同源（backfill-reviews 自动草稿错配多 task）。**修法候选**：主仓 task 分支也读 task 卡 `base_commit:`/`head_commit:` 锡点（与跨仓分支对齐，缺锡点回退 change 级），改动集中在 task-review.js 一处；与 cc-④ 改进空间②（task 级 register-task-review 批量命令）联动。**裁决 defer 留 quick/单独排**：草稿本就是 cannot_verify 兜底（agent 复核后升级 pass/fail 是既定流程，complete.js:252 输出明示），错配不产生伪造判级（gate 对账会拦），非硬缺陷；但每 change 多 task 并行时都需人工覆盖一遍，摩擦真实，值得修。
- ✅ **neg-② worktree 自建 .venv 缺 pytest 迫使回归子代理换主仓 venv（exec-f 新维度，已修 ql-20260816-002-1506）**：worktree-deps.js python 分支（exec-f 已修）`uv sync` 会建 worktree 独立 .venv，但主仓 .venv 若是 pyenv-virtualenv / venv --copies 等非 symlink 共享形态，worktree 新 venv 无 pytest 等二级工具（uv sync 只装 pyproject 声明依赖，dev 依赖组是否装取决于 dependency-groups/uvsync 配置），回归子代理被迫换主仓 venv 跑（环境不一致隐患，好在已验证加载的是 worktree 代码）。**裁决**：不做 CLI 侧自动同步（识别「主仓 venv 形态 + 补装工具」是 consumer 环境语义，违反定位）；**已修（2026-08-16 quick ql-20260816-002-1506，commit bbf3598）**：execute「确认 worktree 路径」步工具链预告补 python 场景提示——worktree .venv 缺 pytest/ruff 等工具时优先在 worktree 内 `uv pip install pytest`（或 `uv sync --group dev`），避免回退主仓 venv 跑测试（环境不一致掩真 bug）；同步 _extracted.json + docs/prompt/execute.md 镜像，npm test EXIT=0 + lint 295 过。关联 exec-f（:148）与 memory `worktree-deps-junction-halfbroken`（nodejs 侧同病：主仓 node_modules 半坏时 worktree Junction 假阳性）。
- ⏭ **neg-③ 审查子代理不能续聊，每次复审都重启重读材料，token 成本高（登记 defer，与 P4.3 边界相邻）**：execute 的 task review / stage review 子代理是一次性上下文，fail→修正→复审需整个重启重读 design/plan/代码，token 成本随复审次数线性涨。「复审边界/是否再派」本身 = P4.3a 已 defer（语义软判定推 sillyhub/agent 自判）；但「**重读成本**」是 CLI 侧可观测的新维度——当前无任何机制降低复审时的材料重读（如 review.json 草稿随 context 复用、复审子代理 prompt 注入「前轮审查结论 + 修正 diff 而非全量重读」）。用户建议「支持 agent 续用」（同一子代理会话续聊）。**裁决 defer**：续聊能力取决于宿主（Claude Code Agent tool SendMessage / Task 续跑）非 SillySpec CLI 可控，SillySpec 能做的是 prompt 侧引导（复审子代理只喂前轮 review.json + 修正 diff，不重读全量 design/plan）——可作为 execute review 派单 prompt 的低成本改进候选，与 cc-④ 改进空间①②同范畴，留单独评估。

## 总结

- **代码完成 15 项**（B1、P1.3a/b、P1.4、P3.1、P4.1、P5.1a/b、P6.1a、P6.3、P6.4、P2.2.3、Q-A1、Q-B、Q-C）；全套 test EXIT=0、lint 49 文件通过。
- **评估保留 / 回退 4 项**（P1.1 SKILL.md 铁律、P1.2 step 内铁律、P2.4 decisions 场景化展示、Q-A2 QUICKLOG 压缩回退）——非纯重复 / 场景必要 / 压缩破坏契约断言，抽收敛反而加复杂度或削弱控制。
- **defer 6 项**（P2.1/2.2 单处模板、P4.2 batch、P4.3 Grill verdict、P6.1b docHash 全交 CLI、P6.2 wait 三态）——均有技术理由（复用价值小、语义工作 CLI 无法替代、推 sillyhub、独立工程、进度兼容），非「不做」而是「需单独排期/跨仓」。
- 核心收益：brainstorm/execute/quick/verify 的 prompt 显著瘦身，命令模板和复读铁律清除，控制力零损失（run.js 注入 + 硬门 + globalGuardrails 兜底）；P2.2.3 引入 prompt include 机制（`{{include}}` → 包内 templates/prompts/ 注入），verify 探针抽包内模板，为后续 self-contained 大块复用铺路。
- **2026-08-04 复盘增补（plan+quick）**：7 条改进点核实后，登记 4 项新 defer 债（plan-b 行数丢字段 / plan-c plan→scan 回头路半修 bug / quick-① QUICKLOG 落盘 / quick-② lint doc 空转，均需改源码留 follow-up）+ 3 项裁决否决（plan-a 源码已有逐字示例 / plan-d=P4.3a stage 通用 / quick-③=troubleshooting CRLF 条目同根）。
- **2026-08-06 第二批复盘**：5 个负面点核实后，2 项修复提交（exec-e execute prompt 加"既跑 check 也跑 format"引导；exec-f worktree-deps 加 python 分支 uv sync/pip + execute 工具链预告）+ 1 项让出（exec-d stage-review marker 死锁，已实现 `register-stage-review` 命令 34 测试过，因与并行全流程 `2026-08-06-sillyspec-self-tooling-fixes` 坑1 撞车让出，设计存债单 + 仓外备份 `temp/sillyspec-exec-d-backup-20260806/` 供采纳）+ 2 项 defer（exec-g worktree `.sillyspec` 文档分叉 / exec-h gen:types 自报无产物校验，均需设计决策留单独完整流程）+ 1 项 consumer 侧否决（exec-i frontend hook 假失败）。本批 commit 新增 test worktree-deps-python 7 断言，全量 116/0、lint 68。
- **2026-08-08 多 agent 并发写预检落地（债单末尾候选→实现）**：in-place execute 落实最后候选。新增 `src/run/concurrent-detect.js`（非阻塞 advisory 检测核心，复用 isQuickMetadata 分类产出 foreignFiles + otherActiveChanges 两信号，fail-open）+ quick/execute --done 两处 warn 钩子（try/catch 兜底，不改 audit status/gate 通过性/isQuickMetadata 语义，FR-07）。落实 Design Grill D-001..D-008 全决策。采纳 worktree 半截 execute 的 task-01..03 草稿（避免重写），采纳时修正 task-03 钩子位置（completeStageGates 入口=design 原文，初版误挂 runStageCompletionGates 会因前置 gate 失败漏触发）。npm test 全量 EXIT=0（+2 测试文件 55 断言）+ lint 73。worktree cleanup 坑复发（node_modules 全删，比 memory 记录更严重）→ memory 更新 + `npm install --registry=npmmirror` 恢复（npm 12 EALLOWREMOTE + lock 指向 npmmirror 镜像）。
