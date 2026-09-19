---
author: qinyi
created_at: 2026-09-19 16:25:58
generated_by: sillyspec-design-init
scale: large
risk_level: contract-required
---

# 设计文档（Design）— 2026-09-19-span-risk-pattern-migration

## 背景

2026-09-19-ceremony-pricing-five-cuts 把判级/定价输入迁到项目声明面（blast 轴：`_module-map.yaml` 顶层 blast 段 + src/blast-surface.js 装载，词表判级整体退役），其 D-011@v1 登记了同族遗留：span 轴的 QUICK_RISK_PATH_PATTERNS（src/change-risk-profile.js:36-43，auth/permission/billing/migration/lock/scheduling 六域路径模式）仍是硬编码全宇宙表。知识库 conventions「判级/定价/门禁输入必须项目声明，禁全宇宙词表」是口径真相源——本表是判级/定价域最后一张违反该口径的表。管道（声明面装载/消费先例/rebuild 回插）已随上一变更落 main，本变更按 D-011 退役判据收口这最后一刀。

两消费面：
- **定价面**：src/ceremony-tier.js:218 computeCeremonyTier span 轴第三维（声明文件命中模式 → 至少 S2），上游调用方 run/gates.js:646（阶段门定价）、src/review-tier.js:156（评审档）、src/verify-postcheck.js:3074 + reconcileDualRun（双跑收口事实面）。
- **quick 画像面**：src/quick-gate-profile.js:148 computeGateProfile 默认 riskTable（命中 → L2 + checks.runtimeEvidence='required' advisory），上游调用方 src/run/shared.js:1780（quick --done 审计）、src/scope-audit.js:435/517。

锚点事实修正（D-002@v1）：上一变更的 30 前缀 blast 自举表未落 main（悬空提交 bbe30ab，无分支包含；归档走 --skip-apply），main 的 map 现无 blast 段——本变更不修（硬约束），登记 known-issues，形态参考自 bbe30ab 读取。

## 设计目标

1. 六模式表迁为项目声明：`_module-map.yaml` 顶层新 `span_risk:` 段（token 扁平字符串列表）为唯一声明源（D-003@v1）。
2. 匹配语义零漂移：token 编译为现行同款边界锚定正则（前界 `(?:^|[/_-])`、后界 `(?=[/._-]|$)`、`/i`）——同 token 集命中面与旧表逐字节相同，等价性有回归钉。
3. 两消费面同刀切换声明面；QUICK_RISK_PATH_PATTERNS 硬退役不留 legacy。
4. 无声明/坏声明项目 → 空表（span 模式维度关闭），不回退内置表——与 blast「未配置禁止回退」（D-008 先例）对齐。
5. 本仓自举：span_risk 段声明定制 token 集（D-004@v1）。

## 非目标

- **价目表不动**：三轴 max 公式、阈值 8/3/2 三常量（SPAN_FILES_THRESHOLD=8 / SPAN_MODULES_THRESHOLD=3 / FRICTION_ESCALATION_THRESHOLD=2）、force_tier 只升不降——零改动、既有回归钉零变化（D-005 措辞修正：初稿「8/2」失准，实指 8 文件+2 摩擦，三常量均不在触碰面）。
- **blast 声明面不动**：`_module-map.yaml` blast 段（含其在 main 缺失的现状）零触碰；不借道恢复 bbe30ab 的自举表（独立变更收口，D-002@v1）。
- 不改 blast 段 schema、不引入 local.yaml 新键（span 轴无逐机覆盖需求——blast 的 local 只升覆盖动机是档位值试升，token 集无此语义）。
- 不动 span 轴另两维（文件数/跨模块数）的任何口径。
- 不做 token 通配/正则语法（纯字面量——零新文法，防 YAML 里写正则的转义/评审不可读问题）。

## 拆分判断

单变更不拆（用户裁定方向，D-001@v1）：表退役与两消费面切换强耦合——留任一消费面用旧表即留下「同一张表两种口径」的分裂面；自举表与装载机制必须同交付（否则本变更自身无价可依，上一变更同款论证）。无批量模式特征。

## 总体方案

四层（一个 Wave 内顺序落地，无跨 Wave 依赖）：

**① 装载层（NEW src/span-risk-surface.js）**——与 blast-surface.js 同构的独立模块：
- `compileSpanRiskPatterns(tokens)`：token（纯字符串）→ `{ pattern: <token>, re }`，token 经正则转义后编译为 `(?:^|[/_-])<token>(?=[/._-]|$)` `/i`；非字符串/空白 token 跳过；重复 token 去重（首个保留）。
- `matchSpanRiskPatterns(files, patterns)`：files（反斜杠归一 POSIX）× patterns → `[{ pattern, file }]` 扁平命中数组（`/g` 正则 lastIndex 防御沿用两消费面现行写法）——两消费面共享的单一命中语义。
- `loadSpanRiskPatterns({ specBase, project })`：读 `docs/<project>/modules/_module-map.yaml` 顶层 `span_risk:`（字符串数组）→ 编译产物；容错=map 缺失/坏 YAML/段非数组 → 空表（不缺省不拦截，与 parseModuleMapSimple / loadBlastDeclarations 同立场）。
- `loadSpanRiskPatternsAllProjects({ specBase })`：扫 `docs/*/modules/_module-map.yaml` 取并集（多项目仓保守口径，loadBlastDeclarationsAllProjects 同款形态）；任一项目装载异常 → 该项目按空表跳过。
- 模块头注声明口径真相源指向 knowledge/conventions.md 条目（blast-surface.js 同款）。

**② 纯函数层**：
- ceremony-tier.js computeCeremonyTier 增 `opts.spanRiskPatterns`（默认 `[]`=维度关闭）；内部 QUICK_RISK_PATH_PATTERNS 循环替换为 matchSpanRiskPatterns；reasons 文案形态不变（`span=S2（风险路径命中 <token>：<files>）`——token 即审计标签）；reconcileDualRun 增 `factSpanRiskPatterns` 参数穿透到内部 computeCeremonyTier（双跑事实面同口径）。
- quick-gate-profile.js computeGateProfile 的 `opts.riskTable` 默认值自 QUICK_RISK_PATH_PATTERNS 改 `[]`（参数名/形态不变——已是注入位）。
- change-risk-profile.js 删除 QUICK_RISK_PATH_PATTERNS 导出与定义（连同其头注段），其余导出零改动。

**③ 接线层**（装载一次、就近传入）：
- run/gates.js：定价点装载 `loadSpanRiskPatterns({ specBase, project: projectName })` → computeCeremonyTier `spanRiskPatterns`。
- review-tier.js / verify-postcheck.js：`loadSpanRiskPatternsAllProjects`（与其 blast AllProjects 选择同口径）→ computeCeremonyTier / reconcileDualRun（factSpanRiskPatterns）。
- run/shared.js：quick 审计点装载（与 loadQuickModuleIndex 同 specBase/projectName 上下文）→ gateOpts.riskTable。
- scope-audit.js：仅 :435 调用点注入（rec.specBase 在场）；:517 调用点唯一消费 unmappedFiles.length、riskTable 不参与——不接线（Grill X-7：避免死接线）。

**④ 自举与登记层**：
- 本仓 map 顶层增 `span_risk: [migrate, migration, migrations, dispatch, scheduler, scheduling, cron, job, jobs]`（D-004@v1 定制口径）；维护提示写**段内注释**（`span_risk:` 键行后首行）——map 头部注释区与段前置注释会被 rebuild --force 重发射丢弃，唯段内注释随通用回插保留（Grill X-10，modules.js:186-204 实证）。
- config-schema.js ceremony 段 note 同步「span 轴输入=map span_risk 段」表述（无新 local 键）。
- knowledge/known-issues.md 增 blast 自举表缺口条目（D-002@v1：悬空提交 bbe30ab、恢复路径、main 现状 blast 全 S1 起步）+ INDEX.md 路由行。
- modules-rebuild-preserve 补 span_risk 段（含段内注释）--force 回插断言。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/span-risk-surface.js | 装载层：compile/match/load×2 四导出，纯函数+两 IO 装载（blast-surface 同构） |
| 修改 | src/change-risk-profile.js | 删 QUICK_RISK_PATH_PATTERNS 定义与导出、头注段收口 |
| 修改 | src/ceremony-tier.js | computeCeremonyTier opts.spanRiskPatterns + reconcileDualRun factSpanRiskPatterns；span 命中循环改共享 matcher |
| 修改 | src/quick-gate-profile.js | riskTable 默认 []；头注口径改声明面 |
| 修改 | src/review-tier.js | AllProjects 装载 + 传参（评审档定价接线） |
| 修改 | src/run/gates.js | project 装载 + 传参（阶段门定价接线） |
| 修改 | src/verify-postcheck.js | 双跑事实面装载 + factSpanRiskPatterns 穿透 |
| 修改 | src/run/shared.js | quick 审计点装载 + gateOpts.riskTable |
| 修改 | src/scope-audit.js | :435 调用点装载注入（:517 不接线，Grill X-7） |
| 修改 | src/config-schema.js | ceremony 段 note 文本同步（span 输入源表述） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 顶层增 span_risk 段（9 token 自举，D-004）；维护提示落段内注释（X-10）；core-engine paths 补 span-risk-surface.js |
| 修改 | .sillyspec/knowledge/known-issues.md | 增 blast 自举表缺口条目（D-002） |
| 修改 | .sillyspec/knowledge/INDEX.md | known-issues 新条目路由行 |
| 新增 | NEW:test/span-risk-surface.test.mjs | 编译等价性钉（六域展开 token 集 vs 旧正则逐字节同命中）、装载容错、AllProjects 并集 |
| 修改 | test/ceremony-tier.test.mjs | spanRiskPatterns 参数化用例、默认空=维度关、阈值 8/2 钉复跑；依赖默认表的既有块（:117-121 等，Grill X-8）显式注入声明表或改口径断言 |
| 修改 | test/quick-gate-profile.test.mjs | 依赖默认表的全部既有块翻新（:183-188/:211-214/:274/:307-326/:331-334/:359-360/:379-381——其中 :359-360 默认空表下将直接抛错、:331-334 恒空成假绿，Grill X-8 点名）；表形状测试改声明面口径；D-011 钉翻新 |
| 修改 | test/modules-rebuild-preserve.test.mjs | 增 span_risk 段 --force 回插断言 |
| 修改 | test/scope-audit.test.mjs | 夹具 map 补 span_risk 段（D-005 连带翻新：:1042 用例依赖旧默认表） |
| 修改 | test/audit-quick-completion.test.mjs | 夹具 map 补 span_risk 段（D-005 连带翻新：G-4 用例同因级联） |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md | 模块卡同步（span-risk-surface 补录、QUICK 表退役） |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.md | 模块卡同步（gates/shared 接线） |
| 修改 | .sillyspec/docs/sillyspec/modules/setup.md | 模块卡同步（config-schema note） |
| 修改 | .sillyspec/docs/sillyspec/modules/docs-consistency.md | 模块卡同步（map 段/knowledge 登记） |

## 接口定义

```js
// src/span-risk-surface.js
/** token 编译（纯函数）：非字符串/空白跳过、去重；转义后 (?:^|[/_-])token(?=[/._-]|$) /i */
export function compileSpanRiskPatterns(tokens) // → Array<{ pattern: string, re: RegExp }>
/** 共享命中语义（纯函数）：files 反斜杠归一 POSIX；/g lastIndex 防御 */
export function matchSpanRiskPatterns(files, patterns) // → Array<{ pattern: string, file: string }>
/** IO 装载（project 域）：docs/<project>/modules/_module-map.yaml 顶层 span_risk 段 */
export function loadSpanRiskPatterns({ specBase, project }) // → Array<{ pattern, re }>
/** IO 装载（多项目并集）：任一项目异常按空表跳过 */
export function loadSpanRiskPatternsAllProjects({ specBase }) // → Array<{ pattern, re }>

// src/ceremony-tier.js（签名增量）
computeCeremonyTier({ ..., spanRiskPatterns })   // 默认 []：span 模式维度关闭
reconcileDualRun({ ..., factSpanRiskPatterns })  // 穿透内部 computeCeremonyTier
// src/quick-gate-profile.js（默认值变更）
computeGateProfile(files, moduleIndex, { riskTable = [], ... })  // 参数形态不变，默认空表
```

YAML 声明形态（本仓自举实例）：

```yaml
span_risk:  # 本段为 span 轴风险路径声明（进 git 手工维护）；rebuild --force 按未知顶层段原样回插
  - migrate
  - migration
  - migrations
  - dispatch
  - scheduler
  - scheduling
  - cron
  - job
  - jobs
```

## 生命周期契约表

生命周期契约:无/N/A——本变更只迁路径模式表与装载接线，不新增/修改任何运行时实体的事件契约。

## 数据模型

无 schema 变更（无 SQLite 表/字段改动）。新增数据面仅 `_module-map.yaml` 顶层 `span_risk:` 段（手工维护 YAML 列表，随 map 进 git）。

## 兼容策略（brownfield 必填）

- **无 span_risk 段的项目**：两消费面 span 模式维度关闭（ceremony span 轴只剩文件数/跨模块两维；quick 画像 riskHits 恒空、runtimeEvidence 恒 'na'）——不回退内置表，与 blast「未配置禁回退」同款取舍；行为变化面（六域网消失）登记 known-issues/文档，项目按需自声明。
- **坏声明容错**：段非数组/条目非字符串/空 token 逐条跳过；map/YAML 损坏 → 空表。与 parseModuleMapSimple / loadBlastDeclarations 立场一致（坏数据不缺省不拦截）。
- **API 面**：QUICK_RISK_PATH_PATTERNS 导出删除是**破坏性变更**——仓内消费点（ceremony-tier/quick-gate-profile/两测试文件）本变更内全量切净；该导出属 CLI 内部模块（npm 包外无消费方），风险面可忽略；不留 legacy 别名（blast 退役同款纪律）。
- **map 兼容**：span_risk 段对旧版 CLI 是未知顶层段（parseModuleMapSimple 只读 modules 段，忽略未知段）；新版 CLI 读旧 map（无段）→ 空表。modules rebuild --force 未知顶层段通用回插（D-008@v2 机制）自动覆盖 span_risk，回归钉补断言。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 无声明项目静默失去六域网（auth/billing 路径不再触发 span S2 / quick L2） | P1 | blast 迁移同款取舍（D-008「未配置禁回退」先例）；known-issues/模块卡/config-schema note 文档化；本仓自举表示范 |
| R-02 | 迁移中匹配语义漂移（口径变化伪装成迁移） | P0 | 等价性回归钉：六域展开 token 集对代表性路径集与旧正则逐字节同命中（含 author/booking/lockfile 反例防串） |
| R-03 | 本仓 dispatch 域灵敏度上升（span 命中→S2 / quick L2，比现行严） | P2 | D-004@v1 有意为之（自 declaration 立意）；quick L2 是 advisory 不阻断；map 评审可调 |
| R-04 | token 拼错/过宽静默失配或误伤 | P2 | token 纯字面量 git 可评审；命中明细进 ceremony reasons / quick riskHits 审计输出 |
| R-05 | 接线遗漏某消费点导致口径分裂（如双跑事实面没吃到声明表） | P1 | 消费点清单以本设计文件清单为准逐点接线；测试覆盖 computeCeremonyTier 参数化 + reconcileDualRun 穿透 |
| R-06 | map 维护提示与 rebuild 行为脱节（span_risk 段被 --force 清空/提示丢失） | P2 | 维护提示落 span_risk 段内注释（键行后——头注区与段前置注释会被 --force 重发射丢弃，Grill X-10）；D-008@v2 通用回插机制已覆盖未知顶层段；modules-rebuild-preserve.test.mjs 增 span_risk 段（含段内注释）回插断言钉死 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 设计目标 1-3 / 非目标（价目表与 blast 段零改动）/ frontmatter risk_level 先行 | 已覆盖 |
| D-002@v1 | 背景（锚点事实修正）/ 非目标（不借道恢复）/ 文件清单 known-issues 条目 | 已覆盖 |
| D-003@v1 | 总体方案四层 / 兼容策略（无段空表+禁回退+硬退役） | 已覆盖 |
| D-004@v1 | 总体方案④自举 / 文件清单 map 行 / 风险 R-03 | 已覆盖 |

无未解决决策；无自审存疑项。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale + risk_level 先行声明）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-004 全部入追踪表）
- [x] 生命周期关键词：紧邻豁免短语（生命周期契约:无/N/A）
- [x] UI 原型分级核对：纯后端/CLI/配置变更，无界面变化，跳过原型（分级依据记入步骤 5 输出）
- [x] 无「⚠️ 自审存疑」标注项
