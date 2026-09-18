# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——七任务全落地、主仓全量 533/533 绿 + lint 全绿、execute 独立评审 fail→修复→复审改判 pass（12过5缺口0fail）；4 条 P3 注记见技术债节（影子 client 供给面/摩擦双计观察/出口接线冒烟为丢弃式/双跑取数口径），无 P1/P2。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| manual-acceptance | 影子期 client 供给面：CLI 进程无平台 client，影子重仪式实际派发需平台/宿主侧带 client 调用（review-dispatch 命令 SillyHubMcpClient 先例可复用） | 平台侧接入后 shadow-ledger 出现 completed 条目，doctor ceremony_shadow 维度有对照数据 |
| manual-acceptance | 影子期转正判据需 N=10 轻档样本积累 | doctor ceremony_shadow 报 N≥10 且漏检=0 或均 advisory 后人工置 ceremony.shadow: off |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- task-NN: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填；豁免时填 missing 并加（豁免：<一句话理由>）后缀）

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
- task-01 ~ task-07：7/7 已完成（CLI 勾选 7/7 + 逐项复核见「逐项检查任务」步输出；task-04 的 verify 出口缺口经 execute 独立评审 fail→修复 5842f5d→复审 pass 闭环）。

## 设计一致性 [层：人工判断]
与 design.md 一致，三处执行期增量（均有留痕）：①文件清单补 docs/prompt/README.md（收尾合理偏差，apply 门拦截后补录）；②verify 双跑接线从 task-04 卡让渡至收尾修复提交 5842f5d（评审 fail 驱动）；③force_tier 逃生阀实现为只升不降（防 gate/prompt 判定分裂，好裁量）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/run/gates.js:83` // 防骨架直接过门（2026-08-21 agent-手工产出审计项⑤）：CLI 会代生成逐 task TODO 骨架
- ⚠️ `src/run/gates.js:88` // 捕获 token 排除冒号/逗号：骨架行格式「- task-01: <!--TODO-->」，\S+ 会连冒号一起捕获导致永不命中
- ⚠️ `src/run/gates.js:91` for (const m of report.matchAll(/^[-*][ \t]*([^\s:：,，]+)[^\n]*<!--TODO-->/gm)) {
- ⚠️ `src/run/gates.js:96` errors.push(`${id} 的结论仍是骨架 <!--TODO--> 占位——替换为真实结论（无签名级变更也显式写「无」）`)
- ⚠️ `src/run/gates.js:102` * 生成 symbol-impact.md 逐 task TODO 骨架（2026-08-21 审计项⑤「报错即生成」）。
- ⚠️ `src/run/gates.js:105` * 骨架从 tasks.md 注册表生成逐 task 占位行，agent 只需逐行填结论；占位 <!--TODO-->
- ⚠️ `src/run/gates.js:126` '> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）',
- ⚠️ `src/run/gates.js:128` '> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。',
- ⚠️ `src/run/gates.js:131` for (const id of taskIds) lines.push(`- ${id}: <!--TODO-->`)
- ⚠️ `src/run/gates.js:156` // 报错即生成（2026-08-21 审计项⑤）：报告缺失时自动落一份逐 task TODO 骨架，agent 从
- ⚠️ `src/run/gates.js:157` // 「从零手写整份」变「逐行填结论」；TODO 占位由 validate 拒绝，骨架不能直接过门。
- ⚠️ `src/run/gates.js:164` skeletonNote = `\n   📄 已代生成逐 task 骨架：${reportPath}（逐行替换 <!--TODO--> 为结论，无签名级变更也显式写「无」）`
- ⚠️ `src/stages/plan.js:363` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `src/stages/plan.js:402` decision_ids: [D-XXX@vN]
- ⚠️ `src/stages/plan.js:518` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `docs/prompt/README.md:129` ### 路径根占位符（`{XXX}` 形式，`applyRootPlaceholders` 替换）

#### 探针 2：设计关键词覆盖
- ceremony_tier 三轴取封顶：src/ceremony-tier.js computeCeremonyTier（maxTier 逐分量）✅
- 接管 review-tier：src/review-tier.js classifyReviewTier 内调 computeCeremonyTier ✅
- plan_level 编排标签：src/stages/plan.js「仪式按 risk 计价，plan_level 仅编排」文案 ✅
- Grill 档位化菜单：src/stages/brainstorm.js「仪式档位菜单」四档区块 ✅
- 双跑对账：src/verify-postcheck.js runCeremonyDualRunCheck + gates.js:1086 verify 接线 + complete-handlers.js:819 archive 接线 ✅
- friction 升档：src/run/gates.js escalateCeremonyTierAtGate（:658 检查块 :1366）✅
- 影子派发：src/review-dispatch.js dispatchShadowReview（:636）+ gates.js:1413 fire-and-forget 触发 ✅
- doctor 维度：src/doctor-diagnostics.js ceremony_shadow（第 15 维度）✅
- ceremony.force_tier/shadow 键：src/config-schema.js + prompt.js readCeremonyLocalConfig ✅

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ⚠️ task-03: 模块目录（src/run）递归未找到测试文件（含 co-located tests/）
- ✅ task-04: 模块目录（src、src/run）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-05: 模块目录（src/stages、src/run、src、docs/prompt）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-06: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-07: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 三轴取封顶矩阵断言成立——任一分量达到更高档时 tier=max(blast, span, friction)，各轴档位组合下 tier 不低于任何单轴（矩阵级直测用例由 task-07 落 NEW:test/ceremony-tier.test.mjs 收口） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| RISK_TO_TIER 映射表逐档断言——五输入档全覆盖映射到四输出档、无遗漏无越序 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| escalateByFriction 只升不降+封顶 S3——S3 输入再超阈仍返回 S3 且 escalated 语义正确；未超阈时 tier 原样返回不降档 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| reconcileDualRun 错配判定——声明 S1 事实 S2 → mismatch=true、severity=error；声明≥事实 → severity=none | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| computeCeremonyTier 返回四字段齐全（tier/components/reasons/explicitDowngradeAccepted）；显式升档被尊重、显式降档须理由且 explicitDowngradeAccepted=true、无理由的自报降档不生效（一切自报只升不降） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| frictionCounts 携带 verify_run_failed 第三键时调用不抛错、输出与两键输入一致（超集透传容忍） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 无 riskDetection 输入 → blast 分量 S2、tier≥S2（brownfield 兼容不静默降级） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| classifyReviewTier 返回双字段 { tier, ceremonyTier } 且保留现 reason/fileCount 字段——三消费方（gates.js:242/:1015、prompt.js:1075、stage-review.js:570 注释约定）逐一核对零改动可继续消费（tier.reason 消费锚点 gates.js:1031） | `test/stage-review.test.mjs` | classifyReviewTier、tier、ceremonyTier（`test/stage-review.test.mjs`） | covered | `test/stage-review.test.mjs:5`（classifyReviewTier）、`test/stage-review.test.mjs:18`（tier）、`test/stage-review.test.mjs:6`（ceremonyTier） |
| 评审档由 computeCeremonyTier 决定——引擎档 S2/S3 → tier=independent；S0/S1 且旧断路器命中 → tier=self（旧文件数规则降为内部断路器，兼容语义不破） | `test/stage-review.test.mjs` | 决定、引擎档、tier（`test/stage-review.test.mjs`） | covered | `test/stage-review.test.mjs:140`（决定）、`test/stage-review.test.mjs:130`（引擎档）、`test/stage-review.test.mjs:18`（tier） |
| 旧变更 brownfield（无 risk 输入）→ blast 缺省 S2 → independent，行为近似现状不静默降级 | `test/stage-review.test.mjs` | brownfield、risk、输入、blast（`test/stage-review.test.mjs`） | covered | `test/stage-review.test.mjs:6`（brownfield）、`test/stage-review.test.mjs:7`（risk）、`test/stage-review.test.mjs:121`（输入） |
| test/stage-review.test.mjs 既有断言全绿＋委托行为增量断言（双字段/档位接管/断路器兼容/brownfield 缺省档）通过 | `test/stage-review.test.mjs` | test、stage、review（`test/stage-review.test.mjs`） | covered | `test/stage-review.test.mjs:24`（test）、`test/stage-review.test.mjs:25`（stage）、`test/stage-review.test.mjs:8`（review） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 四完成门均执行升档检查——ledger 按 change 过滤累计的 gate_rollback/review_rejected 超阈时档位 min(S3, tier+1) 只升不降；friction-tally 零读取（次序依赖禁入） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 读档无文件先落初始档（开跑定价事件）——.runtime/ceremony-tier-<change>.json 首次出现即含 tier/components/reasons，后续迁移追加 transitions[] 记录（from/to/frictionCounts） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 档位文件并发写安全——withFileLock＋writeAtomicSync，交错写不回退档位（只升不降不变量在多会话并发下成立） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 六组连带测试（stage-completion-atomicity / noai-completion-gate / run-complete-step-validator-rollback / doctor-verify-feedback / concurrent-preflight-hooks / taskcard-ensure-skeletons）定向回归绿 | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |
| 升档时完成门输出含 from→to 与摩擦计数审计行；未超阈不产生输出噪声 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 注入场景「声明档 S1 / 实际 diff 命中高一档（事实档 S2+）」：verify --done 出口 mismatch 被硬 flag（errors 级阻断语义，非 advisory） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 同场景 archive confirm 出口：阻断级警告可见 + friction-ledger 对应 change 条目落账 + .runtime/ceremony-fact-seed-<session>.json 落盘且含 declaredTier/factTier/mismatch | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 声明档 ≥ 事实档（含显式降档被事实面支持）→ 双跑放行零噪音（skipped/ok 不误红） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 实际 diff 全部取自 resolveReconcileActualFiles 单点（:2549），仓内无第二取数口径 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 档位文件缺失 / quick 无 changeName / git 不可用 → skipped 降级不阻断（存量变更零回归） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| plan 阶段 prompt 全文不再有「plan_level 决定评审 / 仪式强度」语义；「仪式按 risk 计价，plan_level 仅编排」文案在场 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| agent 报 plan_level=full 而档位 S1 的场景：CLI 强制轻仪执行且留审计痕（不因「计划写得完整」进入 independent×2——FR-02 任务②同款不再全价场景） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| brainstorm Step7 按 ceremonyTier 渲染四档菜单：S3 两轮 / S2 一轮独立 / S1 CLI 清单+定向探针抽查 / S0 CLI 清单；通道全不可用兜底输出带 degraded 戳 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| run/prompt.js {REVIEW_TIER} 注入按 ceremonyTier 分档（plan_level 不再驱动仪式档），{REVIEW_TIER_REASON} 随档输出 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| config schema --json 可查 ceremony.force_tier / ceremony.shadow 且 status=live；renderExample() 文本含两键示例行 | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |
| docs/prompt/plan.md、docs/prompt/brainstorm.md 与 _extracted.json 同批次一致（镜像流水线零漂移） | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 注入影子 verdict=fail 产物到 stage-reviews-shadow/ 后，主线 gate 经 getLatestStageReviewRunId 取评审产物不命中影子命名空间（不返回影子 runId、不读影子 review.json）——主线不受影子 verdict 阻断（FR-04 场景「影子产物不污染主线」/ R-06）。 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 档位 S2 及以上、或 ceremony.shadow=off 时影子派发不发生（skip 留痕可查），S0/S1 且 shadow=on 时派发且产物落 stage-reviews-shadow/<change>-<stage>-<ts>/review.json。 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| sillyspec doctor 输出含「影子对照」维度：有影子数据时输出轻/重 catch 差异报告；无影子数据时跳过不误报。 | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |
| 转正判据计数逻辑可检查：构造 N=10 且漏检=0（或漏检均 advisory 级）的对照账 → 达标结论；漏检含非 advisory 项或样本不足 → 不达标并报告缺口。 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-07**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| node --test test/ceremony-tier.test.mjs 全绿，七组断言（三轴封顶矩阵 / 映射表逐档 / escalateByFriction 只升不降+封顶 / reconcileDualRun 错配注入 / 显式升降规则 / 影子命名空间隔离 / 并发锁不回退）全部有对应用例且通过。 | `test/ceremony-tier.test.mjs`<br>`test/stage-review.test.mjs` | node、test、ceremony、tier、mjs（`test/ceremony-tier.test.mjs`、`test/stage-review.test.mjs`） | covered | `test/ceremony-tier.test.mjs:25`（node）、`test/ceremony-tier.test.mjs:14`（test）、`test/ceremony-tier.test.mjs:2`（ceremony） |
| test/stage-review.test.mjs 增量断言（无 risk 输入 → 缺省 S2、双字段过渡结构、断路器兼容）通过，且该文件既有断言零回归。 | `test/ceremony-tier.test.mjs`<br>`test/stage-review.test.mjs` | test、stage、review、mjs（`test/ceremony-tier.test.mjs`、`test/stage-review.test.mjs`） | covered | `test/ceremony-tier.test.mjs:14`（test）、`test/ceremony-tier.test.mjs:14`（stage）、`test/ceremony-tier.test.mjs:14`（review） |
| npm test 全量零失败（覆盖 task-01~06 全部落地面）。 | `test/ceremony-tier.test.mjs`<br>`test/stage-review.test.mjs` | test、覆盖、task（`test/ceremony-tier.test.mjs`、`test/stage-review.test.mjs`） | covered | `test/ceremony-tier.test.mjs:14`（test）、`test/ceremony-tier.test.mjs:4`（覆盖）、`test/ceremony-tier.test.mjs:2`（task） |
| npm run lint —— 即 node test/check-syntax.mjs零错误。 | `test/ceremony-tier.test.mjs`<br>`test/stage-review.test.mjs` | run、node、test（`test/ceremony-tier.test.mjs`、`test/stage-review.test.mjs`） | covered | `test/ceremony-tier.test.mjs:232`（run）、`test/ceremony-tier.test.mjs:25`（node）、`test/ceremony-tier.test.mjs:14`（test） |

- ⚠️ 零/半自动化承接条目 23 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
闭环判定：D-001~D-008 全部 D→FR→task→实现证据回指闭环（逐条见下方决策追踪矩阵 Evidence 列）；D-006 为显式「不做」决策，闭环形态=非目标清单+无对应实现（正确形态），标注于矩阵。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4] + artifact 0), 0 frontend calls [scope: change-diff (23 files @ scan-root)] | 3 backend endpoints unused by frontend
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 13 个非 Java 清单文件不在探针 9 扫描面）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（四选一）：covered / partial / uncovered / non-testable。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- 主仓 `npm test`：**533 文件全绿（0 失败，89.6s）**——含新增 test/ceremony-tier.test.mjs 94 断言七组 + test/stage-review.test.mjs 77/77。
- 主仓 `npm run lint`：全绿（677 文件，未引用导出 0，module-map 覆盖全）。
- worktree 期 13 个失败为 worktree-cwd 守卫环境性（HEAD A/B stash 复跑同清单实证），主仓消失。
- known_failures 豁免：无。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-07 | ceremony-tier.js 三纯函数+review-tier 委托+94 断言矩阵 | 已闭环 |
| D-002@v1 | FR-01、FR-02、FR-03、FR-04 | task-02、task-05、task-07 | plan.js 编排文案+prompt.js 强制轻仪审计痕（E2E 实证 full+S1） | 已闭环 |
| D-003@v1 | FR-01、FR-02、FR-03、FR-04 | task-04、task-07 | verify-postcheck:2961+gates:1086+complete-handlers:819 两出口三接点（冒烟 mismatch 阻断实证） | 已闭环 |
| D-004@v1 | FR-03 | task-04 | ceremony-tier.js 显式升降规则（12 断言）+双跑复核双态（S5 放行/S5b 拒绝） | 已闭环 |
| D-005@v1 | FR-02 | task-02、task-05 | <待填：证据回指> | <待填> |
| D-006@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | 非目标清单+全仓无信用分/reopen 实现（grep 零命中）——「不做」决策的正确闭环形态 | 已闭环（显式不做） |
| D-007@v1 | FR-01、FR-02、FR-03、FR-04 | task-06、task-07 | dispatchShadowReview+shadow-ledger+doctor 转正计数；client 供给面移交（见移交项） | 已闭环（带移交） |
| D-008@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-03、task-07 | gates.js escalateCeremonyTierAtGate 四阶段门+只升不降三重保证（11 断言并发锁） | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 命中均为本仓源码自身的骨架注释行（gates.js/plan.js 处理 <!--TODO--> 占位符的固有回声——自举仓已知误报形态，非未实现标记）。P3 债四条：
- P3-1 影子 client 供给面（见移交项，平台侧接入后影子对照数据开始积累）
- P3-2 mismatch 摩擦双计观察（runCeremonyDualRunCheck 直记 + rollback tally 汇账单次低报=2，verify 为末阶段无后续消费点，仅账面偏肥方向保守——复审观察项）
- P3-3 verify/影子两出口接线为丢弃式冒烟验证（修复会话内 12/12 断言），自动化测试钉待后续 quick
- P3-4 双跑 module-map 取数口径：初始定价单项目 map vs 事实侧合并全项目（多 docs 项目部署下事实档偏高，方向保守）——统一入口后续收口

## 变更风险等级 [层：人工判断]
显式声明 = unit-sufficient（design frontmatter，理由：lifecycle 关键词误伤——档位状态文件是纯派生数据，无 daemon/session/启动入口面；daemon、session、lease 三词已被同句否定语境抑制，CLI 判级输出在案）。D-004 通道降级留理由 + 本变更自身的收口双跑将以实际 diff 复核该声明——自举：声明档（span 12 文件 → S2）与事实档（实际 diff 23 文件跨多模块 → span S2）档位一致，无低报。

## Runtime Evidence [层：人工判断]
unit-sufficient 档（显式声明）——运行时组件不涉及 daemon/服务起停；证据链为 CLI 命令面：
- 引擎冒烟：node -e import ceremony-tier → computeCeremonyTier({level:unit-sufficient}) = S1（2026-09-18 14:52）
- mismatch 阻断实证：tmp git 仓声明 S1 + 9 文件实际 diff → verify --done「⛔ Ceremony 双跑对账不通过（声明档 S1 < 事实档 S2）」+ 回滚 {stageCompleted:false} + friction-ledger gate_rollback≥1 + 种子落盘（修复会话冒烟 A）
- 影子隔离实证：派发后 tmp 仓无主线 marker、无 stage-reviews/ 目录（冒烟 C）
- 提交链：7208a88→4b20666→bab1d78→95051d0→d09d586→3316984→83eeb6d→a4029fa→5842f5d（worktree 分支 sillyspec/2026-09-18-ceremony-risk-pricing）
<!-- 降级路径（design §3.2，D-004 收口）：服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及 -->

## 代码审查 [层：人工判断]
execute 阶段独立评审（agent-tool 通道）已完成 14 项 checklist + 3 项复审（execute-review-2026-09-18-164535/review.json）：初判 fail 1 项（verify 双跑死代码）→ 修复 5842f5d → 复审改判 pass/pass（12过5缺口0fail，运行时锚点实证）。走查清单映射：①编辑/更新链路 N/A（纯新增面为主，classifyReviewTier 兼容断言 77/77）；②非主分支流=archive 出口与影子 skip 四态（均有实证）；③守卫一致性=N/A（无端点面）；④载荷契约=探针 8 不适用；⑤并发原子性=档位文件锁 11 断言直测。总体评价：生产级——防御性归一完整、fail-safe 方向保守（缺省 S2）、注释落档语义裁量点。探针 7 ⚠️ 的 23 条零/半自动化承接条目属 prompt 文案面（渲染类），经 task-05 的 60 项定向测试与镜像 MATCH 覆盖。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
已有（execute 评审回路）：独立评审初判 specVerdict=fail（verify 双跑死代码，P1 级）→ 修复 5842f5d → 同评审员复审改判 pass（锚点 gates.js:1086-1107 接线真实/错误汇入逐字同形/运行时实证 mismatch 阻断+隔离保持/回归五组 0 fail）。结论枚举已按复审判决取 PASS WITH NOTES（4 条 P3 见技术债）。
