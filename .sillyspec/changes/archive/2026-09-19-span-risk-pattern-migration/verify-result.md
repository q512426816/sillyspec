# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`
本变更自身验证面全绿（聚焦 7 测试文件 78/78、lint 全绿、grep 清零、装载实证）；NOTES 唯一来源=worktree 内全量 npm test 存在 17 个基线即有的环境性失败（stash A/B 对照逐字相同+独立归属复核、净增 0），按封顶语义如实降档并移交复跑。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| env-blocked | worktree 内全量 npm test 的 17 个环境性失败（CLI 子进程类测试被 src/index.js 顶层 worktree-cwd 守卫拦下 + spec-dir 并发 flake，known-issues 已登记；stash 基线对照失败集逐字相同、净增 0） | apply 后在主仓（或 CI）跑一次全量 `npm test` 期望 exit 0——worktree 形态下这些用例结构性不可跑，非本变更引入 |
| manual-acceptance | 走位验收为一次性回放（node -e 实测：模式维命中 0 且与旧口径对照同为 0——等价性再实证；span S2 由文件数 18≥8 + 跨模块 3≥3 双维承担） | 已在 execute task-04 实录完成；如需持久化可后续把回放固化为测试（advisory） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（四 task review 均 pass/pass，无 cannot_verify 任务）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（变更风险等级 contract-required，非 integration/deployment-critical——无集成回执要求）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
- task-01 ✅ 完成：NEW src/span-risk-surface.js 四导出 + NEW test/span-risk-surface.test.mjs（等价性钉 21 token×35 路径四重断言 7/7 绿；装载容错六路；AllProjects 并集）；review pass/pass
- task-02 ✅ 完成：computeCeremonyTier spanRiskPatterns / reconcileDualRun factSpanRiskPatterns / computeGateProfile riskTable 默认 [] 参数化 + 两测试翻新（28/28 绿）；四文件对旧表引用 grep 清零；review pass/pass
- task-03 ✅ 完成：五处装载接线 + map span_risk 9 token 段（段内注释）+ config-schema note + known-issues 两登记 + INDEX 路由 + rebuild 回插钉 11/11 + QUICK_RISK_PATH_PATTERNS 全仓清零 + D-005 两夹具翻新 41/41；review pass/pass（扩面后复审）
- task-04 ✅ 完成：四模块卡同步（docs-check 失效集与基线 diff 逐字相同）+ 走位验收如实记录 + lint 全绿 + 全量 524/17 环境性（净增 0，见移交项）；review pass/pass
完成率 4/4。

## 设计一致性 [层：人工判断]
一致，两处已裁决的文档措辞修正（不构成实现偏差）：
- design 非目标「阈值 8/2」措辞失准已按 D-005 修正为「8/3/2 三常量」——约束实质（价目表零改动）不变，代码零触碰（阶段审查 diff 级实证 ceremony-tier.js 阈值区零 hunk）。
- design 文件清单 map 行「头注维护提示」措辞与总体方案④「段内注释」自相矛盾（Grill X-10 已裁决），实现取④正确侧，清单行已同步修正。
其余逐层核对一致：装载层四导出签名与接口定义逐字一致；纯函数层参数位/reasons 文案形态；接线层五处+scope-audit :435 单点；自举 9 token 与 D-004 一致；known-issues 两条目事实准确（bbe30ab 悬空经 git cat-file 独立验证）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/run/gates.js:86` // 防骨架直接过门（2026-08-21 agent-手工产出审计项⑤）：CLI 会代生成逐 task TODO 骨架
- ⚠️ `src/run/gates.js:91` // 捕获 token 排除冒号/逗号：骨架行格式「- task-01: <!--TODO-->」，\S+ 会连冒号一起捕获导致永不命中
- ⚠️ `src/run/gates.js:94` for (const m of report.matchAll(/^[-*][ \t]*([^\s:：,，]+)[^\n]*<!--TODO-->/gm)) {
- ⚠️ `src/run/gates.js:99` errors.push(`${id} 的结论仍是骨架 <!--TODO--> 占位——替换为真实结论（无签名级变更也显式写「无」）`)
- ⚠️ `src/run/gates.js:105` * 生成 symbol-impact.md 逐 task TODO 骨架（2026-08-21 审计项⑤「报错即生成」）。
- ⚠️ `src/run/gates.js:108` * 骨架从 tasks.md 注册表生成逐 task 占位行，agent 只需逐行填结论；占位 <!--TODO-->
- ⚠️ `src/run/gates.js:129` '> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）',
- ⚠️ `src/run/gates.js:131` '> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。',
- ⚠️ `src/run/gates.js:134` for (const id of taskIds) lines.push(`- ${id}: <!--TODO-->`)
- ⚠️ `src/run/gates.js:159` // 报错即生成（2026-08-21 审计项⑤）：报告缺失时自动落一份逐 task TODO 骨架，agent 从
- ⚠️ `src/run/gates.js:160` // 「从零手写整份」变「逐行填结论」；TODO 占位由 validate 拒绝，骨架不能直接过门。
- ⚠️ `src/run/gates.js:167` skeletonNote = `\n   📄 已代生成逐 task 骨架：${reportPath}（逐行替换 <!--TODO--> 为结论，无签名级变更也显式写「无」）`
- ℹ️ 2 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
关键词覆盖（worktree diff 内 grep 实证，逐个确认）：
- compileSpanRiskPatterns / matchSpanRiskPatterns / loadSpanRiskPatterns / loadSpanRiskPatternsAllProjects → src/span-risk-surface.js 四导出在盘，两消费面+五接线点引用齐
- span_risk → map 顶层段（9 token+段内注释）、span-risk-surface 装载、config-schema note、回插钉、两夹具翻新齐
- 边界锚定（(?:^|[/_-]) 与 (?=[/._-]|$)）→ 编译行逐字+测试 LEGACY 快照钉
- 空表/维度关闭/不回退 → computeCeremonyTier 默认 []、computeGateProfile 默认 []、双向钉
- grep 清零 → QUICK_RISK_PATH_PATTERNS src/ test/ 零命中（exit=1）
全部命中，无能力词落空。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-02: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-03: 模块目录（src/run、src、test、.sillyspec/docs/sillyspec/modules、.sillyspec/knowledge）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ⚠️ task-04: 模块目录（.sillyspec/docs/sillyspec/modules）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| node --test test/span-risk-surface.test.mjs 全绿；等价性钉覆盖六域全部 21 token × ≥20 代表路径正反例 | `test/span-risk-surface.test.mjs`<br>`test/ceremony-tier.test.mjs`<br>`test/quick-gate-profile.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | node、test、span、risk、surface（`test/span-risk-surface.test.mjs`、`test/ceremony-tier.test.mjs`、`test/quick-gate-profile.test.mjs`、`test/scope-audit.test.mjs`、`test/audit-quick-completion.test.mjs`、`test/modules-rebuild-preserve.test.mjs`） | covered | `test/span-risk-surface.test.mjs:20`（node）、`test/span-risk-surface.test.mjs:20`（test）、`test/span-risk-surface.test.mjs:2`（span） |
| loadSpanRiskPatterns 对无 span_risk 段的 map 返回 []（不抛错、不缺省内置表） | `test/span-risk-surface.test.mjs`<br>`test/ceremony-tier.test.mjs`<br>`test/quick-gate-profile.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | loadSpanRiskPatterns、span_risk、段的、map（`test/span-risk-surface.test.mjs`、`test/modules-rebuild-preserve.test.mjs`、`test/ceremony-tier.test.mjs`、`test/quick-gate-profile.test.mjs`、`test/scope-audit.test.mjs`、`test/audit-quick-completion.test.mjs`） | covered | `test/span-risk-surface.test.mjs:29`（loadSpanRiskPatterns）、`test/span-risk-surface.test.mjs:15`（span_risk）、`test/modules-rebuild-preserve.test.mjs:11`（段的） |
| 模块零依赖除 fs/path/js-yaml（与 blast-surface 同栈），无 CLI/DB/锁副作用 | `test/span-risk-surface.test.mjs`<br>`test/ceremony-tier.test.mjs`<br>`test/quick-gate-profile.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | path、yaml、blast、surface（`test/span-risk-surface.test.mjs`、`test/ceremony-tier.test.mjs`、`test/quick-gate-profile.test.mjs`、`test/modules-rebuild-preserve.test.mjs`、`test/scope-audit.test.mjs`、`test/audit-quick-completion.test.mjs`） | covered | `test/span-risk-surface.test.mjs:23`（path）、`test/span-risk-surface.test.mjs:190`（yaml）、`test/ceremony-tier.test.mjs:6`（blast） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| node --test test/ceremony-tier.test.mjs test/quick-gate-profile.test.mjs 全绿 | `test/ceremony-tier.test.mjs`<br>`test/quick-gate-profile.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | node、test、ceremony、tier、mjs（`test/ceremony-tier.test.mjs`、`test/quick-gate-profile.test.mjs`、`test/scope-audit.test.mjs`、`test/audit-quick-completion.test.mjs`、`test/modules-rebuild-preserve.test.mjs`） | covered | `test/ceremony-tier.test.mjs:25`（node）、`test/ceremony-tier.test.mjs:14`（test）、`test/ceremony-tier.test.mjs:2`（ceremony） |
| computeCeremonyTier({declaredFiles:['src/auth/x.js']}) 无 spanRiskPatterns 时 span 维度不触发（S0 维度关）；注入含 auth token 表时 S2 | `test/ceremony-tier.test.mjs`<br>`test/quick-gate-profile.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | computeCeremonyTier、declaredFiles、src、auth（`test/ceremony-tier.test.mjs`、`test/audit-quick-completion.test.mjs`、`test/quick-gate-profile.test.mjs`、`test/modules-rebuild-preserve.test.mjs`、`test/scope-audit.test.mjs`） | covered | `test/ceremony-tier.test.mjs:20`（computeCeremonyTier）、`test/ceremony-tier.test.mjs:79`（declaredFiles）、`test/ceremony-tier.test.mjs:39`（src） |
| computeGateProfile 无 riskTable 时 riskHits=[] 且 runtimeEvidence='na'；注入表时命中文件 L2 | `test/ceremony-tier.test.mjs`<br>`test/quick-gate-profile.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | computeGateProfile、riskTable、riskHits、runtimeEvidence（`test/quick-gate-profile.test.mjs`、`test/scope-audit.test.mjs`、`test/audit-quick-completion.test.mjs`） | covered | `test/quick-gate-profile.test.mjs:4`（computeGateProfile）、`test/quick-gate-profile.test.mjs:10`（riskTable）、`test/quick-gate-profile.test.mjs:154`（riskHits） |
| 阈值/公式既有断言零改动通过（8/2/2 与 max 行为钉原样） | `test/ceremony-tier.test.mjs`<br>`test/quick-gate-profile.test.mjs`<br>`test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | 阈值、max（`test/ceremony-tier.test.mjs`、`test/quick-gate-profile.test.mjs`、`test/scope-audit.test.mjs`、`test/audit-quick-completion.test.mjs`） | covered | `test/ceremony-tier.test.mjs:90`（阈值）、`test/ceremony-tier.test.mjs:6`（max） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| grep -rn QUICK_RISK_PATH_PATTERNS src/ test/ 零命中 | `test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | src、test（`test/modules-rebuild-preserve.test.mjs`、`test/scope-audit.test.mjs`、`test/audit-quick-completion.test.mjs`） | covered | `test/modules-rebuild-preserve.test.mjs:20`（src）、`test/modules-rebuild-preserve.test.mjs:79`（test） |
| D-005 连带翻新：test/scope-audit.test.mjs :1042 与 test/audit-quick-completion.test.mjs G-4 夹具补 span_risk 段后两文件绿 | `test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | test、scope、audit、mjs（`test/modules-rebuild-preserve.test.mjs`、`test/scope-audit.test.mjs`、`test/audit-quick-completion.test.mjs`） | covered | `test/modules-rebuild-preserve.test.mjs:79`（test）、`test/scope-audit.test.mjs:2`（scope）、`test/scope-audit.test.mjs:2`（audit） |
| 本仓声明表生效：loadSpanRiskPatterns 读到 9 token；src/migrate.js 与 src/dispatch/ 命中 | `test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | token、src（`test/scope-audit.test.mjs`、`test/modules-rebuild-preserve.test.mjs`、`test/audit-quick-completion.test.mjs`） | covered | `test/scope-audit.test.mjs:18`（token）、`test/modules-rebuild-preserve.test.mjs:20`（src） |
| node --test test/modules-rebuild-preserve.test.mjs 全绿（含新回插钉） | `test/modules-rebuild-preserve.test.mjs`<br>`test/scope-audit.test.mjs`<br>`test/audit-quick-completion.test.mjs` | node、test、modules、rebuild、preserve（`test/scope-audit.test.mjs`、`test/audit-quick-completion.test.mjs`、`test/modules-rebuild-preserve.test.mjs`） | covered | `test/scope-audit.test.mjs:24`（node）、`test/modules-rebuild-preserve.test.mjs:79`（test）、`test/modules-rebuild-preserve.test.mjs:2`（modules） |
| known-issues 两新条目 + INDEX 路由行在盘 | `test/modules-rebuild-preserve.test.mjs`（同 task 回插钉归属面） | — | non-testable | 知识/文档类条目（在盘核验：known-issues.md 两新条目与 INDEX.md 两路由行均已读验，worktree diff 可见） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 四模块卡与 map 无 needs_review 漂移（docs-check 过） | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |
| 走位验收记录实际命中 token×文件清单与 span 档预期一致 | `test/ceremony-tier.test.mjs`（spanRiskPatterns 命中→S2 与维度关用例=走位面机械承接） | — | partial | node -e 实测回放已执行（execute task-04 实录：模式维 0 命中=新旧口径对照等价、span S2 双维承担）；底层机制由 `test/ceremony-tier.test.mjs` 1b 组承接，一次性回放面 advisory 移交项登记 |
| npm test 全量 exit 0 + npm run lint exit 0 | `test/span-risk-surface.test.mjs`（CLI verify-test 门已过=module 子集+deps(auto) 实测绿） | — | partial | lint exit 0 实测；CLI verify-test 门（commands.test module 策略亲跑）✅——含 `test/span-risk-surface.test.mjs` 等 deps(auto) 137 伪模块实测；worktree 全量 524 pass/17 环境性失败（stash 基线对照逐字相同、净增 0）——复跑条件见移交项 env-blocked 行 |

- ⚠️ 零/半自动化承接条目 3 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
闭环核对（D→FR→task→证据）：
- D-001@v1（范围/硬约束）→ FR-02/03/04/05 → task-03/04 → 阶段审查硬约束面 18/18 pass（价目表零 hunk/blast 零触碰）✅
- D-002@v1（blast 缺口不修）→ FR-04 → task-03 → known-issues 条目①在盘（bbe30ab 悬空独立验证）✅
- D-003@v1（方案 A）→ FR-01~05 → task-01/02/03 → 装载层+参数化+接线+退役全落地 ✅
- D-004@v1（9 token 自举）→ FR-04 → task-03 → map 段与决策清单逐项一致+装载实证 ✅
- D-005@v1（连带翻新扩面）→ FR-03/05 → task-03（卡 decision_ids 已补）→ 两夹具 41/41 绿 ✅
全部闭环，无未回指决策。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (24 files @ worktree)] | 3 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx
- 复核注记（agent，不改上方预填）：本变更为纯 JS CLI，无 HTTP 端点；三「端点」系探针对 design「接口定义」代码块 JS 签名行（join(specBase,'docs',project,...) 等）的宽解析噪声，非真实 API 面。

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 16 个非 Java 清单文件不在探针 9 扫描面）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（四选一）：covered / partial / uncovered / non-testable。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- 聚焦面（worktree 前台实跑，本变更直接覆盖）：node --test test/span-risk-surface.test.mjs test/ceremony-tier.test.mjs test/quick-gate-profile.test.mjs test/modules-rebuild-preserve.test.mjs test/scope-audit.test.mjs test/audit-quick-completion.test.mjs test/blast-surface.test.mjs → **78/78 绿**
- lint：npm run lint → **exit 0**（690 文件、未引用导出 0 硬门过、module-map 覆盖全）
- 全量（worktree）：npm test → 524 pass / 17 fail——17 项为基线即有环境性失败（stash A/B 对照失败集逐字相同；独立归属复核：CLI 子进程类被 worktree-cwd 守卫拦下+spec-dir 并发 flake，known-issues 在案），**净增 0**；known_failures 豁免不适用（非本仓 local.yaml 声明面）
- CLI 统一对账：commands.test 由 CLI 在本步 --done 亲跑（test_strategy: module 收窄）

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-02、FR-03、FR-04、FR-05 | task-03、task-04 | 阶段代码审查 18/18（价目表零 hunk/blast 零触碰/grep 清零）；模块卡四张 | 闭环 |
| D-003@v1 | FR-01、FR-02、FR-03、FR-04、FR-05 | task-01、task-02、task-03 | src/span-risk-surface.js 四导出+LEGACY 快照等价性钉+五接线+退役清零 | 闭环 |
| D-002@v1 | FR-02、FR-03、FR-04、FR-05 | task-03 | knowledge/known-issues.md blast 缺口条目（bbe30ab git cat-file 独立验证）；本变更 diff 零触碰 blast 段 | 闭环 |
| D-004@v1 | FR-02、FR-03、FR-04、FR-05 | task-03、task-04 | map span_risk 9 token 逐项一致+装载实证（migrate/dispatch 命中明细） | 闭环 |
| D-005@v1 | FR-03、FR-05 | task-03（decision_ids 已补） | 两夹具补 span_risk 段 41/41 绿；design/任务卡扩面同步 | 闭环 |

## 技术债务 [层：人工判断]
探针 1 的 12 处命中全部为 src/run/gates.js 守卫代码自带的 <!--TODO--> 字面量（TODO 扫描器自身的字符串/注释，基线即有——非本变更引入，本变更对 gates.js 仅增装载接线两 hunk）。本变更零新增 TODO/FIXME/HACK。既有债务（不属本变更）：core-engine.md 模块卡 34.1KB 超预算（docs 税，建议后续 modules split-changelog 精简）。

## 变更风险等级 [层：人工判断]
显式声明 = contract-required（design.md frontmatter risk_level，brainstorm 首次定价前先行声明——用户纪律）。理由：判级/定价域跨 4 模块的声明面迁移（21→23 文件、行为契约变更），但纯 CLI 纯函数域、无跨进程/部署启动面。无否定语境抑制。evidence 门：main 的 map 无 blast 段（D-002 缺口），本变更文件面零 evidence:true 命中——证据要求未触发（ceremony 档 S2 与证据门独立，D-009 口径）。

## Runtime Evidence [层：人工判断]
不涉及（contract-required 级，无 daemon/backend 跨进程、无部署启动路径、无生命周期状态机——生命周期契约豁免见 design.md）。关键证据链：worktree HEAD=c3294d9（base）+ 24 文件未提交变更面（git status 实证）；聚焦测试 78/78 绿输出在案；CLI 亲跑 commands.test 于本步 --done 落账。

## 代码审查 [层：人工判断]
独立代码审查（execute 阶段 stage review，agent-tool 通道）pass/pass 18/18：硬约束遵守（价目表零 hunk/blast 零触碰/reasons 逐字）、等价性（LEGACY 快照对照）、五接线逐处核对（含 shared.js 装载守卫逐参对称实证、scope-audit :517 不接线正确性实证）、退役清零、声明一致性、越界零。
探针 7 ⚠️ 零覆盖路径定向走查（本变更形态适配后逐条）：
- ① 编辑/更新链路 → 对应「声明表后续维护路径」：token 增删走 map 编辑（git 可评审）+ rebuild --force 回插钉锁死——走查回插测试夹具含段内注释字节级断言 ✅
- ② 非主分支流 → 对应 degraded/空表路径（无 map 项目、坏 YAML、空 token）：装载容错六路用例覆盖 ✅
- ③ 守卫一致性 → 对应两消费面口径对称：ceremony span 轴与 quick riskTable 共用 matchSpanRiskPatterns 单一命中语义；装载守卫（!specBase||!project）两侧对称（阶段审查逐参实证）✅
- ④ 载荷契约（探针 8）→ 不适用（无 Java/SQL 后端面）
- ⑤ 并发/事务 → 不适用（纯函数+只读装载，无共享可变状态；/g lastIndex 防御在 matcher 内）
遗留 P2：scope-audit 接线注释行号漂移（:517 实为 :512，不害义）。总体评价：实现质量高，硬约束零违反，等价性证据链完整。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
<!-- verify 完成后的深度复核（独立子代理/二次审查）结论回流至此：缺陷分级（P1 功能不可用 / P2 需求子项 / P3 建议修）+ 修复证据链 + 对「结论枚举」的影响改写。无复核时本节写「无」或删除。复核结论不再只活在聊天记录（2026-09-16 EHS 二次复核实证：5 个 P1 只有聊天可查，变更档案仍写 PASS WITH NOTES）。 -->
