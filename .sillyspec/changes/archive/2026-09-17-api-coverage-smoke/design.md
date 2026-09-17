---
author: qinyi
created_at: 2026-09-17 21:22:15
generated_by: sillyspec-design-init
scale: large
risk_level: contract-required
---

<!-- risk_level 显式声明 = contract-required（覆盖关键词误判 integration-critical）：命中词「claim」来自回执槽格式的字面字段名（claim: ...），非本变更触碰 daemon/跨进程/启动入口——本变更为 CLI 校验逻辑与配置面，行为契约变化（verify 门禁语义）属 contract-required 级；smoke 能力面向外部项目的服务生命周期，本变更自身无运行时集成面。 -->

# 设计文档（Design）— 2026-09-17-api-coverage-smoke

## 背景

2026-09-15 EHS 生产会话复盘的结论：verify 的 PASS 与「用户实测逻辑不出问题」之间的断层，一半被批次 A（2026-09-17-pass-cap-semantics，v3.28.11）封死——已知未验证区不得静默 PASS；另一半正是本批要补的：**运行时验证的地板**。EHS 的 5 个 P1 长在跨层契约漂移与运行时行为（字段错位/必填漏发/越权/事务/分页语义），静态门原理上抓不住，唯一机械防线是接口级冒烟；而「测什么」若无依据物，冒烟会退回 agent 自由发挥（EHS 单测因有 design 转移表可依而扎实，接口层因无依据物而零派生——P1 全长在这层）。

批次 A 已留好全部插位：`evaluatePassEligibility` 纯函数消费 facts（加第五条件即可）、quality-scan 指纹含 commands 段（加 smoke 键零改动生效）、回执四条件与 sourceTag 口径、severity/handover 承载通道。

## 设计目标

1. `commands.smoke` 配置键：CLI 亲跑（与 commands.test 同哲学），300s 超时帽，指纹自动覆盖（未变不重跑），回执机器段落盘（agent 不可改写）。
2. `facts.smokeRan` 第五事实条件：判级 integration/deployment-critical 且 smokeRan≠'ran' → PASS 封顶（不设 handover 豁免子句——blocking 在场由批次 A 条件②兜住；初版不 fail）。
3. 接口验证覆盖矩阵：design 接口表 tolerant 解析机械预填，行数 fail-closed，用例须挂依据 ID（五形态锚点），探索性用例不算覆盖。
4. 消费面维度（advisory）：端点×消费端子行，锚点=payload 构造点（非 services 层）。
5. 表间完备性（advisory）：写端点须在权限矩阵有行或显式豁免（治「表缺行型」缺陷如 EHS P1-4）。
6. smoke 纪律进 prompt（命中条件注入）：表驱动断言派生 + 负向下界 + 并行起服 + 严格 sql_mode + 载荷从构造点导出。

## 非目标

- 不做浏览器 E2E（Tier 2 后续独立变更）
- 不做 probe8 代码级直比/Controller 校验器提取（批次 B）
- 不做 keep-alive 服务复用档与外部常驻实例档（优化项，指纹复用已覆盖主成本）
- 不引入接口测试框架/契约测试框架（脚本冒烟即可，EHS 实证 mvn test 被框架 parent 干掉）
- 不动 probe7 既有矩阵（接口矩阵为独立章节并行存在，口径注记区分）
- smoke 不做 per-task 粒度（变更级一条命令）
- 不做 normative 接口表格式硬契约（tolerant 先行，D-005）

## 拆分判断

批次 C 单变更不拆：矩阵（测什么）与 smoke（怎么跑）是同一闭环的两半，拆开则矩阵无执行面、smoke 无依据物。批次 B/D/E 独立后续变更。

## 总体方案

### §1 commands.smoke 配置与 CLI 亲跑（D-001/D-010）

- `config-schema.js` commands 段登记 `commands.smoke: <string>`（与 test/lint/install 同信任级；缺省无行为变化）。
- 执行点：`verify-quality-scan.js` 实测段（executeVerifyQualityScan）——与 commands.test 同段亲测对账；**300s 超时帽**（gate_snapshot.commands 执行段先例同款），超时/非零 exit 记录为失败态（封顶信号非崩溃）。**快照内 junction I/O 慢的应对**（Grill #16）：smoke 负载重于 lint（lint 实证快照内 3~5min 被杀需回退主仓，verify-quality-scan.js:296-301 先例）——smoke 在快照内超时时**回退主仓 cwd 复跑一次**（同款策略），仍失败才记失败态。
- **指纹自动覆盖**：computeQualityScanFingerprint 已含 commands 段原文——配置 smoke 后，代码与脚本未变 → 复用上次实测记录不重跑（零改动生效）。
- 脚本自理服务生命周期（后台起服+轮询就绪+断言+finally 杀），CLI 视角 = 一条命令 + exit code。

### §2 facts.smokeRan 第五事实条件（D-002）

- producer：backfillFactsFromMdAndTests（批次 A 已扩写面）同批写 `facts.smokeRan: 'ran'|'not-ran'|'not-configured'`——输入 quality-scan 实测记录的 smoke 执行面。**边界态封闭**（Grill #7）：记录在场且 smoke 段 exit 0 → ran；记录在场 exit 非 0/超时 → not-ran（失败也是未通过）；记录在场但**无 smoke 段**（升级过渡期的存量记录）→ not-ran + fail-open 注记（同 X-01 口径）；记录缺失 → not-ran + 注记；`commands.smoke: unavailable`（环境探测不可用）→ not-configured（对齐 coverage 先例 verify-quality-scan.js:191-192）；未配置键 → not-configured。
- consumer：`evaluatePassEligibility` 加第五条件——`changeRiskProfile.level ∈ {integration-critical, deployment-critical}` 且 `facts.smokeRan !== 'ran'` → triggered 加枚举 `smoke-not-run`。**语义澄清**（Grill #5 附注）：第五条件**不设 handover 豁免子句**——blocking handover 在场时批次 A 条件②已拦（出口=NOTES），advisory handover 不构成 smoke 缺失的 PASS 豁免；smoke 缺失的合法出路只有两条：配 commands.smoke 并复跑质量扫描步，或降级 PASS WITH NOTES（移交项承载）。非判级零行为（runtimeEndpointExcluded 同款判级限定形态）。
- 初版封顶不 fail（D-002）：攒一轮实证后由后续变更评估升 fail。

### §3 smoke 回执机器段（D-003）

- quality-scan 亲跑 smoke 时自动落回执记录：log 路径 `.runtime/verify-logs/smoke-<change>.log`（tee 实录）、mtime=执行时点、exit code 实录。
- **来源标记由 CLI 打标、分类面消费**（Grill B-1 修正——「smoke 命令天然跨层」不成立：`node scripts/smoke.mjs`/`bash smoke.sh`/`python smoke.py` 等脚本形态在既有 RECEIPT_SOURCE_CROSS_LAYER_RE 下全判 build，会误拦金路径）：①`parseEvidenceSlots`（verify-facts-schema.js）扩**逐条 source 字段提取**——机器段行携带 `| source: cli-noai-smoke` 尾注并可被解析回填；②`classifyReceiptSourceTag`（change-risk-profile.js）与 `classifyReceiptCommandSource`（verify-probes.js）认 CLI 机器段标记**直判 cross-layer**（双侧同步，兑现批次 A 退役判据注释「由 smoke 回执一票判定集成实测已跑」）。
- **注入时点与幂等**（Grill #15）：机器段在 verify-result 回执槽由 CLI 预填——quality-scan（step 6 noAI）先于「输出验证报告」（step 7 --init）执行，故注入挂在 **backfill/骨架生成合并时点**（ensure 式补段先例 ensureAcceptanceMatrixSection，verify-probes.js:1905）：段已在场（CLI 机器段 source 标注识别）→ 跳过；agent 改写机器段 → gate 重跑对比打回（见 R-06）。存量 verify-result.md（无机器段）→ 下次 quality-scan 亲跑后由 ensure 补段。
- **缺态标注**（Grill #12/D-003 补）：未配置 → 槽段标 `not-configured`；配置未跑/超时 → 标 `not-ran`（exit/mtime 空）。
- agent 只可追加段、不可改写机器段（source: cli-noai-smoke 标注 + 一致性对比，见 R-06）。

### §4 接口验证覆盖矩阵（D-004/D-005，核心）

- **骨架新章节**「## 接口验证覆盖矩阵」：verify-probes generateVerifyResultSkeleton 增段（在 probe7 矩阵段之后，附口径注记与 probe7 的区分——probe7=验收项×测试承接面，本矩阵=接口端点×验证用例面）。
- **tolerant 解析器** `parseDesignApiTable(designMd)`（verify-probes 新函数）：扫 design.md 表格行，认「行内含 HTTP 方法 token（GET|POST|PUT|DELETE|PATCH，词边界）+ 路径样式 token（`/xxx` 或 `{xxx}` 模板段）」→ 产出 `[{method, path, rowIdx}]`；跳过纯文档示例行（design 自身的「非目标/先例引用」段内的行不计——按段头过滤：仅认「接口定义」类段头下的表格，段头启发式：含 接口/端点/API/REST 关键词的 ## 段）。
- **行数对账 fail-closed**：新 validator `validateApiCoverageMatrix`（stage-contract，与 validateAcceptanceMatrix 同构注册）。**覆盖记账语义**（Grill B-2 修正）：对账分母=接口面 N 端点（解析或声明），分子=**判定列=covered 的端点行**——partial/uncovered 端点行**不计入已覆盖**；「partial/uncovered 端点行 × 移交项零有效行 → error」（同 probe7 条件④联动形态——已覆盖不足且有未验证端点无去向 = 不可静默）；分子<N 且无未验证端点的移交承载 → error 逐条列缺行端点。矩阵行须含：判定列（covered/partial/uncovered/non-testable 四枚举）+ 用例依据 ID + 结果 + 证据锚点。
- **依据 ID 锚点形态钉死**（Grill #10）：`design接口表#<端点标识>`（`METHOD /path` 形态，非物理行号——行号随编辑漂移） / `权限矩阵[<角色×动作>]` / `契约表@<行标识>` / `DDL@<列名>` / `载荷@<构造点路径>`；校验深度=**解析级**（`design接口表#` 须命中 parseDesignApiTable 产出集合，防空指），其余形态级（存在即认）。
- **non-testable 端点行记账**（Grill 复审 #3）：判定列 non-testable 的端点行不占分子也不触发移交联动——写明理由即合法（对齐 probe7 先例 stage-contract.js:900），有效分母 = N − non-testable 行数。
- **探索性行与消费端子行的机械文法**（Grill #9）：探索性用例行=判定列写 `uncovered` + 证据列含 `[探索]` 标记（不占用 covered 记账，验证自由发挥用例但明示不算覆盖）；消费端子行=端点行下一行、以两空格缩进 + `↳ <消费端>:` 前缀书写——**子行不计入 N 端点对账的分母分子**（对账只数端点行，子行是 advisory 附加面）。
- **零解析降级**（D-005）：解析零行时骨架注入声明占位行「本变更接口面：<N> 端点（agent 声明）」——对账按声明数；声明与解析并存以解析为准并注记；**皆无且判级 critical → error**（接口面不可静默为零——「变更有接口面」以判级 critical 为机械代理，非语义判定）；**判级 critical 且声明 0 端点 → warning 提示复核**（D-005 故障面条款落位）。

### §5 消费面维度 + 表间完备性（D-006/D-007，advisory）

- 消费面子行：矩阵每端点行下挂消费端子行（`web`/`mp`/`script` 等，来源=design 清单文件面（routes/pages/model 目录启发式）+ task 卡 repo 声明机械归类）；子行证据锚点要求 `载荷@<构造点路径>`。第一版 **advisory**：有消费端的端点未填子行 → warning 列出（不阻断）；攒实证升硬。
- 表间完备性：接口表每个**写端点**（POST/PUT/DELETE/PATCH）检查 design 权限矩阵段（段头启发式：含 权限/角色 关键词的 ## 段）有对应行（路径或动作 token 命中）或显式豁免标记（「无权限约束」）；缺 → warning「写端点 X 未在权限矩阵声明——补行或显式豁免（表缺行会让派生框架继承你的洞）」。advisory 输出并入矩阵预填段尾部。

### §6 prompt 纪律 + 清单 + 镜像（D-008）

- stages/verify.js 输出验证报告步补 smoke 纪律段（**命中条件注入**：local.yaml 配了 commands.smoke 或变更判级 critical 时渲染）：
  ①断言派生表：design 接口表每行 ≥1 happy-path（含出参形状断言）/ 权限矩阵每行 ≥1 反例（非授权操作应拒）/ 契约表必填每项 ≥1 空值反例 / 转移表每边 ≥1 状态断言 / 需求字面（单号格式等）→ 格式断言；
  ②负向下界：每写端点 ≥1 权限反例（E4 类）+ 全链 ≥1 注错全量回滚断言（E5 类）；
  ③执行口径：脚本后台起服+轮询就绪+finally 杀（墙钟增量≈冒烟本体）、DB 会话自设严格 sql_mode、载荷从消费端构造点导出（手写正确字段的测试抓不住字段漂移）；
  ④断言锚点注释（每步挂依据 ID）与矩阵行一一对应。
- stage-review-checklist.js：`REVIEW_CHECKLISTS` **新增 verify 键** + 渲染接线（verify 阶段 prompt 渲染该清单条目——本批为新增键非加条目；批次 A 先例是向既有键加条目）+ smoke 纪律条目（文本内嵌命中条件说明）；test/stage-review-checklist.test.mjs 快照随行（清单键 3→4）。
- stages/verify.js 既有两处「CLI 不代跑集成进程」文案（:197/:210）**同步改写**（「集成回执须 agent 真实执行——commands.smoke 配置后由 CLI 亲跑并机器落盘，其余形态仍须 agent 实跑后据实填写」——消除与亲跑语义的直接矛盾，Grill #13）。
- 文档镜像三步流水线再生（_extract → _sync → _verify）。

### §7 测试面

- 新增 `test/smoke-gate.test.mjs`：配置键解析/quality-scan 执行段（mock 命令 exit 0/非0/超时三态+快照超时回退主仓）/指纹含 smoke 键/回执机器段形态与 source 标记提取/分类器认机器段直判 cross-layer（B-1：`node scripts/smoke.mjs`/`bash smoke.sh` 脚本形态回归）/回执槽一致性对比（R-06）/smokeRan producer 边界五态/第五条件（critical×三值/非判级零行为/advisory handover 不豁免）。
- 新增 `test/api-coverage-matrix.test.mjs`：parseDesignApiTable 五形态（规范表/缺方法列/模板路径/段头过滤/示例行跳过）/covered 记账语义（partial/uncovered 不计分子/子行与探索行不计账/移交联动 error）/行数对账/锚点解析级校验（design接口表#须命中解析集）/声明降级/critical×声明0端点 warning/消费面与表间完备性 advisory。
- 既有增量：test/pass-eligibility.test.mjs（第五条件态）、test/verify-conclusion-slot.test.mjs（smoke-not-run 文案）、config-schema 相关既有测试（新键登记）。
- 预计 +50~70 断言。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/config-schema.js | commands 段登记 commands.smoke 键（id/desc/example，缺省可选） |
| 修改 | src/run/verify-quality-scan.js | 实测段增 smoke 亲跑（300s 超时帽/execSync 实录/失败定性）+ 回执机器段落盘（log/mtime/exit/sourceTag=cross-layer）+ 实测记录含 smoke 面。数据流：producer=quality-scan 亲跑 → 记录 json → facts.smokeRan（verify-probes）→ evaluatePassEligibility 第五条件 |
| 修改 | src/verify-probes.js | parseDesignApiTable 新函数 + generateVerifyResultSkeleton 增「接口验证覆盖矩阵」段（预填+口径注记+声明占位）+ backfill 写 facts.smokeRan + 消费面/表间完备性 advisory 输出 + 回执槽机器段预填（source: cli-noai-smoke 标注） |
| 修改 | src/change-risk-profile.js | classifyReceiptSourceTag 认 CLI 机器段 source 标记直判 cross-layer（Grill B-1：脚本形态 smoke 命令在既有正则下判 build 会误拦金路径——批次 A 退役判据兑现） |
| 修改 | src/verify-facts-schema.js | parseEvidenceSlots 扩逐条 source 字段提取（机器段尾注回填）+ additive 登记 smokeRan 枚举（缺省不炸） |
| 修改 | src/verify-postcheck.js | checkProbeConsistency 增机器段一致性对比（回执槽 CLI 段防篡改——Grill #6：现只对比探针子节计数不覆盖回执槽） |
| 修改 | src/stage-contract.js | evaluatePassEligibility 第五条件（smoke-not-run 枚举+判级限定+修复指引）+ validateApiCoverageMatrix 新 validator（covered 记账/行数对账/锚点解析级校验/partial×uncovered 移交联动/探索性与子行不计账）注册进 verify.validators |
| 修改 | src/stages/verify.js | 输出验证报告步 smoke 纪律段（命中条件注入：四段纪律全文）+ 两处「CLI 不代跑集成进程」矛盾文案改写（:197/:210） |
| 修改 | src/stage-review-checklist.js | REVIEW_CHECKLISTS 新增 verify 键 + 渲染接线 + smoke 纪律条目 |
| 修改 | test/stage-review-checklist.test.mjs | 清单快照随行（键 3→4） |
| 修改 | docs/prompt/verify.md | 文档镜像（三步流水线再生） |
| 修改 | docs/prompt/_extracted.json | 镜像数据再生 |
| 新增 | NEW:test/smoke-gate.test.mjs | 配置/执行三态/指纹/回执/第五条件六态断言 |
| 新增 | NEW:test/api-coverage-matrix.test.mjs | 解析五形态/对账/锚点/探索性/降级/advisory 断言 |
| 修改 | test/pass-eligibility.test.mjs | 第五条件态断言（G.r2 输入 additive 调整归 task-03 已落） |
| 修改 | test/verify-probes-facts.test.mjs | 骨架章节计数 14→15 随行（新章配套，task-04） |
| 修改 | test/check-syntax.mjs | PENDING_EXPORT_WHITELIST 符号级白名单（lint 死码门禁官方通道，task-04/05） |
| 修改 | test/acceptance-matrix-gate.test.mjs | validators 链数断言 3→4 随行（第 4 validator 注册配套，task-05） |
| 修改 | src/verify-postcheck.js | auditSmokeReceiptConsistency export 接线（task-07，task-02 挂账正主通道，纯 export 零行为变化） |
| 修改 | test/verify-conclusion-slot.test.mjs | smoke-not-run 触发文案断言 |

## 接口定义

```js
// src/verify-probes.js（新增导出）
export function parseDesignApiTable(designMd)
// → { endpoints: Array<{method: 'GET'|'POST'|'PUT'|'DELETE'|'PATCH', path: string, rowIdx: number}>,
//     declared: number|null,          // agent 声明数（声明行在场时），与解析并存以解析为准
//     sectionHint: string|null }      // 命中的接口段头（审计注记）

// src/stage-contract.js（新增导出，双层形态同批次 A）
export function validateApiCoverageMatrix(cwd, changeName, context)
// 注册壳同 validateAcceptanceMatrix 三参签名；内部组装 { apiFace, matrixRows, factsExpected } 调纯函数
// → { ok, errors, warnings }：行数不足/锚点缺失 → errors；消费面/表间 → warnings

// facts 契约（producer→consumer 第 6 字段）
facts.smokeRan: 'ran' | 'not-ran' | 'not-configured'   // D-002 三态；判级 critical 时第五条件消费
```

生命周期契约：不涉及生命周期契约。

数据模型：verify-facts.json additive 可选字段 smokeRan（schemaVersion 不变）；quality-scan 实测记录 additive smoke 段（schemaVersion 1 兼容）。

## 兼容策略（brownfield 必填）

- **未配置 commands.smoke 零行为变化**：执行段/第五条件在未配置时不触发（not-configured 仅判级 critical 时进入封顶口径——存量 critical 变更首次 verify 会被拦，出路=配 smoke 或 handover 承载或显式 risk_level 降级，三者皆合法）。
- **接口表零解析零声明且非判级 critical**：矩阵段渲染「无接口面」注记，validator 空转零行为。
- **probe7 矩阵不动**：接口矩阵独立章节，两矩阵并行存在（口径注记互指区分）。
- **回退**：第五条件=evaluatePassEligibility 内一个分支（移除即回退）；矩阵 validator=注册行移除；执行段=配置键删除即休眠。
- **不改变**：facts schemaVersion、结论枚举、commands.test/lint 语义、probe7/probe8 语义。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | tolerant 解析漏端点（行数偏低 → 漏覆盖假绿） | P1 | 段头过滤保守（宁多勿漏：接口段头启发式宽收）；漏解析 → 矩阵行少 → 端点无覆盖行被 error 点名（fail-closed 兜住漏解析的后果：宁可拦也不静默）；声明降级通道供 agent 显式补 |
| R-02 | 解析误报端点（文档示例行被当接口 → 行数虚高假红） | P2 | 段头过滤（非接口段的表格不计）+ 模板路径/方法 token 双条件 + advisory 注记可疑行 |
| R-03 | smoke 脚本慢/挂死拖累 verify | P2 | 300s 超时帽 + 指纹复用（未变不重跑）+ prompt 纪律段并行起服指引 |
| R-04 | 存量 critical 变更首跑被第五条件拦 | P2 | 三条合法出路（配 smoke/handover 承载/risk_level 降级）写进 error 文案；初版封顶不 fail |
| R-05 | 消费端归类启发式错（advisory 假提示） | P3 | advisory 无阻断；格式实证后收紧 |
| R-06 | 回执机器段被 agent 篡改 | P2 | 机器段带 `source: cli-noai-smoke` 标注 + checkProbeConsistency **新增回执槽一致性对比**（现只对比探针子节计数——Grill #6 修正，verify-postcheck.js 入清单）；facts.smokeRan 自 quality-scan 记录推导、不受 md 篡改影响（双源兜底） |
| R-07 | 矩阵与 probe7 双矩阵认知负担 | P3 | 骨架口径注记互指（probe7=验收×测试承接面 / 接口矩阵=端点×用例面） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 §1 + FR-01 | 已覆盖 |
| D-002@v1 | 总体方案 §2 + FR-02 | 已覆盖 |
| D-004@v1 | 总体方案 §4 + FR-04 | 已覆盖 |
| D-005@v1 | 总体方案 §4 降级段 + FR-05。注：「变更有接口面」以判级 critical 为机械代理（Grill #11 对齐）；「critical+声明 0 端点→warning 复核」已落 §4 | 已覆盖 |
| D-006@v1 | 总体方案 §5 + FR-04 | 已覆盖 |
| D-007@v1 | 总体方案 §5 + FR-06 | 已覆盖 |
| D-008@v1 | 总体方案 §6 + FR-07 | 已覆盖 |
| D-009@v1 | 非目标 | 已覆盖 |
| D-010@v1 | 总体方案 §1/§4 硬度形态 + FR-01/FR-04 | 已覆盖 |
| D-003@v1 | 总体方案 §3 + FR-03。注：缺态槽段标注（not-configured/not-ran）已落 §3（Grill #12） | 已覆盖 |

无未解决决策；剩余风险见 R-01~R-07（R-01 的最终收紧依赖格式实证攒轮）。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-010 十条全覆盖）
- [x] 生命周期关键词豁免短语已写（「不涉及生命周期契约」，紧邻格式）
- [x] UI 原型分级核对：纯 CLI 校验/配置逻辑无界面变化——跳过（Step 5 已向用户声明且确认）
- [x] 无自审存疑项（批次 A 的落点已全部实证过：quality-scan 指纹形态/evaluatePassEligibility 插位/skeleton 渲染段——本批全部复用已验证代码面）
