# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——三消费点症状经三张真实坏卡夹具实证消失（feasibility 0b 硬校验带 文件:行:列 / parseTaskContracts yamlError 显式降级 / 探针 7 fmError 如实文案），直测 13/13 + 迁移两件 16/16、63/0 + 邻接三件全绿，execute 独立审查 7/7 pass。NOTES：探针 5「3 端点未调用」为存量噪音（本变更无接口面，属问题 C 口径缺陷，另走 quick-C 修）。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| other | 探针 5 报「3 个本变更端点前端未调用」（GET /api/path 等）系存量端点误标——本变更零接口面，端点来自仓内既有文件；属问题 C（contract-matrix unusedChangeRelevant 口径被击穿）| quick-C 落地后重跑 `sillyspec verify-probes --change 2026-09-20-taskcard-yaml-hardgate`，确认该 ⚠️ 行消失或正确折叠 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（四任务全部经直测与门禁复跑客观核验）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
无（unit-sufficient 变更，无集成/部署面）

## 任务完成度 [层：人工判断]
<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->
4/4 全部完成（tasks.md 勾选 4/4，review.json 全 pass）：
- task-01 ✅ src/taskcard-frontmatter.js（3350B，冒烟+直测过）
- task-02 ✅ src/stages/plan-postcheck.js（0b 硬校验实测恰一条 error 带 行:列；yamlError 三路径返回形状齐）
- task-03 ✅ src/verify-probes.js（三态契约+fmError 渲染区分；jsYaml import 清零）
- task-04 ✅ 三夹具字节一致 + 新用例 13/13 + 迁移 16/16、63/0 + 邻接三件绿

## 设计一致性 [层：人工判断]
<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->
一致。AC-01~08 全实证；四接口签名与 design 接口定义逐键一致（execute 独立审查清单 7 复核）；D-001@v2 落点（feasibility 0b、契约门禁零预检）如实落地；非目标面（taskcard.js / hasAcceptanceCriteria / multi-agent-platform 原卡）零触碰。无偏差项。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stages/plan-postcheck.js:1486` * 无 diff 可取）生成骨架，影响类型列留 <!--TODO--> 由 execute/verify 按实际 diff 回填。
- ⚠️ `test/fixtures/taskcard-bad-yaml/task-01.md:47` ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
- ⚠️ `test/fixtures/taskcard-bad-yaml/task-02.md:50` ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
- ⚠️ `test/fixtures/taskcard-bad-yaml/task-03.md:54` ⚠️ plan --done 硬校验会拦截未替换的占位符（FR-XX / D-XXX / src/example/file.ts /
- ⚠️ `test/acceptance-matrix-probe.test.mjs:204` assert((report.match(/<TODO>/g) || []).length === 0, '证据槽占位淘汰（全预填）')
- ⚠️ `test/acceptance-matrix-probe.test.mjs:251` '#### 探针 4：决策追踪覆盖', '<!--TODO-->', '',
- ⚠️ `test/acceptance-matrix-probe.test.mjs:260` assert(after1.includes('## 结论') && after1.includes('<!--TODO-->'), '不触碰既有正文')
- ℹ️ 5 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
- 解析源（splitFrontmatter/parseTaskFrontmatter）→ src/taskcard-frontmatter.js 全量实现；三态（no-frontmatter/invalid-yaml/ok）→ verify-probes.js parseTaskAcceptance + 探针 7 构建分流；硬校验（行:列/双报豁免）→ plan-postcheck.js:1303-1316；yamlError → parseTaskContracts 三路径返回形状。关键词逐个 grep 实现面命中（execute 独立审查清单 1-3 逐 hunk 复核）。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-02: 模块目录（src/stages）递归未找到测试文件（含 co-located tests/）
- ✅ task-03: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-04: 模块目录（test/fixtures/taskcard-bad-yaml、test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 合法 frontmatter 输入返回 ok=true 且 fm 为解析对象、error 为 null | `test/taskcard-frontmatter-hardgate.test.mjs` | frontmatter、ok、error（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:52`（合法卡三键断言） |
| 坏 YAML 输入（未闭合 flow 序列）返回 ok=false 且 error.line 等于 js-yaml mark.line+2 | `test/taskcard-frontmatter-hardgate.test.mjs` | line、mark、yaml（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:39`（三夹具 行20/22/26+列35/17/78 锁死换算，design R-01） |
| 无 frontmatter 输入返回 ok=true 且 hasFrontmatter=false | `test/taskcard-frontmatter-hardgate.test.mjs` | frontmatter、hasfrontmatter（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:61` |
| 模块 import 面仅 js-yaml（Node 内建不算仓内依赖） | `test/taskcard-frontmatter-hardgate.test.mjs` | import、yaml（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `src/taskcard-frontmatter.js:12`（import 面唯一 js-yaml）+ execute 独立审查清单 1 复核 |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 坏卡 changeDir 下 validatePlanFeasibility 返回 ok=false 且 errors 含 frontmatter 非法 YAML 与文件:行:列 | `test/taskcard-frontmatter-hardgate.test.mjs` | feasibility、error、行（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:90`（恰 3 条 0b error，task-01.md:20:35 等行:列在文案） |
| 好卡（合法 YAML）零新增错误（既有用例全绿） | `test/taskcard-frontmatter-hardgate.test.mjs` | 好、错误、全绿（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:169`（好卡 errors 深等于空）+ `test/cross-task-contracts.test.mjs`（16/16 零回归） |
| parseTaskContracts 对坏卡返回 yamlError 非 null 且 provides 为空；对合法卡 yamlError 为 null | `test/taskcard-frontmatter-hardgate.test.mjs` | yamlerror、provides、null（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:212`（坏 :212 / 好 :221 双路径断言；execute 期修出成功路径漏键真缺陷后过） |
| 顶层重复键卡不产生 0b 第二条错误（:1298 独占）；嵌套重复键卡由 0b 报错 | `test/taskcard-frontmatter-hardgate.test.mjs` | 重复、错误、嵌套（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:104`（顶层双报豁免）+ `:136`（嵌套 0b 兜底，message 含 duplicated mapping key） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 坏卡输入 parseTaskAcceptance 返回 status 为 invalid-yaml、acceptance 为空数组、error 非 null | `test/taskcard-frontmatter-hardgate.test.mjs` | status、invalid、error（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:249` |
| 无 frontmatter 输入返回 status 为 no-frontmatter；合法输入返回 status 为 ok 且数组归一 | `test/taskcard-frontmatter-hardgate.test.mjs` | status、frontmatter、归一（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:249`（四态全断言） |
| renderProbe7Lines 对挂 fmError 的条目输出 frontmatter 非法 YAML 行且不输出防御行；真无 acceptance 合法条目保留防御行 | `test/taskcard-frontmatter-hardgate.test.mjs` | fmerror、防御、渲染（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs:268`（骨架含「frontmatter 非法 YAML（task-01.md:20:35」且 task-01 段无防御行、task-02 段保留防御行） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 新用例文件全部通过且覆盖 AC-01 至 AC-07 | `test/taskcard-frontmatter-hardgate.test.mjs` | 全部、覆盖（`test/taskcard-frontmatter-hardgate.test.mjs`） | covered | `test/taskcard-frontmatter-hardgate.test.mjs`（13/13，AC-01~07 每条有对应 it） |
| 迁移后 acceptance-matrix-probe 与 cross-task-contracts 全绿 | `test/acceptance-matrix-probe.test.mjs`<br>`test/cross-task-contracts.test.mjs` | acceptance、matrix、cross（`test/acceptance-matrix-probe.test.mjs`、`test/cross-task-contracts.test.mjs`） | covered | `test/acceptance-matrix-probe.test.mjs:154`（三态迁移五断言）+ `test/cross-task-contracts.test.mjs:81`（yamlError 断言）；63/0、16/16 实测 |
| 相关邻接测试（taskcard-duplicate-key / plan-postcheck-crlf / parse-repo）全绿 | `test/taskcard-duplicate-key.test.mjs`<br>`test/plan-postcheck-crlf.test.mjs`<br>`test/parse-repo.test.mjs` | duplicate、crlf、repo（`test/taskcard-duplicate-key.test.mjs`、`test/plan-postcheck-crlf.test.mjs`、`test/parse-repo.test.mjs`） | covered | `test/taskcard-duplicate-key.test.mjs`、`test/plan-postcheck-crlf.test.mjs`、`test/parse-repo.test.mjs` 三件 node --test 全 pass（execute 审查独立复跑同绿） |

- ℹ️ 预填 12 条 uncovered 经逐格复核全部改判 covered——预填「无归属」因 allowed_paths 均为源码/夹具路径（无 .test. 形态）而归属集为空；实际承接面为新增直测套件 `test/taskcard-frontmatter-hardgate.test.mjs`（review changedFiles 未含测试路径因 task review --changed-files 声明面即测试自身）。

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (10 files @ worktree)] | 3 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx

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
- ✅ 预填注清零（5 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- node --test test/taskcard-frontmatter-hardgate.test.mjs → 13/13 pass（AC-01~07）
- node --test test/cross-task-contracts.test.mjs → 16/16 pass（含 yamlError 迁移断言）
- node test/acceptance-matrix-probe.test.mjs → 63 通过 / 0 失败（三态契约迁移）
- node --test test/taskcard-duplicate-key.test.mjs test/plan-postcheck-crlf.test.mjs test/parse-repo.test.mjs → 全 pass（邻接零回归）
- node test/plan-adopt-waves.test.mjs → 30 通过 / 0 失败（§4c 夹具 deps 去预引号——原预引号经 card() 模板叠成双重引号=真非法 YAML，旧门禁不整体解析漏过、0b 硬拦后暴露的连带债，修夹具数据不弱化断言；已补登 task-04 卡 allowed/target）
- node --check src/taskcard-frontmatter.js src/stages/plan-postcheck.js src/verify-probes.js → 全过
- 全量 npm test 由 CLI 在本步 --done 门禁隔离快照亲自实测（首两轮快照假红系 gate-snapshot 祖先比对 trim 失真工具缺陷，quick-1733001a/2a9e4a5f 已修——见「独立复核」节）；known_failures 豁免：本变更零新增

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-02、task-03、task-04 | `test/taskcard-frontmatter-hardgate.test.mjs:39`（共享源行:列）`:212`（yamlError）`:249`（三态）`:268`（渲染区分） | implemented |
| D-001@v2 | FR-01、FR-02、FR-03、FR-04 | task-02、task-04 | `test/taskcard-frontmatter-hardgate.test.mjs:90`（0b 阻断恰 3 条）`:104`（双报豁免）`:136`（嵌套兜底）`:237`（契约门禁零假阳性） | implemented |

## 技术债务 [层：人工判断]
探针 1 的 7 条 ⚠️ 命中全为噪音，无新增 TODO/FIXME：
- test/fixtures/taskcard-bad-yaml/task-0{1,2,3}.md 三条——夹具内容含 taskcard 生成器骨架注释字面量（FR-XX / D-XXX 等占位标记说明文），夹具受「原样字节保留」约束不改；
- test/acceptance-matrix-probe.test.mjs:204/251/260 三条——既有测试对 `<!--TODO-->` 字面量的断言内容（测试自身正文，非未实现标记）；
- src/stages/plan-postcheck.js:1486 一条——既有 module-impact 生成注释里的 TODO 字样（本变更未触碰该行语义）。

## 变更风险等级 [层：人工判断]
unit-sufficient——纯解析/门禁逻辑 + 直测全绿；无接口面（接口验证覆盖矩阵「无接口面」行如实）、无部署面、无 DB/schema。design.md frontmatter 无显式 risk_level 声明。探针 5 的「3 端点未调用」为存量噪音（见移交项，问题 C 域）。

## Runtime Evidence [层：人工判断]
不涉及——无运行时组件（daemon/服务/端点）触碰；CLI 行为面经直测与 verify 门禁复跑覆盖（探针 10 预填注清零 ✅）。

## 代码审查 [层：人工判断]
走查结论（探针 7 原 12 条 uncovered 已全部改判 covered，定向走查按预填面执行）：
- ① 编辑/更新链路：无 UI/回显面——本变更是解析器与门禁纯逻辑；「编辑」等价场景=同一 frontmatter 反复解析（splitFrontmatter 幂等纯函数，无残留态）。
- ② 非主分支流：parseTaskFrontmatter 三态分支（无 fm/坏/好）+ 0b 双报豁免两条件（duplicated mapping key ∧ dupKeys>0）+ mark 缺席回退 line/column=1——全部有直测（`test/taskcard-frontmatter-hardgate.test.mjs:61`/:104/:136）。
- ③ 守卫一致性：不适用（无端点/权限面）。
- ④ 载荷字段契约：不适用（探针 8「不适用」如实）。
- ⑤ 并发/事务：纯函数无共享态；worktree 内交付已按 baseline 分层。
总体评价：三消费点症状实证消失；execute 期修出一处实现真缺陷（parseTaskContracts 成功路径漏 yamlError 键），verify 期门禁全量又抓出一处存量夹具隐性非法 YAML（plan-adopt-waves §4c 双重引号 deps——恰是 0b 硬拦的真实战果），两处均为流程正向收益。遗留观察两条（不阻断）：js-yaml 原始 message 内嵌 YAML 文本坐标（如 (19:35)）与文件坐标并存可能误导——已由 0b 文案显式给文件:行:列 对冲；fmError 渲染行文件名取 t.task 拼回 .md，跨卡同名 id 场景理论可错位（现卡名=id 约定下无实害）。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
三阶段独立审查（brainstorm design 两轮 / plan / execute acceptance）结论分别落 `.sillyspec/.runtime/stage-reviews/brainstorm-review-2026-09-20-220054/`、`plan-review-2026-09-20-221645/`、`execute-review-2026-09-20-224115/review.json`，全部双 pass；brainstorm 轮抓 P1 行号 off-by-one（19/21/25→20/22/26）已修，plan 轮抓 2 P2（覆盖矩阵漏 task-02、夹具路径合写）已修，execute 轮 7/7 零缺陷。
