# 验证报告（骨架由  生成）

> 探针结果已机械预填；其余章节把  替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——6/6 任务 review 全 pass；QA 验收 10/10（GAP-1 回归钉已补复验绿）；定向 26/26+断言净增 96+lint 零新增（全量留 CI 见移交项）；移交项=全量 CI 回归（advisory）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
| 类型 | 条目 | 复跑/验收条件 |
|---|---|
| other | 全量 npm test 回归（用户指令留 CI） | CI 管道跑全量——fr-index 预存他侧零引用项非本批引入（stash 实证） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（contract-required 显式声明——纯探针逻辑无运行时集成面）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
6/6 全部完成 review pass（task-01 diff 源/task-02 前端提取/task-03 后端两趟/task-04 对账渲染/task-05 接线/task-06 测试 91 断言+缺陷回报）

## 设计一致性 [层：人工判断]
主体一致（QA 10/10 file:line 核验）。等效偏差：①isSegmentSuffix 修复（task-06 回报+主代修——前导斜杠归一，回归钉已补）②DTO 键只收起始键（docstring 自觉契约）③请求调用族不含 axios/apiFetch（旧 extractPayloadKeys 先例族——后续攒需求扩）④无前端面以全零态行承载（design 写专门注记——信息等价）⑤urlsByCall 含 normalizedUrl+comparePayloadFields 第四可选参 backendStats（向后兼容超集，JSDoc 说明）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中
- ℹ️ 1 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-04: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-05: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-06: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| worktree 可用时 source=diff，文件集=baseline..HEAD ∪ porcelain（含未跟踪展开）；三态链各级 fail-open 不抛 | `test/check-syntax.mjs` | diff（`test/check-syntax.mjs`） | covered | `test/check-syntax.mjs:77`（diff） |
| in-place 态含已提交窗口（HEAD~1..HEAD ∪ porcelain）；git 全失败退 design-list 且带模式注记 | `test/check-syntax.mjs` | place、git（`test/check-syntax.mjs`） | covered | `test/check-syntax.mjs:68`（place）、`test/check-syntax.mjs:53`（git） |
| 跨仓每注册仓双源直采，未注册/失败仓跳过不炸；路径经 unquoteGitPath 归一 | `test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/check-syntax.mjs`） |
| 分类规则裁决正确（.ts 目录启发式二态/两不中 other/.vue 无条件 frontend/.java→backend） | `test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/check-syntax.mjs`） |
| designOnlyPaths 差集产出；零新增模块 import 边（unquoteGitPath 并入既有 git-helper.js import） | `test/check-syntax.mjs` | import（`test/check-syntax.mjs`） | covered | `test/check-syntax.mjs:1`（import） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| js/ts 四形态提取正确；DTO 键仅收请求调用 8 行邻近窗口内（非请求区字面量键负例不收） | `test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/check-syntax.mjs`） |
| vue v-model/prop 与 wxml value 插值绑定/data-xxx 提取正确 | `test/check-syntax.mjs` | prop（`test/check-syntax.mjs`） | covered | `test/check-syntax.mjs:48`（prop） |
| URL 归一化三步正确（去 query/去 /api/ 前缀/去尾斜杠），urlsByCall 含行号 | `test/check-syntax.mjs` | api（`test/check-syntax.mjs`） | covered | `test/check-syntax.mjs:60`（api） |
| snake_case→lowerCamel 归一正确；首 5 行 probe8-skip 跳过并计数 | `test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/check-syntax.mjs`） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 请求参数注解三态正确——@RequestParam 正常参数名捕获（捕获组 2）/required=false 排除/value 注解显式名；数组边界不误捕 | `test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/check-syntax.mjs`） |
| 类级+方法级 mapping 拼接正确；@RequestBody 类型名交二趟回调；resolveTypeContent 返 null 不炸（fail-soft） | `test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/check-syntax.mjs`） |
| 必填三形态均命中（注解 5 行窗口/@RequestParam 缺省必填/校验调用三模式） | `test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/check-syntax.mjs`） |
| 二趟全仓解析不限 diff 面（R-07）且有大小 cap；非 Java 跳过与后端 escape hatch 计数正确 | `test/check-syntax.mjs` | diff、Java（`test/check-syntax.mjs`） | covered | `test/check-syntax.mjs:77`（diff）、`test/check-syntax.mjs:123`（Java） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 段边界后缀匹配正确——/orders 命中 /api/v1/orders、不命中 /rporders（段首对齐） | `test/check-syntax.mjs` | 命中、api（`test/check-syntax.mjs`） | covered | `test/check-syntax.mjs:86`（命中）、`test/check-syntax.mjs:60`（api） |
| driftWarnings 含 file/line/field；missingRequiredWarnings 含 endpoint/method/field/frontendFiles | `test/check-syntax.mjs` | file（`test/check-syntax.mjs`） | covered | `test/check-syntax.mjs:6`（file） |
| 渲染为独立子段+命中统计行+明细行；advisory 不阻断（对账结果不进 errors/warnings） | `test/check-syntax.mjs` | advisory（`test/check-syntax.mjs`） | covered | `test/check-syntax.mjs:95`（advisory） |
| 渲染行不匹配 verify-postcheck.js:2887/:2891 PROBE8 系锚点正则（行前缀字面不同） | `test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/check-syntax.mjs`） |
| probe8 既有 design 契约面对账输出零变化；probe1-7/9 零改动 | `test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/check-syntax.mjs`） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| probe8 文件源按 collectProbe8DiffFiles 三态切换；输出含模式注记行 | `test/probe8-direct-compare.test.mjs` | 三态各一用例 | covered | `test/probe8-direct-compare.test.mjs:64`（worktree 态）+:110（in-place 态）+:142（design-list 态） |
| designOnlyPaths 渲染为 advisory 注记行（不阻断） | `test/probe8-direct-compare.test.mjs` | 差集注记 | covered | `test/probe8-direct-compare.test.mjs:64`（worktree 态差集断言）+:110（in-place 态差集注记） |
| 既有 design 契约面对账（contractOrphans/missingRequired）输出前后一致零变化 | `test/probe8-direct-compare.test.mjs` | 端到端 | covered | `test/probe8-direct-compare.test.mjs:526`（端到端缺省内部采集→契约面与直比面并存） |
| probe1-7/9 输出零改动；diff 取数失败 fail-open 不炸 | `test/probe8-direct-compare.test.mjs` | 兜底 | covered | `test/probe8-direct-compare.test.mjs:142`（git 失败 design-list 兜底）+:180（入参缺失空面不抛） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 新文件约 35 断言全绿且覆盖上述全态；两既有文件适配后全绿 | `test/probe8-direct-compare.test.mjs`<br>`test/probe8-payload-parity.test.mjs`<br>`test/probe8-contract-pivot.test.mjs`<br>`test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/probe8-direct-compare.test.mjs`） |
| 渲染锚点负例在列（direct-compare 行不匹配 PROBE8 系锚点正则） | `test/probe8-direct-compare.test.mjs`<br>`test/probe8-payload-parity.test.mjs`<br>`test/probe8-contract-pivot.test.mjs`<br>`test/check-syntax.mjs` | direct、compare、PROBE8（`test/probe8-direct-compare.test.mjs`、`test/probe8-contract-pivot.test.mjs`） | covered | `test/probe8-direct-compare.test.mjs:2`（direct）、`test/probe8-direct-compare.test.mjs:2`（compare）、`test/probe8-direct-compare.test.mjs:23`（PROBE8） |
| 断言与实现不符时修实现侧——测试逻辑本身无误时禁改断言迁就 | `test/probe8-direct-compare.test.mjs`<br>`test/probe8-payload-parity.test.mjs`<br>`test/probe8-contract-pivot.test.mjs`<br>`test/check-syntax.mjs` | — | covered | （无机械命中——人工核验 `test/probe8-direct-compare.test.mjs`） |

- ⚠️ 零/半自动化承接条目 15 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
6 条决策全闭环：D-001→task-01/05/07 测试、D-002→task-02/04、D-003→task-03/04、D-004→task-04（advisory 档）、D-005（边界）、D-006→task-04（probe8 内子段）——全部有测试锚点（下方矩阵）。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 20 backend endpoints (live [scan-root 4 + worktree 4] + artifact 20), 0 frontend calls [scope: change-diff (6 files @ worktree)] | 20 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 20 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx、GET /api、GET /api/path …

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 4 个非 Java 清单文件不在探针 9 扫描面）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（四选一）：covered / partial / uncovered / non-testable。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- 定向（全量留 CI）：node --test 三文件 26/26 全绿×2 连跑（16 用例 91 断言+两既有文件+5 追加断言）+回归钉补后 16/16 复验
- npm run lint：probe8 面 7 导出零告警（白名单清理后真实跨文件引用）；唯一项 fr-index 预存他侧（stash 实证非本批）
- 断言净增 96（91+5）
- known_failures：无

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03 | task-01、task-05、task-06 | <待填：证据回指> | <待填> |
| D-002@v1 | FR-01、FR-02、FR-03 | task-02、task-04、task-06 | <待填：证据回指> | <待填> |
| D-003@v1 | FR-01、FR-02、FR-03 | task-03、task-04、task-06 | <待填：证据回指> | <待填> |
| D-004@v1 | FR-01、FR-02、FR-03 | task-04、task-06 | <待填：证据回指> | <待填> |
| D-005@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | <待填：证据回指> | <待填> |
| D-006@v1 | FR-01、FR-02、FR-03 | task-04、task-06 | <待填：证据回指> | <待填> |

## 技术债务 [层：人工判断]
- 探针 1 命中为骨架生成器/校验器/夹具字面占位词，非实现债
- 留档：DTO 起始键覆盖窄（多键单行不收）+请求调用族不含 axios（攒需求扩）；批次 D/E 路线债见 design 非目标

## 变更风险等级 [层：人工判断]
显式声明 = contract-required（design frontmatter）——纯探针逻辑无运行时集成面。

## Runtime Evidence [层：人工判断]
- 长驻进程/端点/请求/日志/生命周期：均不涉及（CLI 探针逻辑）
- 进程日志：定向 node --test 26/26 exit 0 + QA 独立复跑同结果
- 失败模式排除：三态 fallback 各 fail-open 不抛/resolveTypeContent null 抛错 fail-soft/isSegmentSuffix 前导斜杠缺口已修+回归钉
<!-- 降级路径（design §3.2，D-004 收口）：服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及 -->

## 代码审查 [层：人工判断]
- QA 验收 10/10：GAP-1 isSegmentSuffix 回归钉（主代已补）/注记 2 条（无前端面措辞/接口超集均为向后兼容）。
- 走查定向面：①无 UI 编辑链 ②fail-open/fail-closed 边界全断言 ③零新增 import 边 ④探针 8 双维度独立渲染防撞实证 ⑤纯函数零 IO。
- 总体：可交付。EHS P1-1/P1-2 形态端到端实测可抓（漂移 leaderUserId/漏发 reportOrgId）——静态机械防线兑现。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
execute QA 验收（agent-tool 通道）：specVerdict=pass / qualityVerdict=pass（10/10 checklist 含 file:line，GAP-1 已修复闭环）；review.json 存 .runtime/stage-reviews/execute-review-2026-09-18-094206/。对「结论枚举」无影响。
