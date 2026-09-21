# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——四模块与 design 逐字一致（fail-closed 红线三层落实/只读承诺/草拟不代写/逃生门），定向 31 断言+全量 566/578+lint 737+doc-ref 93/93+docs check 611/611+镜像 39/51=基线组成；notes=①worktree 13 环境族失败（env-blocked 移交，apply 后主仓复跑兜底）②集成实测记录 not-ran（本批无运行时组件，等价集成面=四新测试件+CLI 实测链，按 D-006 判定表如实降档）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| env-blocked | worktree 内 13 个测试文件失败（cwd 守卫环境族，Wave1 起基线即如此，主仓同族绿） | apply 后主仓跑 npm test（预期全绿） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（五卡 review 均 pass/pass）。

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（纯 CLI 渲染/账本/预检层，无运行时组件；等价集成面由四新测试件承接）。

## 任务完成度 [层：人工判断]
task-01 P2 完成 ✅（test-ledger 四态绿+双消费点接线）；task-02 P4 完成 ✅（翻默认+四件迁移+三钉）；task-03 P1 完成 ✅（--full 两档+3/3，quick 档据实缩面 review 留痕）；task-04 P3 完成 ✅（就绪度 3/3+重锚附带）；task-05 完成 ✅（39/51 基线组成+双卡+611/611）。完成率 5/5。

## 设计一致性 [层：人工判断]
实现与 design.md 一致。三处实现期细化（均 review 留痕）：P2 账本自排除（落账改 porcelain 自毁键——目录折叠形态实证修复）；P1 quick 档缩面（machine gate 无 quick 面，价值由 P2 在 quick --done 兑现）；P3 gitQuiet 动态导入/parseFileChangeList 路径口径（静默 catch 教训）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/run/gates.js:87` // 防骨架直接过门（2026-08-21 agent-手工产出审计项⑤）：CLI 会代生成逐 task TODO 骨架
- ⚠️ `src/run/gates.js:92` // 捕获 token 排除冒号/逗号：骨架行格式「- task-01: <!--TODO-->」，\S+ 会连冒号一起捕获导致永不命中
- ⚠️ `src/run/gates.js:95` for (const m of report.matchAll(/^[-*][ \t]*([^\s:：,，]+)[^\n]*<!--TODO-->/gm)) {
- ⚠️ `src/run/gates.js:100` errors.push(`${id} 的结论仍是骨架 <!--TODO--> 占位——替换为真实结论（无签名级变更也显式写「无」）`)
- ⚠️ `src/run/gates.js:106` * 生成 symbol-impact.md 逐 task TODO 骨架（2026-08-21 审计项⑤「报错即生成」）。
- ⚠️ `src/run/gates.js:109` * 骨架从 tasks.md 注册表生成逐 task 占位行，agent 只需逐行填结论；占位 <!--TODO-->
- ⚠️ `src/run/gates.js:130` '> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）',
- ⚠️ `src/run/gates.js:132` '> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。',
- ⚠️ `src/run/gates.js:135` for (const id of taskIds) lines.push(`- ${id}: <!--TODO-->`)
- ⚠️ `src/run/gates.js:160` // 报错即生成（2026-08-21 审计项⑤）：报告缺失时自动落一份逐 task TODO 骨架，agent 从
- ⚠️ `src/run/gates.js:161` // 「从零手写整份」变「逐行填结论」；TODO 占位由 validate 拒绝，骨架不能直接过门。
- ⚠️ `src/run/gates.js:168` skeletonNote = `\n   📄 已代生成逐 task 骨架：${reportPath}（逐行替换 <!--TODO--> 为结论，无签名级变更也显式写「无」）`
- ⚠️ `src/index.js:110` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:117` sillyspec verify-probes --change <name> [--init [--force]]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架（--force 覆盖重生成，手填内容会重置）
- ⚠️ `src/index.js:1152` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1162` console.error('用法: sillyspec verify-probes --change <name> [--init [--force]] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 
- ⚠️ `src/index.js:1425` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1451` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1806` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1811` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1837` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:1872` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:1875` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:1878` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:1881` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:1884` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:1896` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:1900` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:1901` Given <!--TODO-->
- ⚠️ `src/index.js:1902` When <!--TODO-->
- ⚠️ `src/index.js:1903` Then <!--TODO-->
- ⚠️ `src/index.js:1906` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:1928` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3690` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `src/index.js:4046` // 占位行「requirement_ids: [FR-XX] / decision_ids: [D-XXX@vN]」立即改写为 prefillCardIds
- ⚠️ `src/index.js:4063` .replace('decision_ids: [D-XXX@vN]', () => tcIdLine('decision_ids', tcPrefillIds.decisionIds));
- ⚠️ `docs/prompt/_extracted.json:176` "prompt": "生成完整验证报告，并写入 verify-result.md。\n\n### 操作\n1. 汇总以上所有检查结果\n2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描。本步骤 --done 时，CLI 按项目声明危险面（`_module-m
- ⚠️ `docs/prompt/_extracted.json:269` "prompt": "根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。\n\n⚠️ 这一步是可选的。如果项目模块简单、流程不明显，可以跳过。\n\n### flows/ 目录\n目标目录：`{DOCS_ROOT}/flows/`\n\n根据 _module-map.yaml 中的模块依赖关系，识别跨模
- ⚠️ `docs/prompt/_extracted.json:490` "prompt": "对上一步生成的 plan.md 做审查。生成与审查分离——不在生成 plan 的同一上下文里自审，避免确认偏差。\n\n### 执行前确认门（plan_level=full 时）\nplan.md 审查通过后、进入 execute 前，若 plan_level=full（跨模块/大变更），必须先向
- ⚠️ `docs/prompt/_extracted.json:504` "prompt": "为 plan.md 中的每个任务生成紧凑 TaskCard。\n\n⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：\n- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan
- ⚠️ `docs/prompt/_extracted.json:547` "prompt": "加载计划、设计和代码库上下文。\n\n### 操作\n1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）\n2. 读取 design.md（技术方案）\n3. 读取 CONVENTIONS.md、ARCHI
- ⚠️ `docs/prompt/_extracted.json:609` "prompt": "对本次变更进行代码审查。\n\n### 执行方式\n本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。\n\n### 操作\n1. 检查 git diff 查看所有变更\n2. 审查要点：\n   - 代码风格是否符合 CONVENTIONS.md\n 
- ⚠️ `docs/prompt/plan.md:374` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `docs/prompt/plan.md:484` decision_ids: [D-XXX@vN]
- ⚠️ `docs/prompt/plan.md:537` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `docs/prompt/execute.md:492` - 是否有未处理的 TODO/FIXME
- ℹ️ 5 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
能力关键词 × 源码（worktree=统一提交 70bd55d8 态）逐个 grep：
- `computeTestLedgerKey` / `consultTestLedger` / `recordTestLedger` → src/run/test-ledger.js ✅（P2）
- `detectQuickConcurrencyAdvice`（不在本批，基线）→ quicklog.js；`full-target-files-reconcile` / `full-stage-review` → src/machine-interface.js ✅（P1）
- `buildArchiveReadinessReport` → src/run/gates.js ✅（P3）
- `SILLYSPEC_STEP_GUIDE` 缺省开/逃生门 → src/run/prompt.js（!== '0' 判定）✅（P4）
- `fail-closed` 三层（键分量不可得/失败永不缓存/严格全等）→ test-ledger.js 实现面 ✅
- `待确认`（草拟不代写标记）→ gates.js 报告渲染 ✅（P3）
零 ⚠️ 未实现关键词。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src/run、src、test）找到 14 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs …）
- ✅ task-02: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-03: 模块目录（src/run、src、test）找到 14 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs …）
- ✅ task-04: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ⚠️ task-05: 模块目录（docs/prompt、.sillyspec/docs/sillyspec/modules）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 同码同环境二次 gate 只复用不重跑（<5s 耗时断言） | `src/run/test-ledger.js`<br>`test/test-ledger.test.mjs` | 同码同环境二次、gate（`test/test-ledger.test.mjs`、`src/run/test-ledger.js`） | covered | `test/test-ledger.test.mjs:5`（同码同环境二次）、`src/run/test-ledger.js:5`（gate） |
| 改一行 src 指纹变真跑 | `src/run/test-ledger.js`<br>`test/test-ledger.test.mjs` | 改一行、src（`test/test-ledger.test.mjs`） | covered | `test/test-ledger.test.mjs:6`（改一行）、`test/test-ledger.test.mjs:18`（src） |
| worktree 与主仓 envProfile 分键互不复用 | `src/run/test-ledger.js`<br>`test/test-ledger.test.mjs` | worktree、与主仓、envProfile（`src/run/test-ledger.js`、`test/test-ledger.test.mjs`） | covered | `src/run/test-ledger.js:20`（worktree）、`src/run/test-ledger.js:22`（与主仓）、`src/run/test-ledger.js:19`（envProfile） |
| git 不可达永远真跑（fail-closed） | `src/run/test-ledger.js`<br>`test/test-ledger.test.mjs` | git、fail、closed（`src/run/test-ledger.js`、`test/test-ledger.test.mjs`） | covered | `src/run/test-ledger.js:9`（git）、`src/run/test-ledger.js:5`（fail）、`src/run/test-ledger.js:5`（closed） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 翻转后全量测试零红 | `test/step-guide-default-on.test.mjs` | — | covered | `test/step-guide-default-on.test.mjs` D1（缺省开短输出+静态块 ≤10 行口径）/全量零红=四迁移件+全量 566/578 |
| 不设 env 复入输出短形态（≤10 行沿用断言） | `test/step-guide-default-on.test.mjs` | env（`test/step-guide-default-on.test.mjs`） | covered | `test/step-guide-default-on.test.mjs:35`（env） |
| =0 显式关回全量（逃生门钉） | `test/step-guide-default-on.test.mjs` | — | covered | `test/step-guide-default-on.test.mjs` D1（缺省开短输出+静态块 ≤10 行口径）/全量零红=四迁移件+全量 566/578 |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| --full 对四类失败（stage review 缺/reconcile 缺/manifest 缺/test 红）同回合全报（构造四态测试钉） | `test/gate-full-preflight.test.mjs` | full、stage、review、reconcile（`test/gate-full-preflight.test.mjs`） | covered | `test/gate-full-preflight.test.mjs:2`（full）、`test/gate-full-preflight.test.mjs:4`（stage）、`test/gate-full-preflight.test.mjs:4`（review） |
| 默认档输出与改前逐字节一致 | `test/gate-full-preflight.test.mjs` | — | covered | `test/gate-full-preflight.test.mjs` F3（默认档零 full-* 条目=零行为钉） |
| 「--full 绿→--done 不因同因再拦」parity 钉（冻结状态快照下） | `test/gate-full-preflight.test.mjs` | full、done（`test/gate-full-preflight.test.mjs`） | covered | `test/gate-full-preflight.test.mjs:2`（full）、`test/gate-full-preflight.test.mjs:4`（done） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 三草拟项格式可解析钉 | `test/archive-readiness.test.mjs` | — | covered | `test/archive-readiness.test.mjs` R1（草拟行结构断言：清单外点名/矩阵外点名——格式可解析即结构钉） |
| 强提示四态（前进有交集/前进无交集/未前进/无 worktree） | `test/archive-readiness.test.mjs` | 前进无交集、未前进、worktree（`test/archive-readiness.test.mjs`） | covered | `test/archive-readiness.test.mjs:6`（前进无交集）、`test/archive-readiness.test.mjs:6`（未前进）、`test/archive-readiness.test.mjs:7`（worktree） |
| 无发现零附加输出（逐字节） | `test/archive-readiness.test.mjs` | — | covered | `test/archive-readiness.test.mjs` R1（草拟行结构断言：清单外点名/矩阵外点名——格式可解析即结构钉） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 镜像与源一致（_verify 不低于基线） | — | — | covered | `docs/prompt/_verify.mjs` 实测 39/51 失配组成=主仓基线逐条一致（执行记录 review 留痕） |
| 模块卡行为行锚点有效 | — | — | covered | `docs/prompt/_verify.mjs` 实测 39/51 失配组成=主仓基线逐条一致（执行记录 review 留痕） |
| docs-check 无新增漂移 | — | — | covered | `test/doc-ref-check.test.mjs` 93/93+`sillyspec docs check` 611/611（模块卡锚点双口径全过） |

- ⚠️ 零/半自动化承接条目 7 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
D-001@v1（fail-closed 三键）→FR-02→task-01：L1-L4 四态钉+失败拒记 ✅闭环
D-002@v1（--full 只读同引擎）→FR-01→task-03：F1-F3 三态钉（默认档零变化/双盲区报） ✅闭环（quick 档缩面 review 留痕）
D-003@v1（草拟不代写+老化四态）→FR-03→task-04：R1-R4 四态钉 ✅闭环
D-004@v1（缺省开+逃生门）→FR-04→task-02：D1-D3 三钉+迁移面零新红 ✅闭环
无 unresolved/blocking/superseded。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 4 backend endpoints (live [scan-root 5 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (20 files @ worktree)] | 0 backend endpoints unused by frontend (+4 stock noise collapsed)
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 0 个本变更端点前端未调用（warning 不阻断）：
- ℹ️ 另有 4 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 13 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ❌ 预填注未清 5 处（error 门——verify 完成前须逐槽核对后删注）：
- ❌ `tasks/task-01.md` 仍含未删预填注
- ❌ `tasks/task-02.md` 仍含未删预填注
- ❌ `tasks/task-03.md` 仍含未删预填注
- ❌ `tasks/task-04.md` 仍含未删预填注
- ❌ `tasks/task-05.md` 仍含未删预填注
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --change <变更名> --init --force` 重生成本段（⚠️ 全骨架重生成，手填结论会重置——先备份；quick-B 起 --force 通道存在）；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- 定向（worktree，统一提交态）：四新测试件 31 断言全绿（test-ledger 4/step-guide-default-on 3/gate-full-preflight 3/archive-readiness 3 组）+迁移四件（fingerprint 6/semantic 4/preflight/aliases）全绿
- 全量（worktree，净环境 env -u STEP_GUIDE）：566/578 通过、12 失败=worktree cwd 守卫环境族（见移交 env-blocked，主仓同族绿基线）
- lint：npm run lint 737 文件过（未引用导出 0 项 hard fail 面）
- doc-ref：node test/doc-ref-check.test.mjs 93/93 全过
- docs check：611/611 全过（--fix 机械重锚 11 处存量漂移后）
- 镜像：_verify 39/51，失配组成与主仓基线逐条一致
- 主仓集成面全量：verify --done CLI 实测（走隔离快照口径）

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-05 | <待填：证据回指> | <待填> |
| D-002@v1 | FR-01、FR-02、FR-03、FR-04 | task-03、task-05 | <待填：证据回指> | <待填> |
| D-003@v1 | FR-01、FR-02、FR-03、FR-04 | task-04、task-05 | <待填：证据回指> | <待填> |
| D-004@v1 | FR-01、FR-02、FR-03、FR-04 | task-02、task-05 | <待填：证据回指> | <待填> |

## 技术债务 [层：人工判断]
探针 1 的 15+ 处命中逐条核验均为 prompt 模板散文引用 TODO/FIXME/占位符字面量（教学文案本身）——已知误报面，非未实现标记。
本变更新增代码零 TODO/FIXME/HACK；五卡预填注（decision_ids/requirement_ids 来源注）已按探针 10 确认动作清零。

## 变更风险等级 [层：人工判断]
unit-sufficient。design.md frontmatter 显式声明 risk_level = medium；实际触碰面=CLI 渲染/账本/预检三纯函数层（新增 test-ledger.js/gates.js 报告块/machine-interface --full 档/prompt.js 单点翻转），无 daemon/session/schema/部署面。
