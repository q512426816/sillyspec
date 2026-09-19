# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS`——三 task 四提交（材料包契约/四阶段改写/验收钉+QA 修复轮），验收钉 19+31 断言绿、两原语 src/ 绝迹（机械达成）、镜像三步流水线一致、QA 两轮 pass（14 pass/2 定性 gap/0 fail）；全量套件仅已知环境红（docs-check 字节比对，主仓同红）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| other | Gap 1 CLI 机械注入接线（包组装 helper 已就位但生产调用点为零——主代理按模板指引手工组装）与 Gap 4 map 夹带并行补录披露 | 后续小变更接 CLI 注入链（照 execute 热区直抽先例）；G4 已披露无需动作 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- task-01: satisfied | verifiedFiles: src/review-material-pack.js, src/run/prompt.js（worktree 提交1：四形态组包/热区/diff 委托/双分支 join——QA 两轮 pass + 19 断言）
- task-02: satisfied | verifiedFiles: src/stages/brainstorm.js, src/stages/plan.js, src/stages/execute.js, src/stage-review.js（worktree 提交2+4：两原语删除/基准面/排他语/fixDiff 腿——grep 零命中 + 31 断言）
- task-03: satisfied | verifiedFiles: test/review-material-pack.test.mjs, docs/prompt/_extracted.json（worktree 提交3：验收钉 19 断言/三步流水线 _verify exit 0/map 补录）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（纯 prompt 模板与注入框架变更，零运行时集成面；risk_level 显式 unit-sufficient 压仪式档）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
3/3 完成：task-01 注入基建（worktree 提交 1，四形态组包+热区+diff 委托+双分支 join）；task-02 四阶段契约（提交 2，两原语删除+基准面+排他语）；task-03 验收钉+镜像（提交 3，19 断言+三步流水线+map 补录）；QA 修复轮（提交 4，fixDiff 腿+stat 修正+31 断言翻新）。存疑：无

## 设计一致性 [层：人工判断]
一致（QA 材料包口径两轮：首轮 12 pass/4 gap/0 fail；Gap 2/3 修复后复核 14 pass/2 gap/0 fail）。实现优于设计：机械钉首跑咬中自身头注原语引用（改措辞不改钉——钉的严格性自证）。定性偏差两条（Gap 1 CLI 注入接线后续、Gap 4 map 夹带披露）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stages/plan.js:371` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `src/stages/plan.js:410` decision_ids: [D-XXX@vN]
- ⚠️ `src/stages/plan.js:526` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `src/stages/execute.js:335` - **报告骨架勿手写**：先跑 \`sillyspec symbol-impact --change <change-name>\`——CLI 从 tasks.md 生成逐 task \`<!--TODO-->\` 骨架（gate 拦截时也会自动落一份）；把每行占位替换为真实结论（**未替换的 TODO 占位会被 g
- ⚠️ `src/stages/execute.js:491` - 是否有未处理的 TODO/FIXME
- ⚠️ `src/stage-review.js:152` '- **推荐**:docHash 先占位(如 `"TODO"`),review.json 写完后跑',
- ℹ️ glob 项未展开（agent 手动展开扫描）：docs/prompt/_extracted.json 与 docs/prompt/*.md
- ℹ️ 2 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
能力关键词 × 实现锚：buildReviewMaterialPack 四形态→src/review-material-pack.js（19 断言）；extractDesignHotZone→同文件（execute.js:979-1023 先例泛化）；extractDiffSummary 委托 resolveVerifyChangedFiles→verify-postcheck.js:1113；{REVIEW_MATERIALS} 注入→run/prompt.js 双分支 join（断言钉）；两原语删除→brainstorm.js:415-421 基准面段（grep src/ 零命中）；排他语→stage-review.js renderPriorRoundFindingsMd「唯一基准面」；fixDiff 腿→collectSameStagePriorReview async 采集+渲染块（31 断言）；镜像三步→_extract/_sync/_verify exit 0

#### 探针 3：验收标准测试覆盖
- ⚠️ task-01: 模块目录（NEW:src、src/run）递归未找到测试文件（含 co-located tests/）
- ✅ task-02: 模块目录（src/stages、src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-03: 模块目录（NEW:test、docs）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| buildReviewMaterialPack 四形态可渲染（grill-first/plan-review/execute-qa/re-review 各自 schema 字段在场且为注入文本形态）——单测文件由 task-03 落盘，本 task 交付可单测的纯函数 | `test/review-material-pack.test.mjs` | buildReviewMaterialPack、grill、first、plan（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:8`（buildReviewMaterialPack）、`test/review-material-pack.test.mjs:43`（grill）、`test/review-material-pack.test.mjs:43`（first） |
| extractDiffSummary 的 base 解序与 resolveVerifyChangedFiles 一致（actualBaseHash/baselineCommit 优先于 baseHash；±行数与 git diff --stat 对齐） | `test/review-material-pack.test.mjs` | extractDiffSummary、一致（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:15`（extractDiffSummary）、`test/review-material-pack.test.mjs:46`（一致） |
| 注入位容错——{REVIEW_MATERIALS} 材料在→注入包文本；缺失→空串且 prompt 无残留占位符（含 :1475-1480 降级分支路径） | `test/review-material-pack.test.mjs` | REVIEW_MATERIALS（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:10`（REVIEW_MATERIALS） |
| 再审模板不含 {REVIEW_MATERIALS} 槽（两槽互斥）；{PRIOR_REVIEW_FACTS} 双块拼接行为零回归 | `test/review-material-pack.test.mjs` | REVIEW_MATERIALS、两槽互斥（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:10`（REVIEW_MATERIALS）、`test/review-material-pack.test.mjs:9`（两槽互斥） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| grep -rn "必须读取完整\\|素材宁可多读" src/ 零命中（现命中 src/stages/brainstorm.js:417 与 :424，均在本 task 改写面内） | `test/review-material-pack.test.mjs` | 必须读取完整、素材宁可多读、src（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:5`（必须读取完整）、`test/review-material-pack.test.mjs:5`（素材宁可多读）、`test/review-material-pack.test.mjs:5`（src） |
| Grill 首轮/plan 审/execute QA 三处输入段为包注入形态且自检首项在场；再审派发 prompt 含排他语（复审基线段「唯一基准面」）与 fixDiff | `test/review-material-pack.test.mjs` | plan、execute（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:46`（plan）、`test/review-material-pack.test.mjs:48`（execute） |
| 前序 pass 段（src/run/prompt.js:1449-1451）保持建议语不动；填卡步 src/stages/plan.js:500 不动；评审轮次/S2/S3 菜单零改动 | `test/review-material-pack.test.mjs` | pass、src、run、prompt（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:18`（pass）、`test/review-material-pack.test.mjs:5`（src）、`test/review-material-pack.test.mjs:57`（run） |
| 占位符机制零改动；存量 review.json 产物契约（schemaVersion/reviewType/verdict）不变 | `test/review-material-pack.test.mjs` | review、json（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:2`（review）、`test/review-material-pack.test.mjs:66`（json） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 验收 1：grep -rn "必须读取完整\\|素材宁可多读" src/ 零命中（断言组一绿） | `test/review-material-pack.test.mjs` | 验收、必须读取完整、素材宁可多读、src（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:2`（验收）、`test/review-material-pack.test.mjs:5`（必须读取完整）、`test/review-material-pack.test.mjs:5`（素材宁可多读） |
| 验收 2：四阶段包形态单测绿（buildReviewMaterialPack 四 schema）；两槽互斥断言绿（再审模板无 MATERIALS 槽） | `test/review-material-pack.test.mjs` | 验收、buildReviewMaterialPack、schema（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:2`（验收）、`test/review-material-pack.test.mjs:8`（buildReviewMaterialPack）、`test/review-material-pack.test.mjs:8`（schema） |
| 验收 3：排他语在场（复审基线段「唯一基准面」）；自检首项在四阶段 prompt 在场（断言组三绿） | `test/review-material-pack.test.mjs` | 验收、排他语在场、唯一基准面（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:2`（验收）、`test/review-material-pack.test.mjs:76`（排他语在场）、`test/review-material-pack.test.mjs:11`（唯一基准面） |
| 验收 4：extractDiffSummary base 解序与 resolveVerifyChangedFiles 一致（锚点优先级单测绿） | `test/review-material-pack.test.mjs` | 验收、extractDiffSummary（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:2`（验收）、`test/review-material-pack.test.mjs:15`（extractDiffSummary） |
| 验收 5：docs/prompt 三步流水线跑通且镜像一致（node docs/prompt/_verify.mjs 绿） | `test/review-material-pack.test.mjs` | 验收、prompt、node（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:2`（验收）、`test/review-material-pack.test.mjs:9`（prompt）、`test/review-material-pack.test.mjs:13`（node） |
| 验收 6：npm test 全量＋lint 通过 | `test/review-material-pack.test.mjs` | 验收、test、全量（`test/review-material-pack.test.mjs`） | covered | `test/review-material-pack.test.mjs:2`（验收）、`test/review-material-pack.test.mjs:6`（test）、`test/review-material-pack.test.mjs:77`（全量） |

#### 探针 4：决策追踪覆盖
决策追踪五条全闭环（矩阵 Evidence 列已填）：D-001 契约矛盾（四模板改写）→FR-01；D-002 四形态→FR-01；D-003 机械钉→FR-03；D-004 基准面→FR-02；D-005 非目标+镜像→FR-03。无未闭环行

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (13 files @ worktree)] | 3 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx

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
- ✅ 预填注清零（4 个在检文件无未确认预填）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
定向：review-material-pack 19/0、stage-review-prior-round 31/0、stage-review 80/0、wait-gates 4/0；lint 688 文件全绿（未引用导出 0+map 覆盖全）。全量（worktree）：仅 docs-check-fix 字节比对两例环境红（对仓库未提交态敏感，主仓对照同红——基线锚 84d498a 早于本变更）

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01 | task-01 || 契约矛盾定位+打包判定落地（四阶段模板基准面化） | 已闭环 |
| D-002@v1 | FR-01、FR-02 | task-01、task-02 || 四形态包 schema（buildReviewMaterialPack 19 断言）+fixDiff 腿（QA 修复轮） | 已闭环 |
| D-003@v1 | FR-03 | task-03 || 两原语 src/ 绝迹（机械钉组一）——可证伪验收达成 | 已闭环 |
| D-004@v1 | FR-01、FR-02 | task-02 || 基准面语义+自检 cannot_verify 兜底（四模板+排他语渲染体） | 已闭环 |
| D-005@v1 | FR-03 | task-03 || 非目标守界（填卡步未动）+镜像三步流水线 _verify 绿 | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 命中全为骨架机制字面量（生成器代码非债务）；新文件零 TODO/FIXME。债登记：Gap 1 CLI 注入接线（移交项承载）

## 变更风险等级 [层：人工判断]
显式声明 = unit-sufficient（design frontmatter risk_level，压仪式档）：纯 prompt 模板与注入框架变更，零运行时集成面。声明面口径：文件面命中 S2 门禁判定声明（src/stage-*.js + stage-review.js）无 evidence:true 命中。留痕：risk_level 由 design frontmatter 显式声明 = unit-sufficient（压仪式档；evidence 要求不受豁免——本变更无 evidence 命中）

## Runtime Evidence [层：人工判断]
<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->
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
