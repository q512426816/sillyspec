---
author: qinyi
created_at: 2026-09-08 22:40:19
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 2026-09-08-ir-verify-facts

## 背景

verify 阶段的测试维度已下沉到 CLI 实测（自报 PASS 但实测失败 → 阻断），但证据链其余三环仍是弱判定：

1. **requiredEvidence 对账是子串自述**：`runVerifyRequiredEvidenceCheck`（verify-postcheck.js）只检查 verify-result.md 是否「提及」cannot_verify 任务的 task id（includes 子串），满足度由 agent 自报告且 advisory 不阻断——execute 阶段标记 cannot_verify 的任务，其 requiredEvidence 在 verify 是否兑现无机器判定（09-05 称之为「死链」，task-review.js 注释自认仅提示人工复核）。
2. **集成证据是 literals 蹭词**：`checkIntegrationEvidence`（change-risk-profile.js:290）按字面正则（'端到端'/'docker up'/'Runtime Evidence' 等）匹配散文，措辞蹭词即可通过 integration-critical 门。
3. **facts 快照无「过期」检测**：checkProbeConsistency 每次 `--done` 已**全量重跑探针**并与 md 正文锚点对账（verify-postcheck.js:2565 一带）——md 侧防篡改与「代码变了 md 没更新」已覆盖 ERROR 级；但重跑结果**不与 facts 快照比对**——agent 手改 md 数字对齐新代码后，facts 底稿过期无人发现，P3d（archive delta 回灌）会消费过期指标。

同时 P3d（archive delta 回灌、增量 scan）依赖 verify 域结构化数据源；当前 verify-facts.json（v1，2026-09-07 ir-stage-p3b 落地）只有探针指标，结论/测试/证据/回执均缺失。本变更是 09-05 分期中 P3b 的收口（轮次经济学文档 §2 已盘点的「已动工现状」之后剩余部分）。

## 设计目标

- **FR-01 facts v2**：verify-facts.json 扩展为 schemaVersion 2（conclusion / tests / requiredEvidence / runtimeEvidence 四段），CLI 全权写；`--init` 渲染受控槽段骨架进 verify-result.md。
- **FR-02 证据三元组对账**：requiredEvidence 对账从「md 提及 task id 子串」升级为 agent 填状态槽（satisfied/missing/partial + verifiedFiles）+ CLI 机械核验（文件存在 × mtime ∈ verify 窗口 × git diff 交集），核验不过 = ERROR。
- **FR-03 cannot_verify 闭环**：requiredEvidence 存在未豁免 missing → verify 完成阻断（advisory 升硬门，gates 接线）。
- **FR-04 集成回执槽位**：checkIntegrationEvidence 从 literals 匹配改为读 runtimeEvidence 槽做一致性校验（logPath 存在 + mtime ∈ verify 窗口 + 日志失败签名扫描）；literals 退役为 legacy 回退；CLI 不代跑集成进程（D-003）。
- **FR-05 facts 基线对比**：checkProbeConsistency 既有全量重跑结果增加 vs facts 快照的对比维度（probe1/6=ERROR / probe3/5=WARNING 分级沿用现实现），检出「md 被手改对齐新代码而 facts 底稿过期」（P3d 数据源保鲜）；不新增独立重跑。
- **FR-06 prompt 与文档同步**：verify.js step2/step7 指引改槽位填写；schema 单点模块；docs/prompt 镜像；模块卡 + sidecar。

## 非目标

- Wave 派生化、archive 收口机械化、doctor 折叠、decisions/四件套骨架预生成（D-002：各自独立后续变更）。
- lint 门禁强度调整（D-004：观察期计数器已落地，本变更只消费不加强）。
- 集成命令 CLI 代跑（D-003：等 commands.integration 配置入口出现）。
- 讨论型内容 IR 化、全量替换 markdown 产物（09-05 §7 明确不做；facts→md 单向，md 永远是判断层 + 渲染层）。
- quick 流程改造（quick 无 verify 阶段，本变更零影响面）。

## 拆分判断

五件事（facts v2 / 证据对账 / cannot_verify 闭环 / 回执槽 / 探针复跑）全部消费同一 facts schema、全部落在 verify `--done` 链路上，同域高耦合——拆开会造成 schema 分期落地期间的中间态兼容负担，不拆。无重复模式任务，不走批量模式，无 MASTER。

## 总体方案

### Phase 1：facts v2 schema 与写入链路（task-01）

扩展既有 `verify-facts.json`（沿用文件名与 writeVerifyFacts 机制，零新文件；沿用即 09-05 verify.facts.yaml 概念的已落地形态，不另起第二套事实表——D-005 的实质）：

```jsonc
{
  schemaVersion: 2,
  change, generatedAt,
  probes: { /* v1 原样：probe1/3/5/6 { command, metrics } */ },
  conclusion: null | "PASS" | "PASS WITH NOTES" | "FAIL",      // --done 时 CLI 从 md 结论枚举槽回填固化（槽制 = 刀③ ql-20260908-012 已落地）
  tests: { command, exitCode, strategy, failedRemaining: [], passedAt },  // CLI 实测快照（runVerifyTestCheck 数据回灌；供 P3d 追溯，不参与门禁——门禁仍以实测为准）
  requiredEvidence: [ { task, evidence: [], status: "satisfied"|"missing"|"partial", verifiedFiles: [] } ],  // agent 填槽 → CLI 核验后固化
  runtimeEvidence: [ { claim, command, exitCode, logPath, checks: { logExists, mtimeInWindow, failSignatures } } ],  // agent 声明（「集成验证回执」槽）→ CLI 一致性校验结论固化
  factsConsistency: { checked: ["probe1","probe6"], verdict: "match"|"mismatch"|"skipped", detail: {} }  // checkProbeConsistency 重跑 vs facts 基线对比结论（Phase 4）
}
```

**写入模型（双层分工）**：机器数据（probes/tests/probeRerun/runtimeEvidence.checks）CLI 直写；agent 判断（结论枚举、evidence 状态、回执声明）经 verify-result.md **受控槽段**录入，`--done` 时 CLI 解析槽段并固化进 facts——槽是判断层的结构化录入界面，facts 是固化工件；facts→md 单向渲染约束的对象是机器数据，不冲突（D-001）。

**槽段形态**（同刀③结论槽 pattern：行首锚定、占位不含枚举词、fail-closed；槽段标题避开既有「## Runtime Evidence」人工判断章，防 literals 匹配面混淆）：

```markdown
## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」 -->
- task-NN: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填；豁免时填 missing 并加（豁免：<一句话理由>）后缀）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
- claim: <一句话> | command: <命令> | exit: <待填：0 或非 0> | log: <日志路径>
```

（占位符不含枚举词——行首锚定解析 + 占位形态双保险 fail-closed，同刀③结论槽教训：含枚举词的占位会被宽松解析误读。）

**--init 幂等与写侧合并语义**：
- md 侧：已存在的 verify-result.md **缺失槽段时补写**（现有「已存在不覆盖」指全文不覆盖，段落级补齐为新语义；补齐仅追加占位骨架，不触碰既有正文，二跑零改动）——守卫点在 `src/index.js` --init 分支（:924-946 一带，需接线）。
- facts 侧：`writeVerifyFacts` 从无条件覆盖改为**分段合并**——re-init 刷新 `probes/generatedAt` 并升 `schemaVersion: 2`，**保留**已回填的 `conclusion/tests/requiredEvidence/runtimeEvidence` 段（否则 --done 回填后再 --init 会抹掉固化数据）；`probeRerun` 每次重算覆盖。--init 即落 v2（空 evidence 段占位），消灭「init 落 1 还是 2」的时序歧义。

### Phase 2：证据三元组对账（task-02）

`runVerifyRequiredEvidenceCheck` v2：读 verify-required-evidence.json（execute 写入，不变）→ 对每个 item 在 md 证据账槽找 task 行 → 状态 + verifiedFiles 分类核验：

- **verifiedFiles 必填精确路径**（agent 从 requiredEvidence 自由文本提炼；execute 侧原始 evidence 字段是自由文本，不可直接机器匹配）。
- **分类核验**（杜绝「运行时日志/文档类证据必零 diff 交集」的假红——`resolveVerifyChangedFiles` 排除 `.runtime/`，日志类文件天然不在 diff 里）：
  - 代码/测试类路径（命中 git diff 三源）→ 存在 × mtime × **diff 交集** 三核验；
  - 运行时产物类（`.runtime/`、日志、文档）→ 存在 × mtime 两核验（diff 交集不适用，明确豁免该项）。
- **状态语义（机器可判）**：satisfied = verifiedFiles 非空且全部核验过；partial = 核验过的文件 < 全部 + 行内括注理由；missing（豁免）= 行内 `（豁免：<理由>）` 后缀——豁免形态机器可解析，无括注的 missing 不算豁免。
- **verifyStartAt 基准** = DB `stages` 表 execute 行 `completed_at`（db.js:280 一带）——worktree meta 无该字段；新增只读访问器（ProgressManager `getStageCompletedAt`）；DB 不可得时 fallback「文件 mtime 晚于 design.md created_at 即宽容通过 + warning」。
- **无槽 md（存量）降级 legacy 子串对账 + 迁移 warning**（同刀③ pattern）。
- 返回结构增 `items[].verification: { filesExist, mtimeOk, diffHit, pathClass }` 明细供门禁输出与 P3d 消费。

### Phase 3：cannot_verify 闭环 + 集成回执（task-03 / task-04）

**执行次序**（--done 收尾链，防 backfill 与校验竞态；tests 段拆两次回填——实测在 runValidators 之后，tests 不参与门禁）：CLI 收尾先 `backfillFactsFromMdAndTests` 的 md 槽段（固化 conclusion/requiredEvidence/runtimeEvidence 进 facts）→ runValidators（结论门/集成证据门读固化值与槽）→ verify 专属块（test 实测 → **二次回填 tests 段** → parity/evidence 硬门/facts 基线对比）。

cannot_verify 硬门（gates.js verify 专属块接线）：`runVerifyRequiredEvidenceCheck` 存在 status=missing 且无豁免括注 → 阻断 verify 完成（rollback，同 test 门失败语义）；核验不过（文件缺失/mtime 出窗/该 diff 的零交集）同阻断。

`checkIntegrationEvidence` v2 读集成验证回执槽（调用点在 `src/stage-contract.js:613`，需传新参）：每条做 logPath 存在 + mtime ∈ verify 窗口 + 日志尾 200 行失败签名扫描。**绿判据（可测）**：`logExists && mtimeInWindow && failSignatures === 0 && exitCode === 0` 为绿回执；`failSignatures > 0`（error/exception/traceback/fatal 计数）或 `exitCode !== 0` → 该回执不可用作在场证据（warning 列明原因）；槽缺失走 legacy literals 回退 + warning（存量兼容）。integration-critical 且无绿回执 → 维持现有 ERROR 语义，判据从字面变结构。签名扫描须做噪声剔除（行首匹配 + 剔除「0 errors」类良性行——本仓 verify-postcheck.js:679-725 三条已修坑先例，禁复刻）；frontmatter risk_level 显式覆盖逃生通道保留不变。CLI 不代跑集成进程（D-003）。

### Phase 4：facts 基线对比（task-05）

**不新增独立重跑**——checkProbeConsistency 在 verify `--done` 已一次全量重跑探针并与 md 正文锚点对账（gates.js:705-715 接线）。本 Phase 给该既有重跑增加第二个对比维度：**重跑指标 vs facts 快照**（现状只比 md 正文，不比 facts）——不一致说明「md 被手改对齐了新代码、facts 底稿过期」（P3d 会消费过期数据）。分级沿用现实现已验证的口径：probe1/6 = ERROR、probe3/5 = WARNING（probe3/5 环境敏感，进 ERROR 必产噪音）；facts 侧对比**继承**现实现 HEAD-advance 降级语义（verify-postcheck.js:2584-2591——多轮 verify 期间 HEAD 前移属预期，降级不升级）。修复指引：`sillyspec verify-probes --init` 刷新 facts 快照（re-init 分段合并保留已固化段，见 Phase 1）+ 按新探针结果同步 md 探针段（--init 不改已存在 md 的探针段，正文锚点对账会兜住不同步）。

### Phase 5：prompt 与文档同步（task-06）

verify.js 指引同步：**step2**（evidence 传递检查，:73-81）与 **step7**（报告结构，:202-243）增槽位填写说明（三选一状态语义、verifiedFiles 精确路径要求、豁免写法、回执四字段）；`_extract`/`_sync` 镜像；core-engine/stages/runtime 卡 + sidecar（gates 接线）。

**schema 单点**：facts v2 的 schema 定义（字段/枚举/分类核验规则）集中放 `src/verify-facts-schema.js` 新模块（纯常量 + 校验函数），builder/解析器/对账引擎/渲染四方 import 同源——不留散落正则（D-005@v2）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/verify-probes.js | buildVerifyFacts v2 四段扩展 + writeVerifyFacts 改分段合并（re-init 保留已固化段，见 Phase 1）+ generateVerifyResultSkeleton 增两槽段渲染 + backfillFactsFromMdAndTests。数据流：producer=槽段解析器与 runVerifyTestCheck 回灌 → facts.json 单点固化 → consumer=Phase 2/3 对账引擎与 P3d（后续变更） |
| 新增 | NEW:src/verify-facts-schema.js | facts v2 schema 单点（字段/枚举/路径分类/豁免形态常量与校验函数），builder/解析/对账/渲染四方 import 同源（D-005@v2） |
| 修改 | src/verify-postcheck.js | runVerifyRequiredEvidenceCheck v2 分类核验（含 legacy 降级）+ checkProbeConsistency 增 facts 基线对比维度（分级 probe1/6=ERROR、probe3/5=WARNING）+ verifyStartAt 访问 |
| 修改 | src/change-risk-profile.js | checkIntegrationEvidence v2 读集成验证回执槽一致性校验（绿判据见 Phase 3）；literals 降 legacy 回退 |
| 修改 | src/stage-contract.js | checkIntegrationEvidence 调用点（:613）传 v2 新参（runtimeEvidence/verifyStartAt/specBase）；结论门读 facts 固化值与槽双源一致 |
| 修改 | src/run/gates.js | verify 收尾接线：backfill 先行 → cannot_verify 硬门（missing 无豁免阻断）+ facts 基线对比输出 |
| 修改 | src/index.js | verify-probes --init 分支（:924-946）：md 槽段缺失补齐守卫 + facts re-init 分段合并调用 |
| 修改 | src/progress.js | 新增只读 getStageCompletedAt（verifyStartAt 基准，DB stages.completed_at） |
| 修改 | src/stages/verify.js | step2/step7 增槽位填写指引；docs/prompt/verify.md 镜像同步 |
| 新增 | NEW:test/verify-facts-v2.test.mjs | facts v2 schema/回填链路/槽段渲染/段落补齐幂等 |
| 修改 | test/verify-probes-facts.test.mjs | schemaVersion 1→2 与骨架章节数断言同步修正（task-01 落地即红，修正责任随任务） |
| 新增 | NEW:test/verify-evidence-triple.test.mjs | 三元组核验（命中/文件缺失/mtime 出窗/diff 零交集/legacy 降级）+ cannot_verify 硬门 + 豁免通道 |
| 新增 | NEW:test/verify-receipt-rerun.test.mjs | 回执一致性校验 + 探针复跑（match/mismatch/skipped） |
| 修改 | docs/prompt/verify.md | 镜像（_extract + _sync） |
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md（+sidecar） | facts v2/对账引擎/复跑登记 |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.md（+sidecar） | gates 接线登记 |
| 修改 | .sillyspec/docs/sillyspec/modules/stages.md（+sidecar） | verify.js prompt 变更登记 |

（`.sillyspec/docs/` 模块文档 = 交付物，与 apply 阶段 allow-set 口径一致。）

## 接口定义

```js
// verify-facts-schema.js（新增，schema 单点）
export const FACTS_SCHEMA_VERSION = 2
export const EVIDENCE_STATUS = ['satisfied', 'missing', 'partial']          // 枚举单源
export const EXEMPTION_RE = /（豁免：[^）]+）/                                // 豁免形态机器可解析
export function classifyVerifiedFile(path)                                  // 'code' | 'artifact'（.runtime/日志/文档类）
export function validateFactsV2(facts)                                       // 结构校验（字段/枚举/形状）
export function parseEvidenceSlots(mdText)                                    // 槽段解析归 schema 模块（数据形状逻辑；verify-probes 仅 import——plan/设计归属统一）

// verify-probes.js
buildVerifyFacts(result, { changeName, now })            // v1 签名不变，返回值扩展四段（缺省 null 段不落键）
writeVerifyFacts(changeDir, result, changeName)          // 签名不变，内部改分段合并（re-init 保留已固化段）
renderEvidenceSlotSkeleton(requiredEvidenceItems)        // 新增：--init 渲染槽段骨架（带 task 行预填）
backfillFactsFromMdAndTests(factsPath, { verifyMd, testCheckResult })  // 新增：--done 回填 conclusion/tests/evidence

// verify-postcheck.js
runVerifyRequiredEvidenceCheck({ cwd, specBase, changeName, verifyStartAt })  // 返回增 items[].verification: { filesExist, mtimeOk, diffHit, pathClass }；status 语义扩 'blocked'
// checkProbeConsistency：签名不变，内部增 facts 基线对比维度（复用既有一次全量重跑，无独立 rerun 函数）

// change-risk-profile.js
checkIntegrationEvidence(verifyContent, requiredVerification, { runtimeEvidence, verifyStartAt, cwd, specBase, extraEvidenceText })  // v2：槽优先一致性校验（绿判据见 Phase 3），literals 降回退；调用点 stage-contract.js:613；extraEvidenceText（verify-services 回执注入）保留合并为补充候选文本不丢弃

// progress.js
getStageCompletedAt(changeName, stage)                   // 新增只读：DB stages.completed_at（verifyStartAt 基准；W2→W3 接线间隙前调用方缺位时走 R-05 fallback，中间态已言明）
// factsConsistency 段写入：复用 writeVerifyFacts 分段合并（task-05 经同函数落盘，不另开写入面）
```

## 生命周期契约表

不涉及生命周期契约（本变更不新增 session/lease/daemon/agent_run 类事件与状态机；verify 完成门禁的强化是既有 complete 流程的判定条件变更，非新事件契约）。

## 数据模型

无 SQLite schema 变更。新增/变更的文件工件：`changes/<change>/verify-facts.json`（v1→v2，加段不删段）；`verify-result.md` 增两槽段（渲染层）；`verify-required-evidence.json` 读取侧不变。`.runtime/verify-runs/<ts>/` 时间线新增 probeRerun 回执（fail-soft）。

## 兼容策略（brownfield 必填）

- **存量 verify-result.md（无槽）**：Phase 2/3 全部降级 legacy 路径（子串对账/literals 匹配）+ 迁移 warning——行为等同现状，不阻断在途变更。
- **verify-facts.json v1（已存在）**：读侧双版本兼容（`schemaVersion === 2` 走新逻辑，否则 v1 语义）；写侧 --done 回填时原地升 v2（加段不删段，probes 原样保留）。
- **无 verify-required-evidence.json / 无 runtimeEvidence 需求的普通变更**：FR-02/03/04 全部 skipped，行为不变。
- **不改 API/DB schema 写路径/quick 流程**（checkProbeConsistency 既有 md 锚点对账逻辑不动，facts 基线对比是新增维度；复跑不是新机制）。
- 门禁升级首跑风险：cannot_verify 硬门与 probeRerun ERROR 在落地后首轮 dogfood 若撞红噪音过大，plan/execute 阶段可裁量加 `SILLYSPEC_VERIFY_EVIDENCE_GATE=advisory` 逃生观察档（默认 hard；决策点在 plan 定稿，不阻塞本设计）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 门禁变严后首轮 dogfood 撞红（存量 cannot_verify 债/复跑 mismatch 噪音） | P1 | legacy 降级覆盖存量；advisory 逃生档作为 plan 阶段裁量项（默认 hard） |
| R-02 | `--init` 段落级补齐与「已存在不覆盖」语义打架（在途变更 md 被追加槽段） | P1 | 补齐仅追加缺失槽段骨架（占位形态），不触碰既有正文；幂等（二跑零改动）；测试锁定 |
| R-03 | facts 基线对比在 worktree/并发场景误报 mismatch（世界确实变了 vs 竞态） | P1 | 分级沿用现实现已验证口径（probe1/6=ERROR、probe3/5=WARNING——probe3/5 环境敏感只警告）；依赖不可用 → skipped 留痕（fail-open） |
| R-04 | agent 误碰 facts.json（自改固化层） | P2 | 「CLI 全权写勿手改」纪律 + writeVerifyFacts 分段合并的覆盖式重写天然矫正被改段 + facts 基线对比（Phase 4）间接暴露手改（与 md 锚点对账交叉） |
| R-05 | verifiedFiles 核验的 verifyStartAt 基准歧义（多轮 verify 跨天） | P2 | 基准 = DB stages 表 execute 行 completed_at（新只读访问器 getStageCompletedAt）；DB 不可得 fallback「mtime 晚于 design.md created_at 宽容通过 + warning」（Phase 2 定义） |
| R-06 | UI 原型：无界面变化，跳过生成 | P2 | 分级依据：纯 CLI/门禁/文档变更（跳过类第三条） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | FR-01 + 总体方案 Phase 1（双层写入模型/槽段形态/单向约束边界） | 已覆盖 |
| D-002@v1 | 非目标 + 文件变更清单（全 verify 域） | 已覆盖 |
| D-003@v1 | FR-04 + Phase 3（回执槽一致性校验，不代跑） | 已覆盖 |
| D-004@v1 | 非目标（lint 不动）+ 兼容策略（逃生档仅涉 evidence 门） | 已覆盖 |
| D-005@v1 | Phase 1（沿用 verify-facts.json 即 09-05 verify.facts 已落地形态） | 已覆盖（升 v2：命名沿用 + schema 单点改放独立 verify-facts-schema 模块，见 Phase 5） |

无未解决决策。剩余风险见 R-01/R-05（均已有应对，无需用户裁决）。

## 自审（Self-Review）

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale）
- [x] 引用所有当前版本 D-xxx@vN（D-001@v2/D-005@v2 见 decisions.md 升版记录；其余 v1 全映射）
- [x] 生命周期关键词豁免短语紧邻在位（「不涉及生命周期契约」）
- [x] UI 原型分级核对（无前端文件，跳过依据已记入 R-06）
- [x] 不确定问题标注：⚠️ 自审存疑一处——R-01 的 advisory 逃生档默认值（hard vs advisory 起步）留给 plan 阶段结合 dogfood 数据裁量，本设计按 hard 写
- [x] Design Grill 首轮 fail 的 1 P0 + 4 P1 已修订：Phase 4 重写为 facts 基线对比（复用既有重跑，删除单探针重跑接口）；D-001@v2/D-005@v2 升版记录偏离；清单补 stage-contract.js/index.js/progress.js/verify-facts-schema.js；verifiedFiles 分类核验（消日志类零交集假红）；writeVerifyFacts 分段合并（消 re-init 抹数据）；R-04 矛盾消除；执行次序定义（backfill → runValidators → verify 块）
