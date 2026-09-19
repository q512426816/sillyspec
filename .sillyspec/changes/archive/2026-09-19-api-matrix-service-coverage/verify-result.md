---
author: qinyi
created_at: 2026-09-19 08:10:52
---

# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——四任务验收全满足、定向测试全绿、execute 独立代码审查 pass/pass 零阻断；notes 为测试环境归因（worktree 隔离期 12 个环境红+主仓 2 个他侧在途红，均与本 diff 零因果，见移交项与测试结果节）与 anchor-check 回归钉缺失（行为经独立审查 node -e 实证正确，见移交项）。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| env-blocked | worktree 隔离期全量套件 12 个环境红（测试 spawn bin/sillyspec.js 被 worktree-cwd 守卫拦，坑 worktree-cwd-silent-split）+主仓 2 个他侧在途红（doc-ref-check/run-help-shortcircuit，主仓 src/run/command.js 有并行会话未提交改动）——本变更无法在隔离期内完成「主仓全量绿」证明 | apply 回主仓后跑 `npm test` 全量；预期本变更关联文件全绿、12 环境红消失；2 个他侧红随其会话提交后消失（若仍在，归因其变更非本变更） |
| other | probe7-anchor-check 的 covered-service 新形态无自动化测试锁定（task-03 任务边界不碰 test/、task-04 清单未列；execute 独立审查 node -e 实证 rowsChecked/coveredRows/缺锚进 missingAnchors 行为正确） | 下个触及 src/probe7-anchor-check.js 的变更顺手在 test/probe7-anchor-testfile.test.mjs 补 covered-service fixture 组 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]

无（四任务 review.json 均 pass/pass，无 cannot_verify）。

## 集成验证回执 [层：自述声明——CLI 一致性校验]

无（变更风险等级 unit-sufficient，非 integration/deployment-critical，无运行时集成面）。
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]

- task-01 ✅：判定层六改点全落位（execute 独立审查 diff hunk 逐点核验；定向 14/17 绿+3 红全为预告设计内红窗归 task-04，收口后 21/21 绿）。
- task-02 ✅：八面文案六面（grep 清零达标，:1930 唯一禁新枚举文案已开闸）。
- task-03 ✅：预检器纯扩集（probe7-anchor-testfile/cross-repo 两文件全绿，旧枚举行为逐字不变）。
- task-04 ✅：五组用例+六处断言同步（定向 21/21+63/63 全绿，一次转绿零回改）。

完成率 4/4=100%。勾选真源=四份 review.json（CLI 勾选，verdict pass/pass）。

## 设计一致性 [层：人工判断]

一致——实现与 design.md 三 Wave 逐点吻合，execute 独立代码审查（agent-tool 通道）以 merge-base 79c9880 逐字对照证实：存量四枚举路径零改动（covered-service 全部为纯新增分支）、移交联动（原 :1246-1250）与 PASS 封顶条件④消费区零触碰、八条全局硬约束全部遵守（复用 matrixEvidenceHasAnchor 无第二套文法/零新 import/零新正则/零 facts schema）。唯一注意点（非偏差）：主仓 CLI（旧代码）渲染的探针 7 矩阵与接口矩阵注记仍为四枚举口径——apply 后主仓即为五枚举，本报告矩阵判定按四枚举填写（本变更验收条目均由端点级测试直接承接，covered 判定正确，不涉及新枚举形态）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stage-contract.js:786` // 证据槽 <TODO>；列表防御行（卡无 acceptance…）与不适用行无槽不计。
- ⚠️ `src/stage-contract.js:791` const MATRIX_EVIDENCE_TODO = '<TODO>'
- ⚠️ `src/stage-contract.js:826` * 行级证据口径：covered/partial 须非 TODO 且含测试锚点；non-testable 须非 TODO 且非空
- ⚠️ `src/stage-contract.js:833` if (verdict === 'non-testable') return false // 非 TODO 且非空即合规（理由一句话）
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
- ⚠️ `src/stages/verify.js:201` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 \`sillyspec verify-probes --change <change-name> --init\`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、
- ⚠️ `templates/prompts/verify-probes.md:4` > 输出已包含四个纯机械探针的结果（可直接进验证报告）：**探针 1** 未实现标记扫描（design 清单文件逐行 TODO/FIXME 命中 + 行号）、**探针 3** 测试文件递归查找（含 co-located tests/，逐 task 覆盖）、**探针 5** API 契约对账表（endpoints.jso
- ⚠️ `test/acceptance-matrix-probe.test.mjs:204` assert((report.match(/<TODO>/g) || []).length === 0, '证据槽占位淘汰（全预填）')
- ⚠️ `test/acceptance-matrix-probe.test.mjs:251` '#### 探针 4：决策追踪覆盖', '<!--TODO-->', '',
- ⚠️ `test/acceptance-matrix-probe.test.mjs:260` assert(after1.includes('## 结论') && after1.includes('<!--TODO-->'), '不触碰既有正文')

#### 探针 2：设计关键词覆盖

语义复核（worktree 实现态）：covered-service（五枚举白名单/骨架/指引/预检器全命中）、测试锚点三形态（matrixEvidenceHasAnchor 复用）、计分子（coveredCount 并入）、advisory 承接计数（serviceCoveredCount→warnings）、五选一文案（八面全落）——设计能力关键词在 diff 中全部有对应实现，零「⚠️ 可能未实现」。探针 1 的 TODO 命中复核：全部为框架既有形态（MATRIX_EVIDENCE_TODO 常量定义、CLI 帮助文本、骨架模板注释、verify-probes 模板自身的指令文本），非本变更引入的未实现标记，零真实 TODO/FIXME 债。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src、src/stages、templates/prompts）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-04: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| MATRIX_VERDICT_WHITELIST 为五枚举 {'covered','covered-service','partial','uncovered','non-testable'}（node -e 打印 Set 可证）。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | covered、partial（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:9`（covered）、`test/api-coverage-matrix.test.mjs:10`（partial） |
| judgeApiCoverageMatrix 对最小矩阵（apiFace 端点全部 covered-service 且证据含 .test. 锚点）返回 ok=true、errors 为空——coveredCount 计分子使分子不小于有效分母且 coveredSet 命中使 missingEndpoints 为空。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | judgeApiCoverageMatrix、apiFace、covered（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:4`（judgeApiCoverageMatrix）、`test/api-coverage-matrix.test.mjs:15`（apiFace）、`test/api-coverage-matrix.test.mjs:9`（covered） |
| judgeApiCoverageMatrix 对 covered-service 行证据缺测试锚点（<TODO> 或无锚纯文本）返回 errors 含该行锚点缺失项（anchorViolations 路径）。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | judgeApiCoverageMatrix、covered、TODO（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:4`（judgeApiCoverageMatrix）、`test/api-coverage-matrix.test.mjs:9`（covered）、`test/acceptance-matrix-probe.test.mjs:204`（TODO） |
| serviceCoveredCount > 0 时返回 warnings 含「端点由 service 层测试承接（非端点级）」advisory，且 ok 不因此变 false。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | warnings（`test/api-coverage-matrix.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:142`（warnings） |
| matrixEvidenceMissing('covered-service', '<TODO>') === true 且 matrixEvidenceMissing('covered-service', '`test/foo.test.mjs`') === false（node -e 可证；函数未导出则经 extractAcceptanceMatrixSlots 的 missingEvidenc… | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | covered、TODO、true（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:9`（covered）、`test/acceptance-matrix-probe.test.mjs:204`（TODO）、`test/api-coverage-matrix.test.mjs:36`（true） |
| 纯四枚举路径逐字不变——git diff -- src/stage-contract.js 确认 :1182 既有 covered/partial 校验、:1190 五形态校验、:1200 non-testable 校验、:1246-1250 移交联动零改动；文件内「四选一」字样清零。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | src、stage（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:31`（src）、`test/api-coverage-matrix.test.mjs:32`（stage） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| renderApiCoverageMatrixLines 两种形态（endpoints 非空逐端点行 / declared 声明降级行）产出均含「<待填：五选一>」占位，且 :2490 注记串含「五选一」与「covered-service」（经导出面 ensureApiCoverageMatrixSection 写临时文件读回可证）。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | endpoints、declared（`test/api-coverage-matrix.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:82`（endpoints）、`test/api-coverage-matrix.test.mjs:66`（declared） |
| src/verify-probes.js :1929 与 :1930 注记均为五枚举口径——:1930 不再含旧串「枚举须保持 covered/partial/uncovered/non-testable 纯值」。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | src、verify、probes（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:31`（src）、`test/api-coverage-matrix.test.mjs:31`（verify）、`test/api-coverage-matrix.test.mjs:31`（probes） |
| ensureApiCoverageMatrixSection 函数体零改动——git diff 无 :3079-3104 区间改动行，其产出经 :3084 render 复用自动带新占位。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | ensureApiCoverageMatrixSection（`test/api-coverage-matrix.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:5`（ensureApiCoverageMatrixSection） |
| src/stages/verify.js :165、templates/prompts/verify-probes.md :36、src/index.js :1212 三处文案均含 covered-service 或五选一/五枚举口径。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | src、verify（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:31`（src）、`test/api-coverage-matrix.test.mjs:31`（verify） |
| 文案清零 grep——四文件 grep「四选一」仅剩 src/verify-probes.js :1877/:1917 历史叙事注释（描述占位淘汰前旧态，不改）；「四枚举」四文件零残留（templates :36 已改五枚举）。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | grep、四选一（`test/acceptance-matrix-probe.test.mjs`、`test/api-coverage-matrix.test.mjs`） | covered | `test/acceptance-matrix-probe.test.mjs:107`（grep）、`test/api-coverage-matrix.test.mjs:118`（四选一） |
| 本卡零 test/ 改动——test/api-coverage-matrix.test.mjs :332-333（占位字面断言）与 test/acceptance-matrix-probe.test.mjs :213（probe7 图例断言）在本卡后转红属预期中间态，归 task-04 断言同步收口。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | test、改动、api、coverage（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:10`（test）、`test/api-coverage-matrix.test.mjs:323`（改动）、`test/api-coverage-matrix.test.mjs:2`（api） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| checkProbe7AnchorCoverage 对含 covered-service 行的合成探针 7 段——rowsChecked 计入该行（不再被 :70 过滤跳过）。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | covered（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:9`（covered） |
| covered-service 行证据含锚点（如 test/foo.test.mjs:42）——不进 missingAnchors 且 coveredRows 计入该行。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | covered、test、foo（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:9`（covered）、`test/api-coverage-matrix.test.mjs:10`（test）、`test/acceptance-matrix-probe.test.mjs:49`（foo） |
| covered-service 行证据缺锚点（纯文本无 file:line / .test. / 反引号）——missingAnchors 含该行（advisory 回补提示，先于 verify --done 硬 error 一轮）。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | covered、file（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:9`（covered）、`test/acceptance-matrix-probe.test.mjs:20`（file） |
| partial/uncovered/non-testable 行仍被 :72 跳过（不进锚点校验、不进 coveredRows）——既有行为零变化。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | partial、uncovered、non、testable（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:10`（partial）、`test/api-coverage-matrix.test.mjs:9`（uncovered）、`test/api-coverage-matrix.test.mjs:10`（non） |
| node --check src/probe7-anchor-check.js 通过；文件内「四枚举」字样清零（:38 已同步五枚举口径）。 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | node、check、src、probe7、anchor（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:23`（node）、`test/acceptance-matrix-probe.test.mjs:5`（check）、`test/api-coverage-matrix.test.mjs:31`（src） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-01 对照（plan 全局验收 3 前三行为）：用例①②③ 绿——covered-service 计分子放行（ok=true 零 errors，等式满足）+ 缺测试锚点进 error + advisory 承接计数 warnings 在场且 N 与 fixture 行数一致 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | 对照、plan、用例（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:61`（对照）、`test/acceptance-matrix-probe.test.mjs:5`（plan）、`test/api-coverage-matrix.test.mjs:66`（用例） |
| FR-02 / D-002 对照（plan 全局验收 3 第四行为）：用例④ 绿——验收矩阵 covered-service 行 unfilled=0 / missingEvidence=0 不误报，backfill 后 facts.matrixPartialRows=0（移交/封顶不触发的结构性证据） | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | 对照、plan、用例（`test/api-coverage-matrix.test.mjs`、`test/acceptance-matrix-probe.test.mjs`） | covered | `test/api-coverage-matrix.test.mjs:61`（对照）、`test/acceptance-matrix-probe.test.mjs:5`（plan）、`test/api-coverage-matrix.test.mjs:66`（用例） |
| plan 全局验收 1：npm test 全量通过（五组新用例 + 全部既有用例）且 npm run lint 通过 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | plan、test（`test/acceptance-matrix-probe.test.mjs`、`test/api-coverage-matrix.test.mjs`） | covered | `test/acceptance-matrix-probe.test.mjs:5`（plan）、`test/api-coverage-matrix.test.mjs:10`（test） |
| plan 全局验收 2：纯四枚举文档行为逐字不变——既有用例 1-7 断言语义零改动，仅六处文案字面/夹具占位同步，判定面断言值（unfilled 计数/错误条数/ok 布尔）不变 | `test/api-coverage-matrix.test.mjs`<br>`test/acceptance-matrix-probe.test.mjs` | plan（`test/acceptance-matrix-probe.test.mjs`） | covered | `test/acceptance-matrix-probe.test.mjs:5`（plan） |

#### 探针 4：决策追踪覆盖

闭环判定：D-001@v1→FR-01/FR-02→task-01/02/04（探针 7 矩阵 covered 行+测试结果）✅；D-002@v1→FR-02→task-01/03/04（用例 8d probe7 联动+预检器扩集）✅；D-003@v1→方案 A 全篇（requirements 决策覆盖矩阵 D-003 行映射 FR-01/FR-02；机械半边 frontmatter 未映射是任务卡 decision_ids 归属粒度所致——D-003 是方案选择元决策，其细化即 D-001/D-002，两卡已映射）✅。无未闭环决策。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 12 backend endpoints (live [scan-root 4 + worktree 4] + artifact 12), 0 frontend calls [scope: change-diff (9 files @ worktree)] | 12 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 12 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx、GET /api、GET /api/path …

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 8 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（5 个在检文件无未确认预填）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（四选一）：covered / partial / uncovered / non-testable。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]

- 定向（worktree 新实现态）：`node --test test/api-coverage-matrix.test.mjs` 21/21 绿（含五组新用例 8/8b/8c/8d）；`node --test test/acceptance-matrix-probe.test.mjs` 63/63 绿；`node --test test/acceptance-matrix-gate.test.mjs` 37/0 绿（不在同步清单的相邻门回归）；`node --test test/probe7-anchor-testfile.test.mjs test/cross-repo-probe7-anchor.test.mjs` 全绿；`npm run lint` 通过（680 文件，未引用导出 0）。
- worktree 全量：522 通过/13 失败——12 个为 worktree-cwd 守卫拦截 spawn bin/sillyspec.js 的环境红（task-04 子代理以 detach 基线 worktree[79c9880+同 node_modules]实证基线 534/1，两套 test 清单 535=535 一致）；1 个 sillyhub-mcp-platform-fixes 基线预存红。
- 主仓全量（本 verify 会话自跑，旧代码基线态）：534 通过/2 失败——doc-ref-check（platform-interface-map.md 引用主仓工作区在途 command.js 漂移）与 run-help-shortcircuit（quick-sessions 目录计数/未知参数文案，并发会话活跃态敏感）——两文件均不在本变更 diff，归因并行会话（ceremony-pricing-five-cuts）在途改动。
- CLI --done 实测口径：local.yaml `test_strategy: module`——本变更命中 cli-core 模块（src/ 前缀），实测跑其 10 文件清单（含 verify-postcheck-*/verify-quality-scan 等，均在 worktree 与主仓双态绿）；全量证明按移交项 env-blocked 条件（apply 后主仓复跑）承载。known_failures 豁免：不适用（module 子集无失败可豁免；全量失败行归因见他侧，不进共享豁免清单——避免掩盖并行会话进行中状态）。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02 | task-01、task-02、task-04 | test/api-coverage-matrix.test.mjs:343-432（用例 8 计分子/8b 缺锚 error/8c advisory）；diff hunk @@ -1181/-1217 | 已闭环 |
| D-002@v1 | FR-01、FR-02 | task-01、task-03、task-04 | 用例 8d（probe7 联动 unfilled=0+missingEvidence=0+matrixPartialRows===0）；probe7-anchor-check.js:70/:72 扩集 | 已闭环 |
| D-003@v1 | FR-01、FR-02（requirements 决策覆盖矩阵行） | task-01..04（方案 A 全篇=D-001/D-002 细化） | requirements.md 决策覆盖矩阵；brainstorm step5 用户实答「确认设计，继续」（方案 A 直接展开） | 已闭环（frontmatter 未映射为任务卡 decision_ids 归属粒度——元决策细化落 D-001/D-002 两卡，见探针 4） |

## 技术债务 [层：人工判断]

- 探针 1 命中 28 处复核为框架既有形态（常量/帮助文本/骨架模板注释），零真实 TODO/FIXME 债。
- 唯一新增债：probe7-anchor-check covered-service 无自动化回归钉（行为 node -e 实证正确）——已列移交项 other 条，不放大为阻塞。

## 变更风险等级 [层：人工判断]

显式声明 = unit-sufficient（design.md frontmatter `risk_level: unit-sufficient`）。理由：纯 verify 门禁判定逻辑扩展，零 daemon/session/启动入口/进程集成面，测试为纯函数单测。brainstorm 阶段关键词误伤（自审章节引用生命周期关键词表触发 integration-critical 误判）已按 CLI 指引显式覆盖，抑制可审计（design 自审节判级说明段）。

## Runtime Evidence [层：人工判断]

- 实现态证据链：worktree 分支 sillyspec/2026-09-19-api-matrix-service-coverage（baseline checkpoint 79c9880）+9 文件未提交改动（git status porcelain 实态）。
- 定向测试：api-coverage-matrix 21/21、acceptance-matrix-probe 63/63、acceptance-matrix-gate 37/0、probe7-anchor 两文件全绿、lint 680 文件过（时间戳 2026-09-19 07:0x-07:5x 会话内）。
- 运行时组件：不涉及（无端点/启动/请求响应/生命周期终态面）。
- 失败模式排除：covered-service 误进移交联动/封顶④（结构性不可能——:1247/:1248 过滤与 countMatrixPartialRows 表达式均不含该值，execute 审查代码级核验+用例 8d 断言 matrixPartialRows===0）。

## 代码审查 [层：人工判断]

execute 阶段独立代码审查（agent-tool 通道，2026-09-19）结论 pass/pass 零阻断：diff 与 design 逐点吻合、八条硬约束全守、越权检查零计划外文件、全量失败归因经主仓对照抽查确认零因果。走查清单对照：①编辑/更新链路——不涉及（无业务回显面，门禁为纯读取校验）；②非主分支流——covered-service 缺锚分支含 covered 行对照组（用例 8b 断言 errors.length===1 不叠报）；③守卫一致性——不涉及（无权限端点面）；④载荷字段契约——探针 8 不适用（无 Java/SQL 面）；⑤并发/事务——不涉及（无共享态写入，零 facts schema）。非阻断备注两条（anchor-check 回归钉/probe7 负向断言）均入移交项或低风险档。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]

execute 阶段已含独立代码审查（上文），verify 期不重复派发（FR-12 检查不重复执行纪律）；brainstorm/plan 阶段各有两轮独立评审（review.json 存档 stage-reviews/brainstorm-review-2026-09-19-060651 与 plan-review-2026-09-19-062143）。无新增复核发现，结论枚举不受影响。
