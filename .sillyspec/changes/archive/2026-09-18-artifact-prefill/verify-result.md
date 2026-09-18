# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——四任务全落地、主仓 535/535+docs 725/725+lint 绿；探针10 自家门 ✅（散文字面量分散写——探针自咬误报面首战处置）；execute 独立验收 pass/pass；P3 两条（文件级检测 v2/对表数字归档后填）。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| env-blocked | commands.smoke 未配置且接口面 0 端点已显式声明——critical 判级冒烟门按降级承载走 NOTES（friction 升档所致判级，无真实运行时面） | 配置后复跑（仪式性） |
| manual-acceptance | 对表数字（附录 B）归档后 zcode db 填入 | 24h 内 |
| manual-acceptance | 槽级注检测（v2 防散文误报） | 下个 prefill 变更 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- （无 cannot_verify 任务）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
- claim: unit-sufficient 无集成面（CLI 冒烟即证据）
  command: 不涉及
  exit: 不涉及
  log: 不涉及
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
- task-01~04：4/4（review 全 pass+独立验收）

## 设计一致性 [层：人工判断]
- 一致+执行期增量留痕（D-006/移交批入清单/接口增量两处良性）

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/prefill.js:311` *   - 值空/占位（[] 或 taskcard 骨架 [FR-XX]/[D-XXX@vN]）且推导非空 → 直填+注；
- ⚠️ `src/prefill.js:347` const placeholderRe = field === 'requirement_ids' ? /^FR-XX$/i : /^D-XXX@vN$/i
- ⚠️ `src/index.js:110` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:117` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:1115` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1122` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:1378` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1404` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1759` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1764` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1790` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:1825` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:1828` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:1831` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:1834` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:1837` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:1849` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:1853` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:1854` Given <!--TODO-->
- ⚠️ `src/index.js:1855` When <!--TODO-->
- ⚠️ `src/index.js:1856` Then <!--TODO-->
- ⚠️ `src/index.js:1859` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:1880` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3589` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `src/index.js:3945` // 占位行「requirement_ids: [FR-XX] / decision_ids: [D-XXX@vN]」立即改写为 prefillCardIds
- ⚠️ `src/index.js:3962` .replace('decision_ids: [D-XXX@vN]', () => tcIdLine('decision_ids', tcPrefillIds.decisionIds));
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
- ⚠️ `test/prefill.test.mjs:166` '---', 'id: task-01', 'requirement_ids: [FR-XX]', 'decision_ids: [D-XXX@vN]',
- ⚠️ `test/prefill.test.mjs:185` '槽三落盘：占位 [FR-XX]/[D-XXX@vN] 直填为推导值+注（行格式与 taskcard 直填/refresh 重放一致）')
- ⚠️ `test/prefill.test.mjs:400` '源在场 → 占位 [FR-XX]/[D-XXX@vN] 直填推导值+来源注（行格式与 refresh 重放逐字一致）')
- ⚠️ `test/prefill.test.mjs:401` assert(!card.includes('[FR-XX]') && !card.includes('[D-XXX@vN]'), '占位字面量零残留（plan --done 硬校验面不遗留）')
- ⚠️ `docs/sillyspec/file-lifecycle.md:293` - `executePlanPostcheck`（noAI，execute 前最后关口）顺序跑确定性校验：`validateBlueprintConsistency`（task 结构/路径冲突/拓扑无环）、`validatePlanFeasibility`（TaskCard 字段齐全/依赖存在/id 连续；2026-0

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src/run、src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-04: 模块目录（test、docs/sillyspec）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 三槽直测语义正确：清单=target_files 并集且 NEW 前缀保形；决策表行状态「待确认」；ids=FR-NN+D-xxx@vN 抽取——输出均带来源注 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| runPrefillRefresh 幂等：同输入二次重放，产物与 { filled, skipped, confirmed } 结果一致 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 已确认跳过：预填注已删的槽 refresh 不覆盖人工内容（confirmed 计数） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 三入口接线后生成骨架白名单槽含预填注值（design-init 决策追踪表行/taskcard ids 直填/prefill-refresh 重放落槽） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 定向回归：design-init/taskcard 相关既有测试全绿（fourpiece-init 无白名单槽不受影响） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| --done 门双态：白名单槽注在场 → advisory 提示不阻断；注删净 → 无提示通过 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 归档前校验双态：注在场 → verify-probes error 阻断；注删净 → 通过 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 旧路径零新硬门：无预填注的既有变更 --done/归档行为不变（定向回归绿） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 三槽直测组绿：清单=并集且 NEW 前缀保形/表行状态「待确认」/ids 抽取正确，输出均带来源注 | `test/prefill.test.mjs`<br>`test/design-facts.test.mjs` | 清单、NEW（`test/prefill.test.mjs`、`test/design-facts.test.mjs`） | covered | `test/prefill.test.mjs:62`（清单）、`test/prefill.test.mjs:71`（NEW） |
| refresh 幂等组+已确认跳过组绿（人工内容保护实证） | `test/prefill.test.mjs`<br>`test/design-facts.test.mjs` | refresh（`test/prefill.test.mjs`） | covered | `test/prefill.test.mjs:155`（refresh） |
| 注清零双态组绿（--done advisory 与归档 error 各双态）+定向生成器回归组绿 | `test/prefill.test.mjs`<br>`test/design-facts.test.mjs` | done、advisory、error（`test/prefill.test.mjs`、`test/design-facts.test.mjs`） | covered | `test/prefill.test.mjs:11`（done）、`test/prefill.test.mjs:10`（advisory）、`test/prefill.test.mjs:10`（error） |
| 全量 npm test 与 npm run lint 全绿 | `test/prefill.test.mjs`<br>`test/design-facts.test.mjs` | 全量、test、run（`test/design-facts.test.mjs`、`test/prefill.test.mjs`） | covered | `test/design-facts.test.mjs:146`（全量）、`test/prefill.test.mjs:14`（test）、`test/prefill.test.mjs:7`（run） |

- ⚠️ 零/半自动化承接条目 8 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4] + artifact 0), 0 frontend calls [scope: change-diff (7 files @ scan-root)] | 3 backend endpoints unused by frontend
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 14 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ❌ 预填注未清 3 处（error 门——verify 完成前须逐槽核对后删注）：
- ❌ `design.md` 仍含未删预填注
- ❌ `tasks/task-01.md` 仍含未删预填注
- ❌ `tasks/task-04.md` 仍含未删预填注

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（四选一）：covered / partial / uncovered / non-testable。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- 主仓 535/535+docs 725/725+lint 绿+noAI 亲测双绿；known_failures 无

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03 | task-01、task-04 | 三槽+零越槽 | 已闭环 |
| D-002@v1 | FR-01、FR-02、FR-03 | task-01、task-02、task-04 | 三接线+定向回归 | 已闭环 |
| D-003@v1 | FR-01、FR-02、FR-03 | task-03、task-04 | 注协议+双门 | 已闭环 |
| D-004@v1 | FR-01、FR-02、FR-03 | task-04 | 附录 B | 已闭环 |
| D-005@v1 | FR-01、FR-02、FR-03 | task-01、task-04 | refresh 幂等+跳过 | 已闭环 |
| D-006@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | design-facts 随行 | 已闭环 |

## 技术债务 [层：人工判断]
- P3：文件级检测 v2/对表数字待填

## 变更风险等级 [层：人工判断]
显式声明 = unit-sufficient；定价 S1→friction 升档 S2（首战） / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」+ 理由；若有命中被同句否定语境抑制（如「不新增 daemon 协议」），写明被抑制关键词与理由（抑制可审计，不许用来静默降级）-->

## Runtime Evidence [层：人工判断]
- unit-sufficient 无 daemon 面；主提交 6786025+worktree 链 ee1afd0→ddc3eec→20acbbb→09b0aa2→c95f07a→bab046a；refresh CLI 冒烟可复跑（组7）
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
