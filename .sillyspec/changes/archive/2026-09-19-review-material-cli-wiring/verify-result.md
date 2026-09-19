---
author: qinyi
created_at: 2026-09-19 17:45:00
---
# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——三 task 全落（worktree 7 提交→主仓 33fca7f）、定向证据全绿（review-material-pack 32/32、worktree-execute-spec-drift 16/16、lint 688 文件、docs/prompt/_verify exit 0）、三 Gate 过（brainstorm Grill independent 15 pass / plan S2 10 pass / execute QA 12 项 11 pass+1 gap 当场修复）、dogfood 端到端实证真注入；NOTES＝全量 npm test 有**先于本变更的主仓基线红**（5 文件，含本测试文件组一的套件 cwd 相对路径 ENOENT——本变更未引入新红，定向单跑全绿）＋两条顺延项（见移交项）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| other | 全量 npm test 基线红（先于本变更，主仓基线即 5 文件红：docs-check-fix/final-four-fixes/review-material-pack/run-help-shortcircuit/stage-review-checklist——根因一类为套件 runner cwd=test/（test/run-tests.mjs:113）下测试内相对路径 `src/...` ENOENT，一类为 docs-check 字节比对既知环境红；本变更新增断言全部定向可跑且绿，未加重基线） | 后续小变更把相对路径断言锚到 import.meta.url 仓根（同 worktree-execute-spec-drift.test.mjs:18 先例）；或 runner 侧统一 cwd=仓根。known_failures 豁免面不变 |
| other | core-engine 模块卡超预算（36KB+）split-changelog 顺延——预览涉及 hooks/setup/sync 等多他模块卡，超出本变更文件面且并行会话活跃，不顺手 --force | 独立 quick 跑 `sillyspec modules split-changelog --force`（预览输出已在案） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
- task-01: satisfied | verifiedFiles: src/review-material-pack.js（worktree 提交 335cb4e/2e0df51/83d3de6：三形态装配+留位+safeGit .value 修复+前缀剥离；组四 8+2 断言）
- task-02: satisfied | verifiedFiles: src/run/prompt.js, src/stages/brainstorm.js, src/stages/plan.js, src/stages/execute.js（worktree 提交 b9b5790：注入链+三槽+补位指引；端到端冒烟实证+源码钉）
- task-03: satisfied | verifiedFiles: test/review-material-pack.test.mjs, docs/prompt/_extracted.json, docs/prompt/brainstorm.md, docs/prompt/verify.md（worktree 提交 741f707/109e94d：组四钉+流水线镜像；32/32+_verify exit 0）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
无（risk_level 显式 unit-sufficient；CLI 内 prompt 组装注入，零部署/运行时集成面——端到端冒烟证据见 Runtime Evidence 节）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
3/3 完成：task-01 装配函数 assembleStageReviewMaterials（src/review-material-pack.js:228，三形态素材半边+留位半边恒不预填）；task-02 注入链接线+三模板槽（src/run/prompt.js:1475-1486、src/stages/brainstorm.js:418、src/stages/plan.js:362、src/stages/execute.js:445）；task-03 组四钉+镜像流水线（test/review-material-pack.test.mjs:91-152、docs/prompt 三步 exit 0）。QA 修复轮两枚（dogfood 咬出 safeGit stat [object Object] 潜伏 bug src/review-material-pack.js:83、QA P3-1 fileList 前缀剥离 :186）。存疑：无

## 设计一致性 [层：人工判断]
一致（execute QA 独立审查 12 项：11 pass+1 gap——gap 即 fileList 前缀未剥，当场修复为与 design 措辞一致）。设计目标 1-3 与三 Wave 逐项落实；非目标守界实证（buildReviewMaterialPack 四形态 schema 零改动——全 diff 对 src/review-material-pack.js:112-143 区间字节未动；{PRIOR_REVIEW_FACTS} 再审面与 stage-review.js 不在 diff；ceremony 定价零触碰——prompt.js 改动收敛于 tier 注入块内）。Grill 意见①（stale 注释改写）②（specBase 显式接线）落实。两条预估偏差已披露（P3-2：plan/execute.md 镜像属 DYNAMIC 豁免面实际未变；P3-3：verify.md 漂移回同步与 meta.json 簿记超出清单字面面——apply 后 design 清单已补 verify.md 行）

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stages/plan.js:373` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `src/stages/plan.js:412` decision_ids: [D-XXX@vN]
- ⚠️ `src/stages/plan.js:528` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `src/stages/execute.js:335` - **报告骨架勿手写**：先跑 \`sillyspec symbol-impact --change <change-name>\`——CLI 从 tasks.md 生成逐 task \`<!--TODO-->\` 骨架（gate 拦截时也会自动落一份）；把每行占位替换为真实结论（**未替换的 TODO 占位会被 g
- ⚠️ `src/stages/execute.js:492` - 是否有未处理的 TODO/FIXME
- ⚠️ `docs/prompt/_extracted.json:176` "prompt": "生成完整验证报告，并写入 verify-result.md。\n\n### 操作\n1. 汇总以上所有检查结果\n2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描。本步骤 --done 时，CLI 按项目声明危险面（`_module-m
- ⚠️ `docs/prompt/_extracted.json:269` "prompt": "根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。\n\n⚠️ 这一步是可选的。如果项目模块简单、流程不明显，可以跳过。\n\n### flows/ 目录\n目标目录：`{DOCS_ROOT}/flows/`\n\n根据 _module-map.yaml 中的模块依赖关系，识别跨模
- ⚠️ `docs/prompt/_extracted.json:490` "prompt": "对上一步生成的 plan.md 做审查。生成与审查分离——不在生成 plan 的同一上下文里自审，避免确认偏差。\n\n### 执行前确认门（plan_level=full 时）\nplan.md 审查通过后、进入 execute 前，若 plan_level=full（跨模块/大变更），必须先向
- ⚠️ `docs/prompt/_extracted.json:504` "prompt": "为 plan.md 中的每个任务生成紧凑 TaskCard。\n\n⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：\n- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan
- ⚠️ `docs/prompt/_extracted.json:547` "prompt": "加载计划、设计和代码库上下文。\n\n### 操作\n1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）\n2. 读取 design.md（技术方案）\n3. 读取 CONVENTIONS.md、ARCHI
- ⚠️ `docs/prompt/_extracted.json:609` "prompt": "对本次变更进行代码审查。\n\n### 执行方式\n本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。\n\n### 操作\n1. 检查 git diff 查看所有变更\n2. 审查要点：\n   - 代码风格是否符合 CONVENTIONS.md\n 
- ⚠️ `docs/prompt/verify.md:247` 4. 搜索技术债务：grep TODO/FIXME/HACK/XXX（仅限变更文件）
- ⚠️ `docs/prompt/verify.md:293` 3. **生成 verify-result.md 骨架（勿从零手写）**：先跑 `sillyspec verify-probes --change <change-name> --init`——一条命令生成十章节骨架（已存在不覆盖），其中**探针结果章节已机械预填**（探针 1 的 TODO/FIXME 命中清单、探针
- ⚠️ `docs/prompt/plan.md:362` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `docs/prompt/plan.md:464` decision_ids: [D-XXX@vN]
- ⚠️ `docs/prompt/plan.md:513` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `docs/prompt/execute.md:473` - 是否有未处理的 TODO/FIXME
- ℹ️ 语义复核（agent）：以上 17 处命中全为骨架/生成器机制字面量（模块卡骨架说明、报告骨架文案、_extracted.json 镜像 JSON、流程文档）——非未实现标记；本变更测试/实现代码零 TODO/FIXME 命中

#### 探针 2：设计关键词覆盖
能力关键词 × 实现锚：assembleStageReviewMaterials 三形态→src/review-material-pack.js:228-262（grill/plan/execute-qa 分支）；章节行号索引→同文件 sectionIndexLines :150；文件变更清单表解析→extractDesignFileList :178（剥反引号+NEW:/MOD: 前缀 :186）；全局硬约束抽取→extractHardConstraints :194；decisions P0/P1 兜底→extractDecisionConstraints :211（accepted 过滤）；diff 委托→extractDiffSummary :64-86（resolveVerifyChangedFiles 单点、safeGit .value :83）；REVIEW_CHECKLISTS.execute→import :25+execute-qa 分支 :253；{REVIEW_MATERIALS} 注入→src/run/prompt.js:1467-1486（占位符在场才组装 :1472、stage 映射 :1476、主链 join :1486）；三模板槽→src/stages/brainstorm.js:418、src/stages/plan.js:362、src/stages/execute.js:445；补位指引→同三处槽前散文；降级 join 空串→src/run/prompt.js:1495。零「可能未实现」关键词

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-02: 模块目录（src/run、src/stages、docs/prompt）递归未找到测试文件（含 co-located tests/）
- ✅ task-03: 模块目录（test、docs/prompt）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️
- ℹ️ 语义复核（agent）：task-02 归属面＝集成盲区（prompt 渲染链），由端到端冒烟覆盖（Runtime Evidence 节）＋源码钉（`test/review-material-pack.test.mjs` 组四）；断言有效性抽查见「代码审查」节；task-01/task-03 归属 test/review-material-pack.test.mjs 组四（:119-:149）

#### 探针 7：验收×测试覆盖矩阵

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| AC-01：grill-first 非空（章节索引+背景/目标+文件清单）＋交叉点留位 | `test/review-material-pack.test.mjs` | grill-first、章节索引 | covered | `test/review-material-pack.test.mjs:119`（章节索引+文件清单+前缀剥离）、:120（交叉点留位） |
| AC-02：plan-review 硬约束行＋缺节 decisions 兜底＋差量留位 | `test/review-material-pack.test.mjs` | plan-review、硬约束 | covered | `test/review-material-pack.test.mjs:124`（HC-1/HC-2）、:133（decisions P0 兜底+rejected 排除）、:125（差量留位） |
| AC-03：execute-qa 非空（diff 摘要/热区/清单节）＋未知 stage/素材全缺→空串 | `test/review-material-pack.test.mjs` | execute-qa、空串 | covered | `test/review-material-pack.test.mjs:138`（三节在场）、:142（stat 无 [object Object]）、:145-:147（三类边界空串） |
| 导出契约 Promise<string>＋best-effort 不抛错 | `test/review-material-pack.test.mjs` | best-effort | covered | `test/review-material-pack.test.mjs:91-152`（全组 await 调用零异常＋边界断言）＋ src/review-material-pack.js:231（catch→''） |
| buildReviewMaterialPack 四形态 schema 零改动 | `test/review-material-pack.test.mjs` | 四形态 | covered | 既有组二（:44-:54 零改动保持绿——schema 未变则断言原样过）；git 事实：src/review-material-pack.js:112-143 区间无 diff |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| AC-04：主链 join 装配结果＋降级 join 空串＋组二 joins≥2 仍绿 | `test/review-material-pack.test.mjs` | join、装配 | covered | `test/review-material-pack.test.mjs:147`（主链源码钉）、:148（降级分支）、:59（既有 joins≥2 零改动绿） |
| AC-06：三模板槽在场＋流水线 exit 0 | `test/review-material-pack.test.mjs` | 模板、槽 | covered | `test/review-material-pack.test.mjs:149`（三模板槽钉）；流水线为命令面（node docs/prompt/_verify.mjs exit 0 实测，见测试结果节——非单测承载，注记） |
| stageName→stage 映射＋specBase=tierSpecBase＋失败空串无残留 | `test/review-material-pack.test.mjs` | 映射、specBase | covered | 源码钉 `test/review-material-pack.test.mjs:147`＋src/run/prompt.js:1476-1477（映射与 specBase 显式传）；运行时行为由端到端冒烟实证（Runtime Evidence） |
| 再审面零改动（{PRIOR_REVIEW_FACTS}/collectSameStagePriorReview/renderPriorRoundFindingsMd/tier 判定） | `test/review-material-pack.test.mjs` | 再审、互斥 | covered | `test/review-material-pack.test.mjs:61`（两槽互斥既有钉绿）＋ 组三排他语 ：76-80（renderPriorRoundFindingsMd 零回归）＋ git 事实（stage-review.js/review-tier.js 不在 diff） |
| 既有测试零失效 | `test/review-material-pack.test.mjs`、`test/worktree-execute-spec-drift.test.mjs` | 既有、零失效 | covered | 定向实测：`test/review-material-pack.test.mjs` 32/32（组一二三原断言含在内，:38/:59/:61/:76 零改动绿）、`test/worktree-execute-spec-drift.test.mjs` 16/16（主仓合入后跑） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| AC-05：既有组一/二/三零改动绿＋定向+全量+lint | `test/review-material-pack.test.mjs` | 组一、绝迹 | covered | `test/review-material-pack.test.mjs:38`（两原语绝迹组一零改动绿）＋定向 32/32＋lint 688 绿实测（测试结果节）；全量见移交项基线红注记 |
| AC-04（钉面）/AC-06（验面）/组四三断言面 | `test/review-material-pack.test.mjs` | 钉、断言面 | covered | `test/review-material-pack.test.mjs:119-:149`（组四全部断言）＋ docs/prompt/_verify.mjs exit 0 |

- ⚠️ 零/半自动化承接条目复核：预填 9 条 uncovered 经逐格改写为 covered（预填基于关键词机械匹配未识别组四承接面——组四为本变更新增断言组，承接关系见上表证据列）；流水线 exit 0 为命令面证据（非单测），已在测试结果节留痕

#### 探针 4：决策追踪覆盖
D-001@v1（tier 注入链）→FR-01→task-02→src/run/prompt.js:1467-1486 闭环；D-002@v1（混合边界）→FR-01/02→task-01+02→留位断言 test:120/:125＋模板补位指引三处闭环；D-003@v1（可测拆分）→FR-03→task-03→组四 fixture+源码钉 test:91-152 闭环。requirements.md FR-01~03 三条与 Wave/task 互证无悬空

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4] + artifact 0), 0 frontend calls [scope: change-diff (1 files @ scan-root)] | 3 backend endpoints unused by frontend
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx
- ℹ️ 语义复核（agent）：scan-root 面为扫描器误识别示例端点（GET /api/path 等）——本变更为 CLI 内 prompt 工程无 HTTP 端点面，warning 不适用

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 11 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（4 个在检文件无未确认预填）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
- 无接口面（design 接口段为 JS 模块函数契约非 HTTP 端点；装配函数接口由探针 7 组四断言承接——parseDesignApiTable 零端点属实）

## 测试结果 [层：确定性检查——CLI 实测对账]
定向（主仓合入后实测 2026-09-19）：node test/review-material-pack.test.mjs 32/0；node test/worktree-execute-spec-drift.test.mjs 16/0；node test/check-syntax.mjs 688 文件绿（未引用导出 0+map 覆盖全）；node docs/prompt/_verify.mjs exit 0（14 处未匹配为 plan/execute 动态段+archive/doctor fence 既知豁免面）。全量 npm test：主仓基线（先于本变更，33fca7f^ 工作区）5 文件红（docs-check-fix/final-four-fixes/review-material-pack/run-help-shortcircuit/stage-review-checklist）——归因：套件 runner 以 cwd=test/ 执行（test/run-tests.mjs:113），测试内相对路径 `src/...` ENOENT 类既存缺陷＋docs-check 字节比对既知环境红；本变更后红名单零新增（同 5 文件），定向单跑本变更测试全绿。worktree 态全量另有 12 个 init/platform 类环境红（spawn worktree bin/sillyspec.js init 在隔离环境失败——与本 diff 无关，见移交项）。known_failures 豁免面：无涉及

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01 | task-02 | src/run/prompt.js:1467-1486（注入链同链填充＋降级保持）＋test:147-148 源码钉 | 已闭环 |
| D-002@v1 | FR-01、FR-02 | task-01、task-02 | src/review-material-pack.js:228-262（crossPoints/planDelta 恒不预填）＋test:120/:125 留位钉＋三模板补位指引 | 已闭环 |
| D-003@v1 | FR-03 | task-03 | test/review-material-pack.test.mjs:91-152（fixture 三形态非空＋源码钉；既有组零改动） | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 命中全为骨架机制字面量（生成器代码非债务）；变更文件零 TODO/FIXME。债登记两条进移交项：全量基线红的相对路径锚定（既存，非本变更引入）、core-engine 卡 split-changelog（超预算顺延）

## 变更风险等级 [层：人工判断]
显式声明 = unit-sufficient（design.md frontmatter risk_level，先于 brainstorm 完成门落盘）：CLI 内 prompt 组装与注入，零部署/运行时集成面；单测（组四 fixture）＋源码钉＋端到端冒烟（dogfood）三面证据。声明面口径：文件面命中 S2 门禁判定声明（src/stage-*.js）无 evidence:true 命中

## Runtime Evidence [层：人工判断]
- 端到端冒烟①（worktree 实现态，2026-09-19）：getStageSteps('brainstorm')→outputStep 渲染本变更 Grill 步（idx=6）——{REVIEW_MATERIALS} 被真实包内容填充：基准面头＋章节行号索引 L10-L113＋背景/设计目标节体＋文件清单 7 文件；零占位符残留（输出样张 /tmp/smoke-out.txt :128-168）
- 端到端冒烟②（dogfood 首例机械包，2026-09-19）：assembleStageReviewMaterials('execute-qa') 以本变更 worktree 为 cwd 真实装配——diff 摘要 10 文件＋真实 git --stat 文本＋design 热区（非目标/兼容策略）＋验收清单（REVIEW_CHECKLISTS.execute），产物 .sillyspec/.runtime/qa-pack-execute-2026-09-19-review-material-cli-wiring.md；该包直接用于 execute 阶段 QA 独立子代理派发并 pass/pass（reviewType=acceptance，execute-review-2026-09-19-170411）——注入链在真实评审流闭环
- 主仓合入：git commit 33fca7f（9 文件 253+/37-）；合入后定向四项全绿（测试结果节）；不涉及服务/端点/守护进程（「不涉及」）

## 代码审查 [层：人工判断]
走查清单（探针 7 零覆盖定向面）：
① 编辑/更新链路：装配函数为纯新增只读链路（无编辑/回显态）；prompt 注入块变量作用域核过（reviewMaterialsMd 声明于 try 域外、join 消费于同域，src/run/prompt.js:1471-1486）——无残留态
② 非主分支流：tier=self 路径（占位符同被填充——self 审同样吃包基准面，行为一致合理）；降级 catch 分支 join('') 保持（src/run/prompt.js:1495）；占位符不在场路径零组装零 IO（:1472 guard）——三分支核过
③ 守卫一致性：两槽互斥（stage-review.js 零改动＋test:61 钉）；specBase 单源（:1477 tierSpecBase，无第二解析源）
④ 载荷字段契约：包 schema（grill/plan/execute-qa inputs 键）与 buildReviewMaterialPack 消费键逐一对上（assembleStageReviewMaterials :238/:249/:253）
⑤ 并发：装配只读（readFileSync/只读 git diff），prompt 渲染为单会话动作——无共享态竞争；多 agent 并行下 design.md 读取为瞬时快照，与既有 {PRIOR_REVIEW_FACTS} 同风险级
断言有效性抽查（3 个核心断言）：组四 :119（验真实渲染内容非空断言——含具体子串）；:142（负向断言防 [object Object] 回归）；:147（源码钉验接线字面量——实现细节钉，但该钉的契约就是「接线在场」本身，合理）。总体评价：接线面小而清，两枚修复（safeGit .value/前缀剥离）均为 dogfood 真实咬出而非臆测，质量可信

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
execute 阶段 QA 独立子代理（通道=agent-tool，材料包=本变更换的机械装配首例）结论回流：verdict pass/pass，12 项 checklist＝11 pass＋1 gap（P3-1 fileList 前缀——当场修复，提交 83d3de6，断言翻新 :119）；P3-2（plan/execute.md 镜像 DYNAMIC 豁免未变，预估偏差已披露）/P3-3（verify.md 漂移回同步+meta 簿记超清单字面面，apply 后清单已补）不阻断。对结论枚举无影响（PASS WITH NOTES 成立）
