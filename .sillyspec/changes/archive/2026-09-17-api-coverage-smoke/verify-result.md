# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——7/7 任务完成 review 全 pass；独立验收 QA 10/10 pass（1 低危 gap G-1 命中条件注入形态：静态渲染+文本内嵌条件，功能等价，design 侧追认见设计一致性节）；定向 57 tests+断言净增 76+lint 全绿（全量 npm test 留 CI 见测试结果节移交项）；移交项=全量 CI 回归（other 级 advisory）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| other | 全量 npm test 回归（用户指令留 CI，定向 57 tests+lint 已全绿） | CI 管道跑 npm test 全量——已知 13 个 worktree 环境性失败文件在主仓运行即绿（批次 A 同款实证） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（7/7 task review 全 pass，零 cannot_verify）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（本变更为 CLI 校验逻辑，判级 contract-required 显式声明非 integration/deployment-critical——机器段/commands.smoke 能力面向外部项目使用场景）

## 任务完成度 [层：人工判断]
- task-01 ✅（config-schema 登记+quality-scan 亲跑段+smokeResult additive，review pass）
- task-02 ✅（source 双形态提取+双侧分类器直判+ensure 注入+一致性对比，B-1 金路径闭合，review pass）
- task-03 ✅（smokeRan 五边界+第五条件 smoke-not-run 无豁免子句，review pass）
- task-04 ✅（parseDesignApiTable 五形态+骨架三态+facts 通道，review pass）
- task-05 ✅（validateApiCoverageMatrix 第 4 validator 全语义+注册，review pass）
- task-06 ✅（纪律段四段逐字+verify 键+矛盾文案改写+镜像全绿，review pass）
- task-07 ✅（断言净增 69→实测 76，定向 55/55 双径+lint 绿，review pass）

7/7 完成，零存疑

## 设计一致性 [层：人工判断]
主体一致（QA 验收 10/10 file:line 核验）。等效偏差：
1. **G-1 命中条件注入形态**：design §6「配 commands.smoke 或判级 critical 时渲染」→ 实现为静态无条件渲染+段首文本内嵌条件说明（stages/verify.js 第 8 条+checklist 首条自含）——理由自洽（静态导出 prompt 无运行时判级上下文，review-dispatch worker_prompt 单独消费须自含），功能等价，未命中场景多 5 行 prompt；**Reverse Sync 追认该形态**。
2. 白名单 PENDING_EXPORT_WHITELIST 5 条目已全部被测试引用但按其自身纪律可删未删（宽松侧无害，下次触及清理——QA N-2）。
3. resolveLog 绝对路径直读（change-risk-profile.js:65）——CLI 机器段 logPath 为绝对路径实录，join(cwd,abs) 拼破损路径，属机器段链路必要配套（QA N-3 追认）。
4. 执行期计划增补已同步 design/任务卡（acceptance-matrix-gate 链数行/check-syntax 白名单/verify-postcheck export 行/task-05 卡补 2 测试文件）——worktree assess 首跑 BLOCKED 的 allow 面缺口，补后 WARNING 放行。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stage-contract.js:750` // 证据槽 <TODO>；列表防御行（卡无 acceptance…）与不适用行无槽不计。
- ⚠️ `src/stage-contract.js:755` const MATRIX_EVIDENCE_TODO = '<TODO>'
- ⚠️ `src/stage-contract.js:790` * 行级证据口径：covered/partial 须非 TODO 且含测试锚点；non-testable 须非 TODO 且非空
- ⚠️ `src/stage-contract.js:797` if (verdict === 'non-testable') return false // 非 TODO 且非空即合规（理由一句话）
- ⚠️ `src/stages/verify.js:201` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 \`sillyspec verify-probes --change <change-name> --init\`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、
- ⚠️ `docs/prompt/verify.md:247` 4. 搜索技术债务：grep TODO/FIXME/HACK/XXX（仅限变更文件）
- ⚠️ `docs/prompt/verify.md:293` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 `sillyspec verify-probes --change <change-name> --init`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、探针
- ⚠️ `docs/prompt/_extracted.json:176` "prompt": "生成完整验证报告，并写入 verify-result.md。\n\n### 操作\n1. 汇总以上所有检查结果\n2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描关键词。本步骤 --done 时，CLI 会用 detectChangeR
- ⚠️ `docs/prompt/_extracted.json:269` "prompt": "根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。\n\n⚠️ 这一步是可选的。如果项目模块简单、流程不明显，可以跳过。\n\n### flows/ 目录\n目标目录：`{DOCS_ROOT}/flows/`\n\n根据 _module-map.yaml 中的模块依赖关系，识别跨模
- ⚠️ `docs/prompt/_extracted.json:490` "prompt": "对上一步生成的 plan.md 做审查。生成与审查分离——不在生成 plan 的同一上下文里自审，避免确认偏差。\n\n### 执行前确认门（plan_level=full 时）\nplan.md 审查通过后、进入 execute 前，若 plan_level=full（跨模块/大变更），必须先向
- ⚠️ `docs/prompt/_extracted.json:504` "prompt": "为 plan.md 中的每个任务生成紧凑 TaskCard。\n\n⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：\n- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan
- ⚠️ `docs/prompt/_extracted.json:547` "prompt": "加载计划、设计和代码库上下文。\n\n### 操作\n1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）\n2. 读取 design.md（技术方案）\n3. 读取 CONVENTIONS.md、ARCHI
- ⚠️ `docs/prompt/_extracted.json:609` "prompt": "对本次变更进行代码审查。\n\n### 执行方式\n本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。\n\n### 操作\n1. 检查 git diff 查看所有变更\n2. 审查要点：\n   - 代码风格是否符合 CONVENTIONS.md\n 
- ⚠️ `test/verify-probes-facts.test.mjs:96` *   - a.js 含 2 个 TODO 标记（probe1 可命中 2 条）；src/feature.js + co-located 测试（probe3 hasTest）；
- ⚠️ `test/verify-probes-facts.test.mjs:104` writeFileSync(join(dir, 'a.js'), 'console.log(1)\n// TODO: one\n// FIXME: two\n')
- ⚠️ `test/verify-probes-facts.test.mjs:173` { file: 'a.js', line: 3, content: '// TODO: one' },
- ⚠️ `test/verify-probes-facts.test.mjs:174` { file: 'b.js', line: 9, content: '// FIXME: two' },
- ⚠️ `test/verify-probes-facts.test.mjs:285` const r2 = { ...r1, probe1: { ...r1.probe1, matches: r1.probe1.matches.concat([{ file: 'c.js', line: 1, content: 'TODO' }]) } }
- ⚠️ `test/verify-probes-facts.test.mjs:349` const hijack = passFilled.replace(/<!--TODO: 测试命令 \+ 结果/, '测试输出出现 FAIL 字样（同形干扰）<!--TODO: 测试命令 + 结果')
- ⚠️ `test/verify-probes-facts.test.mjs:378` assert(PROBE1_HIT_LINE_RE.test('- ⚠️ `src/a.js:9` // TODO: x'), 'PROBE1_HIT_LINE_RE 命中反引号 file:line 形态')
- ⚠️ `test/acceptance-matrix-gate.test.mjs:9` *    - covered/partial 缺锚点 → missingEvidence；non-testable 空/<TODO> 理由 → missingEvidence；
- ⚠️ `test/acceptance-matrix-gate.test.mjs:10` *      uncovered 无证据要求（<TODO> 不计）
- ⚠️ `test/acceptance-matrix-gate.test.mjs:63` '| 未承接声明 | 无归属测试 | — | uncovered | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:88` assert(r.missingEvidence === 0, `uncovered 行 <TODO> 证据不计 missingEvidence；covered/partial 锚点齐、non-testable 有理由 → 0（实际 ${r.missingEvidence}）`)
- ⚠️ `test/acceptance-matrix-gate.test.mjs:121` '| 条目一 | `test/a.test.mjs` | — | <待填：四选一> | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:122` '| 条目二 | `test/a.test.mjs` | — | maybe | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:133` // 1.4 证据缺失三口径：covered 缺锚点 / partial <TODO> / non-testable 空理由
- ⚠️ `test/acceptance-matrix-gate.test.mjs:142` '| TODO 证据 | `test/a.test.mjs` | — | partial | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:149` assert(r.missingEvidence === 3, `covered 缺锚点 + partial <TODO> + non-testable 空白理由 → 3（实际 ${r.missingEvidence}）`)
- ⚠️ `test/acceptance-matrix-gate.test.mjs:225` '| 判定枚举解析 | `test/x.test.mjs` | — | <待填：四选一> | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:236` // 2.2 证据缺失 → errors 阻断（covered 缺锚点 + non-testable <TODO>）
- ⚠️ `test/acceptance-matrix-gate.test.mjs:242` '| 证据锚点核验 | `test/x.test.mjs` | — | covered | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:247` assert(r.ok === false && !!err, '证据缺失（covered 缺锚点 + <TODO>）→ 阻断')

#### 探针 2：设计关键词覆盖
design §1~§7 关键词逐词 grep 实证（主仓已应用态）：commands.smoke（config-schema.js:73）/runSmokeCheck（verify-quality-scan.js:314）/judgeSmokeRan（verify-probes.js:2231）/smoke-not-run（stage-contract.js:1497）/parseDesignApiTable（verify-probes.js:320）/judgeApiCoverageMatrix（stage-contract.js:1067）/ensureSmokeReceiptSection（verify-probes.js:2290）/auditSmokeReceiptConsistency（verify-postcheck.js:107）/cli-noai-smoke 双侧（verify-probes.js:1853+change-risk-profile.js:337）/REVIEW_CHECKLISTS verify 键（stage-review-checklist.js:50）——全命中无缺词。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、src/run）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-04: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-05: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-06: 模块目录（src/stages、src、test、docs/prompt）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-07: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| - 配置 commands.smoke → verify 质量扫描步亲跑：additive smokeResult 段（exitCode/logPath/ranAt/source），log 实录落盘；失败不 throw（封顶信号）；快照超时回退；指纹含新键 | test/smoke-gate.test.mjs | smoke、执行三态、快照超时回退 | covered | test/smoke-gate.test.mjs:144（① 执行三态）、:178（② 快照回退）、:194（③ 指纹）、:474（⑨ config 键） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| - 机器段行 source 尾注经 parseEvidenceSlots 解析回填（单行/多行双形态）；脚本形态分类直判 cross-layer；一致性对比三态打回 | test/smoke-gate.test.mjs | 机器段、分类器、一致性 | covered | test/smoke-gate.test.mjs:230（④ 机器段 source）、:257（④b 多行 YAML）、:318（⑤ 一致性三态）、:355（⑥ 脚本形态三命令 B-1 回归） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| producer 五边界态+未配置键封闭——facts.smokeRan 按记录各形态产出 | test/smoke-gate.test.mjs | smokeRan、五边界 | covered | test/smoke-gate.test.mjs:395（⑦ 五边界：passed→ran/failed→not-ran/无段→not-ran+注记/记录缺失→not-ran/未配置→not-configured） |
| validateFactsV2——smokeRan 缺席零报错（存量零迁移）、三合法枚举通过、非法值报错 | test/smoke-gate.test.mjs | smokeRan、枚举 | covered | test/smoke-gate.test.mjs:395（⑦ 五边界含三合法枚举）；缺席零报错由 ⑦ 组零迁移夹具（存量 facts 无 smokeRan 字段通过）覆盖 |
| 判级 critical × smokeRan∈{not-ran,not-configured} × 结论=PASS → triggered 含 smoke-not-run 且 ok=false | test/smoke-gate.test.mjs | 第五条件、smoke-not-run | covered | test/smoke-gate.test.mjs:434（⑧ 第五条件 critical×三值+字段不在场 fail-closed） |
| advisory handover 在场+判级 critical+smokeRan≠ran+PASS → 第五条件仍触发（不设豁免子句） | test/smoke-gate.test.mjs | advisory、不豁免 | covered | test/smoke-gate.test.mjs:434（⑧ 组 advisory handover 不豁免断言） |
| 判级非 critical 任意 smokeRan → 零增量；factsExpected=false → 兼容口径不变 | test/smoke-gate.test.mjs | 非判级零行为 | covered | test/smoke-gate.test.mjs:434（⑧ 组非判级零行为断言） |
| 定向测试 pass-eligibility 既有断言零红（全量留 CI 由移交项承载） | test/pass-eligibility.test.mjs | pass-eligibility | covered | test/pass-eligibility.test.mjs（task-03 G.r2 输入 additive 调整后 16/16 定向全绿+task-07 S 组新增） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| parseDesignApiTable 解析形态五面（规范表/{id}模板/词边界/段头过滤/声明行） | test/api-coverage-matrix.test.mjs | 解析五形态 | covered | test/api-coverage-matrix.test.mjs:100（1. 五形态断言：规范表+{id}模板认+缺列不认+示例行不计+声明行） |
| 骨架三态渲染（端点预填/声明占位/无接口面）+段注释 | test/api-coverage-matrix.test.mjs | 骨架、矩阵段 | covered | test/api-coverage-matrix.test.mjs:323（7b. ensureApiCoverageMatrixSection 补段预填+幂等二跑零改动） |
| 消费面 advisory——消费端归类+零子行 warning | test/api-coverage-matrix.test.mjs | 消费面、归类 | covered | test/api-coverage-matrix.test.mjs:282（6. 消费端归类在场而零子行→warning）+:316（7. classifyConsumerHints 段级归类/NEW:剥除/不误命中） |
| 表间完备性 advisory——写端点×权限矩阵缺行 warning/命中/豁免不告 | test/api-coverage-matrix.test.mjs | 表间、权限矩阵 | covered | test/api-coverage-matrix.test.mjs:291（6b. 写端点未在权限矩阵→warning；命中/「无权限约束」豁免→不告） |
| probe7 既有矩阵段渲染零改动 | test/verify-probes-facts.test.mjs | probe7 | covered | test/verify-probes-facts.test.mjs（task-04 章节计数 14→15 唯一改动面——probe7 既有断言零触碰实证+定向 32/32 全绿） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| covered 端点行数 < 有效分母（N−non-testable 行数）→ ok:false 且 errors 逐条列出缺覆盖端点（method+path）；partial/uncovered 端点行不计入分子 | `test/acceptance-matrix-gate.test.mjs`<br>`test/verify-probes-facts.test.mjs`<br>`test/check-syntax.mjs` | covered、non、testable（`test/acceptance-matrix-gate.test.mjs`、`test/check-syntax.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:6`（covered）、`test/acceptance-matrix-gate.test.mjs:6`（non）、`test/acceptance-matrix-gate.test.mjs:6`（testable） |
| partial/uncovered 端点行在场且 facts.handover 零有效行 → error；有移交行 → 放行（blocking 封顶归条件②）；factsExpected=true 而 facts 缺失 → fail-closed error | `test/acceptance-matrix-gate.test.mjs`<br>`test/verify-probes-facts.test.mjs`<br>`test/check-syntax.mjs` | partial、uncovered、facts、handover（`test/acceptance-matrix-gate.test.mjs`、`test/verify-probes-facts.test.mjs`、`test/check-syntax.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:6`（partial）、`test/acceptance-matrix-gate.test.mjs:6`（uncovered）、`test/acceptance-matrix-gate.test.mjs:21`（facts） |
| design接口表#<METHOD /path> 锚点未命中解析产出集 → error（防空指）；其余四形态存在即认、缺失 → error | `test/acceptance-matrix-gate.test.mjs`<br>`test/verify-probes-facts.test.mjs`<br>`test/check-syntax.mjs` | design、path（`test/acceptance-matrix-gate.test.mjs`、`test/verify-probes-facts.test.mjs`、`test/check-syntax.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:183`（design）、`test/acceptance-matrix-gate.test.mjs:27`（path） |
| 解析零行零声明且判级 critical → error；判级 critical 且声明 0 端点 → warning；非判级 critical 零接口面 → 零行为 | `test/acceptance-matrix-gate.test.mjs`<br>`test/verify-probes-facts.test.mjs`<br>`test/check-syntax.mjs` | error（`test/acceptance-matrix-gate.test.mjs`、`test/verify-probes-facts.test.mjs`、`test/check-syntax.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:15`（error） |
| 探索性行（uncovered+[探索]）与消费端子行（两空格缩进 ↳ 前缀）不进分母分子；non-testable 理由非空合法并从分母扣除 | `test/acceptance-matrix-gate.test.mjs`<br>`test/verify-probes-facts.test.mjs`<br>`test/check-syntax.mjs` | uncovered（`test/acceptance-matrix-gate.test.mjs`、`test/check-syntax.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:6`（uncovered） |
| 消费面子行缺失与写端点权限矩阵缺行 → warnings 输出（不阻断、不进 errors） | `test/acceptance-matrix-gate.test.mjs`<br>`test/verify-probes-facts.test.mjs`<br>`test/check-syntax.mjs` | warnings、输出、不阻断、不进（`test/acceptance-matrix-gate.test.mjs`、`test/verify-probes-facts.test.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:289`（warnings）、`test/verify-probes-facts.test.mjs:79`（输出）、`test/acceptance-matrix-gate.test.mjs:20`（不阻断） |
| src/stage-contract.js 全文无 verify-probes import（静态+动态均无——grep 实证）；apiFace 只经 context 传参/facts 落盘面进入 | `test/acceptance-matrix-gate.test.mjs`<br>`test/verify-probes-facts.test.mjs`<br>`test/check-syntax.mjs` | src、stage、contract、verify（`test/acceptance-matrix-gate.test.mjs`、`test/verify-probes-facts.test.mjs`、`test/check-syntax.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:30`（src）、`test/acceptance-matrix-gate.test.mjs:30`（stage）、`test/acceptance-matrix-gate.test.mjs:30`（contract） |
| npm test 既有用例全绿（本 task 不新增测试文件，断言归 task-07）；未跑 --init 的存量变更零行为变化 | `test/acceptance-matrix-gate.test.mjs`<br>`test/verify-probes-facts.test.mjs`<br>`test/check-syntax.mjs` | test、task（`test/acceptance-matrix-gate.test.mjs`、`test/verify-probes-facts.test.mjs`、`test/check-syntax.mjs`） | covered | `test/acceptance-matrix-gate.test.mjs:2`（test）、`test/acceptance-matrix-gate.test.mjs:13`（task） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 「输出验证报告」步 prompt 含 smoke 纪律段四段全文（①断言派生表/②负向下界/③执行口径/④锚点注释，逐字对齐 design §6），段首命中条件说明（commands.smoke 配置或判级 critical）在场 | `test/stage-review-checklist.test.mjs` | 输出验证报告、prompt、smoke、断言派生表（`test/stage-review-checklist.test.mjs`） | covered | `test/stage-review-checklist.test.mjs:13`（输出验证报告）、`test/stage-review-checklist.test.mjs:6`（prompt）、`test/stage-review-checklist.test.mjs:12`（smoke） |
| stages/verify.js :197/:210 两处不再含无条件「CLI 不代跑集成进程」表述；新口径「commands.smoke 配置后由 CLI 亲跑机器落盘，其余形态仍须 agent 实跑后据实填写」在场 | `test/stage-review-checklist.test.mjs` | stages、verify（`test/stage-review-checklist.test.mjs`） | covered | `test/stage-review-checklist.test.mjs:6`（stages）、`test/stage-review-checklist.test.mjs:12`（verify） |
| Object.keys(REVIEW_CHECKLISTS) 排序后 = brainstorm,execute,plan,verify（4 键）；verify 条目渲染进 stages/verify.js prompt 字面 | `test/stage-review-checklist.test.mjs` | Object、keys、REVIEW_CHECKLISTS、brainstorm（`test/stage-review-checklist.test.mjs`） | covered | `test/stage-review-checklist.test.mjs:88`（Object）、`test/stage-review-checklist.test.mjs:88`（keys）、`test/stage-review-checklist.test.mjs:5`（REVIEW_CHECKLISTS） |
| test/stage-review-checklist.test.mjs 全绿（keys 断言 4 键 / 内嵌快照逐字 / 渲染字面三面齐过） | `test/stage-review-checklist.test.mjs` | test、stage、review、checklist（`test/stage-review-checklist.test.mjs`） | covered | `test/stage-review-checklist.test.mjs:67`（test）、`test/stage-review-checklist.test.mjs:2`（stage）、`test/stage-review-checklist.test.mjs:2`（review） |
| node docs/prompt/_verify.mjs 退出码 0（镜像逐字全绿）；npm test / npm run lint 全绿 | `test/stage-review-checklist.test.mjs` | docs、prompt（`test/stage-review-checklist.test.mjs`） | covered | `test/stage-review-checklist.test.mjs:53`（docs）、`test/stage-review-checklist.test.mjs:6`（prompt） |

**task-07**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| npm test 全量通过：两个新测试文件 + 三个既有增量全绿，零 skip 零 todo | `test/smoke-gate.test.mjs`<br>`test/api-coverage-matrix.test.mjs`<br>`test/pass-eligibility.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-review-checklist.test.mjs` | npm、test（`test/smoke-gate.test.mjs`、`test/pass-eligibility.test.mjs`、`test/api-coverage-matrix.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/stage-review-checklist.test.mjs`） | covered | `test/smoke-gate.test.mjs:115`（npm）、`test/smoke-gate.test.mjs:7`（test） |
| smoke-gate 覆盖齐：执行三态+快照超时回退 / 指纹含 smoke 键与复用 / 机器段形态与 source 提取 / 分类器脚本形态直判 cross-layer（B-1 金路径不误拦）/ 一致性对比改写打回 / smokeRan 五边界 / 第五条件 critical×三值+advisory handover 不豁免+非判级零行为 / config-schema 新键 | `test/smoke-gate.test.mjs`<br>`test/api-coverage-matrix.test.mjs`<br>`test/pass-eligibility.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-review-checklist.test.mjs` | smoke、gate、执行三态、快照超时回退（`test/smoke-gate.test.mjs`、`test/api-coverage-matrix.test.mjs`、`test/pass-eligibility.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/stage-review-checklist.test.mjs`） | covered | `test/smoke-gate.test.mjs:2`（smoke）、`test/smoke-gate.test.mjs:12`（gate）、`test/smoke-gate.test.mjs:6`（执行三态） |
| api-coverage-matrix 覆盖齐：解析五形态 / covered 记账（partial/uncovered 不计分子）/ non-testable 分母扣除 / 子行与探索行不计账 / 移交联动 error / 锚点解析级空指打回 / 声明降级 / critical×零接口面 error / critical×声明 0 warning / 消费面与表间 warning | `test/smoke-gate.test.mjs`<br>`test/api-coverage-matrix.test.mjs`<br>`test/pass-eligibility.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-review-checklist.test.mjs` | api、coverage、matrix、解析五形态（`test/smoke-gate.test.mjs`、`test/api-coverage-matrix.test.mjs`、`test/pass-eligibility.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/stage-review-checklist.test.mjs`） | covered | `test/smoke-gate.test.mjs:2`（api）、`test/smoke-gate.test.mjs:2`（coverage）、`test/smoke-gate.test.mjs:437`（matrix） |
| 断言增量 +50~70（design §7 预估区间）；test/config-schema.test.mjs 零改动（不在 allowed_paths） | `test/smoke-gate.test.mjs`<br>`test/api-coverage-matrix.test.mjs`<br>`test/pass-eligibility.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-review-checklist.test.mjs` | design、test、config（`test/api-coverage-matrix.test.mjs`、`test/pass-eligibility.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/stage-review-checklist.test.mjs`、`test/smoke-gate.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:6`（design）、`test/smoke-gate.test.mjs:7`（test）、`test/smoke-gate.test.mjs:26`（config） |
| plan.md 全局验收标准 1~8 均有对应断言落位（逐条可溯源到测试名） | `test/smoke-gate.test.mjs`<br>`test/api-coverage-matrix.test.mjs`<br>`test/pass-eligibility.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-review-checklist.test.mjs` | plan（`test/pass-eligibility.test.mjs`、`test/stage-review-checklist.test.mjs`） | covered | `test/pass-eligibility.test.mjs:169`（plan） |
| npm run lint 通过；mock 命令三态在 Windows Git Bash 与 Linux 下均可运行（跨平台断言形态） | `test/smoke-gate.test.mjs`<br>`test/api-coverage-matrix.test.mjs`<br>`test/pass-eligibility.test.mjs`<br>`test/verify-conclusion-slot.test.mjs`<br>`test/stage-review-checklist.test.mjs` | npm、run、lint、通过、mock（`test/smoke-gate.test.mjs`、`test/pass-eligibility.test.mjs`、`test/verify-conclusion-slot.test.mjs`、`test/stage-review-checklist.test.mjs`） | covered | `test/smoke-gate.test.mjs:115`（npm）、`test/smoke-gate.test.mjs:27`（run）、`test/smoke-gate.test.mjs:176`（lint） |

- ⚠️ 零/半自动化承接条目 10 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
10 条决策全闭环（Evidence/状态逐格见下方决策追踪矩阵）：D-001→task-01/07、D-002→task-03/07、D-003→task-02/07、D-004→task-05/07、D-005→task-04/05/07、D-006/D-007→task-04/07、D-008→task-06、D-010→task-01/05、D-009（边界）——全部有测试锚点（矩阵 Evidence 列），无未闭环行。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 4 backend endpoints (live [scan-root 4] + artifact 4), 0 frontend calls [scope: change-diff (32 files @ scan-root)] | 4 backend endpoints unused by frontend
- ⚠️ 4 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 19 个非 Java 清单文件不在探针 9 扫描面）

## 测试结果 [层：确定性检查——CLI 实测对账]
- 定向测试（用户指令全量留 CI）：node --test 五文件 55/55 全绿（smoke-gate 38 断言 11 test / api-coverage-matrix 22 断言 17 test / pass-eligibility S组+4 / verify-conclusion-slot+2 / stage-review-checklist+3）——另经 QA 独立复跑七文件 57 tests exit 0
- npm run lint：绿（check-syntax 669 文件，未引用导出 0 项）
- 断言净增 76（design §7 口径 +50~70 超上界 6 条——QA 基线对比 51225ae 实测）
- 全量 npm test：**未跑**（用户指令留 CI）——批次 A 同款 13 个 worktree 环境性失败文件在主仓运行即绿；移交项承载 CI 回归
- known_failures 豁免：无

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | — | — | test/smoke-gate.test.mjs:6（执行三态）+ :12（快照回退） | 已闭环 |
| D-002@v1 | — | — | test/smoke-gate.test.mjs:15 组（第五条件 critical×三值+advisory 不豁免）+ test/pass-eligibility.test.mjs S 组 | 已闭环 |
| D-003@v1 | — | — | test/smoke-gate.test.mjs ④⑤组（机器段 8 断言+一致性 4 断言） | 已闭环 |
| D-004@v1 | — | — | test/api-coverage-matrix.test.mjs 记账 6 断言（covered 分子/移交联动） | 已闭环 |
| D-005@v1 | — | — | test/api-coverage-matrix.test.mjs 降级 5 断言（声明对账/critical×零面 error/声明 0 warning） | 已闭环 |
| D-006@v1 | — | — | test/api-coverage-matrix.test.mjs advisory 3 断言（消费面归类/子行） | 已闭环 |
| D-007@v1 | — | — | test/api-coverage-matrix.test.mjs 写端点权限矩阵 warning 断言 | 已闭环 |
| D-008@v1 | — | — | test/stage-review-checklist.test.mjs（四段渲染锚+快照 verify 键） | 已闭环 |
| D-010@v1 | — | — | test/acceptance-matrix-gate.test.mjs 链数 4 断言+定向全绿 | 已闭环 |
| D-009@v1 | — | — | （边界决策——非目标清单对照 design 非目标节，无 FR 映射属预期） | 已闭环（边界） |

## 技术债务 [层：人工判断]
- 探针 1 命中全为骨架生成器/校验器/测试夹具字面占位词（probe1-noqa 标注面）——非实现债。
- 留档增强项：①白名单 PENDING_EXPORT_WHITELIST 5 条目接线已落地可清理（QA N-2，下次触及）②G-1 命中条件真渲染（静态 prompt 架构限制，后续 prompt 动态化时一并）③批次 B/D/E 路线债见 design 非目标。

## 变更风险等级 [层：人工判断]
显式声明 = contract-required（design frontmatter risk_level）——覆盖关键词误判 integration-critical（命中词「claim」为回执槽格式字段名字面）。本变更为 CLI 校验逻辑与配置面：行为契约变化（verify 门禁语义+新 validator+新配置键）属 contract-required；smoke 能力面向外部项目服务生命周期，本变更自身无运行时集成面（无 daemon/跨进程/启动路径触碰）。

## Runtime Evidence [层：人工判断]
- 长驻进程启动命令：不涉及（CLI 短进程校验逻辑，无服务启动——判级 contract-required 非 critical）
- 触碰的服务端点：不涉及（REST 端点零变化，端点基线 4 个）
- 触发核心路径的请求：不涉及（无 HTTP 面改动）
- 进程日志关键片段：定向 node --test 七文件 57 tests exit 0（2026-09-18，QA 独立复跑）+ lint 绿 669 文件——CLI 短进程全量实跑即本变更核心路径的运行时证据
- 生命周期终态断言：不涉及（无状态机/生命周期事件；smokeRan 为 facts 字段非进程生命周期）
- 失败模式排除：超时帽 300s+快照回退（smoke-gate ②组 mock 注入实证）；机器段改写/删段/冒充三态 ERROR（⑤组）；smokeRan 记录缺失 fail-open 注记不阻断（producer 五边界）
<!-- 降级路径（design §3.2，D-004 收口）：服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及 -->

## 代码审查 [层：人工判断]
- execute Step 10 独立验收（agent-tool 通道）：10/10 checklist 全 pass（file:line 证据），1 低危 gap（G-1 命中条件注入形态——Reverse Sync 追认）+3 注记（白名单可清/meta.json 基建/绝对路径配套）。
- 走查清单定向面：①编辑/更新链路——CLI 校验逻辑无 UI 编辑链；②非主分支流——fail-open/fail-closed 边界全断言（五边界/三态/存量空转四态）；③守卫一致性——零 import verify-probes 双实证（grep 静态+动态）；④载荷契约——探针 8 不适用（无前后端面），facts 通道经落盘面进入；⑤并发/原子性——ensure 幂等二跑零改动+一致性对比防篡改。
- 总体评价：可交付。B-1 金路径闭合（脚本形态 smoke 三命令直判 cross-layer）是本批最关键修复——批次 A 留的分类链缺口兑现。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
execute Step 10 独立验收（QA agent-tool 通道）结论回流：specVerdict=pass / qualityVerdict=pass（10/10 checklist 含 file:line 证据，0 fail / 1 低危 gap G-1 已 Reverse Sync 追认 / 3 注记）；review.json 存 .runtime/stage-reviews/execute-review-2026-09-18-002110/。对「结论枚举」无影响（无 P1/P2 级缺陷）。
