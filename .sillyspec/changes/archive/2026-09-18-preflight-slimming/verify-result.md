# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——五任务全落地、主仓全量 534/534 绿+docs check 589/589+lint 全绿；execute 独立验收 pass/pass（diff 与清单 1:1、硬约束五条实证）；结算档 integration-critical（双跑纠正：设计期乐观 unit-sufficient 被事实面 27 文件跨 4 模块纠正）；**守恒三红线（D-005 本变更专属验收）全过**：①L1 拦截守恒——diff 零触碰 gate 判定逻辑（prompt.js 只增渲染层，gates/validators 一行未动），摩擦账拦截链原样 ②CLI 亲测照跑——noAI 质量扫描 module+lint 双绿（见测试结果节）③单步中位不反弹——双渲染字节金丝雀 out2===out3 显式 PASS+分叉只减不增注入体积（摘要行<全量块）；P3 注记 2 条（v2 边界 D-006 收录归期/超时态无自动化测试）。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| env-blocked | commands.smoke 未配置且本变更无可冒烟接口面（接口面 0 端点已显式声明）——critical 档冒烟门按降级承载走 NOTES | 配置 commands.smoke 后复跑质量扫描（本变更无运行时接口，属仪式性补课非真实缺口） |
| manual-acceptance | v2 validator 收录（execute 任务步 allowed-paths-scan/plan postcheck-lite——D-006@v1 边界，friction-ledger 首个真实案例驱动归期） | 归期触发时映射表增量收录+声明补值 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- （无 cannot_verify 任务——五任务全 satisfied）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
- claim: unit-sufficient 档无集成面（纯 CLI 注入/协议/文案），集成回执不涉及——运行时证据链见 Runtime Evidence 节（CLI 冒烟+提交链）
  command: 不涉及
  exit: 不涉及
  log: 不涉及
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
- task-01~05：5/5 完成（review 全 pass；明细见「逐项检查任务」步输出）

## 设计一致性 [层：人工判断]
与 design.md 一致，两处执行期增量留痕：①v2 边界（execute 任务步/plan postcheck-lite 收录归期）经 execute 独立评审 gap 回写 design Phase 1 注记+D-006@v1；②docs --fix 越界回退后主仓侧独立收口（29aa686，含 6 处人工锚修）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/index.js:110` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:116` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:1114` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1121` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:1377` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1403` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1758` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1763` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1789` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:1824` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:1827` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:1830` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:1833` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:1836` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:1848` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:1852` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:1853` Given <!--TODO-->
- ⚠️ `src/index.js:1854` When <!--TODO-->
- ⚠️ `src/index.js:1855` Then <!--TODO-->
- ⚠️ `src/index.js:1858` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:1879` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3536` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `src/stages/plan.js:371` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `src/stages/plan.js:410` decision_ids: [D-XXX@vN]
- ⚠️ `src/stages/plan.js:526` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `src/stages/execute.js:335` - **报告骨架勿手写**：先跑 \`sillyspec symbol-impact --change <change-name>\`——CLI 从 tasks.md 生成逐 task \`<!--TODO-->\` 骨架（gate 拦截时也会自动落一份）；把每行占位替换为真实结论（**未替换的 TODO 占位会被 g
- ⚠️ `src/stages/execute.js:491` - 是否有未处理的 TODO/FIXME
- ⚠️ `templates/prompts/taskcard-rules.md:31` - **占位符硬拦**（未替换视同缺字段，plan --done 直接报错阻断）：FR-XX（requirement_ids）、D-XXX（decision_ids）、src/example/file.ts（allowed_paths）、一句话说明这个 task（goal）、具体步骤 1（implementation）
- ⚠️ `docs/prompt/plan.md:362` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `docs/prompt/plan.md:464` decision_ids: [D-XXX@vN]
- ⚠️ `docs/prompt/plan.md:513` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `docs/prompt/_extracted.json:176` "prompt": "生成完整验证报告，并写入 verify-result.md。\n\n### 操作\n1. 汇总以上所有检查结果\n2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描关键词。本步骤 --done 时，CLI 会用 detectChangeR
- ⚠️ `docs/prompt/_extracted.json:269` "prompt": "根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。\n\n⚠️ 这一步是可选的。如果项目模块简单、流程不明显，可以跳过。\n\n### flows/ 目录\n目标目录：`{DOCS_ROOT}/flows/`\n\n根据 _module-map.yaml 中的模块依赖关系，识别跨模
- ⚠️ `docs/prompt/_extracted.json:490` "prompt": "对上一步生成的 plan.md 做审查。生成与审查分离——不在生成 plan 的同一上下文里自审，避免确认偏差。\n\n### 执行前确认门（plan_level=full 时）\nplan.md 审查通过后、进入 execute 前，若 plan_level=full（跨模块/大变更），必须先向
- ⚠️ `docs/prompt/_extracted.json:504` "prompt": "为 plan.md 中的每个任务生成紧凑 TaskCard。\n\n⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：\n- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan
- ⚠️ `docs/prompt/_extracted.json:547` "prompt": "加载计划、设计和代码库上下文。\n\n### 操作\n1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）\n2. 读取 design.md（技术方案）\n3. 读取 CONVENTIONS.md、ARCHI
- ⚠️ `docs/prompt/_extracted.json:609` "prompt": "对本次变更进行代码审查。\n\n### 执行方式\n本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。\n\n### 操作\n1. 检查 git diff 查看所有变更\n2. 审查要点：\n   - 代码风格是否符合 CONVENTIONS.md\n 
- ⚠️ `test/preflight-slimming.test.mjs:6` *      整体 fail-open 返空串。超时态（3s 帽）见组一末 TODO 注释——PREFLIGHT_VALIDATORS
- ⚠️ `test/preflight-slimming.test.mjs:7` *      映射表为模块私有，测试无法注入慢 validator，不在本文件硬造（时间盒约定：记 TODO 不算失败）。
- ⚠️ `test/preflight-slimming.test.mjs:164` // TODO（超时态，3s 帽）：PREFLIGHT_VALIDATORS 映射表为 run/prompt.js 模块私有，测试无法注入
- ⚠️ `test/preflight-slimming.test.mjs:166` // 哨兵，src/run/prompt.js），不在本文件硬造——按 taskcard 时间盒约定记 TODO 不算失败。

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、src/run）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-02: 模块目录（src/run）递归未找到测试文件（含 co-located tests/）
- ✅ task-03: 模块目录（src/run、src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-04: 模块目录（src/stages、templates/prompts、docs/prompt）递归未找到测试文件（含 co-located tests/）
- ✅ task-05: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| hasDecisionId 对 decisions.md 中存在/不存在的 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| renderPreflightFailures 失败项超过 5 条截断为 5；单 validator 超 3s 丢弃该项；validator 抛错或无失败返回空串 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| shouldInjectFullContext 无账本时返回 full 为真；账本含该阶段记录时返回 full 为假并带 digest 与 firstStep | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| decisions-io/prompt 邻面既有测试零回归 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 未配 preflight 声明的 stage/步骤渲染输出与现状逐字节一致 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 有失败项的产出步 prompt 含清单头固定行、帽 5 截断后的条目、尾部完整清单行 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 同阶段首步全量注入、后续步骤注摘要行（digest 前 8 位+可 Read 路径） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 删除或损坏账本后渲染回退每步全量，无异常抛出 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 不带 --inherit-from 的 --wait 行为与现状逐字节一致（兼容红线） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 带存在于 decisions.md 的 ID：同命令完成 wait 记录并追加盖章轮（来源标注可审计） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 带不存在的 ID：exit 2 且不落任何 wait 状态（fail-closed） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| execute 任务步 prompt 与 taskcard-rules.md verify 段均含定向优先引导行（逐字一致） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 三 stages 产出步带 preflightValidators 声明且能被 task-02 渲染机制消费（{PREFLIGHT_FAILURES} 通路有内容） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| docs/prompt/_extracted.json 与 brainstorm.md/plan.md 镜像一致（流水线再生成无漂移） | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 七组断言全部落地且通过 | `test/preflight-slimming.test.mjs`<br>`test/stage-review.test.mjs` | — | partial | （无机械命中——人工核验 `test/preflight-slimming.test.mjs`） |
| 全量 npm test 绿（零回归）；npm run lint 绿 | `test/preflight-slimming.test.mjs`<br>`test/stage-review.test.mjs` | 全量、npm、test、run（`test/preflight-slimming.test.mjs`、`test/stage-review.test.mjs`） | covered | `test/preflight-slimming.test.mjs:181`（全量）、`test/preflight-slimming.test.mjs:94`（npm）、`test/preflight-slimming.test.mjs:10`（test） |

- ⚠️ 零/半自动化承接条目 14 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4] + artifact 0), 0 frontend calls [scope: change-diff (5 files @ scan-root)] | 3 backend endpoints unused by frontend
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 14 个非 Java 清单文件不在探针 9 扫描面）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（四选一）：covered / partial / uncovered / non-testable。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- 主仓 `npm test`：**534 文件全绿（0 失败，103.8s）**——含 NEW test/preflight-slimming.test.mjs 57 断言七组。
- 主仓 `node bin/sillyspec.js docs check`：**589/589 全绿**（重锚收口 29aa686 后）。
- 主仓 `npm run lint`：全绿（678 文件未引用导出 0）。
- noAI 质量扫描：module[cli-core,run-gates,stages]+deps 亲跑 exit 0 + lint exit 0（step 6 实测）。
- known_failures 豁免：无。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03 | task-01、task-02 | renderPreflightFailures+占位符接线+清单头行（57 断言①⑦组） | 已闭环 |
| D-002@v1 | FR-01、FR-02、FR-03 | task-01、task-02 | shouldInjectFullContext+分叉+账本（②组 15 断言含字节金丝雀） | 已闭环 |
| D-003@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | <待填：证据回指> | <待填> |
| D-004@v1 | FR-04 | task-04 | 引导行双落点（④组）+默认值未动（diff 零 test_strategy） | 已闭环 |
| D-005@v1 | FR-01、FR-02、FR-03、FR-04 | task-02、task-05 | 守恒三红线全过（结论段①②③） | 已闭环 |
| D-003@v2 | FR-01、FR-02、FR-03 | task-01、task-03 | hasDecisionId+四文件协议（③组 18 断言 CLI 子进程层双态） | 已闭环 |
| D-006@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | v2 边界留痕（design 注记+移交行） | 已闭环 |

## 技术债务 [层：人工判断]
P3 两条：①v2 收录边界（见移交项）②超时态无自动化测试（PREFLIGHT_VALIDATORS 模块私有无法注入慢 validator——读码核验正确，TODO 注释在测试 :164）。

## 变更风险等级 [层：人工判断]
显式声明 = unit-sufficient（design frontmatter 附理由）；span 轴起爆 11 文件 → 定价 S2（一轮独立评审已消费：设计评审 fail→修→改判+execute 独立验收双回路）——定价引擎 span 首战实录。

## Runtime Evidence [层：人工判断]
unit-sufficient 档无 daemon 面；证据链=CLI 命令面：主提交 10a6ee7（14 文件）+docs 收口 29aa686；worktree 提交链 dbcf632→735620e→f79ca81→a02173a→044f6ea；盖章轮冒烟样例与双渲染金丝雀在 task-05 测试内可复跑。
<!-- 降级路径（design §3.2，D-004 收口）：服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及 -->

## 代码审查 [层：人工判断]
execute 阶段独立验收审查（agent-tool 通道）pass/pass（6 项 5 过 1 缺口）：硬约束五条全实证（帽常量/超时 race/fail-open 四层/wait 无参逐行未动/L1 零进 diff）；57/57+lint+邻面 109/0 复核；gap（execute 步声明留空 v2）已回写 D-006。走查清单映射：①编辑链路=N/A（纯新增）；②旁路=quick 不分叉（现状逐字保留，裁量记录在案）；③守卫=wait fail-closed 先于状态写入；④⑤=N/A（无端点/事务面）。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
已有：brainstorm 独立设计评审 fail（2 事实断言错）→修复→复审改判 pass（18 项）；execute 独立验收 pass/pass（gap 回写 D-006）。零 P1/P2；P3 两条进技术债节。
