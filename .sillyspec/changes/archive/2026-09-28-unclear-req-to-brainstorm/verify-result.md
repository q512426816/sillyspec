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

<!--AGENT:槽1/3 结论枚举——替换上行占位，槽行格式勿改（gate 判定消费面） -->
结论枚举：PASS WITH NOTES —— FR-01/02/03 全探针实测通过（三件新测试真实 CLI 子进程级实证＋模板 grep/temp dir 手跑 init v3.31.0 传播走查），全量回归 221/221 绿；唯一 lint 失败项为存量债（src/verify-postcheck.js stripNestedTestEnv，并行变更 43e75370 面，不在本变更 cb6fc0a0 diff 内），非本变更义务，如实记录并移交。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
<!--AGENT:槽2/3 移交项——按需增行；结论=PASS/FAIL 时本表写「无」 -->
| other | lint 存量债：src/verify-postcheck.js export `stripNestedTestEnv` 未引用（22e-b 死码门）——并行变更 43e75370 面，文件不在本变更 cb6fc0a0 diff 内 | 由该并行变更收口时清偿（补引用或删导出）；清偿后 `npm run lint` 退出码 0 即闭环，本变更无需复跑 |
| other | 仓根 AGENTS.md 仍为 v3.30.0 完整态——init 四态幂等 4b 分支设计行为（完整态不覆盖、仅 stderr 提示保留用户改动，src/init.js:216-219），非缺陷 | 如需新模板：备份后删除 AGENTS.md 再跑 `sillyspec init`（temp dir 已实测 v3.31.0 生成新选道表传播面） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（verify-required-evidence.json 不存在——execute Task Review Gate 已于 2026-09-26-task-review-retire 退役停写，无 cannot_verify 任务）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（tier=S2 非 integration/deployment-critical；实测证据链见「Runtime Evidence」节）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
<!-- MACHINE-DRAFT:task-completion:248fce88fefa438d2cfaa91e0696b716099da38f3ffd6dc89503438c74a616e1:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
客观任务完成度（真相源 = review.json verdict，runId=exec-2026-09-28-181042-f2fe2c）:
- 总任务：5
- 已通过（spec + quality verdict 均非 fail）：0
- 未通过 / 缺失：5
- 未完成列表:
  - task-01: review.json 缺失（task 未走完 execute 评审）
  - task-02: review.json 缺失（task 未走完 execute 评审）
  - task-03: review.json 缺失（task 未走完 execute 评审）
  - task-04: review.json 缺失（task 未走完 execute 评审）
  - task-05: review.json 缺失（task 未走完 execute 评审）
注：以 review.json verdict 为准；plan.md checkbox 仅作显示态（回填断裂时会与客观 verdict 不一致，以下方客观点为准）。
- 总任务：5；已完成（review verdict 口径）：0
- 未完成：task-01（review.json 缺失（task 未走完 execute 评审））、task-02（review.json 缺失（task 未走完 execute 评审））、task-03（review.json 缺失（task 未走完 execute 评审））、task-04（review.json 缺失（task 未走完 execute 评审））、task-05（review.json 缺失（task 未走完 execute 评审））
<!-- MACHINE-DRAFT:task-completion:end -->


## 设计一致性 [层：人工判断]
<!--AGENT:槽3/3 审查叙述——设计偏差（无偏差显式写「一致」）+ 技术债务叙述（探针 1 统计已机器预填在「技术债务」节）；替换下方 TODO 注释为正文 -->
<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->
设计一致性：一致（除两处执行期裁决——均已按规程落档 decisions.md，非未声明偏差）：
- D-006@v1：testFailures 数据源由卡面「flow-state substeps」改读 .runtime/verify-runs 记录面（src/route-hindsight.js:160-174）——根因：flow-state 无失败计数面（substeps 恒为 done 标记），同为既有记录面、封闭面语义不变；归属计数口径测试钉住（test/route-hindsight.test.mjs:66-69：他变更/通过记录不计）
- D-007@v1：门检索查询串取 decisions.md 全部当前条目（非「自上轮新增」——D 条目模板无时间戳，无机械锚点）；超集命中面由 warn 不阻断＋rejected 优先＋knowledge-gate 开关三层降噪兜底（src/run/complete.js:470-477）
- design.md 接口定义块 verify 期补遗：第四导出 snapshotBaseline 签名与「本变更接口面：0 端点」声明行（机制在 design 正文「基线快照来源」段与任务卡已覆盖，纯文档对齐——执行审查员 note 清偿）

任务完成度补充叙述（机器段客观 verdict 面 review.json 缺失系 Task Review Gate 退役后预期空面，完成证据以提交面＋测试面替代）：5/5 完成——tasks.md 全勾；交付提交 cb6fc0a0（10 文件 +882/-9）覆盖全部 5 任务文件面。task-01 src/route-hindsight.js（四导出 :94/:122/:188/:226＋阈值常量 :40）＋8 用例全绿；task-02 src/stages/brainstorm.js:210/:238 检索固定动作句（test/design-knowledge-check.test.mjs:133-146 ④ 断言在场）；task-03 src/flow.js:560-562/:556/:1196-1210＋6 用例全绿（含端到端 FR-02 回路）；task-04 src/run/complete.js:454-500＋src/config-schema.js:77＋门用例 4 项全绿；task-05 templates/agents-instruction.md＋package.json 3.31.0＋verify 期实测走查全过（见「代码审查」节）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->
逐关键词 grep 实现面，全部命中：
- 「选道自检／还有没有必须问用户才能动手的问题」→ src/flow.js:560-562（新建路径渲染段，纯提示不阻断）
- 「疑似该走预段未走／route-hindsight.json」→ src/route-hindsight.js:48（MARK_FILE）、:226-234（readHindsightHint「疑似」文案）、src/flow.js:1208（标记 warn）
- 四导出（snapshotBaseline/computeHindsightMetrics/markHindsight/readHindsightHint）→ src/route-hindsight.js:94/122/188/226
- 阈值常量（重写比 0.5/改写率 0.6/盲维 2/实测失败 2，可调）→ src/route-hindsight.js:40-45（HINDSIGHT_THRESHOLDS 导出常量）
- 「knowledge search --query／命中必读」→ src/stages/brainstorm.js:210（Step4）、:238（Step5）、templates/agents-instruction.md:29
- 「knowledge-gate 逃生阀（缺省开）」→ src/config-schema.js:77（schema 登记）、src/run/complete.js:464-468（local.yaml 开关解析，缺省 true）
- 「重写比/改写率/盲维/实测失败」封闭面口径 → src/route-hindsight.js:18-31（口径注释）＋computeEditRatio 复用（src/flow-draft.js:574，纯 LCS 行 diff 零语义）
- 版本 bump 传播 → package.json:3 version 3.31.0＋src/init.js:171-219（AGENTS.md 四态幂等版本感知机制既有面不动）

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ⚠️ task-02: 模块目录（src/stages）递归未找到测试文件（含 co-located tests/）
- ✅ task-03: 模块目录（src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-04: 模块目录（src/run、src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ⚠️ task-05: 模块目录（templates）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 四指标均为数字/计数输出，模块内无任何关键词匹配逻辑（D-003） | `test/route-hindsight.test.mjs` | — | covered | 人工核验：src/route-hindsight.js 全文零词表/关键词匹配——比例＝computeEditRatio 纯 LCS（src/flow-draft.js:574-587）、blindDims＝dimensionNotes==='finding' 枚举计数（src/route-hindsight.js:156）、testFailures＝verify-runs status 记录计数（:164-173）；`test/route-hindsight.test.mjs:80-105` 反例（真实形态回放 FP=0）钉住 |
| 指标超阈 → hindsight.json 落库字段齐全；无超阈 → 不落库（marked:false） | `test/route-hindsight.test.mjs` | hindsight、json、无超阈（`test/route-hindsight.test.mjs`） | covered | `test/route-hindsight.test.mjs:2`（hindsight）、`test/route-hindsight.test.mjs:33`（json）、`test/route-hindsight.test.mjs:9`（无超阈） |
| readHindsightHint 无文件返回 null | `test/route-hindsight.test.mjs` | readHindsightHint、null（`test/route-hindsight.test.mjs`） | covered | `test/route-hindsight.test.mjs:10`（readHindsightHint）、`test/route-hindsight.test.mjs:10`（null） |
| test/route-hindsight.test.mjs 全绿（node --test） | `test/route-hindsight.test.mjs` | test、route、hindsight、mjs（`test/route-hindsight.test.mjs`） | covered | `test/route-hindsight.test.mjs:2`（test）、`test/route-hindsight.test.mjs:2`（route）、`test/route-hindsight.test.mjs:2`（hindsight） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| Step 4/Step 5 渲染文本均含检索固定动作句（含 knowledge search --query 用法与「命中必读」字样） | 无归属测试——判定大概率 uncovered | — | covered | `test/design-knowledge-check.test.mjs:133-146`（④ 指引文案在场：getStageSteps 断言 Step4/5 prompt 含 knowledge search --query／命中条目必读／rejected／举例非机制）——预填归属面漏配，实有承接 |
| 例词以「举例」身份出现，不构成封闭清单 | 无归属测试——判定大概率 uncovered | — | covered | `test/design-knowledge-check.test.mjs:143`（断言 /举例非机制/）＋src/stages/brainstorm.js:210、:238（「例词为举例非机制，不构成封闭清单」在场） |
| 既有 stage 测试（execution-mode-render 等）不破 | 无归属测试——判定大概率 uncovered | — | covered | 全量 `npm run test:core` 221/221 绿含全部既有 stage 渲染系测试（log: .sillyspec/.runtime/logs/verify-testcore-full.log） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 新建变更输出含「选道自检」固定段；adopt（src/flow.js:351 分支）/resume（src/flow.js:437 printRecoveryBriefing）输出不含 | `test/flow-clarity-probe.test.mjs` | 选道自检、固定段、adopt、src（`test/flow-clarity-probe.test.mjs`） | covered | `test/flow-clarity-probe.test.mjs:6`（选道自检）、`test/flow-clarity-probe.test.mjs:6`（固定段）、`test/flow-clarity-probe.test.mjs:7`（adopt） |
| 清晰度门既有 exit 2 文案逐字不变（src/flow.js:447-453） | `test/flow-clarity-probe.test.mjs` | exit、src、flow（`test/flow-clarity-probe.test.mjs`） | covered | `test/flow-clarity-probe.test.mjs:8`（exit）、`test/flow-clarity-probe.test.mjs:8`（src）、`test/flow-clarity-probe.test.mjs:2`（flow） |
| flow done 收口指标接线 best-effort（异常仅 warn 不阻断收口） | `test/flow-clarity-probe.test.mjs` | flow、done、收口指标接线、best、effort（`test/flow-clarity-probe.test.mjs`） | covered | `test/flow-clarity-probe.test.mjs:2`（flow）、`test/flow-clarity-probe.test.mjs:10`（done）、`test/flow-clarity-probe.test.mjs:2`（收口指标接线） |
| test/flow-clarity-probe.test.mjs 全绿 | `test/flow-clarity-probe.test.mjs` | test、flow、clarity、probe、mjs（`test/flow-clarity-probe.test.mjs`） | covered | `test/flow-clarity-probe.test.mjs:2`（test）、`test/flow-clarity-probe.test.mjs:2`（flow）、`test/flow-clarity-probe.test.mjs:2`（clarity） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 方案步 --done 命中库内条目时输出含命中摘要与 evidence 提示；不阻断、不要求改写 | `test/design-knowledge-check.test.mjs` | 方案步、done、evidence、提示（`test/design-knowledge-check.test.mjs`） | covered | `test/design-knowledge-check.test.mjs:2`（方案步）、`test/design-knowledge-check.test.mjs:2`（done）、`test/design-knowledge-check.test.mjs:7`（evidence） |
| 无命中 / 开关关闭时输出与现状一致 | `test/design-knowledge-check.test.mjs` | 无命中（`test/design-knowledge-check.test.mjs`） | covered | `test/design-knowledge-check.test.mjs:9`（无命中） |
| 复用既有检索匹配器（不新写匹配逻辑） | `test/design-knowledge-check.test.mjs` | — | covered | 人工核验：src/run/complete.js:480 `matchKnowledge` 自 ../knowledge-match.js 动态导入复用（既有匹配器零新写）；`test/design-knowledge-check.test.mjs:17-19` harness 直调 completeStep 全链路实证 |
| test/design-knowledge-check.test.mjs 全绿 | `test/design-knowledge-check.test.mjs` | test、design、knowledge、check、mjs（`test/design-knowledge-check.test.mjs`） | covered | `test/design-knowledge-check.test.mjs:2`（test）、`test/design-knowledge-check.test.mjs:2`（design）、`test/design-knowledge-check.test.mjs:2`（knowledge） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 选道表第 1 行含前提式自检表述；第 2 行负面信号带「举例」标注 | 无归属测试——判定大概率 uncovered | — | non-testable | 文档/模板面无自动化测试面；verify 期实测走查：templates/agents-instruction.md:9 第 1 行「自检通过才走——……能不假思索答『无』且成功标准可直书，才走本行」、:10 第 2 行「负面信号举例——举例非机制、非封闭清单」 |
| 模板全文不再含「勿自行重复检索」 | 无归属测试——判定大概率 uncovered | — | non-testable | 实测走查：grep -c 勿自行重复检索 templates/agents-instruction.md ＝ 0；:29 已改写为「入口注入不覆盖设计时点——……主动检索……方案步 --done 门也会自动检索回显命中」 |
| package.json version 为 3.31.0 | 无归属测试——判定大概率 uncovered | — | non-testable | 实测走查：package.json:3 `"version": "3.31.0"`（cb6fc0a0 diff 3.30.0→3.31.0） |
| init 幂等逻辑在版本提升后可刷新既有仓 AGENTS.md（手跑 init 自验或引用既有测试） | 无归属测试——判定大概率 uncovered | — | covered | 手跑 init 自验（temp dir 2026-09-28，exit 0）：AGENTS.md 头部 `<!-- SillySpec v3.31.0 … -->`、含「自检通过才走」1 处、「勿自行重复检索」0 处、「主动检索」1 处；机制面 src/init.js:171-219 四态幂等（本变更未触碰的既有面） |

- ⚠️ 零/半自动化承接条目 9 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节
  → 9 条已逐条显式走查：task-02 三条实有测试承接（改判 covered，归属预填漏配）；task-05 四条为文档/配置/机制面，全部实测走查通过（模板 grep＋version 核对＋temp dir 手跑 init）；task-01/task-04 两条 partial 已人工核验源码补证改判 covered。走查明细见「代码审查」节。

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->
7 条决策全部闭环，无 P0/P1 unresolved/blocking（D-003 为 rejected 禁区声明，非未决）；无 superseded 决策被下游引用。逐条证据见「决策追踪矩阵」Evidence/状态列。两处执行期裁决（D-006/D-007）FR/Task 列机器映射「未映射」系解析面局限——实况 impacts 声明在档（D-006: [FR-02, task-01]、D-007: [FR-03, task-04]），证据列已人工回指闭环。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4] + artifact 0), 0 frontend calls [scope: change-diff (16 files @ scan-root)] | 0 backend endpoints unused by frontend (+3 stock noise collapsed)
- ⚠️ 0 个本变更端点前端未调用（warning 不阻断）：
- ℹ️ 另有 3 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 10 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（6 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）
#### 探针 12：UI 视觉证据（分级门）
<!-- 口径注记：在场性检查非语义审计——只验 visual-evidence.md 存在非空与降级裁决留痕，不判对照结论对错（语义面归 verify-result 人工判断层）。证据应在执行时按 flow start「UI 变更执行须知」随手产生；本探针不要求收口现做。分级：缺证据默认 ⚠️（local.yaml ui_visual_gate=error 升阻断）；视觉降级无「用户裁决」留痕恒 ❌（off 豁免）。 -->
- ⚠️ 变更目录缺 visual-evidence.md（渲染对照证据应在执行时随手落盘——收口只验在场不产新证据）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态（可复制样例）：design接口表#POST /api/xx（# 后必须 METHOD /path，仅表名/行号/散文描述不计命中）、权限矩阵[admin×读]、契约表@任务卡字段清单、DDL@users.id、载荷@e2e_body.json（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
| 端点 | 判定 | 用例依据 ID | 结果 | 证据 |
|---|---|---|---|---|
| 本变更接口面：0 端点（agent 声明） | non-testable | design接口定义@route-hindsight.js 模块契约（verify 期已补 0 端点声明行＋snapshotBaseline 第四导出） | 模块导出面全数测试承接 | 无 HTTP 端点（纯 CLI 内模块）；四导出由 `test/route-hindsight.test.mjs:47-58`（快照首写者胜）、:60-78（指标四元组）、:127-146（阈值/落库）、:166-181（hint 读取）逐导出直调断言；flow.js/complete.js 接线面由 `test/flow-clarity-probe.test.mjs`、`test/design-knowledge-check.test.mjs` 承接 |
<!-- 解析零行降级（D-005）：接口面以 agent 声明为准（对账分母=声明数）；声明与实际不符时补 design 接口段表格后重跑 --init --force 重生成本段（quick-B：--force 才有刷新通道，手填内容会重置先备份） -->
<!-- advisory 尾注（warning 计算归 validator，本段只留位）：有消费端未填子行的端点将列于此（advisory——消费端归类=design 清单启发式，数据面 facts.consumerHints）；写端点（POST/PUT/DELETE/PATCH）未在权限矩阵段声明的将列于此（advisory——补行或显式豁免「无权限约束」，数据面 facts.apiFace.writeEndpoints；表缺行会让派生框架继承你的洞） -->

## 测试结果 [层：确定性检查——CLI 实测对账]
<!-- MACHINE-DRAFT:test-result:52961d144e0275f58a0cb7bfb1b7a681bf9a1cc547d5ec325eec3babd7eb0cb8:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
- ♻️ noAI 质量扫描实测记录复用（代码指纹匹配）：`module[]+deps(js18)+fr(17)` — 通过
- 实测于 2026-09-28T11:29:07.944Z，耗时 29s
- verify `--done` 门与本文对账同源（P2 账本 > 扫描记录 > 亲跑）——正文与门结论冲突时以门为准并在此说明差异
<!-- MACHINE-DRAFT:test-result:end -->


## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- MACHINE-DRAFT:decision-chain:9a8b804faddc58912735c0bb88428c73aed696259cb25f0cd5f03026c7b07295:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
- 决策链机械半边：7 条决策 × 5 张 task 卡（D→FR→Task 自 decisions.md × tasks/*.md frontmatter 构建）
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02 | task-01、task-03、task-05 | 双轮落实：判断面 templates/agents-instruction.md:9-10 前提式自检＋负面信号举例；行为面 src/flow.js:560-562 前门盘问＋:1196-1210 事后指标接线；清晰度门 exit 2 面零触碰（test/flow-clarity-probe.test.mjs:132-147 逐字断言） | 已闭环（accepted，无未决） |
| D-002@v1 | FR-01、FR-02 | task-03 | run 族选道入口零改动实证：cb6fc0a0 diff 文件清单无 run 族入口文件（complete.js 为 stage 推进门）；adopt/resume 无自检段（test/flow-clarity-probe.test.mjs:103-130） | 已闭环（accepted，无未决） |
| D-003@v1 | FR-02 | task-01 | rejected 落实为禁区：src/route-hindsight.js 全封闭面（computeEditRatio 纯 LCS＋contentSurface 结构过滤:57-73＋枚举计数:156/:164-173，零词表）；FP=0 反例钉住（test/route-hindsight.test.mjs:80-105） | 已闭环（rejected 禁区未被违反） |
| D-004@v1 | FR-03 | task-02、task-04 | 三件套落实：指引面 src/stages/brainstorm.js:210/:238；机器面 src/run/complete.js:454-500 门检索回显（warn 不阻断）；速查行 templates/agents-instruction.md:29；命中/无命中/开关三态测试全绿（test/design-knowledge-check.test.mjs:65-131） | 已闭环（accepted，无未决） |
| D-006@v1 | ⚠️ 未映射（实况 impacts [FR-02, task-01] 在档，机器半边解析局限） | ⚠️ 未闭环（无 task 回指）→ task-01 | src/route-hindsight.js:160-174 verify-runs 归属计数（change 字段＋status='failed' 枚举）；归属口径测试钉住（test/route-hindsight.test.mjs:66-69：通过/他变更记录不计）；flowState 仅随 raw 留档（:176-178） | 已闭环（accepted，执行期裁决已落档） |
| D-007@v1 | ⚠️ 未映射（实况 impacts [FR-03, task-04] 在档，机器半边解析局限） | ⚠️ 未闭环（无 task 回指）→ task-04 | src/run/complete.js:470-477 查询串＝--output 全文＋decisions.md 全部条目标题/question 拼串（4000 字帽）；仅条目命中用例钉住（test/design-knowledge-check.test.mjs:84-104） | 已闭环（accepted，执行期裁决已落档） |
| D-005@v1 | FR-01、FR-02 | task-01、task-03 | 方案Ⅱ全貌落实：前门纯提示不阻断（test/flow-clarity-probe.test.mjs:67-77 exit 0）；事后闭环端到端（:149-203 超阈落库→下次 start 点名「疑似」）；无硬门/无声明 flag/无新 exit 2（拒绝面不渲染自检段 :145-146） | 已闭环（accepted，无未决） |
- Evidence / 状态两列是人工判断（机器不代笔）——逐格复核，未闭环行在「审查叙述」槽标注风险
<!-- MACHINE-DRAFT:decision-chain:end -->


## 技术债务 [层：人工判断]
<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->
- 本变更面：探针 1 零命中（design 清单文件无 TODO/FIXME/HACK/尚未实现标记）；cb6fc0a0 新增代码无技术债标注
- 存量债 1 项（非本变更面，移交项已登记）：src/verify-postcheck.js export `stripNestedTestEnv` 未引用（22e-b 死码门，并行变更 43e75370 面）

## 变更风险等级 [层：人工判断]
<!-- MACHINE-DRAFT:risk-level:24ccfd491f34bf896a53d7fc6608c1e7d3027f572b7ac8bae499a2792aba7077:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
- 机器判级：tier=S2（design.md 无显式 risk_level 声明）
- 未命中 evidence:true 声明危险面——无集成证据链硬要求（「集成验证回执」节机器判「无」）
- 判级输入：design 文件清单 × blast 声明（同 verify 门 evaluateConclusionDraft 口径；判定被新事实推翻时在「审查叙述」槽说明）
<!-- MACHINE-DRAFT:risk-level:end -->


## Runtime Evidence [层：人工判断]
<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->
- 交付提交：cb6fc0a0（2026-09-28 19:14 +0800，10 文件 +882/-9：src/route-hindsight.js 新增 240 行、src/flow.js +49、src/run/complete.js +48、src/stages/brainstorm.js ±12、src/config-schema.js +2、templates/agents-instruction.md ±6、package.json 版本、三件新测试 532 行）
- `npm run test:core` exit 0：221/221 pass（2026-09-28，log: .sillyspec/.runtime/logs/verify-testcore-full.log，tail「ℹ tests 221 / ℹ pass 221 / ℹ fail 0」）
- CLI verify 隔离快照实测：`module[]+deps(js18)+fr(17)` exit 0（2026-09-28T11:29:07Z，29s，记录面 .runtime/verify-runs/20260928112933/）
- `npm run lint` exit 1：唯一失败项存量 stripNestedTestEnv（log: .sillyspec/.runtime/logs/verify-lint.log；advisory 豁免留痕 SILLYSPEC_VERIFY_LINT_GATE=advisory，tally: .runtime/verify-lint-tally.json；gate 零交集降档放行）
- 手跑 init 实测（temp dir，2026-09-28）：exit 0；生成 AGENTS.md 头部 `<!-- SillySpec v3.31.0 … -->`；grep「自检通过才走」1 处、「勿自行重复检索」0 处、「主动检索」1 处
- 模板/版本盘面：templates/agents-instruction.md:9-10 前提式＋举例标注；package.json:3 `"version": "3.31.0"`
- 长驻服务/端点/请求响应/生命周期终态：不涉及（无 daemon/session/lease 面——design 生命周期契约表声明）

## 代码审查 [层：人工判断]
**问题列表：无 P1/P2 发现；P3 观察项 1 条（见末尾）。总体评价：实现质量高——三层分工（机械层封闭面/判定层归 agent/门禁层 warn 不阻断）严格落地，测试为真实 CLI 子进程级而非 mock 级，反例（FP=0、CRLF、首写者胜、损坏 JSON、best-effort 异常路）覆盖充分。**

零覆盖路径显式走查（探针 7 ⚠️ 9 条定向面）：
- ① 编辑/更新链路：快照首写者胜幂等（src/route-hindsight.js:98 已存在不覆盖——resume 重入不刷快照；test/flow-clarity-probe.test.mjs:88-115 adopt/resume 落快照断言）；hindsight 标记整文件覆盖幂等（断点续跑重入同值，test/route-hindsight.test.mjs:148-164）；amend-draft 留痕通道下机器段重锚不破坏快照口径（端到端用例 :183-184 走通）
- ② 非主分支流：adopt（收编时点快照——flow.js 注释「adopt 的 design 是头脑风暴产物」与行为一致）；resume（偏晚快照=少计早期改写，方向保守不误标，src/flow.js:429-434）；无标记仓（hint null → 头区逐字节一致，test/flow-clarity-probe.test.mjs:79-101 剥 hint 行逐字节比对）；旧版本起步在途变更（无快照=零信号不误标，test/route-hindsight.test.mjs:107-116）
- ③ 守卫一致性：本变更无同资源端点操作人校验面（纯 CLI 内模块）；门禁梯度一致——前门零阻断/后门 warn/knowledge-gate warn＋可关，与 D-005/D-004 故障面设计一致
- ④ 载荷字段契约：hindsight json schema 与 design 数据模型节逐字段一致（change/marked_at/metrics 四键/reasons[]），test/route-hindsight.test.mjs:148-164 deepEqual 钉住
- ⑤ 并发/原子性：writeAtomicSync 原子写（baseline/mark 两文件无半文件窗）；per-repo 单条 last-writer-wins——多会话并行 flow done 后写覆盖先写，提示语义「上个轻量变更」仍成立；verify-runs 遍历对损坏 JSON try/catch 跳过（:171）
- 接线正确性人工核验：complete.js 门块变量均在作用域（specBase src/run/complete.js:174、changeName 自 options:167、steps/currentIdx:197-200）；步名谓词「提出 2-3 种方案」与 src/stages/brainstorm.js:201 定义逐字一致；completeStepBurst（:1351）不挂门检索——burst 模式方案步收口零回显，与 stage.burst「一次下发全部步骤说明书」定位一致（warn 面不阻断，无功能损失，可接受面差非缺陷）
- knowledge-gate 开关解析（src/run/complete.js:464-468）：正则 ^\s*knowledge-gate\s*: 不受 # 注释行干扰（行首 # 不匹配）；commands: 段缩进可匹配。P3 观察项：local.yaml 将来若在非 commands 段出现同名异义键会误判——当前 config-schema 唯一键位登记（src/config-schema.js:77）下实际风险≈0，不改（结构化 YAML 解析超出本变更面）

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
无（本变更未安排独立复核子代理）
