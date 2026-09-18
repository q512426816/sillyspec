---
author: qinyi
created_at: 2026-09-18 06:52:35
generated_by: sillyspec-design-init
scale: large
risk_level: unit-sufficient
---
<!-- risk_level 说明：自动判级若命中部署类关键词（index/archive/daemon 字样）属误伤——本变更是 CLI 库面+知识库文件面，无服务/端点/启动入口，单测+fixture 可证。 -->

# 设计文档（Design）— 2026-09-18-fr-index-l1

## 背景

requirements.md 在整个生命周期只被浅解析（存在性+FR 编号字面检查），archive 时原样搬走零提炼；FR-NN 是 change 局部编号无跨 change 身份；被后来 change 取代的需求无人标记——「现行需求」今天不存在任何可查询面。三轮评审定稿 L1（稳定 id + knowledge 索引 + 取代标记，同一变更做完），战略定位为 **L3 的证据发生器**：跑 20-30 个 change 后用遥测数据裁决「索引事实上是否已是活规格真源候选」，把 L3 从抽象辩论变工程题。

## 设计目标

1. 每条归档入选 FR 获全局稳定 id（`FR-<域>-NNN`），索引幂等可重放。
2. 承接引用驱动取代链：旧条目 superseded+链完整，数据为 L3 裁决累积。
3. brainstorm step8 写作期可见触达域现行 FR（superseded 默认藏），配 advisory 重复检测。
4. 三观察指标（fr-inject / fr-supersede / fr-duplicate-warning）落事件流，verify 实测读回。**指标可算性依赖（护栏②）**：fr-inject 的发生器=step8 注入动作、fr-duplicate-warning 的发生器=step8 --done 软门、fr-supersede 的发生器=归档承接机制——三机制任一被移除，对应指标恒零、实验失真；机制与指标互为存在理由，不可单独裁撤。
5. D14 长出第四检查（epoch 后归档索引在场+取代完整），机制复用零新账本。
6. **删除缺口探针（护栏③）**：archive 时对触达域 active FR 未被本次承接引用的条目计数，advisory 注记 + fr-unreferenced 遥测——显式标注「观察信号，不算 L3 门禁」（L1 无删除声明义务，边界见 D-002）。

**实验裁决条款（护栏①·证伪出口）**：本变更是 L3 的证据发生器，实验允许失败——20-30 个 epoch 后 change 的观察期内，若 ①fr-inject 注入后承接引用率趋零 ②fr-supersede 事件稀少 ③重复 FR 仍靠人眼发现，则明确裁决**杀掉或冻结 L3**（活规格树不建），fr 索引降级保留为检索面（L2 素材）。此为合法结局而非失败；「已经有索引了」不构成「必须盖房」的义务。裁决须文档化（引用四类遥测事件计数）。

## 非目标

- 未声明删除的门禁检测（L3 合并门禁领地，L1 只观察）
- 模块卡挂 FR 指针（L2 领地——与模块卡关系=**暂不挂卡**，显式声明非遗漏）
- 活规格树/合并引擎/scenario 丢失检测（L3 领地）
- 重复 FR 硬拦（L1 只 advisory+计数）
- 存量 93 份归档回填索引（不伪造历史，epoch 分界）
- knowledge-stats 聚合面板接入（后续变更，本期只落事件流）

## 拆分判断

单变更承载：id/索引/取代是完整性单元（无 id 的索引无法取代、无取代的索引是坟场——评审双护栏），遥测与 D14 检查依附同一条归档管线。不拆批。

## 总体方案

**Phase 1 索引核心**：新模块 `src/fr-index.js`——①`parseChangeRequirements(changeDir)`：解析 requirements.md 的 FR 块（`### FR-NN: 标题` + `承接:` 行 + Given/When/Then 场景名抽取）；②`indexRequirements({changeDir, knowledgeRoot, headHash, cwd})`：域解析（design.md 文件变更清单×_module-map，**清单内 `NEW:` 前缀先剥再匹配**，unmapped 兜底）→ 新 FR 按域计数器发号 → 承接引用翻旧条目 superseded → 写 `knowledge/fr/<域>.md`（条目=「## FR-<域>-NNN 标题」+字段行：来源变更/状态/superseded_by/摘要（场景名列表）/最近确认）→ INDEX.md 路由行同步 → 返回 written/superseded/unreferenced/warnings；幂等键=全局 id（同变更重跑 no-op）；承接 id 不存在→warn 不阻断。域文件读写复用 decision-distill 的四底座函数（**参数化重构**：节头正则/INDEX 节名/子目录经参，decisions 侧行为零回归由既有测试钉死）。

**Phase 2 归档挂载与注入**：`run/archive-distill.js` 的 executeArchiveDistill（noAI 步）在决策提炼后追加 FR 索引调用（同 best-effort 降级语义）；每次归档的 superseded 事件落 fr-supersede 遥测。`run/prompt.js` 新占位符 `{FR_INDEX_DIGEST}`：brainstorm step8 注入触达域 active 条目清单（id+标题+来源变更+场景名；superseded 默认藏；无触达域→段不出现；索引空→注记行（「本变更大概率是这些域的首批需求」——R1 审查纠偏：空态提示比消隐更有写作价值，语义更正）；digest 末行自纠注记）；注入落 fr-inject 遥测。step8 `--done` advisory 重复检测（新 FR 标题×同域 active 标题 bigram 重叠率 ≥0.6 且无承接 → warning+fr-duplicate-warning 遥测，不阻断）。

**Phase 3 D14 第四检查与探针**：doctor archive_integrity 维度加检查——`FR_INDEX_EPOCH='2026-09-18'`，日期前缀 ≥ epoch 的归档：变更名须在 fr 索引「来源变更」字段在场；若其 requirements 含承接行则旧条目 superseded 须已标；违者并入现有 offenders（warning 级，豁免走既有 archive-integrity-exempt.yaml 机制零新增）。删除缺口探针：indexRequirements 返回值附 `unreferenced: [{domain, count}]`（触达域 active FR 未被本次承接引用计数），archive-distill 打一行 advisory（带「观察信号，不算 L3 门禁」标注）+ fr-unreferenced 遥测事件。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/fr-index.js | 索引核心：parseChangeRequirements / indexRequirements / readActiveFrDigest / frTitleOverlap；producer=本模块，consumer=archive-distill（归档发号）/prompt+complete（注入与检测）/doctor（第四检查） |
| 修改 | src/decision-distill.js | **参数化重构**复用四函数（splitKnowledgeSections 节头正则 / joinKnowledgeFile / syncIndexRoutingLines 的 INDEX 节名与子目录 / discoverModuleIndex）：内部实现变更（decisions 硬编码面参数化），decisions 侧行为零回归由既有测试钉死——非「仅 export」（R1 审查纠偏，D-003 口径以此为准） |
| 修改 | src/stages/brainstorm.js | **step8 prompt 模板**（注入发生器所在，R1 阻断①）：模板插 {FR_INDEX_DIGEST} 占位符 token + requirements 格式要求段补「承接: FR-<域>-NNN」行指引与「改已有行为先查注入清单引用承接」写作纪律——prompt.js 只替换模板已有 token，不进模板注入永不触发（护栏②机制链） |
| 修改 | src/run/archive-distill.js | executeArchiveDistill 追加 indexRequirements 调用+fr-supersede 遥测（best-effort 降级语义不变） |
| 修改 | src/run/prompt.js | {FR_INDEX_DIGEST} 占位符替换实现（brainstorm step8；active-only；fr-inject 遥测）——token 本体在 stages/brainstorm.js 模板（见上行） |
| 修改 | src/stage-contract.js | brainstorm 末步 --done 的 validateBrainstormOutputs 挂 advisory 重复检测+fr-duplicate-warning 遥测（warning 永不阻断——R1 审查纠偏：软门实落 stage-contract 非 complete.js，设计行随实现更正） |
| 修改 | src/doctor-diagnostics.js | D14 第四检查（epoch 分界：索引在场+取代完整，并入 offenders 机制） |
| 修改 | docs/sillyspec/platform-interface-map.md | doctor-diagnostics import 块位移的行锚重锚 44→50（R1 审查阻断③——docs-check doc-ref 实证回归的机械修复） |
| 修改 | src/verify-probes.js | verify 期实证死锁修复：facts.handover 恒落盘（零行=count:0——原「有行才写」使零移交+PASS 被 eligibility 条件② fail-closed 拦死；对齐 pass-eligibility 测试 CLEAN_FACTS 既有契约，Reverse Sync） |
| 新增 | NEW:test/fr-index.test.mjs | 发号/幂等/承接翻链/域解析/digest 读取/重叠纯函数/坏承接 warn——fixture 全态 |
| 修改 | test/doctor-archive-integrity.test.mjs | +第四检查测试组（epoch 前 skip/epoch 后缺索引红/承接未标红/豁免机制复用） |

数据流：requirements.md（FR 块+承接行）→ archive noAI 步 indexRequirements → knowledge/fr/<域>.md + INDEX 路由 → brainstorm step8 {FR_INDEX_DIGEST} 注入 → 新 requirements 引用承接 → 下一轮归档翻链。遥测旁路：knowledge-hits.jsonl 四事件类型（fr-inject/fr-supersede/fr-duplicate-warning/fr-unreferenced）。

## 接口定义

```js
// src/fr-index.js
export const FR_INDEX_EPOCH = '2026-09-18';
export function parseChangeRequirements(changeDir)
  // → { missing, frs: [{ local: 'FR-01', title, supersedes: ['FR-<域>-NNN'], scenarios: ['场景名'] }], malformed }
export function indexRequirements({ changeDir, knowledgeRoot, headHash, cwd })
  // → { written: [{file, id, action:'added'}], superseded: [{from, to, change}], unreferenced: [{domain, count}], warnings: [] }（幂等：同变更重跑 no-op）
export function readActiveFrDigest(knowledgeRoot, domains)
  // → [{ domain, id, title, change, scenarios }]（superseded 藏）
export function frTitleOverlap(a, b) // → 0..1（bigram 重叠率，中文轻量切分零依赖）
```

knowledge/fr/<域>.md 条目（机械解析契约，同 decisions 字段行纪律）：

```markdown
## FR-<域>-014 标题一句话
来源变更：2026-09-18-xxx
状态：active            # 或 superseded
superseded_by：FR-<域>-017   # 仅 superseded 时
摘要：场景A；场景B
最近确认：a1b2c3d
```

requirements.md FR 块新增可选行（brainstorm step8 prompt 指引使用）：`承接: FR-<域>-NNN[, FR-<域>-MMM]`（全角冒号同认）。

## 生命周期契约表

本设计不涉及生命周期契约——索引写入挂在既有 archive noAI 步（原生命周期语义不变），无 session/lease/heartbeat/新状态转移；{FR_INDEX_DIGEST} 为无状态读路径注入。

## 数据模型

无 sillyspec.db schema 变更。知识面新增文件型数据：knowledge/fr/<域>.md（条目格式如上）；knowledge-hits.jsonl 新增四类事件 type（fr-inject/fr-supersede/fr-duplicate-warning/fr-unreferenced，appendKnowledgeHit 字段透传零底座改动）。

## 兼容策略（brownfield 必填）

- 未归档任何 epoch 后变更的仓：fr/ 目录不存在→digest 为空态注记行（见总体方案空态语义）、D14 第四检查零命中、归档步索引零输出注记——行为与现状一致。
- **覆盖面边界**：索引只覆盖完整流程归档变更；quick 流程（无四件套）与 design `scale: small` 变更（requirements 可豁免）不产 FR 索引条目——D14 第四检查对二者同样不查（无 requirements 即无索引义务），边界显式声明防「索引该有却没有」误读。
- 旧 requirements.md（无承接行）：parse 照常（supersedes 空），发号入库零影响。
- 遥测文件缺省：appendKnowledgeHit 自动建目录。
- 回退：删除 archive-distill 追加调用即回到现状；fr/ 目录与事件流为纯增量数据可整体退役。
- decision-distill 复用重构：参数化实现（decisions 侧零回归钉死），既有调用点签名不变。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 承接行写错 id（域拼错/号不存在） | P3 | 发号时校验+warn 留痕不阻断（typo 不炸归档） |
| R-02 | bigram 重叠误报（同域正常相似标题） | P3 | advisory 不阻断+文案双出路（承接或改名）；阈值常量可调 |
| R-03 | 域文件格式与 decisions 契约漂移 | P2 | fr/ 子目录隔离+头注释钉契约；复用同一 splitKnowledgeSections 底座而非复制 |
| R-04 | 注入 digest 撑大 step8 prompt | P3 | 仅触达域 active 条目+每条一行紧凑格式；域数多时截断注记 |
| R-05 | 本变更自身归档是首个 epoch 样本，索引失败当场被抓 | P2 | 自举即验收：D14 新检查抓到=机制工作的活证（verify 记录） |
| R-06 | 遥测事件流无人消费 | P3 | verify 实测读回三指标；knowledge-stats 接入列后续变更钩子 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 / 总体方案 Phase 1 / 接口定义（发号+幂等） | 已落实 |
| D-002@v1 | FR-02 / 总体方案承接段 / 非目标（删除不判） | 已落实 |
| D-003@v1 | FR-01 / 总体方案存储段 / 兼容策略回退 | 已落实 |
| D-004@v1 | FR-02 / 总体方案 Phase 2 注入段 | 已落实 |
| D-005@v1 | FR-02 / 风险 R-02 / 非目标（不硬拦） | 已落实 |
| D-006@v1 | FR-03 / 总体方案遥测旁路 / 风险 R-06 | 已落实 |
| D-007@v1 | FR-04 / 总体方案 Phase 3 / 兼容策略（epoch 前零检查） | 已落实 |
| D-008@v1 | FR-03 / FR-04 / 设计目标护栏②③ + 实验裁决条款（护栏①） | 已落实 |

无未解决决策；无剩余风险挂账。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale/risk_level）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1 ~ D-007@v1 全入决策追踪）
- [x] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语（豁免短语在节内）
- [x] UI 原型分级核对（纯 CLI+知识库面，无前端文件，原型跳过）
- [x] 不确定的问题标注「⚠️ 自审存疑」（无存疑项；观察指标可验收性由 D-006 钉死）
