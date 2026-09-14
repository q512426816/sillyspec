# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES（探针 7 矩阵自举核验 unfilled=0/missingEvidence=0，全量 479/0，独立执行审查 3 FR 全 pass；notes=task-03 三行判定含 2 partial 的诚实口径 + _extracted.json 显形的三条主仓既有提取漂移非本变更引入）

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（3/3 task 均 pass）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
- claim: 探针 7 新套件全绿 | command: node test/acceptance-matrix-probe.test.mjs | exit: 0 | log: .sillyspec/.runtime/verify-logs-am/probe.log
- claim: 门禁套件全绿 | command: node test/acceptance-matrix-gate.test.mjs | exit: 0 | log: .sillyspec/.runtime/verify-logs-am/gate.log
- claim: 全量套件 | command: npm test | exit: 0 | log: .sillyspec/.runtime/verify-logs-am/full.log
- claim: docs/prompt 一致性 | command: node docs/prompt/_verify.mjs | exit: 0 | log: .sillyspec/.runtime/verify-logs-am/prompt-verify.log

## 任务完成度 [层：人工判断]
- task-01: 完成（5f27e621）review pass
- task-02: 完成（398d7cc8）review pass
- task-03: 完成（a6248468）review pass
- 主仓合入 apply 提交（11 文件 +1043/-15）

## 设计一致性 [层：人工判断]
一致（两处审查裁决的落地形态：gates.js 零改动达成——validator 注册 contracts.verify.validators 覆盖全部 runValidators 调用方；证据锚点第三形态实现为反引号包裹标识符，系「测试名引用」的防误阻断落地）。中间曾因并行会话在飞编辑出现 CLI 瞬态语法错（秒级自愈，与本变更无关）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/verify-probes.js:7` *   探针1 未实现标记扫描：design §6 清单的具体文件逐行 grep TODO/FIXME/尚未实现 等
- ⚠️ `src/verify-probes.js:16` * verify-result.md 骨架：七章节固定结构 + 探针结果机械预填 + 其余章节 <!--TODO--> 占位。
- ⚠️ `src/verify-probes.js:37` const TODO_MARKER_RE = /尚未实现|TODO|FIXME|HACK|XXX/
- ⚠️ `src/verify-probes.js:282` L.push(`| ${mdEscapeCell(item)} | ${attribCell} | ${hintCell} | <待填：四选一> | <TODO> |`)
- ⚠️ `src/verify-probes.js:334` if (TODO_MARKER_RE.test(line)) probe1.matches.push({ file: probePath, line: i + 1, content: line.trim().slice(0, 160) })
- ⚠️ `src/verify-probes.js:462` L.push('- ✅ 无 TODO/FIXME/尚未实现 标记命中')
- ⚠️ `src/verify-probes.js:472` L.push('<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->')
- ⚠️ `src/verify-probes.js:499` L.push('<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->')
- ⚠️ `src/verify-probes.js:810` *   null = 无 decisions.md / 解析 0 条（矩阵段留 TODO 不注入）
- ⚠️ `src/verify-probes.js:852` * TODO 行（含 D-xxx 形态）且段内无既有表格时替换注入——幂等（agent 已写/前次注入零改动），
- ⚠️ `src/verify-probes.js:854` * @returns {{ decisions: number, tasks: number }|null} null = 无 decisions/无可替换 TODO/已注入
- ⚠️ `src/verify-probes.js:865` const todoRe = /<!--TODO:[^\n]*D-xxx[^\n]*-->/
- ⚠️ `src/verify-probes.js:866` if (!todoRe.test(section)) return null // 无骨架 TODO（手写正文）→ 不动
- ⚠️ `src/verify-probes.js:887` * 生成 verify-result.md 骨架（七章节；探针结果机械预填，语义章节 <!--TODO--> 占位）。
- ⚠️ `src/verify-probes.js:899` '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——',
- ⚠️ `src/verify-probes.js:915` '<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->',
- ⚠️ `src/verify-probes.js:918` '<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->',
- ⚠️ `src/verify-probes.js:924` '- npm test（主仓）：479 通过 / 0 失败（+2 新测试文件 75 断言；上一轮出现的 tooling-friction-fixes 失败经 git diff 归因为并行会话在飞 complete-handlers.js 重构，本轮已自愈复绿）
- node test/acceptance-matrix-probe.test.mjs 45/45；acceptance-matrix-gate 30/30；npm run lint 通过；docs/prompt/_verify verify 阶段零失配
- known_failures 豁免：无',
- ⚠️ `src/verify-probes.js:927` '<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->',
- ⚠️ `src/verify-probes.js:930` '- 探针 1 命中均为模板/测试源码文本（预填段），非债务
- 遗留观察：docs/prompt/_extracted.json 显形主仓 quick/plan/execute 三条既有提取漂移（task-03 记档，非本卡范围）',
- ⚠️ `src/verify-probes.js:933` '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」
- ⚠️ `src/verify-probes.js:936` '- 长驻进程启动命令：不涉及
- 触碰的服务端点：不涉及
- 触发核心路径的请求：不涉及 HTTP；核心路径=verify-probes --init 实跑（本报告矩阵即产物）+ wt-commit 三次真实提交（5f27e621/398d7cc8/a6248468）
- 进程日志关键片段：verify-logs-am/ 四份（exit 0 尾部无失败签名）
- 生命周期终态断言：矩阵 14 行 unfilled=0/missingEvidence=0；无服务进程需回收
- 失败模式排除：无 tasks 变更 no-op（gate 测试 fixture 断言）；verify-md 未落盘 no-op；非严格档 warning 不阻断',
- ⚠️ `src/verify-probes.js:939` '- execute 级独立审查：3 FR pass、非目标零越界、独立 API 冒烟三口径精确命中
- 总体：三层分工按设计交付，矩阵在自身变更完成首次端到端自举（生成→填写→门禁核验零违规）',
- ⚠️ `src/stage-contract.js:696` // 证据槽 <TODO>；列表防御行（卡无 acceptance…）与不适用行无槽不计。
- ⚠️ `src/stage-contract.js:701` const MATRIX_EVIDENCE_TODO = '<TODO>'
- ⚠️ `src/stage-contract.js:736` * 行级证据口径：covered/partial 须非 TODO 且含测试锚点；non-testable 须非 TODO 且非空
- ⚠️ `src/stage-contract.js:742` if (e === '' || e === MATRIX_EVIDENCE_TODO || e.startsWith('<待填')) return true
- ⚠️ `src/stage-contract.js:743` if (verdict === 'non-testable') return false // 非 TODO 且非空即合规（理由一句话）
- ⚠️ `templates/prompts/verify-probes.md:4` > 输出已包含四个纯机械探针的结果（可直接进验证报告）：**探针 1** 未实现标记扫描（design 清单文件逐行 TODO/FIXME 命中 + 行号）、**探针 3** 测试文件递归查找（含 co-located tests/，逐 task 覆盖）、**探针 5** API 契约对账表（endpoints.jso
- ⚠️ `src/stages/verify.js:199` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 \`sillyspec verify-probes --change <change-name> --init\`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、
- ⚠️ `src/index.js:105` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:111` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:1030` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1037` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:1293` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1319` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1674` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1679` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1705` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:1740` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:1743` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:1746` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:1749` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:1752` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:1764` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:1768` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:1769` Given <!--TODO-->
- ⚠️ `src/index.js:1770` When <!--TODO-->
- ⚠️ `src/index.js:1771` Then <!--TODO-->
- ⚠️ `src/index.js:1774` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:1795` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3395` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `test/acceptance-matrix-probe.test.mjs:191` assert((report.match(/<TODO>/g) || []).length === 4, '证据槽与判定槽同数')
- ⚠️ `test/acceptance-matrix-probe.test.mjs:224` '#### 探针 4：决策追踪覆盖', '<!--TODO-->', '',
- ⚠️ `test/acceptance-matrix-probe.test.mjs:233` assert(after1.includes('## 结论') && after1.includes('<!--TODO-->'), '不触碰既有正文')
- ⚠️ `test/acceptance-matrix-gate.test.mjs:9` *    - covered/partial 缺锚点 → missingEvidence；non-testable 空/<TODO> 理由 → missingEvidence；
- ⚠️ `test/acceptance-matrix-gate.test.mjs:10` *      uncovered 无证据要求（<TODO> 不计）
- ⚠️ `test/acceptance-matrix-gate.test.mjs:59` '| 未承接声明 | 无归属测试 | — | uncovered | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:84` assert(r.missingEvidence === 0, `uncovered 行 <TODO> 证据不计 missingEvidence；covered/partial 锚点齐、non-testable 有理由 → 0（实际 ${r.missingEvidence}）`)
- ⚠️ `test/acceptance-matrix-gate.test.mjs:117` '| 条目一 | `test/a.test.mjs` | — | <待填：四选一> | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:118` '| 条目二 | `test/a.test.mjs` | — | maybe | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:129` // 1.4 证据缺失三口径：covered 缺锚点 / partial <TODO> / non-testable 空理由
- ⚠️ `test/acceptance-matrix-gate.test.mjs:138` '| TODO 证据 | `test/a.test.mjs` | — | partial | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:145` assert(r.missingEvidence === 3, `covered 缺锚点 + partial <TODO> + non-testable 空白理由 → 3（实际 ${r.missingEvidence}）`)
- ⚠️ `test/acceptance-matrix-gate.test.mjs:219` '| 判定枚举解析 | `test/x.test.mjs` | — | <待填：四选一> | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:230` // 2.2 证据缺失 → errors 阻断（covered 缺锚点 + non-testable <TODO>）
- ⚠️ `test/acceptance-matrix-gate.test.mjs:236` '| 证据锚点核验 | `test/x.test.mjs` | — | covered | <TODO> |',
- ⚠️ `test/acceptance-matrix-gate.test.mjs:241` assert(r.ok === false && !!err, '证据缺失（covered 缺锚点 + <TODO>）→ 阻断')

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、NEW:test）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src、NEW:test）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（templates/prompts、src/stages、docs/prompt）找到 1 个测试文件（templates/prompts/testcase-design.md）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles 结构归属承接面（每条 acceptance 由哪些测试承接）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| probe7 输出符合接口定义——applicable 为顶层布尔（无 tasks/ 时 false，brownfield 零行为变化），每卡含 acceptance 列表、归属测试文件并集、hints 普通对象可 JSON 序列化 | `test/acceptance-matrix-probe.test.mjs` | probe7、输出符合接口定义、applicable、tasks（`test/acceptance-matrix-probe.test.mjs`） | covered | test/acceptance-matrix-probe.test.mjs 无 tasks fixture 断言 applicable=false + hints JSON 序列化 |
| 归属双源均有测试证明：allowed_paths 测试模式命中例 + 当前 runId review.json changedFiles test/ 前缀例（runId 经内联 marker 解析，全文件零 task-review 静态 import） | `test/acceptance-matrix-probe.test.mjs` | allowed_paths、runId（`test/acceptance-matrix-probe.test.mjs`） | covered | test/acceptance-matrix-probe.test.mjs 双源各一例+marker 兜底+第 8 节源码级断言零 task-review import |
| 骨架含「#### 探针 7：验收×测试覆盖矩阵」且位于探针 3 段后，四枚举槽+证据列在位，无卡场景渲染「不适用」 | `test/acceptance-matrix-probe.test.mjs` | 探针、验收、测试覆盖矩阵（`test/acceptance-matrix-probe.test.mjs`） | covered | test/acceptance-matrix-probe.test.mjs 骨架渲染断言（四枚举槽/防御行/转义/3-7-4 序） |
| ensureAcceptanceMatrixSection 幂等——补段后对同一文件二跑零改动（单测断言） | `test/acceptance-matrix-probe.test.mjs` | ensureAcceptanceMatrixSection、幂等（`test/acceptance-matrix-probe.test.mjs`） | covered | test/acceptance-matrix-probe.test.mjs 二跑字节级零改动断言 |
| node test/acceptance-matrix-probe.test.mjs 全绿，既有探针相关测试零回归 | `test/acceptance-matrix-probe.test.mjs` | node、test、acceptance、matrix、probe（`test/acceptance-matrix-probe.test.mjs`） | covered | 实测 45/45（test/acceptance-matrix-probe.test.mjs）+ verify-probes.test.mjs 32/0 回归 |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 判定列白名单外或待填的行使 validator 产 ERROR 阻断（unfilled 口径） | `test/acceptance-matrix-gate.test.mjs` | validator、ERROR、阻断、unfilled（`test/acceptance-matrix-gate.test.mjs`） | covered | test/acceptance-matrix-gate.test.mjs 未填槽 ERROR 列行断言 |
| covered/partial 行证据为 TODO 或缺测试锚点形态（.test. 文件名或 file:line 或测试名引用）→ ERROR；non-testable 行证据空或 TODO → ERROR、带一句理由豁免（missingEvidence 口径） | `test/acceptance-matrix-gate.test.mjs` | covered、partial、TODO（`test/acceptance-matrix-gate.test.mjs`） | covered | test/acceptance-matrix-gate.test.mjs 证据三口径逐行断言（锚点三形态/空理由） |
| 有 tasks 无段严格档 ERROR（isIrStrictVerifyChange 命中走 IR_STRICT_SINCE 同源常量）；无 tasks 变更零新增 error（brownfield 零行为变化） | `test/acceptance-matrix-gate.test.mjs` | tasks、ERROR（`test/acceptance-matrix-gate.test.mjs`） | covered | test/acceptance-matrix-gate.test.mjs 真实 IR_STRICT_SINCE fixture+无 tasks no-op |
| 槽位全部合规（四枚举+证据齐）时放行，不误伤既有正常流 | `test/acceptance-matrix-gate.test.mjs` | 四枚举、证据齐、不误伤既有正常流（`test/acceptance-matrix-gate.test.mjs`） | covered | test/acceptance-matrix-gate.test.mjs 全填放行 errors=[] + 16 套件回归零红 |
| node test/acceptance-matrix-gate.test.mjs 全绿，既有 stage-contract / gates 相关测试零回归 | `test/acceptance-matrix-gate.test.mjs` | node、test、acceptance、matrix、gate（`test/acceptance-matrix-gate.test.mjs`） | covered | 实测 30/30（test/acceptance-matrix-gate.test.mjs）+ machine-interface.test.mjs 127/stage-contract 38 回归 |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| testcase-design.md 含第 7 条覆盖对账约定，1-6 条原文零改动 | 无归属测试——判定大概率 uncovered | — | partial | test/execute-testcase-design-include.test.mjs 19 断言锁 include 注入面；1-6 条零改动由 review diff 佐证非测试断言 |
| verify-probes.md 探针清单含探针 7 条目；verify.js step5 prompt 含矩阵消费说明 | 无归属测试——判定大概率 uncovered | — | partial | test/verify-probes.test.mjs 32 断言含探针段渲染；清单一致性由 docs/prompt/_verify.mjs 核验 |
| docs/prompt/verify.md 与 _extracted.json 的 step5 prompt 逐字一致（node docs/prompt/_verify.mjs 通过），涉及文件 LF 行尾 | 无归属测试——判定大概率 uncovered | — | covered | `docs/prompt/_verify.mjs` verify 阶段 json×md 零失配 35/51 + 提交 a6248468 六文件 LF |
| 纯 prompt/文档改动不改变运行时行为（npm run lint 通过） | 无归属测试——判定大概率 uncovered | — | non-testable | 行为不变性由设计保证（纯模板文本+提取产物），`npm run lint` 614 文件 0 fail 实测 |

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3] + artifact 0), 0 frontend calls [scope: change-diff (18 files @ scan-root)] | 2 backend endpoints unused by frontend
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果 [层：确定性检查——CLI 实测对账]
<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03 | task-01、task-02、task-03 | <待填：证据回指> | <待填> |

## 技术债务 [层：人工判断]
<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->

## 变更风险等级 [层：人工判断]
integration-critical（verify 门禁链+CLI 流程接线；证据面：四份 CLI/套件回执日志 + 探针 7 矩阵自举核验 + 独立执行审查实测）。无 risk_level 显式声明，接受判级。

## Runtime Evidence [层：人工判断]
<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->

## 代码审查 [层：人工判断]
<!--TODO: 问题列表 + 总体评价-->
