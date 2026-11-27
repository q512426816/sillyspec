---
author: t
created_at: 2026-11-27 23:50:51
generated_by: sillyspec-design-init
scale: small
---

# 设计文档（Design）— 2026-11-27-changes-dir-platform-default

## 背景

本仓（SillySpec dogfood 仓）`.sillyspec/changes/` 已入库 13227 个文件（archive 占 99.8%、125MB），每次 clone 全量拖载；同时平台侧（multi-agent-platform）已有权威的 spec 文件同步管道（manifest 增量推送 + base_version 乐观锁 + spec-pull 快照拉取），对平台用户而言 git 副本属双重存储。用户决策：变更文档**默认不放 git**（平台用户由平台管、单机用户自选、想跟踪的用户显式开启），配套收口提示、init 模板、doctor 迁移指引与文档族同步。平台侧适配（spec-pull 一键化、同步失败显性化等）另立变更（D-001），本变更交付面仅覆盖 sillyspec 仓。

## 设计目标

1. local.yaml 新增 `changes.doc_tracking` 枚举配置（`platform`（缺省）| `never` | `repo`），作为变更文档 git 跟踪行为的唯一声明真源（D-003@v2/D-004@v2）。
2. `repo` 之外的所有值下：归档链跳过 changes/ 面暂存（archive/<名>/ 与 changes/ 源侧补暂存），收口 epilogue 对 changes/ 面输出单行形态说明+回退指引；knowledge/docs 面暂存与其落库指引保留（与枚举解耦）。`repo` 值行为逐字不变。
3. `sillyspec init` 建仓按生效值条件写 `.gitignore` 忽略行与 example 注释。
4. doctor 新增存量仓迁移指引检查项，保证已入库存量仓升级后行为可预期。
5. 本仓自身切换到新默认（D-002@v1：存量保留跟踪、新增不入库）。
6. 文档族（CLAUDE.md / AGENTS.md / skills / file-lifecycle）措辞同步。

## 非目标

1. 平台侧任何代码改动（spec-pull 一键化、同步失败显性化、内容版本历史）——归平台侧另立变更（D-001@v1）。
2. 不改变归档/收口的状态机与子步**流程结构**——patch 冻结、distill、ledger、子步编排不动；但归档链内的 **changes/ 面 git 暂存动作**（src/run/complete-handlers.js:648 archive 目录 add、:704 changes/ 源侧补暂存）按枚举分支（platform/never 跳过）——这是 Design Grill 评审 fail 后的对齐修正：归档链含 git 操作，「全部不动」的前提不成立，分支必须下沉到暂存动作（D-004@v2）。
3. 不迁移存量入库文件——已跟踪的 13227 个文件保持跟踪（gitignore 对已跟踪文件无效，天然达成）。
4. 不做平台策略字段与本地枚举的运行时联动/映射层——词汇对齐由平台侧变更消费时处理。
5. knowledge/docs 面的暂存与落库行为不随枚举变化——知识资产入库与变更文档跟踪是两件事（D-004@v2 解耦决策）。

## 总体方案

### Phase 1 · 配置面（真源）

`src/config-schema.js:45`（LOCAL_YAML_SCHEMA）新增 `changes` 段 `doc_tracking` 键：枚举校验 `platform|never|repo`，缺省 `platform`（D-004@v2）；非法值在 config validate 报错。新增读取 helper（如 `resolveDocTracking(localConfig)`）：缺省/解析失败一律回退 `platform` 并留痕警告（fail 向不入库语义）。**语义边界（诚实口径）**：枚举的行为差异面=①收口 epilogue 输出形态、②归档链 changes/ 面暂存动作。变更目录不在项目工作树（平台外部 specDir）时 changes/ 面暂存天然为空操作，行为差异仅剩 epilogue 输出形态随值变。

### Phase 2 · 收口面与归档链（行为分支）

**归档链分支**（src/run/complete-handlers.js 归档子步内）：`doc_tracking !== 'repo'` 时跳过 changes/ 面 git add——`:648` archive/<名>/ 目录 add、`:704` minePaths 的 changes/ 源侧补暂存两处按枚举短路（避免 ignore 路径 add 报 fatal 触发 ：622「⚠️ 补暂存失败」告警）；`:661/:675/:721` knowledge/docs 面 add **保留**（与枚举解耦，D-004@v2）。子步编排与流程结构零变化，仅暂存动作短路。

**epilogue 两段式**（src/flow.js:3083 调用点）：`doc_tracking = 'repo'` 时现行为逐字不动（computeArchiveLanding → 🚨/✅+幂等 commit 命令）。`!== 'repo'` 时两段：①changes/ 面不跑 git 重算，输出单行 `📁 变更文档不入库（changes.doc_tracking=<值>）：spec 以平台同步为准（未接平台时仅存本机）；需入库请设 changes.doc_tracking: repo`（回退指引内联，满足 cli-copy-selfsufficient 探针）；②knowledge/docs 面若暂存区存在本变更蒸馏面（`git diff --cached --name-only` 过滤 `.sillyspec/knowledge/`、`.sillyspec/docs/`），保留落库指引行（该面出口不因枚举消失——修复评审指出的「暂存面无限累积无出口」）。doctor 残留检测（src/doctor-diagnostics.js:928 detectArchiveCommitResidue）扫描面维持 changes/ 前缀不变，knowledge 面出口由 epilogue 承担。`src/run/complete-handlers.js:875`（computeArchiveLanding）、`:892`（renderArchiveLandingEpilogue）、`:935`（resolveArchiveCommitPathspecs）三个纯函数零改动，分支收在调用点与归档链暂存动作两处。

### Phase 3 · init 面与 doctor 面

`src/init.js:407` ignoreRules 数组按「生效值 ≠ repo」追加 `.sillyspec/changes/` 行（幂等判重逻辑已有）；`src/config-schema.js:431`（renderExample）增 `changes.doc_tracking` 注释示例。doctor（`src/doctor-diagnostics.js:928` detectArchiveCommitResidue）changes/ 面语义不变（暂存区出现变更文档=残留，platform/never 下照样警告——不该有的东西在哪都是残留；knowledge 面不在其扫描范围，出口由 epilogue 承担）；新增迁移检查项：HEAD 树含 `changes/` 存量 && doc_tracking 未显式声明 → INFO「存量入库仓建议显式声明 changes.doc_tracking: repo」。

### Phase 4 · 本仓切换与文档族

本仓 `.gitignore` 加 `.sillyspec/changes/` 行、`.sillyspec/local.yaml` 显式 `changes.doc_tracking: platform`（吃狗粮；存量 13227 文件跟踪不变；**缺省形态翻转是有意行为变更而非零回归**——兼容策略与 R-01 如实登记）；同步文档：CLAUDE.md 与 AGENTS.md 中「文档改动随变更提交入库」惯例措辞、`.claude/skills/`（sillyspec-archive / sillyspec-flow / sillyspec-commit 中教 agent 提交归档件的动作按枚举改写为「repo 值才提交归档件」；knowledge 面落库指引保留）、`docs/sillyspec/file-lifecycle.md` 变更文档生命周期节补 doc_tracking 说明。knowledge 蒸馏产物的入库惯例不变（与枚举解耦），archive 锚点不受影响（历史条目不动）。

### Phase 5 · 测试面

纯逻辑先写测试，六块：①epilogue 调用点分支（repo 现形态逐字；platform/never 两段式——单行含回退指引、knowledge 面有暂存时保留落库指引、无暂存时不出该段）；②config-schema 枚举校验（未配置缺省回退/非法值报错/读取失败回退留痕——config-absent-zero-regression 探针的「缺省零回归」主张**不适用本变更**：缺省 platform 即有意翻转 epilogue 形态，测试锚=R-01 登记的翻转+doctor INFO，非逐字一致）；③归档链暂存分支（platform/never 短路 changes/ 面 add——:648/:704 两处不触 git；knowledge 面 add 保持）；④init ignoreRules 条件写入（≠repo 写、repo 不写、幂等重入）；⑤doctor 迁移 INFO 项（存量+未声明触发；显式声明/无存量不触发）；⑥文案探针对照（单行文案的配置键拼写、回退句与 config validate 接受值一致）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/config-schema.js | LOCAL_YAML_SCHEMA 增 changes.doc_tracking 枚举 + renderExample 注释示例 |
| 修改 | src/flow.js | :3083 收口 epilogue 调用点按 doc_tracking 两段式分支 |
| 修改 | src/run/complete-handlers.js | 归档链 changes/ 面暂存动作（:648/:704）按枚举短路；knowledge/docs 面（:661/:675/:721）保留 |
| 修改 | src/init.js | ignoreRules 按「生效值≠repo」追加 .sillyspec/changes/ 行 |
| 修改 | src/doctor-diagnostics.js | 新增存量仓迁移 INFO 检查项（detectArchiveCommitResidue 语义不变） |
| 修改 | .gitignore | 本仓追加 .sillyspec/changes/ 行（D-002 吃狗粮） |
| 修改 | .sillyspec/local.yaml | 本仓显式 changes.doc_tracking: platform（gitignored，不入 patch，落地以本地文件为准） |
| 修改 | CLAUDE.md | 「文档随变更提交入库」惯例措辞按枚举改写 |
| 修改 | AGENTS.md | 选道表与规则中「文档随变更提交入库」措辞按枚举改写 |
| 修改 | .claude/skills/sillyspec-archive/SKILL.md | 归档提交动作改写为 doc_tracking=repo 条件执行（实现期 grep「归档提交/落库/入库」全量定位其余 skills 散点，逐文件补入本清单） |
| 修改 | docs/sillyspec/file-lifecycle.md | 变更文档生命周期节补 doc_tracking 说明 |
| 新增 | NEW:test/doc-tracking-config.test.mjs | 配置枚举校验 + 缺省/失败回退测试 |
| 新增 | NEW:test/flow-epilogue-doc-tracking.test.mjs | epilogue 两段式分支 + 归档链 changes/ 面暂存短路测试 |
| 新增 | NEW:test/init-doctor-doc-tracking.test.mjs | init 条件写入 + doctor 迁移项测试 |

## 接口定义

本变更接口面：0 端点（无接口变更）——纯配置键新增与 CLI 输出形态分支，无 CLI flag / HTTP 端点 / 表结构变化。

## 生命周期契约表

本变更不涉及生命周期契约（lifecycle contract）——无 session/lease/agent_run/claim/heartbeat 状态机改动，收口状态机与子步流程零变化。

## 数据模型

无 schema 变更——仅 local.yaml 配置键新增（文件配置，非数据库）。

## 测试 seam 约定

- `resolveDocTracking`（配置读取 seam）：能查出缺省回退错误、非法值未拦截、fail 方向错误（不应 fail 向 repo）/ 查不出 local.yaml 文件级 IO 故障（由 config validate 层覆盖）。
- flow done epilogue 调用点分支 seam：能查出非 repo 值仍跑 git 重算（浪费子进程）、repo 值形态被误改、单行文案缺失 / 查不出 git 子进程真实失败（computeArchiveLanding 内部错误由其既有纯函数测试覆盖）。
- init ignoreRules 条件写入 seam：能查出 repo 值误写 ignore 行（会导致用户想跟踪却跟踪不上）、幂等重入重复行 / 查不出用户手工删行后的行为（文件事实由用户自管，文档声明）。
- doctor 迁移 INFO seam：能查出存量+未声明漏报、显式声明误报 / 查不出 HEAD 树读取失败（既有非仓 skipped 逻辑覆盖）。

## 兼容策略（brownfield 必填）

1. **未配置新键时**：`doc_tracking` 缺省 `platform`——存量用户升级后 epilogue 形态翻转（🚨 消失）。**这是有意行为变更而非零回归**（config-absent-zero-regression 探针的「缺省逐字一致」主张本变更不适用，测试锚=R-01 翻转登记+doctor INFO 断言）。缓解双通道：doctor 迁移 INFO 点名显式声明 repo；单行文案内联回退指引；CLAUDE.md/AGENTS.md 迁移说明。依赖🚨提示做归档提交的存量用户显式声明 `changes.doc_tracking: repo` 即恢复原行为（一字段回退路径）；`repo` 值下全部输出与行为逐字一致（该子集零回归有测试锚）。
2. **不变的 API 与表结构**：CLI 命令族签名、flow 状态机、归档子步、schema 校验其余键、平台同步协议（spec-sync/manifest）全部不动。
3. **gitignore 对已跟踪文件无效**是 git 语义保障：本仓等存量仓加行后存量文件照常跟踪，无需任何迁移脚本。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 存量用户升级后 epilogue 形态翻转（🚨+commit 命令消失），依赖该提示做归档提交的习惯被改变——**缺省形态为有意行为变更，不主张零回归** | P1 | doctor 迁移 INFO + 文档迁移说明 + 单行文案内联回退指引（需入库请设 repo）+ `repo` 一字段即恢复原行为 |
| R-02 | 配置中途改值（变更进行中 platform→repo）导致同变更两轮收口形态不一致 | P2 | 配置读取时点=收口时点，行为以下轮为准；风险留痕不做时点锁定（YAGNI） |
| R-03 | 平台侧另立变更定稿的策略词汇与本枚举不一致 | P2 | 词汇前置对齐（platform/never/repo 语义在 D-004@v2 固化）；分歧时在平台变更内统一改名并给 local.yaml 兼容读（D-004@v2 退役判据） |
| R-04 | 长驻进程/外部资源 | — | 无长驻进程/外部资源，生命周期面不适用（显式留痕） |
| R-05 | skills/文档族同步遗漏（教 agent 提交归档件的散点措辞） | P2 | 实现期 grep「归档提交/落库/入库」全量定位后逐一改写，收口文档核对门兜底 |
| R-06 | 归档链暂存短路遗漏（除 :648/:704 外的 changes/ 面触点）导致 ignore 路径 add fatal 告警复现 | P2 | 实现期 grep complete-handlers.js 全部 `changes` 前缀 add 触点逐一核对；测试③覆盖两处已知触点短路断言 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 非目标第 1 条、背景段——交付面仅 sillyspec 仓 | 已覆盖 |
| D-002@v1 | Phase 4 本仓切换、兼容策略第 3 条——存量保留+新增不入库 | 已覆盖 |
| D-003@v2 | Phase 1 配置真源（显式声明优于运行时探测；supersedes D-003@v1 布尔词汇） | 已覆盖 |
| D-004@v2 | Phase 1 枚举三值与缺省 platform、Phase 2 归档链 changes/ 面分支+epilogue 两段式+knowledge 面解耦、Phase 3 init 条件写入（supersedes D-004@v1） | 已覆盖 |
| D-005@v1 | 方案取舍留痕（布尔最小面否决），无直接设计章节，防复潮通道条目 | 已覆盖（留痕型） |

剩余风险：R-01/R-03/R-06 如上表；无未解决的 D-xxx@vN（D-003@v1/D-004@v1 已被 @v2 取代，仅作 supersedes 链保留）。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=small）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v1 / D-002@v1 / D-003@v2 / D-004@v2 / D-005@v1 全覆盖；@v1 旧版经 supersedes 链保留）
- [x] 生命周期豁免短语已落（「不涉及生命周期契约」紧邻否定）
- [x] UI 原型分级：跳过——纯 CLI/配置/文档变更，无任何界面变化（无前端文件触达，无探针对象）
- [x] 多裁定组合推演：D-004@v2 三态 × 变更目录位置（项目内/外部 specDir）× 本仓存量已跟踪形态——逐格核过：外部 specDir 下 changes/ 面暂存天然空操作、行为差异仅 epilogue 输出形态；本仓 platform+存量跟踪组合下存量归档不会重跑收口（归档变更不可重入收口），新归档 changes/ 面不暂存、knowledge 面照常暂存且 epilogue 给落库指引（出口存在）——组合无死锁格
- [x] Design Grill 评审（brainstorm-review-2026-11-27-235305）fail 结论已全部修复：非目标 2 前提修正（归档链含 git 操作）、分支下沉归档链暂存动作、knowledge 面出口保留、外部 specDir 边界句诚实化、D-003@v2/D-004@v2 升版、决策追踪引用修正、单行文案补回退指引
- [x] 不确定的问题标注「⚠️ 自审存疑」：无
