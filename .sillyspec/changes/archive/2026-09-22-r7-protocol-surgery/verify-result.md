# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

<!-- VERIFY-DRAFT-MODE -->
> **填槽模式**：机器段（MACHINE-DRAFT 标记包裹，篡改会被 --done 拒收）之外，你只填三处
> AGENT 槽：①结论枚举 ②移交项 ③审查叙述。工作流 = 本 draft → 填槽 → `--done` 复核，
> verify-result 读写 ≤3 次。改机器段唯一通道：`sillyspec verify-probes --change <变更名> --amend-draft`（留痕重锚）。

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`（四切片全落地+协议四钉 harness 全验+主仓 589/589+lint 绿；notes=2 项已归档偏差+终验重放待发枪——R7 验收的最终判据按 flip-3.31.0-proposal §十：三桶 Δ≤20M/当量 ≤1.3/墙钟 ~90min）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| manual-acceptance | 终验大任务重放（R7 发版硬门）：复用 r6-session-replay 工作树+prompt-R6-L.md，仅换重打包版本号；判据三桶 Δ≤20M/当量 ≤1.3 达标 ≤1.2 拉伸/墙钟 ~90min | 按 docs/sillyspec/r7-final-replay-checklist.md 执行：前置=版本号重打包；产出=forensic-buckets 桶级对比+flow-telemetry/watcher 事件导出；不达标逐层归因不回滚重测 |
| manual-acceptance | 30min 级小任务烟测三指标（agent 采纳行为验证） | task done 使用数（--with-tasks 时）/--draft 槽填充形态/RERUN 拒绝数——单测证明机制存在，烟测证明采纳发生（proposal §十一验证策略） |
| other | task-done 四合一 review-head 错位工具修复（quick 立项候选） | task done 的 wt-commit 子步完成后回填 review.json head——本次 5 份手工重对的机制化根治 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- 无（全部 7 任务 verdict=pass，无 cannot_verify）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
- claim: <待填：一句话>
  command: <待填：命令>
  exit: <待填：0 或非 0>
  log: <待填：日志路径>
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
<!-- MACHINE-DRAFT:task-completion:cd9f947da280b9cba571413eb9012bf081e4c24b68d796eff533327581fd369a:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
客观任务完成度（真相源 = review.json verdict，runId=exec-2026-09-22-112240-ab0a19）:
- 总任务：7
- 已通过（spec + quality verdict 均非 fail）：7
- 未通过 / 缺失：0
- 未完成列表:
  （无）
注：以 review.json verdict 为准；plan.md checkbox 仅作显示态（回填断裂时会与客观 verdict 不一致，以下方客观点为准）。
- 总任务：7；已完成（review verdict 口径）：7
- 未完成：无
<!-- MACHINE-DRAFT:task-completion:end -->


## 设计一致性 [层：人工判断]
一致（含已归档偏差 2 项）：实现与 design.md 四切片方案及 7 处 grill/裁定修正逐条对齐——红线五条经 execute 独立审查 24 条 file:line 证据实证零触碰；协议四钉全部 harness 可验（必需交互=2/工件回填轮=0/观测解耦/写入仅例外裁决）。偏差 1：probes 子步在 thin 薄跑为记账占位（薄跑无 verify-result 骨架，探针链由 flow done 裁决自含；升厚走 run verify 既有面）——设计「复用第 3 批 --draft 产物」的原意在升厚路径兑现。偏差 2：fail-closed 失败升厚引入 born_face 出身字段（设计未列；防「升厚后无 plan.md 归档死锁」——升厚改仪式不回溯工件面，裁定#2 断点续与裁定#10 升厚组合的必要调和，已记 D-005 补充）。技术债务：watcher 空闲退出粒度 6h 较粗（12h 硬帽兜底）；平台 events 端点为声明依赖（fail-soft 本地 jsonl 兜底）；task done 四合一 review-head 错位（本次手工重对，工具级修复候选已入档）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/verify-draft.js:122` // 幂等闸：段内已有 MACHINE-DRAFT 标记或已非 TODO 占位（手写正文）→ 不动
- ⚠️ `src/verify-draft.js:124` if (!/<!--TODO|<待填|<!-- 结论=|<!--\s*无 cannot_verify/.test(body)) continue
- ⚠️ `src/verify-draft.js:134` .replace(/(## 设计一致性 \[层：人工判断\]\n)(<!--TODO[^>]*-->)/, '$1<!--AGENT:槽3/3 审查叙述——设计偏差（无偏差显式写「一致」）+ 技术债务叙述（探针 1 统计已机器预填在「技术债务」节）；替换下方 TODO 注释为正文 -->\n$2')
- ⚠️ `src/index.js:110` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:117` sillyspec verify-probes --change <name> [--init [--force]]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架（--force 覆盖重生成，手填内容会重置）
- ⚠️ `src/index.js:1208` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1224` console.error('用法: sillyspec verify-probes --change <name> [--init [--force]] [--draft] [--amend-draft] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 契
- ⚠️ `src/index.js:1311` // 同款口径（detectChangeRisk 词表已退役 D-008）。幂等：段内非 TODO 占位（已手写/已
- ⚠️ `src/index.js:1567` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1593` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1948` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1953` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1979` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:2014` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:2017` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:2020` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:2023` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:2026` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:2038` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:2042` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:2043` Given <!--TODO-->
- ⚠️ `src/index.js:2044` When <!--TODO-->
- ⚠️ `src/index.js:2045` Then <!--TODO-->
- ⚠️ `src/index.js:2048` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:2070` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3832` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `src/index.js:4188` // 占位行「requirement_ids: [FR-XX] / decision_ids: [D-XXX@vN]」立即改写为 prefillCardIds
- ⚠️ `src/index.js:4205` .replace('decision_ids: [D-XXX@vN]', () => tcIdLine('decision_ids', tcPrefillIds.decisionIds));
- ⚠️ `src/stages/plan.js:392` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `src/stages/plan.js:431` decision_ids: [D-XXX@vN]
- ⚠️ `src/stages/plan.js:554` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、src/run、test、.sillyspec/docs/sillyspec/modules）找到 14 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs …）
- ✅ task-02: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-04: 模块目录（src、test）找到 14 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs …）
- ⚠️ task-07: 模块目录（src/stages）递归未找到测试文件（含 co-located tests/）
- ✅ task-03: 模块目录（src、.sillyspec、test）找到 26 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、.sillyspec/.runtime/merge-backups/1789787389252-src__stage-contract-spec.js …）
- ✅ task-05: 模块目录（src、test、.sillyspec/docs/sillyspec/modules）找到 14 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs …）
- ✅ task-06: 模块目录（src、test）找到 14 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| harness 无 agent 产物流程：watcher 事件数与 CLI 调用数解耦（事件来自文件/git/工件三类源，不随调用数等比例下降） | `test/watcher.test.mjs` | harness、watcher（`test/watcher.test.mjs`） | covered | `test/watcher.test.mjs:12`（harness）、`test/watcher.test.mjs:2`（watcher） |
| 全部事件恒带 provisional:true | `test/watcher.test.mjs` | 全部事件恒带、provisional、true（`test/watcher.test.mjs`） | covered | `test/watcher.test.mjs:6`（全部事件恒带）、`test/watcher.test.mjs:6`（provisional）、`test/watcher.test.mjs:6`（true） |
| watcher 被杀/SILLYSPEC_WATCHER=0 时主流程命令正常返回零影响（best-effort 语义） | `test/watcher.test.mjs` | watcher、SILLYSPEC_WATCHER（`test/watcher.test.mjs`） | covered | `test/watcher.test.mjs:2`（watcher）、`test/watcher.test.mjs:9`（SILLYSPEC_WATCHER） |
| 租约判死覆盖心跳过期与 pid 死两态；pid 复用假活有守卫 | `test/watcher.test.mjs` | pid（`test/watcher.test.mjs`） | covered | `test/watcher.test.mjs:8`（pid） |
| 墙钟拆账 json 落盘且阶段序列单调 | `test/watcher.test.mjs` | json（`test/watcher.test.mjs`） | covered | `test/watcher.test.mjs:158`（json） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| runArchiveChain 从 src/run/complete-handlers.js 可导入且原调用点行为不变 | `test/archive-chain.test.mjs`<br>`test/flow-protocol.test.mjs` | runArchiveChain、src、run、complete、handlers（`test/archive-chain.test.mjs`、`test/flow-protocol.test.mjs`） | covered | `test/archive-chain.test.mjs:5`（runArchiveChain）、`test/archive-chain.test.mjs:18`（src）、`test/archive-chain.test.mjs:5`（run） |
| skipPlanCheck=true 跳过 plan.md 硬校验、false 走原校验（两态断言） | `test/archive-chain.test.mjs`<br>`test/flow-protocol.test.mjs` | skipPlanCheck、true、跳过、plan、硬校验（`test/archive-chain.test.mjs`、`test/flow-protocol.test.mjs`） | covered | `test/archive-chain.test.mjs:6`（skipPlanCheck）、`test/archive-chain.test.mjs:7`（true）、`test/flow-protocol.test.mjs:8`（跳过） |
| 既有 archive 流程测试族零回归 | `test/archive-chain.test.mjs`<br>`test/flow-protocol.test.mjs` | 既有、archive（`test/archive-chain.test.mjs`、`test/flow-protocol.test.mjs`） | covered | `test/archive-chain.test.mjs:6`（既有）、`test/archive-chain.test.mjs:2`（archive） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 机械 harness 走通薄跑道，CLI 必需调用恰为 2（start+done） | `test/flow-protocol.test.mjs`<br>`test/flow-draft.test.mjs` | 机械、harness、走通薄跑道、CLI（`test/flow-protocol.test.mjs`、`test/flow-draft.test.mjs`） | covered | `test/flow-protocol.test.mjs:5`（机械）、`test/flow-protocol.test.mjs:5`（harness）、`test/flow-protocol.test.mjs:5`（走通薄跑道） |
| 恢复场景新会话同命令从盘面状态生成恢复简报（checkbox/提交/账本/dirty files 三态注入） | `test/flow-protocol.test.mjs`<br>`test/flow-draft.test.mjs` | checkbox、提交、账本、dirty（`test/flow-protocol.test.mjs`） | covered | `test/flow-protocol.test.mjs:7`（checkbox）、`test/flow-protocol.test.mjs:7`（提交）、`test/flow-protocol.test.mjs:7`（账本） |
| 实测失败整单 FAIL exit 非 0 且不继续 distill/归档；中断重入从断点续不假绿 | `test/flow-protocol.test.mjs`<br>`test/flow-draft.test.mjs` | FAIL、exit（`test/flow-protocol.test.mjs`） | covered | `test/flow-protocol.test.mjs:8`（FAIL）、`test/flow-protocol.test.mjs:6`（exit） |
| flow 配 legacy 后既有 run stage 族行为零变化 | `test/flow-protocol.test.mjs`<br>`test/flow-draft.test.mjs` | flow、legacy、run、stage（`test/flow-protocol.test.mjs`、`test/flow-draft.test.mjs`） | covered | `test/flow-protocol.test.mjs:2`（flow）、`test/flow-protocol.test.mjs:10`（legacy）、`test/flow-protocol.test.mjs:10`（run） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 四原语从 src/machine-draft.js 导出，verifyMarkers 三态与 verify-draft 既有 checkDraftIntegrity 逐字对应 | `test/machine-draft.test.mjs`<br>`test/flow-draft.test.mjs` | src、machine、draft（`test/machine-draft.test.mjs`、`test/flow-draft.test.mjs`） | covered | `test/machine-draft.test.mjs:12`（src）、`test/machine-draft.test.mjs:2`（machine）、`test/machine-draft.test.mjs:2`（draft） |
| 既有 test/verify-draft.test.mjs 与 verify 族测试零回归（不改既有断言） | `test/machine-draft.test.mjs`<br>`test/flow-draft.test.mjs` | 既有、test、verify、draft、mjs（`test/machine-draft.test.mjs`、`test/flow-draft.test.mjs`） | covered | `test/machine-draft.test.mjs:25`（既有）、`test/machine-draft.test.mjs:2`（test）、`test/machine-draft.test.mjs:6`（verify） |
| amendCmd 参数化后 verify-result 标记文案与旧版逐字一致 | `test/machine-draft.test.mjs`<br>`test/flow-draft.test.mjs` | amendCmd、verify（`test/machine-draft.test.mjs`、`test/flow-draft.test.mjs`） | covered | `test/machine-draft.test.mjs:5`（amendCmd）、`test/machine-draft.test.mjs:6`（verify） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 四件起草器输出含机器段标记与 AGENT 槽的规范形态 | `test/flow-draft.test.mjs`<br>`test/flow-route.test.mjs` | AGENT（`test/flow-draft.test.mjs`） | covered | `test/flow-draft.test.mjs:5`（AGENT） |
| 机器段被整份重写三态拒收（标记删除/哈希失配/手工重锚未审计）；AGENT 槽改写放行 | `test/flow-draft.test.mjs`<br>`test/flow-route.test.mjs` | 标记删除、哈希失配、AGENT（`test/flow-draft.test.mjs`） | covered | `test/flow-draft.test.mjs:90`（标记删除）、`test/flow-draft.test.mjs:8`（哈希失配）、`test/flow-draft.test.mjs:5`（AGENT） |
| flow amend-draft 重锚后 ledger 留 amendment 审计且首版原文仍在 | `test/flow-draft.test.mjs`<br>`test/flow-route.test.mjs` | flow、amend、draft、重锚后、ledger（`test/flow-draft.test.mjs`、`test/flow-route.test.mjs`） | covered | `test/flow-draft.test.mjs:2`（flow）、`test/flow-draft.test.mjs:10`（amend）、`test/flow-draft.test.mjs:2`（draft） |
| 薄跑道 harness 全程 .sillyspec 写入仅 AGENT 槽与 amend 产物 | `test/flow-draft.test.mjs`<br>`test/flow-route.test.mjs` | 薄跑道、harness、sillyspec（`test/flow-draft.test.mjs`、`test/flow-route.test.mjs`） | covered | `test/flow-draft.test.mjs:11`（薄跑道）、`test/flow-draft.test.mjs:11`（harness）、`test/flow-draft.test.mjs:11`（sillyspec） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| editRatio 阈值触发正确（合成改写 0.5 边界两侧行为分明） | `test/flow-route.test.mjs` | editRatio（`test/flow-route.test.mjs`） | covered | `test/flow-route.test.mjs:84`（editRatio） |
| 失败升级通路真跑一次（verify 失败注入→tier 变 thick+upgrade_reason 在案） | `test/flow-route.test.mjs` | verify、tier、thick（`test/flow-route.test.mjs`） | covered | `test/flow-route.test.mjs:10`（verify）、`test/flow-route.test.mjs:10`（tier）、`test/flow-route.test.mjs:6`（thick） |
| advisory 缺省下测绿+高 editRatio 可薄档过（不阻断）；block 配置下阻断 | `test/flow-route.test.mjs` | advisory、editRatio、可薄档过（`test/flow-route.test.mjs`） | covered | `test/flow-route.test.mjs:8`（advisory）、`test/flow-route.test.mjs:84`（editRatio）、`test/flow-route.test.mjs:8`（可薄档过） |
| AGENT 槽书写不改变 editRatio | `test/flow-route.test.mjs` | editRatio（`test/flow-route.test.mjs`） | covered | `test/flow-route.test.mjs:84`（editRatio） |

**task-07**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| plan.js 新增指引文案就位（步骤 2 与步骤 4 两处） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 文案明确「同 Wave 文件不相交=防并行互盖」语义 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| plan 阶段既有测试族零回归（不删既有文案断言） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

- ⚠️ 零/半自动化承接条目 3 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 4 backend endpoints (live [scan-root 5] + artifact 0), 0 frontend calls [scope: change-diff (38 files @ scan-root)] | 0 backend endpoints unused by frontend (+4 stock noise collapsed)
- ⚠️ 0 个本变更端点前端未调用（warning 不阻断）：
- ℹ️ 另有 4 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 17 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（8 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --change <变更名> --init --force` 重生成本段（⚠️ 全骨架重生成，手填结论会重置——先备份；quick-B 起 --force 通道存在）；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
<!-- MACHINE-DRAFT:test-result:885d247bf2ac517b6fae255857ace156cb90ecc1ffbce7dfe78324ff61077cb4:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
- ♻️ noAI 质量扫描实测记录复用（代码指纹匹配）：`module[cli-core,run-gates]+deps(30)` — 通过
- 实测于 2026-09-22T09:40:39.053Z，耗时 22s
- verify `--done` 门与本文对账同源（P2 账本 > 扫描记录 > 亲跑）——正文与门结论冲突时以门为准并在此说明差异
<!-- MACHINE-DRAFT:test-result:end -->


## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- MACHINE-DRAFT:decision-chain:b89711584773733efc96e8a1a03699453d686dd207aab50ff586d07ce84b7681:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
- 决策链机械半边：7 条决策 × 7 张 task 卡（D→FR→Task 自 decisions.md × tasks/*.md frontmatter 构建）
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02 | task-01 | <待填：证据回指> | <待填> |
| D-002@v1 | FR-03、FR-04、FR-05、FR-06 | task-03 | <待填：证据回指> | <待填> |
| D-003@v1 | FR-03、FR-04、FR-05、FR-06、FR-07 | task-02、task-03 | <待填：证据回指> | <待填> |
| D-004@v1 | FR-05、FR-07、FR-08 | task-02、task-04、task-05 | <待填：证据回指> | <待填> |
| D-005@v1 | FR-07、FR-08、FR-09、FR-10 | task-05、task-06 | <待填：证据回指> | <待填> |
| D-006@v1 | FR-11 | task-07 | <待填：证据回指> | <待填> |
| D-007@v1 | FR-03、FR-04、FR-05、FR-06、FR-07、FR-08 | task-03、task-05 | <待填：证据回指> | <待填> |
- Evidence / 状态两列是人工判断（机器不代笔）——逐格复核，未闭环行在「审查叙述」槽标注风险
<!-- MACHINE-DRAFT:decision-chain:end -->


## 技术债务 [层：人工判断]
<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->

## 变更风险等级 [层：人工判断]
<!-- MACHINE-DRAFT:risk-level:c4d43e9a5ae668ddf70d5086801d54b605c9ba9df218ea83e9bb5d271489f962:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
- 机器判级：tier=S1（design.md 无显式 risk_level 声明）
- 未命中 evidence:true 声明危险面——无集成证据链硬要求（「集成验证回执」节机器判「无」）
- 判级输入：design 文件清单 × blast 声明（同 verify 门 evaluateConclusionDraft 口径；判定被新事实推翻时在「审查叙述」槽说明）
<!-- MACHINE-DRAFT:risk-level:end -->


## Runtime Evidence [层：人工判断]
<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->
<!-- 降级路径（design §3.2，D-004 收口）：服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及 -->

## 代码审查 [层：人工判断]
<!--TODO: 问题列表 + 总体评价。走查清单（零覆盖路径必查——探针 7 ⚠️ 条目即定向面）：
     ① 编辑/更新链路（回显、字段映射、残留态）——非新增主链路，实证盲区；
     ② 非主分支流（相关方/旁路支线等未走查路径）；
     ③ 守卫一致性：同资源端点的操作人/权限校验模式对比（实证 doSubmit 无操作人校验而 delete/withdraw 有——越权）；
     ④ 载荷字段契约（探针 8 ⚠️ 配对逐条核实）；
     ⑤ 分页/并发/事务原子性（无测试基建端的纯逻辑面）-->

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
<!-- verify 完成后的深度复核（独立子代理/二次审查）结论回流至此：缺陷分级（P1 功能不可用 / P2 需求子项 / P3 建议修）+ 修复证据链 + 对「结论枚举」的影响改写。无复核时本节写「无」或删除。复核结论不再只活在聊天记录（2026-09-16 EHS 二次复核实证：5 个 P1 只有聊天可查，变更档案仍写 PASS WITH NOTES）。 -->
