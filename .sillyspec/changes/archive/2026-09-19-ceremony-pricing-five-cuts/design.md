---
author: qinyi
created_at: 2026-09-19 08:30:00
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-19-ceremony-pricing-five-cuts

> revision 1：按用户 2026-09-19 深度审查重定范围——五刀中的刀 1（枚举继承精修）/刀 5（事实面 hunk）作废，新增 blast 轴项目化；保留追赶重定价/span 标题/高报记账。本版为四件事编队（D-001@v2）。

## 背景

2026-09-18-ceremony-risk-pricing 落地的仪式定价公式（ceremony_tier = max(blast, span, friction)）成立，但 blast 轴的输入源是错的：`detectChangeRisk`（src/change-risk-profile.js）用**硬编码全宇宙词表**（daemon/session/lease/lifecycle/heartbeat/entrypoint 等 24 式）对 design/plan 全文与 diff 文件内容做机械字符串匹配——该词表是 SillySpec 自用（多 agent 平台域）词汇，无项目配置入口，八个调用点（stage-contract×4 / run/gates / review-tier / run/verify-quality-scan / verify-postcheck）共用。实证链（2026-09-19 本仓）：

1. **撞词≠危险**：api-matrix 变更 design 写「无 session/lease/…/heartbeat」免责句被打 integration-critical（八词四漏出）；换仓则 HTTP session / lifecycle 回调 / 变量名 entryPoint 全是良性词。
2. **自指陷阱**：门禁引擎自身源码与指引文案写满关键词——8 文件全文件回放打出 deployment-critical，改门禁引擎的变更事实面天然 S3。
3. **时序粘住**：06:19 首定价 S3，06:31 design 补 `risk_level: unit-sufficient` 不重算——显式声明是补丁且受首定时序惩罚。
4. **span 解析器瞎**：readDesignOwnFiles 只认 `## 6.` 数字标题，现行模板 `## 文件变更清单` 8 行解析成 0。
5. **高报静默**：reconcileDualRun 只抓低报（fact > declared），高报不可见。

根因结论（知识库 conventions.md 已落条目）：判级/定价/门禁类机制的危险面信号必须来自项目自己的声明（路径/结构面）；显式人工通道是逃生补丁不是定价规则；首次判级早于声明须留重算通道；扫变更面不扫全文件不扫措辞。

## 设计目标

1. **blast 轴项目化**：危险面由项目在 `_module-map.yaml`（进 git）按路径前缀声明（tier + evidence 两属性）；`local.yaml` 只升不降并入；未命中 S1；未配置项目禁止回退旧词表；词表+否定抑制+枚举继承从定价与证据门默认路径删除、不留 legacy。
2. **仪式档与证据门分离**：证据门只认显式 `evidence: true` 声明路径，不从仪式档推断；evidence 命中不被 risk_level 豁免（豁免=改 map，git 可见）。
3. **追赶重定价**（保留）：完成门按当前声明面重算开跑价——无摩擦迁移可升可降、摩擦地板不退。
4. **span 标题修正**（保留）：readDesignOwnFiles 认「## 文件变更清单」双形态+段关闭。
5. **高报记账**（保留）：双跑高报 severity warn 只记账不阻断。
6. 自举交付：本仓自己的 blast 声明表（S3+evidence 钉真会话/租约/worktree/dispatch 路径；门禁判定文件 S2；core-engine 不整模块标价）。

## 非目标

- 价目表不动：档位集合 S0~S3、三轴 max 公式、SPAN_FILES_THRESHOLD=8、FRICTION_ESCALATION_THRESHOLD=2、force_tier 只升不降。
- 证据门判据不动：VERIFICATION_NEEDS literals、checkIntegrationEvidence/auditRuntimeReceipt 校验逻辑零改动——只换触发源。
- QUICK_RISK_PATH_PATTERNS 不迁（D-011：同族登记，管道建好后另立变更迁）。
- 在途 api-matrix-service-coverage 不动（D-007@v2：按已锁定 S3 跑完）。
- stage-contract 矩阵判定域不动（并行变更 api-matrix 领地，见兼容策略）。
- 不做行级/符号级危险面、不做 scan 自动改价（map 声明人工钉，宁缺勿错）。

## 拆分判断

单变更四件事强耦合：blast 项目化是追赶重定价的输入正确性前提（D-003 的重算必须吃到正确的 span/blast）；自举声明表与声明机制必须同交付（否则本变更自身无价可依）；warn 与事实面简化共享 verify-postcheck 接线面。无批量模式特征，不拆分。

## 总体方案

### Wave A：声明面机制（NEW:src/blast-surface.js + map + local + rebuild）

1. **新纯函数模块 `src/blast-surface.js`**：
   - `resolveBlastSurfaces(files, declarations)`（纯函数）：files POSIX 归一后对声明条目做前缀匹配（字面量或目录前缀——matchModuleForFile 同款语义，不发明第二套文法），返回 `{ tier, evidence, hitPrefixes }`——tier = 命中条目最高档（无命中 → 'S1'）；evidence = 任一命中条目带 `evidence: true`。
   - `loadBlastDeclarations({ specBase, project, localCeremonyConfig })`（IO 装载）：解析 `_module-map.yaml` 顶层新 `blast:` 段（形如 `- prefixes: [...]; tier: S3; evidence: true`）+ `local.yaml ceremony.blast_surfaces`（仅 tier，无 evidence 位）——合并语义：**逐文件取 max(map 命中档, local 命中档)，local 永不压低**；map 段缺失/坏形态 → 空表（不缺省不拦截，与 moduleIndex 同立场）。
2. **modules rebuild 保留**（src/modules.js）——实证修正（Grill P1-1）：非 force 重建本就是 dry-run 不写盘（modules.js:181-185）；**--force 是唯一写盘路径且为 merge 语义**（:91-94），但 merge 重发射只覆盖 modules 段 per-module 字段白名单（:166）、不生成任何顶层段——顶层 `blast:` 段在 --force 写盘时会丢。修法：**--force 重发射时从 existingMap 文本提取顶层 blast 段原样回插**（未知顶层段通用回插，不只为 blast 特判）；回归钉断言「--force 写盘后 blast 段在场且字节不变」（断言「非 force 保留」无保护力——它本就不写盘）。map 头注警告同步提及 blast 段。
3. **local.yaml 键**（src/config-schema.js）：`ceremony.blast_surfaces: [{ prefixes: [...], tier: S0~S3 }]`——注记明示「只升不降、不承载 evidence（证据语义属共享 map）」；ceremony 段「只升不降」表述同步改「无摩擦随声明重定价、有摩擦地板不退」。
4. **自举声明表**（本仓 `_module-map.yaml` 交付，D-010 口径）：
   - `tier: S3, evidence: true`——真会话/租约/worktree/dispatch 域：src/agent-session-log.js、src/friction-ledger.js、src/friction-tally.js、src/semantic-guard.js、src/workspace.js、src/runtime-hygiene.js、src/progress/、src/db.js、src/db-engine.js、src/worktree.js、src/worktree-apply.js、src/worktree-cross.js、src/worktree-deps.js、src/wt-commit.js、src/git-helper.js、src/review-dispatch.js、src/dispatch/
   - `tier: S2`（无 evidence）——门禁判定文件：src/stage-contract.js、src/stage-contract-engine.js、src/stage-contract-spec.js、src/verify-postcheck.js、src/verify-probes.js、src/ceremony-tier.js、src/review-tier.js、src/change-risk-profile.js、src/blast-surface.js、src/quick-gate-profile.js、src/probe7-anchor-check.js、src/run/gates.js、src/run/complete.js
   - 其余路径零声明（datetime/constants/fs-atomic/taskcard/知识库/文档/dashboard 等——S1 起步）。执行期清单微调允许，口径不变：S3 只钉真运行时域、门禁判定 ≤S2、core-engine 不整模块。

### Wave B：判级重构（src/change-risk-profile.js）

1. **删除**：INTEGRATION_CRITICAL_PATTERNS、INTEGRATION_FILE_PATTERNS、NEGATION_CUES / NEGATION_WINDOW / CLAUSE_SPLIT_RE / ENUM_GAP_RE、collectLineTriggerStats、RISK_LEVEL_CAUSES 词表命中文案（重写为声明面文案：「触碰项目声明的高危面 <prefixes>」/「显式声明」）。
2. **保留**：extractExplicitRiskLevel（frontmatter 五级词兼容）、VERIFICATION_NEEDS、checkIntegrationEvidence / auditRuntimeReceipt（证据门判据零改动）、QUICK_RISK_PATH_PATTERNS（span 轴与 quick 画像在用）、isEndToEndTaskText、回执来源分类族（RECEIPT_SOURCE_*）。
3. **新导出 `resolveChangeRisk({ files, blastDeclarations, explicitRiskLevel })`**：files × 声明面 → `{ tier, level, evidenceRequired, explicit, hitPrefixes, requiredVerification }`（`level` 为五级词兼容字段——evidenceRequired → 'integration-critical'，否则 tier 反查，存量 level 消费面零改动；接口定义节有完整签名）。requiredVerification：evidenceRequired=true → `['unit_tests','contract_tests','real_daemon_backend_integration','runtime_log_evidence','terminal_state_assertion']`（现行 integration-critical 组原样）；否则 `['unit_tests']`。**explicitRiskLevel（frontmatter）只压 tier**（五级词经 RISK_TO_TIER 映射，存量兼容），**不豁免 evidenceRequired**（D-009——今日显式短路连证据门一起免的懒 agent 洞收口）。

### Wave C：消费点接线（八点逐点，执行期 grep 复核防漂）

| 调用点 | 现输入 | 新输入与处置 |
|---|---|---|
| stage-contract.js:385（design 门判级） | designContent | files=readDesignOwnFiles(design) × 声明面 + explicit=extractExplicitRiskLevel(designContent) |
| stage-contract.js:658 / :1361 / :1641（verify 侧 changeRiskProfile 族） | designContent+… | 同上口径（files 取对应声明面/实际面，explicit 取 design frontmatter） |
| run/gates.js:632（定价 blast） | design/plan 全文 | files=declaredFiles × 声明面 + explicit；computeCeremonyTier 增 tier 直入通道（riskDetection.level 兼容层同批翻新） |
| review-tier.js:118（评审档实判） | design/plan+declaredFiles | 同上口径切换 |
| run/verify-quality-scan.js:531 | design/plan 全文 | 同上口径切换 |
| verify-postcheck.js:3082（双跑事实面） | 事实文件**内容** | **只传 actual.files**（文件名 × 声明面）；readCeremonyFactContent 调用与函数整体删除——事实面零内容扫描（自指陷阱整类消失） |

### Wave D：保留三刀

1. `applyDeclarationCatchUp` 三分支纯函数（ceremony-tier.js）：transitions 空且未超阈 → 整档换可升可降；空且超阈 → 整档换不设地板、同锁 escalate 即时 +1；非空 → max(重算档, transitions 最高 to 档)。重定价记 reasons「声明追赶重定价」、不记 transitions；gates 接线复用 computeInitialCeremonyTierDoc 时以参数区分事件文案（不追加「初始档/首见」行）。
2. `reconcileDualRun` 高报 warn（ceremony-tier.js）：fact < declared → `{ mismatch: false, severity: 'warn' }`；返回结构不加字段；文案由 runCeremonyDualRunCheck 写 notes。低报 error 逐字不变。
3. `readDesignOwnFiles`（run/gates.js）：标题双形态（`## 6.` / `## 文件变更清单` 含括注）+ 任何 `^##\s` 标题关闭清单段；旧标题行为不变。

### Wave E：契约同步与测试

1. config-schema ceremony 段两处注记（blast_surfaces 键 + 只升不降表述修订）；ceremony-tier.js 模块头注契约表述同步；core-engine / runtime 模块文档认领行为契约变更。**src/stages/verify.js :194-196 判级教学段重写（Grill P1-2）**：判级源改「项目声明危险面 × 变更文件」、否定抑制教学退役、risk_level 教学从「豁免级不再被强制拦」改「压仪式档、不豁免 evidence 要求——出路=改 map 声明或提供真实集成证据」；src/stage-contract-spec.js :55/:229 注册名注释同步。
2. 测试六组：**声明面组**（NEW:test/blast-surface.test.mjs：前缀匹配形态/无命中 S1/local 只升不压低/map 段缺失空表/evidence 位传递）；**rebuild 保留组**（NEW:test/modules-rebuild-preserve.test.mjs：--force 写盘后 blast 段在场且字节不变、非 force 不写盘双面断言）；**判级重构组**（test/stage-contract.test.mjs：否定抑制/枚举用例段随散文匹配退役删除，新增路径判级用例——含「显式声明压 tier 但不豁免 evidence」钉）；**引擎组**（test/ceremony-tier.test.mjs：warn 态〔含 :260 above 例 none→warn 翻新〕+ applyDeclarationCatchUp 三分支矩阵 + tier 直入翻新）；**门接线组**（test/concurrent-preflight-hooks.test.mjs：在场档追赶重定价落档/地板托底/事件文案）；**回归组**（全量 npm test + lint）。
3. **自指验收（改写）**：本变更自身在新架构下——blast = 门禁判定文件 S2、span = 文件清单 ≥8 → S2 → 档位 S2；verify 双跑事实面（actual.files × 声明面）= 声明档 S2，零 mismatch；不再有内容扫描类验收（随 Wave C 删除消失）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/blast-surface.js | resolveBlastSurfaces 纯函数 + loadBlastDeclarations 装载器（map blast 段 + local 只升合并） |
| 修改 | src/change-risk-profile.js | 删词表/否定抑制/枚举继承/detectChangeRisk 散文体；增 resolveChangeRisk；保留 extractExplicitRiskLevel/证据门判据/QUICK_RISK_PATH_PATTERNS |
| 修改 | src/ceremony-tier.js | applyDeclarationCatchUp、reconcileDualRun warn、computeCeremonyTier tier 直入、头注契约表述 |
| 修改 | src/run/gates.js | 追赶重定价接线（事件文案参数化）、readDesignOwnFiles 双形态+段关闭、computeInitialCeremonyTierDoc 输入源切换 |
| 修改 | src/verify-postcheck.js | 事实面去内容扫描（删 readCeremonyFactContent 及调用）、warn 消费 notes 披露 |
| 修改 | src/stage-contract.js | 四消费点接线（:385/:658/:1361/:1641）——与并行变更 api-matrix 不同区域，执行前重读最新态 |
| 修改 | src/review-tier.js | 实判输入源切换（design/plan 全文 → 声明面×文件） |
| 修改 | src/run/verify-quality-scan.js | 实判输入源切换 |
| 修改 | src/modules.js | --force 写盘时从 existingMap 文本回插顶层 blast 段（未知顶层段通用回插，+头注警告提及） |
| 修改 | src/config-schema.js | ceremony.blast_surfaces 键 + ceremony 段注记两处 |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | 自举 blast 声明段（S3+evidence 运行时域 / S2 门禁判定，D-010 全量表） |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md | 模块文档认领：判级/定价行为契约变更 |
| 修改 | src/stages/verify.js | :194-196 判级教学段按声明面新语义重写（Grill P1-2：否定抑制教学退役、explicit 不豁免 evidence） |
| 修改 | src/stage-contract-spec.js | :55/:229 判级注册名注释同步（detectChangeRisk → resolveChangeRisk） |
| 修改 | test/quick-gate-profile.test.mjs | :22 detectChangeRisk import + :363-399 判级回归组随散文匹配退役，替换为声明面用例（Grill P1-3） |
| 修改 | test/verify-conclusion-slot.test.mjs | :84 frontmatter 判级依赖用例翻新（Grill P1-3） |
| 修改 | test/ceremony-tier.test.mjs | 引擎组：warn/catchUp 三分支/tier 直入翻新 |
| 修改 | test/stage-contract.test.mjs | 否定抑制段退役删除 + 路径判级新用例（含 explicit 不豁免 evidence 钉） |
| 修改 | test/concurrent-preflight-hooks.test.mjs |
| 修改 | test/stage-review.test.mjs | 五断言声明面翻新（QA 阻断 2 修复面，零命中缺省 S1/命中 fixture 建 map） |
| 修改 | test/pass-eligibility.test.mjs | 态 D 按 D-009 口径重写（Step 9 全量跑出的第三处旧语义断言） | 门接线组 |
| 新增 | NEW:test/blast-surface.test.mjs | 声明面解析组 |
| 新增 | NEW:test/modules-rebuild-preserve.test.mjs | rebuild 保留回归钉 |

## 接口定义

- `resolveBlastSurfaces(files: string[], declarations: BlastDeclaration[]) → { tier, evidence, hitPrefixes }`（纯函数，无命中 tier='S1'）。
- `loadBlastDeclarations({ specBase, project, localCeremonyConfig }) → { declarations: BlastDeclaration[], mapDeclarations, localDeclarations }`（IO；返回三表——declarations=合并后全表，另两表分源审计；map 段 `{ prefixes: string[], tier: 'S0'..'S3', evidence?: boolean }`；local 仅 `{ prefixes, tier }` 且只升不降）。
- `loadBlastDeclarationsAllProjects({ specBase, localCeremonyConfig }) → BlastDeclaration[]`（IO；扫 specBase/docs/&lt;project&gt;/modules/_module-map.yaml 取全部项目声明并集——无 project 语境的消费点专用：verify-postcheck 事实面 / stage-contract / review-tier / verify-quality-scan）。
- `resolveChangeRisk({ files, blastDeclarations, explicitRiskLevel }) → { tier, level, evidenceRequired, explicit, hitPrefixes, requiredVerification }`（显式声明只压 tier 不豁免 evidence；`level` 为五级词兼容字段——evidenceRequired → 'integration-critical'，否则 tier 反查，存量 level 消费面零改动）。
- `resolveChangeRisk({ files, blastDeclarations, explicitRiskLevel }) → { tier, evidenceRequired, explicit, hitPrefixes, requiredVerification }`（显式声明只压 tier 不豁免 evidence）。
- `detectChangeRisk` **删除**（npm 导出面 breaking——本仓「不要求历史兼容」立场适用；调用点全量翻新）。
- `applyDeclarationCatchUp({ currentDoc, recomputedTier, recomputedComponents, recomputedReasons, frictionCounts }) → 新 doc 体`（transitions 原样透传）。
- `reconcileDualRun` severity 取值域扩 'warn'，返回结构零新增字段。
- `computeCeremonyTier({ riskDetection?, blastTier?, explicitRiskLevel, declaredFiles, moduleIndex, frictionCounts })`——增 blastTier 直入（与 riskDetection.level 兼容层并存，内部调用点同批切换）。
- `_module-map.yaml` schema：新增顶层 `blast:` 段（--force rebuild 写盘时文本回插保留）；其余字段零变化。

## 生命周期契约表

不涉及生命周期契约（判级/定价纯函数、map 声明面与门接线扩展，无 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 运行时语义——正文此类词均为退役词表的讨论对象）。

## 数据模型

- `_module-map.yaml` 增顶层 `blast:` 段（手工维护、rebuild 保留、进 git）。
- `local.yaml` 增 `ceremony.blast_surfaces`（每机覆盖、只升不降、不承载 evidence）。
- 零 db/facts/schema 变更：ceremony-tier-<change>.json 字段集不变；friction-ledger、progress.db、verify-facts 不动。

## 兼容策略（brownfield 必填）

- **存量 map 无 blast 段** → 该项目全部变更 blast S1 起步（预期行为：项目危险面自己声明；span 结构信号、friction 轴、低报双跑门仍在）。**禁止回退旧词表**（D-008）。
- **存量 design frontmatter risk_level 五级词** → 兼容（RISK_TO_TIER 映射保留）；evidence:true 命中不被其豁免（行为收紧点，verify 指引同步说明出路=改 map）。
- **本仓自举生效后**：改 S3+evidence 域文件的变更将被要求真实集成证据——原立意（改会话/租约必须拿运行时证据）恢复为正确形态。
- **detectChangeRisk 删除是 npm 导出 breaking**：本仓立场「已发布 npm、不要求历史兼容」适用；minor 版本号随发布递增。
- **并行变更**：api-matrix-service-coverage 正在改 stage-contract.js 矩阵判定域（:789-1250），本变更触其 :385/:658/:1361/:1641 判级消费点——区域不重叠，执行前重读最新态、Edit 前核对锚点行号漂移。
- **回退路径**：Wave 独立可退（声明面机制可空表运行、判级重构可整体 revert、三刀各自独立），但 blast 项目化与追赶重定价同进退（重定价吃新输入源）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | modules --force 重发射丢顶层 blast 段（实证：merge 只覆盖 modules 段白名单字段） | P1 | --force 写盘时从 existingMap 文本提取顶层段通用回插 + 回归钉断言写盘后 blast 段在场且字节不变（Grill P1-1 修正） |
| R-02 | 声明表与代码演化脱节（新文件落错价/漏声明） | P2 | map 人工钉、scan 不自动改价（宁缺勿错）；S3 门禁的守门靠评审而非机器 |
| R-03 | 本仓 evidence 门收紧面（自举后 runtime 域变更要求集成证据）误伤纯重构 | P2 | evidence 只挂真运行时域（D-010 全量表评审可见）；verify 指引写明出路（改 map 或提供真实证据） |
| R-04 | stage-contract.js 并行编辑冲突（api-matrix 曾同文件在改；Grill 时点已归档，前提消失但防御保留） | P2 | 消费点区域隔离（:385/:658/:1361/:1641）；执行前重读+锚点漂移核对（多 agent 铁律，习惯性防御） |
| R-05 | 未配置项目全 S1 的保护弱化观感 | P2 | 预期行为非回归（用户裁定口径）；span/friction/低报门/显式声明四层仍在 |
| R-06 | 消费点/删除面翻新遗漏（grep 面漂移：调用点 8 处 + test import 面 quick-gate-profile/verify-conclusion-slot/stage-contract-spec） | P1 | Wave C 执行期以 `grep -rn "detectChangeRisk(" src/ test/` 全量复核清零 + 全量测试 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v2 | 全篇四件事编队 | 已覆盖 |
| D-003@v1 | Wave D.1（追赶重定价三分支 + 事件文案） | 已覆盖 |
| D-004@v1 | Wave D.3（span 标题双形态+段关闭） | 已覆盖 |
| D-005@v1 | Wave D.2（高报 warn） | 已覆盖 |
| D-008@v1→v2 | Wave A（声明面机制）+ Wave B（词表退役）+ Wave C（接线）——v2 修正 rebuild 保留机制为「--force 文本回插」 | 已覆盖 |
| D-009@v1 | Wave B.3（evidence 位独立、不被 explicit 豁免） | 已覆盖 |
| D-010@v1 | Wave A.4（自举声明表全量表） | 已覆盖 |
| D-011@v1 | 非目标（QUICK_RISK_PATH_PATTERNS 登记） | 已覆盖 |
| D-002/D-006/D-007@v1 | superseded（重定范围） | 已标注 |

无未解决决策。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale/risk_level: unit-sufficient——纯函数判级/定价/门接线重构，测试为纯函数单测与合成声明面用例，零运行时集成面；正文此类词均为退役词表讨论对象）
- [x] 引用所有当前版本 D-xxx@vN（v2 后全集入决策追踪，superseded 三条标注）
- [x] 生命周期关键词核对——正文关键词均出现于退役词表讨论语境与豁免短语紧邻处
- [x] UI 原型分级核对——纯后端 CLI 判级/定价逻辑无界面变化，跳过原型
- [x] 不确定的问题标注——rebuild 保留行为以回归钉锁定（R-01 明示先例是假设）；八消费点执行期 grep 复核（R-06）
