---
author: qinyi
created_at: 2026-08-23
scale: medium
source: deepseek-harness 代码管理实践分析落地（用户 2026-08-23 发起；Design Grill 修订 v2）
---

# 设计文档（Design）— deepseek-harness 实践落地：决策生命周期 + 轻量 postmortem + 证据匹配检查

> v2：按 Design Grill（brainstorm-review-2026-08-23-205426）20 项交叉审查修订——3 个 blocker（B-1/B-2/B-3）经用户裁决，6 个机械修正项（C-08/09/10/12/17/20）直接落实。

## 背景

对 deepseek-ai/deepseek-harness（约 1.3 万提交、1,484 篇带生命周期的 Agent Note、编号 postmortem）的代码管理方式做了全量分析（git 历史 + 工程结构），筛出对 sillyspec 有真实增量的三项实践。sillyspec 现状的对应缺口（代码实证）：

1. **决策记录「归档即死亡」**：brainstorm 产出 `changes/<变更名>/decisions.md`（D-xxx@vN 稳定 ID，`src/stages/brainstorm.js:336`），但 archive 后随目录进 `changes/archive/` 冷藏。`knowledge/` 只有 conventions/patterns/known-issues 三类 + proposed/uncategorized，没有决策维度；没有「决策与代码同步更新」机制；没有 rejected 决策留痕——同一问题换个 agent 重新踩坑、重新选择已否决方案的风险长期存在。
2. **postmortem 无结构**：quicklog 已有「根因：」字段（`src/quicklog.js:504` 四字段解析），但根因是自由文本，没有护栏落点、没有证据引用（agent-session-log 已支持 8 种 harness 含 deepseek-dsh 的会话日志路径探测，`src/agent-session-log.js`，这个证据源目前没人消费）。
3. **检查选择粗粒度**：test_strategy 枚举实际只有 `full/module` 两值（`src/config-schema.js:120`）；`skip` 在 local.yaml 注释与帮助文档中声明但**未接线**——配置后 `extractTestStrategy` 返回 null，verify-postcheck 按 full 全量跑（`src/verify-postcheck.js:175`）。不区分变更面——文档改动也跑测试、门禁契约改动不跑 gate。

deepseek-harness 的对应解法：implemented 决策记录与代码同变更新 + rejected 防复潮 + 机械校验门禁；postmortem 引用会话日志序列号做证据、护栏落成测试；「按证据面选检查、本地轻 CI 重」。

## 设计目标

- G1：变更归档时，有实现影响的决策（D-xxx@vN）提炼进**活跃决策库**（`knowledge/decisions/<模块域>.md`），rejected 决策留痕防复潮，后续 brainstorm 自动命中提示。
- G2：决策条目与模块源码建立 behind 关联（复用 docs-debt 的 git 口径），源码前进 N 次未复核的决策在 doctor 检查项可见（status 命令接线二期）。
- G3：quicklog 根因字段支持结构化四子字段（现象/根因/护栏/证据），证据可引用 agent-session-log 路径；verify/doctor 检出问题时 prompt 提示补写。
- G4：verify 按变更面推荐检查组合（行为→聚焦测试、文档→docs-check、门禁→gate）；test_strategy 在 `full/module` 之外兑现 `skip` 声明语义（真跳过）并新增 `evidence-auto`；`full/module` 语义不变。

## 非目标

- `sillyspec decisions` / `sillyspec postmortem` 一等命令（二期，视 dogfood 使用频率）
- status 命令的决策待复核展示（二期，doctor 先行）
- 双语文档体系、100% 覆盖率门禁、AGENTS.md 单源（sillyspec 的 SKILL 体系已是等价物）
- 分支前缀编码任务来源（worktree 分支命名已有自身规则，另立变更）
- 决策记录进 SQLite（文件即真相，与 knowledge/ 同构；见 D-002@v1）
- postmortem 编号目录（knowledge/postmortems/，二期命令化时再做）

## 拆分判断

不拆分、不走批量：三个 Wave 共享「决策知识生命周期」同一主题（postmortem 的护栏结论本质也是一条决策），拆开会造成 archive 步骤两次变更、knowledge 扩展两次设计。规模 medium，单变更三 Wave 在 plan 阶段分组，Wave 间依赖：W1 的决策库格式是 W2 护栏回流和 W3 检查选择的基础，串行交付。

## 总体方案

### Wave 1 — 决策生命周期（核心）

**W1.0 decisions.md 记录契约扩展（B-1 裁决 a：字段在决策产生时写入）**

Grill 实证：现有记录约定（`brainstorm.js:336-341`）只有 type/status/source/question/answer/normalized_requirement/impacts/evidence/priority，缺「锚点/模块域/否决理由/复潮条件」——纯函数提炼无米下锅。修法：**扩展记录契约，不放弃纯函数定位**（决策时上下文最全，归档时补推靠 LLM 易错且不可测）：

1. `brainstorm.js` Step6「写决策」模板每条记录新增四个可选字段（按需填、不强制全填）：
   - `锚点：<src 路径>:<行号或符号>`——决策落点的主文件（status=confirmed 时必填；提炼时才映射为 implemented 状态词）
   - `模块域：<module-id>`——取自 `_module-map.yaml` 的模块 ID（可多个，逗号分隔）
   - `否决理由：<一句话>`——status=rejected 时必填
   - `复潮条件：<什么前提下可重新考虑>`——status=rejected 时必填
2. **提炼入选规则（可测试定义，C-01）**：`type ∈ {architecture, compatibility, boundary, definition, process}` 且 `status ∈ {confirmed, accepted}` → 提炼为 implemented；任何 type 的 `status=rejected` → 提炼为 rejected；`type=scope`（变更范围取舍，跨变更无复用价值）不入选。
3. 兼容：字段全可选，旧格式 decisions.md（含本次之前已产生的）解析不失败——缺锚点的 implemented 条目提炼时 `锚点：未记录`，不阻断（advisory 提示补录）。

**W1.1 新增 `src/decision-distill.js` 纯函数模块 + archive 阶段新增「decision-distill 决策提炼」步骤**（插在 sync-module-docs 之后、确认归档之前）：

1. 读取 `changes/<变更名>/decisions.md`，按入选规则解析 D-xxx@vN 条目。
2. 按 `模块域` 字段（缺失时按 impacts 文本与 `_module-map.yaml` paths 前缀匹配兜底，仍未中归 unmapped 域——同 docs-debt D-003 三级口径，C-02）追加/更新 `knowledge/decisions/<模块域>.md`：
   - `## D-xxx@vN <短标题>`（同 ID 同版本重跑幂等不重复追加；@vN+1 整段替换旧版并注明 supersedes）
   - `状态：implemented` + `锚点：src/xxx.js:NN` + `最近确认：<commit-hash>`（写入时取当前 HEAD）+ `理由：<一句话>`
   - 或 `状态：rejected` + `否决理由：` + `复潮条件：`
3. **rejected 防复潮注入（C-07 修正）**：`knowledge-match.js` 的 parseKnowledgeIndex 扫描范围扩到 `knowledge/decisions/`；INDEX.md 路由行的写入责任归 decision-distill 步骤（提炼时幂等增删，无手工维护）；brainstorm Step2 的上下文注入由 `src/run/prompt.js` 统一渲染（复用 `{SCAN_STALENESS}` 先例 `prompt.js:414`）——decisionHits 命中 rejected 条目时注入否决理由与复潮条件。
4. **docs-check 新增决策规则**（advisory 起步，见 D-003@v1；豁免口径 C-17：走 known_failures 新键 `decisions.*` 命名空间，不复用 docs-gate 的 baseline ratchet——baseline 是内容冻结语义，决策豁免是条目级语义）：
   - 锚点校验：implemented 条目的 `锚点：src/...` 路径存在性
   - behind 复核：`src/docs-debt.js` 的归属三级 + behind git 口径**导出复用**（C-10：docs-debt.js 入清单，导出 `computeModuleBehind` helper，不改其现有行为）——决策锚定模块源码在 `最近确认` 后前进超阈值（默认 10，`decisions.behind_threshold` 可调）→ doctor 报「决策待复核」，不阻断
5. archive 末步「更新路线图和提交」prompt 补 `git add` 清单：`knowledge/decisions/`（C-20——现状仅 `changes/archive/ + modules/`，决策库会漏提交）。
6. 无 decisions.md / 无入选条目时零输出跳过（同 docs-debt 无债零输出原则）。

### Wave 2 — 轻量 postmortem

1. **quicklog 根因字段结构化**：根因块内支持嵌套列表行 `- 现象：… / - 根因：… / - 护栏：… / - 证据：…`。关键约束：子字段必须是列表行（`- ` 前缀），不能是新顶层标签——`src/quicklog.js:486-504` 的字段边界扫描按顶层标签切段，Grill 已实证嵌套行落在根因块正文内不破坏解析（C-15 pass）。旧条目（纯文本根因）解析行为不变。
2. **`src/stages/quick.js` 最小纳入（B-3 裁决）**：修正 `quick.js:103` 的「避免嵌套全角冒号」警告文案——明确嵌套 `- 字段：` 列表行是合法形态（顶层标签边界不受影响），消除与 W2 的自相矛盾；step3 模板补一句可选四子字段提示。prompt 镜像同步扩到第四处（docs/prompt/quick.md）。
3. **证据引用**：`- 证据：` 行引用 agent-session-log 路径（`sillyspec agent-log --json` 输出的本地 jsonl 路径）或 review.json / verify-result.md 路径。
4. **触发点**：verify 检出实现偏差（postcheck 失败项）、doctor 检出状态错乱时，对应 step prompt 追加提示：按四子字段补 postmortem 进 quicklog（advisory，不新增命令不强制）。
5. **护栏回流**：`- 护栏：` 结论经人工确认后归入 `knowledge/known-issues.md`（走现有 knowledge 追加链路，不新建链路）。

### Wave 3 — 证据匹配检查

1. verify 阶段 prompt 注入「检查选择指引」：行为改动→聚焦测试（test_strategy=module）；文档/prompt 改动→docs-check；门禁契约/接口改动→`sillyspec gate`；全量仅在用户明确要求或仓库级不可分变更时。
2. **test_strategy 枚举扩展（B-2 裁决：顺带接线 skip）**：`src/config-schema.js` 枚举扩为 `['full','module','skip','evidence-auto']`；`src/verify-postcheck.js` 的 extractTestStrategy 消费端接线（C-06）：`skip` → 真跳过测试（不再回退全量，既有 skipped 状态机 `verify-postcheck.js:781` 可承载）；`evidence-auto` → 按 module-impact.md 影响类型推荐检查组合（缺失/不可解析时降级 `module` 策略并注记），推荐结果经 `run/prompt.js` verify 分支占位符注入 prompt 供用户否决（渲染载体先例 `{WORKTREE_BASELINE_INFO}` `prompt.js:649`——verify-postcheck 在 --done 事后运行，prompt 时点注入必须走 run/prompt.js）。`full/module` 消费路径不变。
3. verify `_globalGuardrails` 修订：增加「不得为凑检查而重复执行已通过的检查；本地聚焦、全量留给 CI/明确要求」原则条目。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/decision-distill.js | 决策提炼纯函数：parseDecisions(changeDir) / distillIntoKnowledge(changeDir, knowledgeRoot, head)；producer=decisions.md（含 W1.0 新字段）→ 归一化（入选规则/域映射/幂等）→ consumer=knowledge/decisions/<域>.md |
| 修改 | src/stages/archive.js | steps 数组在 sync-module-docs 后插入「decision-distill 决策提炼」步骤（conditionalWait: true 先例）；末步 prompt 补 git add knowledge/decisions/ |
| 修改 | src/stages/brainstorm.js | Step6 决策记录模板扩四字段（锚点/模块域/否决理由/复潮条件，可选）；Step2 prompt 的 knowledge 命中段增 decisions 库路由说明 |
| 修改 | src/run/prompt.js | brainstorm Step2 上下文注入 decisionHits（复用 {SCAN_STALENESS} 先例 prompt.js:414）+ verify 分支注入 evidence-auto 推荐占位符（先例 {WORKTREE_BASELINE_INFO} prompt.js:649）；producer=knowledge-match / verify-postcheck → consumer=brainstorm Step2 与 verify step prompt |
| 修改 | src/knowledge-match.js | parseKnowledgeIndex 扫描 knowledge/decisions/；matchKnowledge 返回**在既有 shape `{matched, entries, report, json}` 上增** decisionHits 字段（C-08 笔误修正：不引入新顶层 hits）；producer=decision-distill 写入 → consumer=run/prompt.js 注入 |
| 修改 | src/docs-check.js | 新增决策规则族（advisory）：锚点存在性 + behind 阈值；豁免走 known_failures 新键 decisions.*；配置键 decisions.behind_threshold（producer=config-schema 默认 10 → consumer=docs-check 规则） |
| 修改 | src/docs-debt.js | 导出 computeModuleBehind helper 供 docs-check 决策规则复用（不改现有行为，C-10） |
| 修改 | src/config-schema.js | 新键 decisions: { behind_threshold }；test_strategy 枚举扩 skip 接线 + evidence-auto |
| 修改 | src/verify-postcheck.js | extractTestStrategy 消费端：skip→真跳过（不再回退全量）；evidence-auto→按 module-impact 推荐检查组合（缺失降级 module）（C-06/B-2） |
| 修改 | src/stages/verify.js | prompt 注入检查选择指引 + _globalGuardrails 增「不重复已通过检查/本地聚焦」条目 |
| 修改 | src/stages/quick.js | :103 警告文案修正（嵌套 `- 字段：` 列表行合法）+ step3 模板可选四子字段提示（B-3 最小纳入） |
| 修改 | src/stages/doctor.js | 新检查项：决策待复核清单（读 docs-check 决策规则结果，advisory 输出） |
| 修改 | src/quicklog.js | 根因块嵌套四子字段解析（列表行形态，顶层四字段边界不动）；旧条目兼容 |
| 新增 | test/decisions-lifecycle.test.mjs | W1 回归：入选规则/提炼幂等/ID 版本前进/rejected 留痕/无 decisions.md 零输出/behind 阈值/缺字段旧条目容错 |
| 新增 | test/quicklog-postmortem-fields.test.mjs | W2 回归：四子字段解析/单行压缩兼容/旧条目回退/quick.js:103 文案与新形态一致 |
| 修改 | test/config-schema.test.mjs | 防漂断言更新（renderExample 与新 live 键 decisions 同步）+ 枚举扩回归；producer=本变更 → consumer=task-11 |
| 修改 | test/verify-postcheck-module.test.mjs | skip 真跳过 + evidence-auto 降级路径语义回归（task-13） |
| 修改 | docs/prompt/_extracted.json + docs/prompt/*.md | prompt 镜像同步（brainstorm/verify/archive/quick 四处，跑 _extract.mjs 带新旧字符串 sanity 断言） |
| 运行时产物 | .sillyspec/knowledge/decisions/*.md | 运行时生成，不进静态清单（dogfood 时回填种子） |

## 接口定义

```js
// src/decision-distill.js
export function parseDecisions(changeDir)
// → { entries: [{ id: 'D-001@v1', type, status, question, answer, anchor?, domains?: [moduleId...], rejectReason?, revisitWhen?, raw }], missing: bool }
// 入选规则见 W1.0 第 2 点；字段全可选容旧格式

export function distillIntoKnowledge(changeDir, knowledgeRoot, headHash)
// → { written: [{ file, id, action: 'append'|'update'|'supersede' }], skipped: reason|null, needsWait: string|null }
// 幂等：同 ID 同版本重跑不重复追加；@vN+1 整段替换并注 supersedes
// rejected 条目缺 否决理由/复潮条件 → needsWait 返回缺失描述（步骤层转 --wait 请用户裁决）

// src/knowledge-match.js（扩展，C-08 修正）
export function matchKnowledge(indexDir, taskContext)
// → 既有 { matched, entries, report, json } 基础上新增 decisionHits:
//    [{ file, id, title, status, reason, revisitWhen }]  // rejected 优先排序

// src/docs-debt.js（新导出，C-10）
export function computeModuleBehind(moduleId, lastConfirmedCommit)
// → { behind: number|null, degraded: bool }  // 口径同现有 moduleDebt，抽公共实现
```

knowledge/decisions/<模块域>.md 条目格式（docs-check 机械解析的契约）：

```markdown
## D-012@v1 archive 步骤插在 sync-module-docs 之后
状态：implemented
锚点：src/stages/archive.js:45
最近确认：a1b2c3d
理由：模块文档终审后再提炼决策，锚点与文档同基线
复潮条件：（仅 rejected 条目必填）
```

## 生命周期契约表

本变更不涉及 session/lease/agent_run/daemon 的生命周期契约；但新增了**决策条目自身的状态流转**，按下表契约（自检命中「生命周期」关键词，主动列表）：

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| 提炼 implemented | archive decision-distill 步骤 | knowledge/decisions/<域>.md | id, status=implemented, 锚点, 最近确认, 理由 | （新条目）→ implemented |
| 提炼 rejected | archive decision-distill 步骤 | knowledge/decisions/<域>.md | id, status=rejected, 否决理由, 复潮条件 | （新条目）→ rejected |
| 版本前进 | archive decision-distill 步骤 | 同条目 | id 同号@vN+1, supersedes | @vN → @vN+1（旧段替换） |
| behind 待复核 | docs-check（阈值触发） | doctor 展示 | id, behind 计数, 阈值 | implemented → 待复核（展示态，不改文件） |
| 复核再确认 | 用户经 doctor 交互 | 同条目「最近确认」 | 新 headHash | 待复核 → implemented |
| 复潮重提 | brainstorm Step2 命中注入 | prompt 展示 | id, 复潮条件 | rejected → （用户裁决后）新 D-xxx@vN+1 |

## 数据模型

无 SQLite 表结构变更。决策库为文件型（与 knowledge/ 同构，决策见 D-002@v1）；progress DB 仅在 archive 步骤序列变化时按既有步骤名机制兼容（见兼容策略）。

## 兼容策略（brownfield）

- **未配置新功能行为不变**：无 decisions.md / 无入选条目 → 提炼步骤零输出跳过；knowledge/decisions/ 不存在时自动创建且 knowledge search 无命中时行为不变；test_strategy 未配置 → 缺省=全量 full（`config-schema.js:120`，`verify-postcheck.js:216` null→默认全量），行为不变。
- **test_strategy 行为变化（有意，B-2）**：`full/module` 消费路径不变；`skip` 从「声明未接线（配置后实际全量）」兑现为「真跳过」——已配置 skip 的用户行为改变，属声明语义的兑现（修 bug 性质），doctor/CHANGELOG 显式提示（风险 R-07）；`evidence-auto` 为新枚举。
- **归档中途的存量变更**：archive steps 数组插入新步骤后，progress DB 已记录步骤按名匹配（`run/command.js:111-131` ensureStageSteps 步骤数漂移按名重播种，Grill C-14 实证成立）；进行中变更下次 `run archive` 看到新步骤为待执行，属预期增量。补回归测试「已过 sync-module-docs 的变更继续归档」。
- **旧格式 decisions.md**：四字段全可选，缺失不失败；缺锚点 implemented 条目提炼为 `锚点：未记录` + advisory 补录提示。
- **quicklog 旧条目**：根因块无 `- ` 嵌套子字段 → 按纯文本渲染，顶层四字段边界逻辑不变（Grill C-15 实证 + 测试锁定）。
- **docs-check 新规则 advisory**：只 warn 不阻断，known_failures 新键豁免；dogfood 一个稳定周期后另立小变更升 error（D-003@v1）。
- **回退路径**：新步骤解析失败降级 warn 跳过（同 agent-session-log best-effort 先例）；knowledge/decisions/ 整目录可删，删除后一切回退现状。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | archive 步骤插入对进行中变更的进度兼容 | P1 | 步骤按名匹配（C-14 已实证）+ 回归测试「已过 sync-module-docs 继续归档」；execute 期用本变更自身 dogfood 验证 |
| R-02 | 决策库冷启动空库，防复潮/behind 价值延迟显现 | P1 | dogfood 时手工回填 3-5 条高频决策种子（如 worktree junction、CRLF 坑）；doctor 输出空库提示 |
| R-03 | quicklog 四子字段与既有严格标签边界解析冲突 | P1 | 子字段强制 `- ` 列表行形态（C-15 已实证）；test/quicklog-postmortem-fields.test.mjs 锁定单行压缩兼容 |
| R-04 | docs-check 决策规则误报（锚点 file:line 漂移） | P2 | advisory + known_failures decisions.* 豁免；behind 阈值默认 10 可调 |
| R-05 | HTML 原型跳过（按分级规则：纯 CLI/prompt/文档变更，无界面变化） | P2 | 已声明；如二期命令化涉及交互 UI 再补 |
| R-06 | prompt 镜像（docs/prompt/*.md + _extracted.json）漂移 | P2 | 沿用 _extract.mjs 带新旧字符串 sanity 断言的既有同步流程；本变更扩到四处（含 quick.md） |
| R-07 | skip 接线改变已配置用户的行为（全量→跳过） | P1 | 声明语义兑现属修复；CHANGELOG/doctor 升级提示；verify prompt 在 skip 生效时显式标注「测试已按配置跳过」留审计痕迹 |

## 决策追踪

| 决策 ID | 覆盖 |
|---|---|
| D-001@v1（方案C分期混合，命令化二期） | G1-G4 + 非目标节 |
| D-002@v1（决策库文件型不进 SQLite） | 总体方案 W1 + 数据模型节 |
| D-003@v1（docs-check 决策规则 advisory 起步） | W1.1 第 4 点 + 兼容策略 |
| D-004@v1（postmortem 不新增命令，quicklog 承载） | W2 全节 + 非目标 |
| D-005@v2（supersedes D-005@v1：test_strategy 实为两值，skip 接线 + evidence-auto；full/module 不变） | W3 第 2 点 + 兼容策略 + R-07 |
| D-006@v1（防复潮注入挂 brainstorm Step2，经 run/prompt.js 渲染） | W1.1 第 3 点 + 文件清单 run/prompt.js 行 |
| D-007@v1（B-1：decisions.md 记录契约扩展四字段，保纯函数提炼） | W1.0 全节 + 接口定义 |
| D-008@v1（B-3：quick.js 最小纳入——警告文案修正 + step3 模板提示） | W2 第 2 点 + 文件清单 quick.js 行 |

## 自审（v2，含 Grill 修订核对）

- 章节齐全：背景/目标/非目标/拆分判断/总体方案/文件变更清单（含数据流标注）/接口定义/生命周期契约表/数据模型/兼容策略/风险登记/决策追踪/自审 ✅
- Grill 20 项闭环核对：3 blocker（B-1→W1.0+D-007、B-2→W3+D-005@v2+R-07、B-3→W2.2+D-008）✅；机械项 C-08（matchKnowledge shape）✅ C-09（G2 收缩 doctor-only）✅ C-10（docs-debt 导出）✅ C-12（决策追踪改 G 编号）✅ C-17（豁免 known_failures decisions.*）✅ C-20（archive 末步 git add）✅；实证确认项 C-13/14/15/16/18/19 无需动作 ✅
- 生命周期关键词命中 → 已含契约表 ✅
- 对外字段数据流：decisionHits（producer=knowledge-match → consumer=run/prompt.js 注入）、decisions.behind_threshold（producer=config-schema → consumer=docs-check）、evidence-auto/skip（producer=local.yaml → consumer=verify-postcheck extractTestStrategy）均已标注 ✅
- YAGNI 自检：非目标显式排除六项；skip 接线经用户裁决纳入（修声明语义，非功能蔓延） ✅
- ⚠️ 自审存疑 1：evidence-auto 依赖 module-impact.md 质量，旧变更缺失时降级 module 策略（设计已闭环，测试覆盖降级路径）
- ⚠️ 自审存疑 2：behind 阈值默认 10 的合理性待 dogfood 校准（config 可调，不阻断）
- 原型跳过原因已按分级规则声明于 R-05，无静默缺位 ✅
