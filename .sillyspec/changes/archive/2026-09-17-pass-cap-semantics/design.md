---
author: qinyi
created_at: 2026-09-17 11:31:37
generated_by: sillyspec-design-init
scale: large
---

# 设计文档（Design）— 2026-09-17-pass-cap-semantics

## 背景

2026-09-15 EHS 生产会话（变更 2026-09-15-ehs-reward-punishment，三仓交付）复盘实证：verify 结论 PASS WITH NOTES 出门时，「集成测试未跑（环境阻断）」「三端联调人工验收」「fix.sql 手工执行」三个**已知未验证区**全部在场——被 NOTES 语义吸收而非阻断。随后人工深查发现 5 个 P1（含「相关方支线三端均不可用」），用户实测又连续撞出保存炸库（fix.sql 未执行）、下拉全空（角色 tenant_id 数据缺陷）等逃逸。

机制根源有三：
1. **结论资格无事实面条件**：现行证据门 `requiresEvidence = PASS || (NOTES && !explicit)`（src/stage-contract.js:649）只管「要不要集成证据」，「能不能写 PASS」没有任何事实面校验。
2. **诚实申报无阻断力**：Runtime Evidence「不涉及」自声明、移交项 prose 叙述、probe7 矩阵 partial/uncovered 合法填值——三条「如实说没做」的通道都能与 PASS/无移交 NOTES 并存。
3. **回执口径漏洞**：mvn compile + JUnitCore 纯单测的三条 log 通过了集成回执四条件校验（四条件只验 log 形态不验内容层次）——单测/编译类回执被当成集成实测。

本变更为防复发方案的**批次 A**（语义层 + 配套门眼睛修复 + fix.sql 声明门）。批次 B（probe8 diff 源/校验器提取）、C（接口验证覆盖矩阵 + smoke 硬门）、D（checklist 固化）、E（归档侧移交项闭环对账——治「NOTES 出门后移交项腐烂没人跑」的后半段失败链）为后续独立变更。

## 设计目标

1. 结论=PASS 时，四个事实条件（集成实测未跑 / **blocking 级** handover 行在场 / db 脚本未声明执行 / 矩阵 partial·uncovered 无移交去向）**全部不成立**，任一成立即 verify gate error——已知未验证区不得静默通过。
2. 「要不要集成证据」（随 risk_level 分层，误伤逃生保留）与「能不能写 PASS」（只看事实面）**解耦**。
3. handover 成为唯一合法的「带缺口出门」通道：如实上报 advisory 级零惩罚，blocking 级触发封顶，且防两面滥用（NOTES 洗 PASS / 漏报少写）。
4. fix.sql 类前置脚本从「口头契约」变「verify 判定 + apply/archive-confirm 兜底双门」。
5. 四处门自身失明点修复（skip 跨仓档位 / adopt 勾选断链 / probe7 跨仓多根 / design 无段头缺口）。

## 非目标

- **不连库实测**：不做 information_schema 对账（local.yaml 无 database 配置段，属后续独立决策）。
- **不做冒烟/契约探针升门**：commands.smoke、probe8 diff 源与硬门化属批次 B/C。
- **不做归档侧闭环对账**：handover 条目的 resolved/豁免/转结构化负债语义属批次 E（本批只做 archive 确认点注入清单的可见性地基）。
- **不新增结论枚举档**：不引入 CONDITIONAL——NOTES + 结构化 handover 已能承载（D-001@v2 退役判据记录重构条件）。
- **不做 handover 逐行强关联硬门**：第一版存在性门槛，逐行关联 advisory 攒实证（D-003）。
- **不动 facts schemaVersion**：facts 新增字段全部 additive 可选，handover 字段已存在，本变更只新增生产与消费方。

## 拆分判断

批次 A 单变更不拆：四小修 + fix.sql 门与语义封顶同属「假 PASS」因果链（语义收紧了、眼睛半盲照样漏），拆开留半盲窗口。B/C/D/E 独立后续变更（C 依赖本批的统一插位，E 依赖本批的 severity 与注入地基）。无批量模式特征。

## 总体方案

### §1 validatePassEligibility——facts 锚定的集中式封顶（D-001@v2/D-010/D-011/D-012）

新增 validator，与 `validateAcceptanceMatrix` 同构注册进 verify validators（src/stage-contract.js:1069-1077 注册面）。判定式：

```
结论 === 'PASS' 且 [①集成实测未跑 ②blocking 级 handover 行>0 ③db/*.sql 未声明执行 ④矩阵含partial/uncovered且handover零行(任意级)] 任一成立
→ error（逐条列触发行 + 修复指引：改写 PASS WITH NOTES 并补「## 移交项（结构化）」）
```

**实现纪律（D-011）——producer/consumer 分层，validator 零 MD 解析**：
- 事实生产走 facts 管线：`backfillFactsFromMdAndTests`（verify-probes.js:1591，已接收 testCheckResult）扩写——`facts.integrationRan`（输入 quality-scan 实测记录 + test_strategy + 回执来源标签，按 D-006 判定表）、`facts.dbScriptDeclarations`（`parseDbScriptDeclarations(verifyMd)` 解析声明段）。**时序纪律（X-08）**：integrationRan/dbScriptDeclarations 必须在**首次 backfill**（gates 收尾前置、无 testCheckResult 时点）产出——quality-scan 记录按 verify-quality-scan.js:36 的路径规则自 specBase 推导自读，不依赖调用方传参；误挂二次回填则 validator 恒误拦；
- 矩阵事实并入 backfill 同批写入时，`extractAcceptanceMatrixSlots` 由 verify-probes 侧**动态 import 后传参**（conclusion 先例）——维持 verify-probes → stage-contract 分层单向，不造静态 import 环；
- 事实③的文件集在 **verify 时点**取 `design.md 文件清单（design-facts 已解析）∪ worktree changed files` ∩ `db/**/*.sql`（D-012——apply manifest 此时不存在，apply 门退为事后兜底，见 §4）；
- 事实②③④消费现成产出：facts.handover（blocking 行计数，severity 口径见 §4）、facts.dbScriptDeclarations、`extractAcceptanceMatrixSlots` 现成槽解析（矩阵事实并入 backfill 同批写入）；
- validator 本体退化为纯函数 `eligible = conditions.every(...)`——批次 C 加条件 = 加一个 facts 写入方 + 一行注册。

**双源 fail-closed（D-011）**：facts 快路径 + MD 锚点校验（并入 checkProbeConsistency 抽查面，防 facts.json 被删/被改——本仓既有坑「facts 可删、正文锚点才是防篡改基准」）。factsExpected 判定式：`isIrStrictVerifyChange(changeDir) || verify-facts.json 在场（含探针子节判别，同 checkProbeConsistency 口径）`——factsExpected=true 而 facts 缺失 = 篡改/故障 → 按条件触发拦下；严格档变更删 facts.json 由 checkProbeConsistency 的 error 级 MD 锚点兜底拦（通道：gates probeBlocked）；factsExpected=false（存量未跑管线）→ 沿用存量兼容 skip 口径，不误伤。**时序口径（X-01）**：条件①在 validator 时点只认**已落盘**的 quality-scan 记录——`--done` 亲测替代扫描的场景记录时序不可得，被拦出路 = 重跑质量扫描步或降级 NOTES（不算失败）。

`requiresEvidence`（risk_level 分层）一字不动。

### §2 risk_level 豁免洞分层 + 回执口径（D-002/D-006）

src/stage-contract.js:646-652 改三处：
1. explicit + 降级 unit-sufficient：维持免证据（关键词误伤逃生）；
2. explicit 且仍 integration/deployment-critical + NOTES：必须携带结构化 handover（blocking 级计入封顶口径同 §1）**或**齐全集成证据，二选一；
3. 回执来源分类：`auditRuntimeReceipt`（change-risk-profile.js:398-429）增可选入参 `sourceTag`——打标在 **change-risk-profile 内**按回执 command 来源分类（'cross-layer' | 'build' | 'unit'，auditRuntimeReceipt/checkIntegrationEvidence 内实现），stage-contract 调用侧只透传声明源（X-10：verify-postcheck 不在 auditRuntimeReceipt 调用链上）；不解析日志内容猜测；quality-scan 记录的命令与 verify_precedents 声明为打标依据；未标类默认 'build'（fail-closed：宁可触发封顶要求 handover）。

### §3 probe7 联动 + Runtime Evidence 收口（D-003/D-004）

`validateAcceptanceMatrix`（stage-contract.js:833-880）加分支：矩阵存在 partial/uncovered 行且 handover **零有效行（任意 severity）** → error（「部分实现必须有移交去向」）；有 → 放行，封顶与否由 blocking 行决定（§1 条件②④分工：④管「有去向」，②管「去向是否 blocking」）。分支的 handover 数据从 **facts.handover** 读（首次 backfill 已写入，时序成立）；validateAcceptanceMatrix 本体的 MD 槽解析天然充当防篡改锚点（X-05）。逐行关联（验收项 ID ↔ handover 条目文本命中）做 advisory。

Runtime Evidence（verify-probes.js:1900 骨架「## Runtime Evidence [层：人工判断]」）：
1. 判级 integration/deployment-critical 的变更上，「服务端点请求-响应」行=「不涉及」自声明且无对应 handover ⇒ 计入 §1 事实面。行识别文法（X-18）：该节内匹配「行含 `端点|请求-响应|服务端点` 关键词且以 `不涉及` 收尾」的表格行——**该事实的解析与写入属 producer 侧**（backfill 首次时点产出 `facts.runtimeEndpointExcluded`，与 task-01 同批），W3 的骨架/提示改动不晚于消费；文法失配时降 advisory 注记（攒实证后再收紧）；
2. 骨架该节注释补降级路径提示：「服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及」。

### §4 severity 分层 + fix.sql 双门 + handover 可见性（D-005@v2/D-007/D-012）

**severity 分层**：移交项表加第 4 列 severity（blocking | advisory），类型默认映射——db-script/env-blocked→blocking，manual-acceptance/other→advisory；降级 blocking→advisory 必须带理由，理由文法（X-02）：`（降级：<理由>，依据 <file:line 或 D-xxx>）`——进 checkProbeConsistency 抽查面。`parseHandoverRows`（verify-probes.js:1569）三列正则扩四列，**存量三列表格零迁移兼容**（缺省按类型映射）。EHS 案例口径（X-07）：集成复跑（env-blocked）与 fix.sql（db-script）两项恒 blocking——分层不削弱该案例的封顶；联调人工验收（manual-acceptance）默认 advisory，须显式标 blocking 才计入（execute/verify prompt 明示该口径）。

**fix.sql 双门（D-007/D-012）**：
- verify 侧（§1 条件③）：声明面/diff 判定，时点正确；
- 兜底门：worktree-apply.js apply 尾声 + archive `--confirm` 前置校验（src/stages/archive.js Step 3 用户确认点 :82-91）——apply 文件集含 `db/*.sql` 时，verify-result 须含对应「已对目标库执行」声明条目（引用文件名；有 log 路径走四条件校验，无则至少声明行），缺失阻断。纯文件集 + 文本声明对账，零连库。

**互锁与可见性**：
- `db-script` 类 handover 行（恒 blocking）与声明门互斥不可同真（写 db-script handover = 承认未执行 ⇒ 触发 §1 封顶且兜底门拦截）；
- archive Step 3 用户确认 prompt 注入 `facts.handover` 清单（含 severity 标注，blocking 置顶；条目数封顶渲染，全量指路 facts.json，不阻断——闭环对账语义属批次 E）。

### §5 配套四小修（D-008，各自原位）

1. **skip 跨仓档位**（verify-postcheck.js:1426）：`mergeCrossRepoResults` 前判 mainResult.status——skip 短路主仓 + **无自配 commands.test 的跨仓**；跨仓自配了 test 的仍跑；跨仓 own local.yaml 提供单独 skip 通道（`test_strategy: skip` 逐仓生效）。
2. **adopt 勾选两层**（task-review.js:355-357 + run/complete.js:1013-1038）：`isExplicitReviewWrite` 白名单加 `adoptTaskReviewMechanics`；`prefetchDiffFileSet` 并跨仓 diff 源（复用 cross-repo-reconcile.js:94-106 双源）。
3. **probe7 跨仓多根**（verify-probes.js:860）：`buildAcceptanceHints` 双根扩多根，含跨仓仓根（local.yaml repos 注册根）。
4. **design 无段头缺口**（design-facts.js:461-468）：清单无「## <repo> 仓变更」段头时，行内含跨仓注册路径（local.yaml repos 值前缀命中）降 warning 提示补段头，不再按主仓根逼 NEW:。

### §6 prompt/清单升级 + 文档镜像 + 测试面（D-009）

- 审查清单**新增**两处条目（X-13：stage-review-checklist.js 现无角色/字典类条目，属新增非升级；该清单条目从 stages prompt 逐字迁移且被快照测试钉死——连带改 src/stages/brainstorm.js / verify.js 的 prompt 源 + test/stage-review-checklist.test.mjs 快照）：①角色/字典类实证「以生产查询口径可解析到目标结果」；②「用户入口 × 菜单/注册 DML 对账」（命中条件注入：涉及角色或新页面）。
- verify 阶段 prompt（stages/verify.js）补封顶语义提示（「结论想写 PASS 前自查四事实条件 + severity 口径」）。
- 文档镜像：改 src/stages/verify.js 后按真实三步流水线再生（node docs/prompt/_extract.mjs 产 _extracted.json → _sync.mjs fence 同步 verify.md/brainstorm.md → _verify.mjs 逐字核验；手写 fence 区如有，明示其范围后再处理）。
- 测试面：新增 test/pass-eligibility.test.mjs（四事实条件各一态 + 全清 PASS 态 + 豁免洞分层态 + severity 映射/降级/三列兼容态 + facts 缺失双源态）；skip 跨仓/adopt 勾选/probe7 多根/双门断言补既有测试文件。预计 +60~80 断言。

### §7 Wave 步骤完成度门（D-013，task-08）

execute 完成名为 `Wave N 执行` 的步骤时 **fail-closed 校验本 Wave 任务完成度**：先幂等跑 `autoCheckPlanFromReviews`（review pass 自动勾选），再解析 plan.md `## Wave N` 段任务 ID，逐一核对 tasks.md checkbox——任一未勾 → error 列未勾清单 + 指引（补实现与 review write，或 `--reopen --from-step` 退回），exit 1 不推进；plan.md 无该 Wave 段（隐式 Wave/light 计划）→ warn 放行（fail-open，不破坏隐式串行语义 D-003@v1）。落点：run/complete-handlers.js 新增 `assertWaveTasksComplete`（Wave 解析动态 import stages/execute.js parseWavesFromPlan），complete.js 标记 completed 前调用。动机：本变更执行中实证 Wave 2 步骤在 task-02 未做、review 仍自动草稿时被 --done 放行（review write 退出码被 shell 管道吞掉 + 既有防护 `--step` 断言可选、并发横幅仅 warn 全部非阻断）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/stage-contract.js | 新增 validatePassEligibility 纯函数 validator（消费 facts，注册进 verify validators）+ validateAcceptanceMatrix partial/uncovered 分支 + :646-652 requiresEvidence 分层调整。数据流：verify-facts.json（producer=verify-probes backfill）→ validator 纯函数 → runValidators error 通道（既有） |
| 修改 | src/verify-probes.js | backfillFactsFromMdAndTests 扩写 facts.integrationRan/dbScriptDeclarations/matrix 摘要（producer 侧）；parseHandoverRows 三列正则扩四列（存量三列缺省按类型映射 severity）；Runtime Evidence 骨架注释补降级路径；probe7 预填说明；buildAcceptanceHints 双根扩多根 |
| 修改 | src/verify-facts-schema.js | 登记 additive 可选字段（integrationRan/dbScriptDeclarations/matrixPartialRows/runtimeEndpointExcluded/handover[].severity），缺省不炸 |
| 修改 | src/change-risk-profile.js | auditRuntimeReceipt 增可选 sourceTag 入参（打标在本文件内按回执 command 来源分类：'cross-layer'/'build'/'unit'，consumer=checkIntegrationEvidence 绿判据）；未标默认 'build' |
| 修改 | src/verify-postcheck.js | mergeCrossRepoResults 前置 skip 短路（主仓 skip + 跨仓无自配 test 短路） |
| 修改 | src/task-review.js | isExplicitReviewWrite 白名单加 'adoptTaskReviewMechanics' |
| 修改 | src/run/complete.js | prefetchDiffFileSet 并跨仓 diff 源（cross-repo-reconcile 双源复用）——adopt/手写跨仓 review 的 changedFiles 命中主仓外 diff；Wave 完成度门前置接线（§7） |
| 修改 | src/run/complete-handlers.js | 新增 assertWaveTasksComplete（Wave 完成度 fail-closed 门，D-013/task-08） |
| 新增 | NEW:test/wave-task-complete-gate.test.mjs | Wave 门断言（全勾放行/任一未勾 exit 1/无 Wave 段 warn 放行/autoCheck 先行幂等） |
| 修改 | test/run-complete-step-execute-batch.test.mjs | Case 2 夹具双 Wave 适配（旧单 Wave 未全勾仍完成步骤=FR-12 堵的洞，D-013 锚） |
| 修改 | src/design-facts.js | 无段头清单行含跨仓注册路径时降 warning（不再逼 NEW:）；供 §1 事实③复用的清单解析已在 |
| 修改 | src/worktree-apply.js | apply 尾声 db/*.sql 兜底声明门（文件集 ∩ db/*.sql ⊆ parseDbScriptDeclarations(verifyMd)） |
| 修改 | src/stages/archive.js | Step 3 门控 definition（requiresConfirm/提示文案，纯 prompt 模板无逻辑挂点） |
| 修改 | src/run/complete-handlers.js | archive --confirm 前置 db 声明兜底校验（handleArchiveConfirmStep :778-787 实证门控处） |
| 修改 | src/run/prompt.js | archive 确认 prompt 注入 facts.handover 清单（{HANDOVER_SUMMARY} 占位符 + fail-soft 注入，{SCOPE_AUDIT_TABLE} 先例 :1292-1313） |
| 修改 | src/run/gates.js | matrixSlots 动态 import 传参兜底（一行级透传，仅当选调用侧传参形态） |
| 修改 | docs/sillyspec/platform-interface-map.md | 行号锚随 complete-handlers.js 插入漂移同步（doc-ref-check 硬校验对齐，task-04 锚点维护） |
| 修改 | src/stages/verify.js | 阶段 prompt 补封顶语义自查提示 |
| 修改 | src/stages/brainstorm.js | D-009 新增条目的 prompt 源（清单条目从 stages prompt 逐字迁移） |
| 修改 | src/stage-review-checklist.js | D-009 两处新增条目落盘 |
| 修改 | docs/prompt/verify.md | 文档镜像（改 src/stages/verify.js 后 node docs/prompt/_extract.mjs 再生） |
| 修改 | docs/prompt/brainstorm.md | 文档镜像（brainstorm prompt 源变更连带再生） |
| 修改 | docs/prompt/_extracted.json | 镜像数据（_extract.mjs 再生产物） |
| 新增 | NEW:test/pass-eligibility.test.mjs | 四事实条件 + 全清 PASS + 豁免洞分层 + severity 映射/降级/三列兼容 + facts 缺失双源 + 双门断言 |
| 修改 | test/cross-repo-verify.test.mjs | skip 跨仓档位断言 |
| 修改 | test/verify-handover-structured.test.mjs | severity 四列解析/缺省映射/db-script 互锁断言 |
| 修改 | test/verify-conclusion-slot.test.mjs | 结论联动与封顶触发文案断言 |
| 修改 | test/acceptance-matrix-probe.test.mjs | probe7 联动分支断言 |
| 修改 | test/acceptance-matrix-gate.test.mjs | probe7 联动分支夹具适配（既有「全填放行」夹具为 strict+partial+无 handover，新分支必然打爆，最小适配随行） |
| 修改 | test/stage-contract.test.mjs | 豁免洞分层语义翻转断言随行（集成4「显式 critical+NOTES 无 handover 放行」→ error，D-002 封死口径） |
| 修改 | test/probe7-anchor-testfile.test.mjs | 多根内容读取断言 |
| 修改 | test/task-review-adopt.test.mjs | adopt 勾选白名单生效断言 |
| 修改 | test/stage-review-checklist.test.mjs | 清单新增条目断言随行 |
| 修改 | test/design-facts.test.mjs | 无段头跨仓行降 warning 断言 |

## 接口定义

```js
// src/stage-contract.js（新增导出，双层形态 X-09）
// 注册壳：与 validateAcceptanceMatrix 同签名同构注册进 verify validators
export function validatePassEligibility(cwd, changeName, context)
// 壳内组装 args（verifyMd/facts/conclusion/changeRiskProfile 自 context 与 changeDir 读取）后调纯函数：
/**
 * 事实面封顶纯函数：结论=PASS 时校验四个已知未验证区全部不成立（消费 facts，零 MD 解析）。
 * @param {{ conclusion: string|null, facts: object|null, factsExpected: boolean,
 *           changeRiskProfile: object, changeName: string }} args
 * @returns {{ ok: boolean, errors: string[], triggered: Array<
 *   { fact: 'integration-not-run'|'blocking-handover-present'|'db-script-undeclared'|'matrix-partial-no-handover', detail: string }> }}
 */
function evaluatePassEligibility(args)
// factsExpected=false（存量未跑管线）→ 沿用存量兼容口径返回 ok；factsExpected=true 而 facts 缺失 → 全条件按触发处理（双源 fail-closed）

// src/verify-probes.js（producer 侧扩写）
backfillFactsFromMdAndTests(factsPath, { verifyMd, testCheckResult, conclusion })
// 新增写入（全部在首次 backfill 时点产出——validator（W2）消费时已就位，生产-消费时序锚定）：
//   facts.integrationRan: 'ran'|'not-ran'（D-006 判定表；quality-scan 记录自 specBase 推导自读）
//   facts.dbScriptDeclarations: string[]（parseDbScriptDeclarations(verifyMd) 私有函数产出）
//   facts.handover[].severity: 'blocking'|'advisory'（parseHandoverRows 四列，三列缺省按类型映射）
//   facts.matrixPartialRows: number（extractAcceptanceMatrixSlots 动态 import 传参后统计 partial/uncovered 行数——条件④消费）
//   facts.runtimeEndpointExcluded: boolean（Runtime Evidence 节「服务端点」行命中「不涉及」文法——FR-03 消费；仅判级 integration/deployment-critical 时 validator 计入封顶）
// parseDbScriptDeclarations 文法（X-03）：回执槽条目 command 含 db/<file>.sql，或声明行「已对目标库执行：db/<file>.sql」

// src/change-risk-profile.js（签名扩展，向后兼容可选参；打标在本文件内按 command 来源分类）
auditRuntimeReceipt(receipt, opts) // opts.sourceTag?: 'cross-layer'|'build'|'unit'，缺省 'build'
```

生命周期契约：不涉及生命周期契约。

数据模型：verify-facts.json 新增 additive 可选字段（integrationRan/dbScriptDeclarations/matrixPartialRows/runtimeEndpointExcluded/handover[].severity），schemaVersion 不变；无 DB/表结构变更。

## 兼容策略（brownfield 必填）

- **未触发事实条件时行为零变化**：无 blocking handover、无 db/*.sql、矩阵全 covered、集成已跑的变更，PASS 照旧——validator 是纯加法规则，回退 = 移除注册行。
- **存量变更三重兼容**：①未跑 --init 无 facts 的存量变更沿用 checkProbeConsistency 兼容 skip 口径（factsExpected=false）；②存量三列 handover 表格零迁移（severity 缺省按类型映射）；③verify 进行中且带 partial 矩阵/blocking handover 的存量变更会被新门拦——报错附修复指引（补「## 移交项（结构化）」章节或改结论），verify --reopen 既有机制支持补章节后重跑。
- **跨仓 skip 语义变化面**：主仓 skip + 跨仓无自配 test 的组合从「假败打回」变「短路通过」——只消除假红不引入假绿（自配 test 的跨仓仍跑）。
- **不改变**：结论枚举三值、facts schemaVersion、平台同步协议、verify_precedents/gate_snapshot 既有键。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 事实条件误判假红（「集成实测已跑」判定过宽，把真实验证过的变更拦在 PASS 外） | P1 | D-006 判定表按证据来源判定不做内容猜测；module/evidence-auto 子集=已跑；escape：等效验证先例声明（verify_precedents 同思想）；被拦出路=降级 NOTES 非失败 |
| R-02 | handover 双面钻空：漏报（整行不写保 PASS）/ 降级造假（全标 advisory） | P1 | 漏报由机器算的①③④事实条件独立兜住（钻空面只剩 agent 手写行，有界）；降级须理由进 checkProbeConsistency 抽查面；批次 E 归档闭环后 advisory 也不再蒸发 |
| R-03 | 回执来源标签启发式漏标新形态命令（跨层命令被标 build → 误触封顶） | P2 | 标签来自命令来源声明非日志内容；未标默认 build 属 fail-closed 侧（误触的代价=多写一行 handover，可接受） |
| R-04 | skip 跨仓短路过宽（有意义的空套件烟雾被跳过） | P2 | 档位收窄：跨仓自配 commands.test 仍跑；文档明示语义 |
| R-05 | probe7 逐行关联 advisory 假红（验收项措辞与 handover 文本不匹配） | P3 | 第一版只做存在性门槛，逐行关联纯 advisory 不阻断 |
| R-06 | verify 后新增 sql 文件绕过 verify 侧事实③ | P2 | apply/--confirm 兜底门按当时实际文件集拦截（D-012 双门互补） |
| R-07 | facts 双源 fail-closed 误伤（管线写了但读取时序错位 → 误判篡改） | P2 | factsExpected 由 CLI 自身运行状态判定（非 agent 可控字段）；报错文案给「重跑 verify-probes」出路 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v2 | 总体方案 §1 + FR-01 | 已覆盖 |
| D-002@v1 | 总体方案 §2 + FR-02 | 已覆盖 |
| D-003@v1 | 总体方案 §3 + FR-04 | 已覆盖 |
| D-004@v1 | 总体方案 §3 + FR-03 | 已覆盖 |
| D-005@v2 | 总体方案 §4 + FR-06 | 已覆盖 |
| D-006@v1 | 总体方案 §1/§2 判定表 + FR-02 | 已覆盖 |
| D-007@v1 | 总体方案 §4 + FR-05 | 已覆盖 |
| D-008@v1 | 总体方案 §5 + FR-07~FR-10 | 已覆盖 |
| D-010@v1 | 总体方案 §1 架构形态（集中式 validator，facts 锚定实现纪律由 D-011 细化）+ FR-01。注：其故障面 fail-open 条款已被 D-011 收窄为「仅限 producer 侧输入缺失」；consumer 侧 facts 缺失仍 fail-closed，以 §1 双源口径为准 | 已覆盖 |
| D-011@v1 | 总体方案 §1 实现纪律 + FR-01 | 已覆盖 |
| D-012@v1 | 总体方案 §1 条件③ + §4 双门 + FR-05 | 已覆盖 |
| D-009@v1 | 总体方案 §6 + FR-11 | 已覆盖 |
| D-013@v1 | 总体方案 §7 + FR-12 | 已覆盖 |

无未解决决策；剩余风险见 R-01~R-07（R-02 的最终收紧依赖批次 E）。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v2、D-002~D-004、D-005@v2、D-006~D-012 共 12 条全覆盖）
- [x] 生命周期关键词豁免短语已写（「不涉及生命周期契约」，紧邻格式）
- [x] UI 原型分级核对：纯 CLI 校验逻辑、无界面变化——跳过（分级依据：跳过档「纯后端逻辑/CLI/配置/文档」，Step 5 已向用户声明且确认）
- [x] 原 ⚠️ 自审存疑已由 TaskCard 期实证落定：archive --confirm 门控在 run/complete-handlers.js:778-787（handleArchiveConfirmStep），prompt 注入面在 run/prompt.js:1292-1313（{SCOPE_AUDIT_TABLE} 先例）——清单已按实落点补 complete-handlers.js/prompt.js 两行，stages/archive.js 保持 definition 不挂逻辑
