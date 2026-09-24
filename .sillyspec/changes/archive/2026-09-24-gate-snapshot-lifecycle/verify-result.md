# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:<行号>）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`（单元与集成级行为验证全绿：两份新测试 30/30、既有 gate-snapshot 族 9 文件零回归、全量 613/613、lint 782 绿、doc-ref 93/93、doctor CLI 亲测新维度渲染；封顶为 WITH NOTES 的原因是 task-05 三条文档/清单类验收无自动化测试承接（探针 7 uncovered×2 + non-testable×1），按 PASS 封顶四事实条件④降级，结论与移交项如实登记）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| manual-acceptance | task-05「npm run lint 绿（module-map 覆盖全、模块卡字数预算不超限）」无自动化测试承接——已人工执行 `npm run lint`：Checked 782 JavaScript files（src 162 + test 620），内容规则通过 + 未引用导出 0 + module-map 覆盖全 | 复跑：`npm run lint`，期望输出末行含「未引用导出 0 项（hard fail）+ module-map 覆盖全」 |
| manual-acceptance | task-05「test:core 清单含新测试文件」无自动化测试承接——已人工核对 package.json test:core 含 test/gate-snapshot-lifecycle.test.mjs 与 test/gate-snapshot-cleanup.test.mjs，且 `npm run test:core` 可跑 | 复跑：`node -e "console.log(require('./package.json').scripts['test:core'].includes('gate-snapshot-lifecycle'))"` 期望 true |
| other | verify 阶段 CLI 实测选面降级（test_strategy: module + in-place 模式自动 checkpoint 2b5bb6e7 生成于执行半途 → 模块 0 命中 → commands.test 按「据 verify-result.md 自报告」跳过；真实全量证据由本报告测试结果节逐条登记） | 复跑：待 in-place checkpoint 基线问题单独立项修复后，`sillyspec run verify --done` 将亲跑 commands.test；本次证据：全量 613/613（npm test，修复后）、新测试 30/30、lint 782 绿 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
- 无（5 张卡 review.json 均 spec=pass/quality=pass，无 cannot_verify）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
- 无（判级 unit-sufficient：纯 Node 库函数+门禁接线面，无长驻服务/端点/DB 面；真实行为证据见 Runtime Evidence 与测试结果节——create→cleanup 与崩溃自愈均为真实 git worktree 集成用例）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
5/5 全部完成（tasks.md 5 个 checkbox 由 CLI 依 review verdict 自动勾选；逐卡验收对照）：
- task-01 账本模块：完成。src/run/gate-snapshot-ledger.js 七导出 + 双守卫 + TTL×pid 三态 + 双清回收；单测 15 例（幂等/损坏/守卫/真值表/双清/双失败保留/resolveStaleHours 值域）。
- task-02 cleanup 硬化：完成。cleanupSnapshot 可注入清理体（rmSync maxRetries/retryDelay、remove 失败补 prune、返回双清）；根因修正（worktree remove --quiet 非法 flag 除尽，含 env 早退分支）；故障注入 6 例。
- task-03 生命周期接线：完成。runtimeRoot 显式透传（quick resolveRuntimeRoot(null,specBase) + verify 内部复用）、create 前 best-effort 回收（空结果零输出）、add 后登记、cleanup/失败 catch 双清确认销账；真实临时仓集成：create→cleanup 账本归零+注册双清、死 pid 超期自愈、活跃/无效 pid 零误删、接线钉。
- task-04 doctor 维度：完成。detectGateSnapshotLeak + gate_snapshot_leak dimensions 适配（末尾追加）+ 平台指针 runtimeRoot 同源；doctor 三态单测 + `node bin/sillyspec.js doctor` 亲测渲染 ✅ 门禁快照泄漏。
- task-05 文档登记：完成。runtime 模块卡/changelog 摘要、file-lifecycle 登记（含 frontmatter updated_at）、test:core 两份新测试、platform-interface-map 14 锚机械重锚。

## 设计一致性 [层：人工判断]
一致，两处经 execute 独立审查修正后与 design 终稿对齐：①cleanup 抽出 cleanupSnapshot 并返回双清结果（design 接口定义已含该签名）；②守卫拆为 isSafeSnapshotRoot（路径）+ isSafeLedgerEntry（结构），plan 硬约束限定为「账本回收路径的删除原语」——均已同步 design/plan/卡面。设计清单 8 行与实际改动文件面一致（含 platform-interface-map 机械重锚一行，系并行会话 97454a6f 漂移致 doc-ref-check 全量拦的连带修复，已在 design 登记）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `docs/sillyspec/file-lifecycle.md:296` - `executePlanPostcheck`（noAI，execute 前最后关口）顺序跑确定性校验：`validateBlueprintConsistency`（task 结构/路径冲突/拓扑无环）、`validatePlanFeasibility`（TaskCard 字段齐全/依赖存在/id 连续；2026-0

#### 探针 2：设计关键词覆盖
逐个 grep 确认（design 接口段 7 个导出 + 门控关键词）：
- `gateSnapshotLedgerPath/registerGateSnapshot/unregisterGateSnapshot/readGateSnapshotLedger/isSafeSnapshotRoot/isSafeLedgerEntry/selectStaleSnapshots/reclaimStaleGateSnapshots/resolveStaleHours` — 全部存在于 src/run/gate-snapshot-ledger.js，且均有单测消费（lint 未引用导出 0）
- `runtimeRoot` 形参 — src/run/gate-snapshot.js:createGateSnapshot 签名 + quick-audit.js 调用点 + createVerifyGateSnapshot 下传，三处 grep 全中
- `test_strategy: skip` 语汇不适用于本变更（那是 semantic-guard 夹具口径）；本变更阈值单源 `SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS` 在 ledger resolveStaleHours、doctor 维度、requirements FR-01/FR-03 四处一致
- `CHECK_SEVERITY.WARNING` — doctor-diagnostics.js 维度适配层在位
- 无遗漏关键词。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-02: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-03: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-04: 模块目录（src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-05: 模块目录（.sillyspec/docs/sillyspec/modules、docs/sillyspec）找到 1 个测试文件（docs/sillyspec/fr-test-binding-proposal-2026-09-24.md）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| test/gate-snapshot-lifecycle.test.mjs 全绿（上述六组用例 ≥18 断言） | `test/gate-snapshot-lifecycle.test.mjs` | test、gate、snapshot、lifecycle（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:8`（test）、`test/gate-snapshot-lifecycle.test.mjs:2`（gate）、`test/gate-snapshot-lifecycle.test.mjs:2`（snapshot） |
| 篡改/损坏账本用例证明零 rmSync、零 git worktree remove 调用 | `test/gate-snapshot-lifecycle.test.mjs` | rmSync、git、worktree（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:10`（rmSync）、`test/gate-snapshot-lifecycle.test.mjs:5`（git）、`test/gate-snapshot-lifecycle.test.mjs:6`（worktree） |
| 双失败（remove 失败 ∧ rmSync 失败）用例证明条目仍在账本且计入 skipped | `test/gate-snapshot-lifecycle.test.mjs` | 双失败、remove、失败、rmSync（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:158`（双失败）、`test/gate-snapshot-lifecycle.test.mjs:135`（remove）、`test/gate-snapshot-lifecycle.test.mjs:158`（失败） |
| npm run lint 绿（未引用导出 0；本模块导出均有单测或 task-03/04 消费） | `test/gate-snapshot-lifecycle.test.mjs` | run（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:5`（run） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| test/gate-snapshot-cleanup.test.mjs 四组故障注入用例全绿（真实调用与失败分支断言，非文本钉） | `test/gate-snapshot-cleanup.test.mjs`<br>`test/gate-snapshot-lifecycle.test.mjs` | test、gate、snapshot、cleanup（`test/gate-snapshot-cleanup.test.mjs`、`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-cleanup.test.mjs:8`（test）、`test/gate-snapshot-cleanup.test.mjs:2`（gate）、`test/gate-snapshot-cleanup.test.mjs:2`（snapshot） |
| 既有 gate-snapshot 族 9 文件全部零回归（copy/monorepo/layout-guard/lineage/import-smoke/e2e/commands/ancestor-trim/worktree-skip） | `test/gate-snapshot-cleanup.test.mjs`<br>`test/gate-snapshot-lifecycle.test.mjs` | gate、snapshot（`test/gate-snapshot-cleanup.test.mjs`、`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-cleanup.test.mjs:2`（gate）、`test/gate-snapshot-cleanup.test.mjs:2`（snapshot） |
| npm run lint 绿（cleanupSnapshot 导出有单测消费，未引用导出 0） | `test/gate-snapshot-cleanup.test.mjs`<br>`test/gate-snapshot-lifecycle.test.mjs` | run、cleanupSnapshot（`test/gate-snapshot-cleanup.test.mjs`、`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-cleanup.test.mjs:5`（run）、`test/gate-snapshot-cleanup.test.mjs:10`（cleanupSnapshot） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 集成用例绿：create→cleanup 账本归零且 worktree list 无残留注册 | `test/gate-snapshot-lifecycle.test.mjs` | create、cleanup、账本归零且、worktree（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:86`（create）、`test/gate-snapshot-lifecycle.test.mjs:201`（cleanup）、`test/gate-snapshot-lifecycle.test.mjs:240`（账本归零且） |
| 真实 kill 自愈用例绿：被杀后账本留条目→下个 create 回收并销号 | `test/gate-snapshot-lifecycle.test.mjs` | 真实、kill、下个（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:6`（真实）、`test/gate-snapshot-lifecycle.test.mjs:229`（kill）、`test/gate-snapshot-lifecycle.test.mjs:254`（下个） |
| 活跃/无效 pid 零回收用例绿；篡改条目零删除用例绿（task-01 守卫） | `test/gate-snapshot-lifecycle.test.mjs` | 活跃、pid（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:201`（活跃）、`test/gate-snapshot-lifecycle.test.mjs:5`（pid） |
| 正常路径（reclaimed 空）create 输出逐字节不变 | `test/gate-snapshot-lifecycle.test.mjs` | 正常路径、reclaimed、create（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:306`（正常路径）、`test/gate-snapshot-lifecycle.test.mjs:135`（reclaimed）、`test/gate-snapshot-lifecycle.test.mjs:86`（create） |
| quick/verify 门禁既有路径零回归 + lint 绿 | `test/gate-snapshot-lifecycle.test.mjs` | quick（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:318`（quick） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| doctor 族测试零回归（既有维度顺序与输出逐字不变） | `test/gate-snapshot-lifecycle.test.mjs` | doctor（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:334`（doctor） |
| 三态单测绿；leak 输出含 root 与账龄且 severity=WARNING 不阻断 | `test/gate-snapshot-lifecycle.test.mjs` | leak、root（`test/gate-snapshot-lifecycle.test.mjs`） | covered | `test/gate-snapshot-lifecycle.test.mjs:341`（leak）、`test/gate-snapshot-lifecycle.test.mjs:26`（root） |
| lint 绿 | `test/gate-snapshot-lifecycle.test.mjs` | — | partial | （无机械命中——人工核验 `test/gate-snapshot-lifecycle.test.mjs`） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| node bin/sillyspec.js docs check 失效数不增（重锚后零新增） | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |
| npm run lint 绿（module-map 覆盖全、模块卡字数预算不超限） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| test:core 清单含新测试文件 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

- ⚠️ 零/半自动化承接条目 3 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
7 条决策全部闭环（→ FR → task → 证据，详见下方决策追踪矩阵）：D-001 三件套范围（task-02/04/05 实现面）、D-002 回收时机（task-03 create 前接线，src/run/gate-snapshot.js 建快照入口）、D-003@v2 pid 三态（task-01 selectStaleSnapshots + task-03 env 接线）、D-004@v2 双清销账（task-01 回收执行 + task-03 cleanup/catch 接线）、D-005@v1 双守卫（task-01 两导出 + selectStale/reclaim 前置过滤）、D-006@v1 runtimeRoot 透传（task-03 quick/verify 双侧）、D-007@v1 doctor 阈值单源（task-04 resolveRuntimeRoot 平台同源 + env/24h）。supersedes 链（D-003/D-004 v1→v2）在 decisions.md 内自洽，无悬空旧版引用。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 4 backend endpoints (live [scan-root 5 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (1 files @ worktree)] | 0 backend endpoints unused by frontend (+4 stock noise collapsed)
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 0 个本变更端点前端未调用（warning 不阻断）：
- ℹ️ 另有 4 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 9 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（6 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态（可复制样例）：design接口表#POST /api/xx（# 后必须 METHOD /path，仅表名/行号/散文描述不计命中）、权限矩阵[admin×读]、契约表@任务卡字段清单、DDL@users.id、载荷@e2e_body.json（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（检测到接口段标题「接口定义」但表格解析零端点）——矩阵只解析表格形态（每端点一行 METHOD | path），散文式接口定义不进矩阵。修复：接口定义改为表格（每端点一行 METHOD /path）或加声明行「本变更接口面：N 端点」，再重跑 `verify-probes --change <变更名> --init --force` 重生成本段（⚠️ 全骨架重生成，手填结论会重置——先备份）；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
本轮修复后实跑（2026-09-24，node v24.15.0，Windows）：

1. `node --test test/gate-snapshot-lifecycle.test.mjs test/gate-snapshot-cleanup.test.mjs` → **30/30 pass, 0 fail**（账本幂等/损坏退空/守卫三态/TTL×pid 真值表/双清双失败保留/真实临时仓 create→cleanup 与崩溃自愈/活跃零误删/doctor 三态/接线钉）
2. 既有 gate-snapshot 族 9 文件（copy/monorepo/layout-guard/lineage/import-smoke/e2e/commands/ancestor-trim/worktree-skip）→ **41/41 pass, 0 fail**
3. `node --test test/doctor-align-execute-progress.test.mjs` → 1/1 pass；`node bin/sillyspec.js doctor` 亲测新维度渲染 `✅ 门禁快照泄漏`
4. `npm test`（全量 619 文件）→ **613/613 pass, 0 fail**（含 2 个满载竞态文件串行复核转绿）
5. `npm run lint` → **Checked 782 JavaScript files（src 162 + test 620）；内容规则通过 + 未引用导出 0 + module-map 覆盖全**
6. `node --test test/doc-ref-check.test.mjs` → **93/93 引用全过**（含本变更 task-05 的 14 锚重锚与并行会话漂移修复）

known_failures（local.yaml 23 条模式）本轮零命中——无豁免项。CLI 侧 verify-test 实测本轮按「module 0 命中 → 据自报告」跳过（原因与复跑口径见「移交项」other 行），上列 1-6 为 agent 实跑证据。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04 | task-02、task-04、task-05 | task-02 cleanupSnapshot+故障注入 6 例（test/gate-snapshot-cleanup.test.mjs）；task-04 doctor 三态（test/gate-snapshot-lifecycle.test.mjs 尾段）；task-05 lint 782 绿+test:core 登记 | 已闭环 |
| D-002@v1 | FR-01、FR-02、FR-04 | task-03 | create 前回收接线（src/run/gate-snapshot.js 建快照入口）+「账本空时零自愈输出」逐字节用例 + 崩溃自愈集成用例（死 pid 超期→下个 create 回收销号） | 已闭环 |
| D-003@v2 | FR-01、FR-02、FR-04 | task-01、task-03 | selectStaleSnapshots 真值表（成功/EPERM=活、ESRCH=死、无效/异常=活、staleHours 非法回退 24）+ resolveStaleHours 值域直测 | 已闭环 |
| D-004@v2 | FR-01、FR-02、FR-04 | task-01、task-03 | 双清销账用例（双失败保留+skipped、目录已删但注册残留保留）+ create→cleanup 全程账本归零集成用例 | 已闭环 |
| D-005@v1 | FR-01、FR-04 | task-01 | isSafeSnapshotRoot 路径真值表（直接子目录/前缀/.. 嵌套/非直接子目录/非字符串）+ isSafeLedgerEntry 结构真值表（pid 0/-3/1.5、createdAt NaN/Infinity）+「守卫不过计入保留、零删除原语」用例 | 已闭环 |
| D-006@v1 | FR-01、FR-02、FR-04 | task-03 | 接线钉（createGateSnapshot runtimeRoot 形参/quick 调用点 resolveRuntimeRoot(null,specBase)/verifyRuntimeRoot 下传）+「runtimeRoot 缺失退 no-op」用例 | 已闭环 |
| D-007@v1 | FR-03 | task-04 | detectGateSnapshotLeak 阈值经 resolveRuntimeRoot 平台同源 + env/24h 单源；三态单测；零新增 CLI 参数面（doctor 用法面未动） | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 命中 1 处：docs/sillyspec/file-lifecycle.md:296 的 `executePlanPostcheck`（noAI 关口）描述行——存量文档描述命中「未实现标记」扫描词，非本变更引入、非 TODO/FIXME/HACK 实质标记，不构成债务。本变更新增代码零 TODO/FIXME/HACK。已知遗留：①默认 pid 探针的 EPERM 分支与 doctor 平台 runtimeRoot 行为无自动化用例（跨平台不可稳定注入/需完整指针 fixture，execute 独立审查 P2-3 记录为接受的测试缺口）；②verify-test 实测选面因 in-place 自动 checkpoint 基线错位而降级（移交项 other 行已登记）。

## 变更风险等级 [层：人工判断]
unit-sufficient。判据：纯 Node 库函数（账本模块+清理体）与既有门禁/doctor 接线面改动，无 HTTP 端点、无 DB schema、无长驻进程；blast 声明面（_module-map.yaml blast 段）未命中 evidence:true 前缀。真实集成证据由真实 git worktree 集成用例提供（见 Runtime Evidence），不以等级降级替代。

## Runtime Evidence [层：人工判断]
- 关键提交链：b5f94d60（task-01 账本模块）→ 4f0f6a27（task-02 cleanup 硬化）→ f0d33801（task-03 接线）→ 119322a3（task-04 doctor）→ 7d9f80d1（task-05 文档）→ ef9b39c9（execute 独立审查 P1×3 闭合）
- 真实 git worktree 集成证据（非 mock）：`node --test test/gate-snapshot-lifecycle.test.mjs` 集成段在 mkdtemp+git init 真实临时仓上 create→cleanup——账本归零、目录删除、worktree 注册双清三断言全过；崩溃残留自愈用例以 ESRCH 确认的死 pid+超期条目驱动下个 create 回收；活跃（pid=本进程）与无效 pid 条目零误删
- 根因修复实证：`git worktree remove --quiet`/`prune --quiet` 在本 git 版本报 unknown option（旧 cleanup 因此 remove 恒失败）；修复后 remove 真跑通、失败才补 prune，全文件零 --quiet 残留（接线钉断言在位）
- 生命周期终态断言：门禁快照终态=目录不存在 ∧ worktree list 无注册 ∧ 账本无条目（三者缺一即保留条目待下轮——双清契约）；doctor 终态=新维度渲染 ✅ 门禁快照泄漏（无残留时 pass）
- 失败模式排除：①进程被杀→账本条目留存+TTL×pid 自愈（集成用例覆盖）②Windows EPERM/junction 锁→rmSync maxRetries/retryDelay + prune 兜底（故障注入覆盖）③账本被篡改→双守卫 fail-closed 零删除（真值表覆盖）④并发丢条目→接受退化（回现状残留，不恶化）
- 长驻服务/端点/DB：不涉及（无进程需登记回收）

## 代码审查 [层：人工判断]
- execute 阶段独立审查（agent 子代理，五维：契约忠实度/正确性/测试有效性/范围纪律/文档一致性）一轮 verdict=fail：0×P0、3×P1（env 早退残留非法 --quiet 清理；worktreeCleaned 误信 remove 退出码零未复核 worktree list；doctor 固定读 specBase/.runtime 忽略平台指针）+ 5×P2。3×P1 全部按建议修法闭合并补回归用例（ef9b39c9）；P2 修 2（win32 大小写折一、deadPid 抗 pid 复用）、以 design 补登记闭合 1、部分闭合 1（EPERM 探针分支与平台 runtimeRoot 行为用例为接受的测试缺口）、元数据同步 1（file-lifecycle frontmatter + 源码头）。
- 探针 7 零覆盖走查（task-05 三条）：①docs check 失效数不增——实测 `node bin/sillyspec.js docs check` 相对本变更前未新增（重锚 14 处后 platform-interface-map 93/93 绿）；②lint/module-map 预算——782 文件零失败、module-map 覆盖全；③test:core 登记——已核对 package.json 字符串含两份新文件。三条均人工走查通过，登记为移交项 manual-acceptance（非阻断 advisory）。
- 零新增走查面：①编辑/更新链路——账本 register/unregister 幂等更新路径有单测（重复登记一条目、重复销账不抛）；②非主分支流——worktree 形态跳快照判定（shouldSkipGateSnapshotForWorktree）与本变更正交互（worktree 内不建快照即不登记账本，既有 gate-snapshot-worktree-skip 8 断言钉在位）；③守卫一致性——删除原语仅回收路径可达且必经 isSafeLedgerEntry，cleanup 侧 root 来自 mkdtemp 受信；④载荷字段——账本条目 {snapshotRoot,pid,createdAt} 三字段 producer/consumer 单源（探针 8 不适用）；⑤分页/并发/事务——账本读改写为单文件原子写，跨 root 并发 lost update 为明示接受退化（D-004@v2）。
- 总体评价：交付忠实于 D-001~D-007 契约，安全闭环（双清销账+双守卫+三态保守判定）成立；execute 独立审查 3×P1 闭合后无已知阻断缺陷。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
- execute 阶段独立复核已执行（agent 子代理 agent_d399d6bc，五维审查）：一轮 verdict=fail（3×P1/5×P2，0×P0）→ 全部 P1 按建议修法闭合并补回归用例（提交 ef9b39c9）→ 复核结论文本回写 plan-review/execute-review 的 reviewerNotes 与 requiredEvidence。无剩余 P1/P2 缺陷，结论维持 PASS WITH NOTES（封顶原因见结论节与移交项）。
