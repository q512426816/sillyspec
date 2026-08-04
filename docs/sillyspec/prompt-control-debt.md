---
author: qinyi
created_at: 2026-07-22 12:00:00
updated_at: 2026-08-04T13:31:04+08:00
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

### 2026-08-04 复盘增补（plan + quick 阶段使用复盘）
状态：`登记`（4 新债 + 3 裁决；均 doc-only 登记，未动源码）

来源：一次 plan 阶段 + quick 阶段使用复盘的 7 条改进点，逐条对源码核实后裁决（先查本债单 + 实证，不重复提议已决策项）。

- ⏭ **plan-b TaskCard 行数逼字段丢失**：plan.js prompt 要求「总长度 20~40 行」（plan.js:348/368/411/467），但 plan-postcheck.js **无 max-line 校验**（grep 无 `>40`/maxLine）→ 20-40 是纯 persuasion；且 postcheck **不校验 `title_zh` 等字段完整性**（grep 无 title_zh）→ 子代理为压行数丢字段是**静默丢失**（实证：task-05 合并 title/title_zh 只留中文 title）。**裁决 defer**：修法二选一——① 放宽 prompt 行数上限（如 20~50，复杂 task 可到 60，frontmatter 字段不可缺）；② plan-postcheck 加 frontmatter 字段完整性硬校验（title_zh 等）。均改源码超 doc-only，留 follow-up；倾向②（enforcement 优于放宽劝说，符合债单原则）。
- 🐛 **plan-c plan→scan 回头路（已知半修 bug）**：`run/complete.js:421-422` 注释明说——scan 是 STAGE_ORDER 首位且「永未完成」，通用 `_getNextSuggestion` 会「误推 scan（回头路）」；**仅 brainstorm/quick 加了专属分支**（complete.js:415/419），plan/execute/verify 仍走通用 else（complete.js:424）→ 用户 plan 完成后被提示「下一步 scan」（语义错，plan 后应 execute）。**裁决**：Bug，修法 = 给 plan/execute/verify 加专属分支（或 _getNextSuggestion 排除 auxiliary/永未完成阶段），改 complete.js，留 follow-up。
- ⏭ **quick-① QUICKLOG 四段 `--output` 落盘格式粗糙**：quick step3 `--done --output` 的四段（需求/根因/方案/结果）被 CLI 原样塞进单行 `结果：需求：…结果：…`（双层「结果：」前缀），强制 agent 手工精修拆行。属 P6「仪式负担下沉 CLI」主题——CLI 应解析四段分行落盘，不该让 agent 补排版。**裁决 defer**：改 quicklog.js 落盘逻辑（按「需求：/根因：/方案：/结果：」split 成 4 行），留 follow-up。
- ⏭ **quick-② lint 对 doc-only 改动空转**：CLAUDE.md 规则 8 要求 `--done` 前 npm test + lint，但 lint 只扫 JS 不碰 docs/（实证「Checked 66 JavaScript files」对 doc 改动零信息）。**裁决 defer**：修法二选一——① quick 按 `--files` 文件类型跳过 lint（全非 .js 时跳过）；② CLAUDE.md 规则 8 细化为「仅当触及 src/test 时必跑 lint/test」。倾向①（CLI 自动判定优于改人类指令）。
- ⊘ **plan-a TaskCard 格式不一（裁决：非缺陷，源码已有逐字示例）**：建议「skill 模板给逐字示例（含 needs 中括号）」，但**源码 plan.js:370-408 已有完整 TaskCard 逐字示例**（含 provides/expects_from/`needs: [field_a]`），plan.js:426 明说「无跨 task 契约则留空」。子代理对**可选字段** provides/expects_from 的格式分化（散文 vs 映射）是 postcheck 故意不 style-check（其职责=契约一致性对账 plan.js:427，非风格统一）。**评估否决**：非债务；唯一残留=SKILL.md 镜像可能缺示例，但子代理读注入 prompt 不读 SKILL.md，补 SKILL.md 不解决运行时分化。
- ⊘ **plan-d 独立审查单次（裁决：= P4.3a，已登记）**：plan 审查初审 fail、修正后自判 pass 无二次独立复审——**正是上条 P4.3a**（审查 fail 后复审边界未定义），证实该 gap 为 stage 通用（brainstorm + plan 均命中），非新债。
- ⊘ **quick-③ git autocrlf 噪音（裁决：troubleshooting 已覆盖）**：git 对 `.sillyspec/quicklog/`、`docs/` 报「LF will be replaced by CRLF」——**正是 `docs/troubleshooting.md`「Edit CRLF 失配」条目 方向 A**（`.gitattributes` `* text=auto eol=lf` 规范化）的同根轻度症状（Edit 失配=重度、autocrlf 警告=轻度，根因同为仓库 CRLF/LF 混用 + git autocrlf）。不另立条目；该方向 A 一并治。

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

## 总结

- **代码完成 15 项**（B1、P1.3a/b、P1.4、P3.1、P4.1、P5.1a/b、P6.1a、P6.3、P6.4、P2.2.3、Q-A1、Q-B、Q-C）；全套 test EXIT=0、lint 49 文件通过。
- **评估保留 / 回退 4 项**（P1.1 SKILL.md 铁律、P1.2 step 内铁律、P2.4 decisions 场景化展示、Q-A2 QUICKLOG 压缩回退）——非纯重复 / 场景必要 / 压缩破坏契约断言，抽收敛反而加复杂度或削弱控制。
- **defer 6 项**（P2.1/2.2 单处模板、P4.2 batch、P4.3 Grill verdict、P6.1b docHash 全交 CLI、P6.2 wait 三态）——均有技术理由（复用价值小、语义工作 CLI 无法替代、推 sillyhub、独立工程、进度兼容），非「不做」而是「需单独排期/跨仓」。
- 核心收益：brainstorm/execute/quick/verify 的 prompt 显著瘦身，命令模板和复读铁律清除，控制力零损失（run.js 注入 + 硬门 + globalGuardrails 兜底）；P2.2.3 引入 prompt include 机制（`{{include}}` → 包内 templates/prompts/ 注入），verify 探针抽包内模板，为后续 self-contained 大块复用铺路。
- **2026-08-04 复盘增补（plan+quick）**：7 条改进点核实后，登记 4 项新 defer 债（plan-b 行数丢字段 / plan-c plan→scan 回头路半修 bug / quick-① QUICKLOG 落盘 / quick-② lint doc 空转，均需改源码留 follow-up）+ 3 项裁决否决（plan-a 源码已有逐字示例 / plan-d=P4.3a stage 通用 / quick-③=troubleshooting CRLF 条目同根）。
