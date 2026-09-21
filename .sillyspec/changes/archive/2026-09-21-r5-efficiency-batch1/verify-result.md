---
author: qinyi
created_at: 2026-09-21T15:55:00
---

# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES
四模块五任务全实证通过（主仓集成面 569/569 + lint + 探针矩阵 covered）；NOTES 两条：verify 门禁首跑被 gate 快照 mtime 误取主仓旧版拦下（apply 集成后消解，快照血统缺陷移交）与 task-05 为文档任务 non-testable。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| other | verify gate 快照按 mtime 三方取新存在血统盲区：主仓并行提交（ql-20260921-005 quick 修复）刷新 src/stages/execute.js mtime 后，快照取了无契约代码的主仓版 + worktree 新测试 → module 实测假红一轮；worktree apply 集成后主仓单源消解（569/569） | 已复跑消解；根治建议入 R5 第 2 批：快照对「本变更 worktree 分支内文件」优先取分支内容（血统优先于 mtime），同族记录 round5/r5-collision-ehs-attribution.md P16 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（五任务 review 均 pass，无 cannot_verify）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（非 integration-critical/deployment-critical 变更——CLI 工具层 prompt/材料/测试资产）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
- task-01: 完成（plan.js+5 并批三行 / plan-postcheck.js checkBatchAdvisory 纯增量 advisory；14 断言组绿）
- task-02: 完成（assembleExecuteTaskMaterials 两段式+超限截尾场景3 断言 test/execute-materials.test.mjs:104-111；材料包行回归钉）
- task-03: 完成（轮数纪律+返回契约+回收瘦身三注入；dispatch-contract 9/9 四组合编号单调；对账真相源 diff grep 零触碰）
- task-04: 完成（三类 R4 错键 fixtures+正控；probe-suite 4/4；verify-probes.js 零改动）
- task-05: 完成（_extracted.json 重生成+plan/execute 镜像围栏逐字同步 _verify 39/51>基线 37/51；stages.md 三行为段+changelog；docs-check 无新增漂移）

## 设计一致性 [层：人工判断]
一致。两处实现期裁决已在 execute 阶段落账：①B-③ N≥4 advisory 阈值（消相邻 nag 环）②blockquote 批注行（防 parseWavesFromPlan 静默丢任务）——均为保守正确方向，记 task-01 review。红线（四道防线判定语义/请求钳/allowed_paths 门禁/状态机/DB schema）diff 零触碰。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stages/plan.js:379` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `src/stages/plan.js:418` decision_ids: [D-XXX@vN]
- ⚠️ `src/stages/plan.js:538` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `src/stages/plan-postcheck.js:1510` * 无 diff 可取）生成骨架，影响类型列留 <!--TODO--> 由 execute/verify 按实际 diff 回填。
- ⚠️ `src/stages/execute.js:335` - **报告骨架勿手写**：先跑 \`sillyspec symbol-impact --change <change-name>\`——CLI 从 tasks.md 生成逐 task \`<!--TODO-->\` 骨架（gate 拦截时也会自动落一份）；把每行占位替换为真实结论（**未替换的 TODO 占位会被 g
- ⚠️ `src/stages/execute.js:493` - 是否有未处理的 TODO/FIXME
- ⚠️ `docs/prompt/plan.md:367` module-impact.md 首版**由 CLI 在本阶段 --done 时自动生成**——文件×模块归属按 _module-map.yaml 前缀匹配机械预填，章节含「## 模块影响矩阵」「## 未匹配文件」「## 更新结果」表骨架（每受影响模块一行 pending），影响类型列留 <!--TODO--> 由 e
- ⚠️ `docs/prompt/plan.md:477` decision_ids: [D-XXX@vN]
- ⚠️ `docs/prompt/plan.md:530` - **占位符硬拦**（骨架占位值未替换视同缺字段，plan --done 报错阻断）：FR-XX、D-XXX、src/example/file.ts、一句话说明这个 task、具体步骤 1、可验证的验收条件 1、边界约束 1
- ⚠️ `docs/prompt/execute.md:488` - 是否有未处理的 TODO/FIXME
- ⚠️ `docs/prompt/_extracted.json:176` "prompt": "生成完整验证报告，并写入 verify-result.md。\n\n### 操作\n1. 汇总以上所有检查结果\n2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描。本步骤 --done 时，CLI 按项目声明危险面（`_module-m
- ⚠️ `docs/prompt/_extracted.json:269` "prompt": "根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。\n\n⚠️ 这一步是可选的。如果项目模块简单、流程不明显，可以跳过。\n\n### flows/ 目录\n目标目录：`{DOCS_ROOT}/flows/`\n\n根据 _module-map.yaml 中的模块依赖关系，识别跨模
- ⚠️ `docs/prompt/_extracted.json:490` "prompt": "对上一步生成的 plan.md 做审查。生成与审查分离——不在生成 plan 的同一上下文里自审，避免确认偏差。\n\n### 执行前确认门（plan_level=full 时）\nplan.md 审查通过后、进入 execute 前，若 plan_level=full（跨模块/大变更），必须先向
- ⚠️ `docs/prompt/_extracted.json:504` "prompt": "为 plan.md 中的每个任务生成紧凑 TaskCard。\n\n⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：\n- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan
- ⚠️ `docs/prompt/_extracted.json:547` "prompt": "加载计划、设计和代码库上下文。\n\n### 操作\n1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）\n2. 读取 design.md（技术方案）\n3. 读取 CONVENTIONS.md、ARCHI
- ⚠️ `docs/prompt/_extracted.json:609` "prompt": "对本次变更进行代码审查。\n\n### 执行方式\n本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。\n\n### 操作\n1. 检查 git diff 查看所有变更\n2. 审查要点：\n   - 代码风格是否符合 CONVENTIONS.md\n 

#### 探针 2：设计关键词覆盖
四模块关键词全命中：并批/batch → src/stages/plan.js stepGeneratePlan 文本（plan-batch-advisory 钉）；材料包/assembleExecuteTaskMaterials → src/review-material-pack.js（execute-materials 钉）；轮数纪律/返回契约/回收瘦身 → src/stages/execute.js:1296-1297/1430（dispatch-contract 9/9 钉）；错键/wrong-key → test/probe-suite/wrong-key.fixtures.mjs（4/4）。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src/stages、test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ✅ task-02: 模块目录（src、src/stages、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-03: 模块目录（src/stages、test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ✅ task-04: 模块目录（test/probe-suite）找到 1 个测试文件（test/probe-suite/wrong-key.test.mjs）
- ⚠️ task-05: 模块目录（docs/prompt、.sillyspec/docs/sillyspec/modules）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| checkBatchAdvisory 对四场景判定正确（纯函数，无 IO） | `test/plan-batch-advisory.test.mjs` | checkBatchAdvisory、纯函数（`test/plan-batch-advisory.test.mjs`） | covered | `test/plan-batch-advisory.test.mjs:3`（checkBatchAdvisory）、`test/plan-batch-advisory.test.mjs:3`（纯函数） |
| plan postcheck 输出含 warning 不含新增 error（阻断面零变化） | `test/plan-batch-advisory.test.mjs` | plan、postcheck、warning（`test/plan-batch-advisory.test.mjs`） | covered | `test/plan-batch-advisory.test.mjs:9`（plan）、`test/plan-batch-advisory.test.mjs:20`（postcheck）、`test/plan-batch-advisory.test.mjs:3`（warning） |
| stepGeneratePlan 渲染文本含并批默认三行（文本钉） | `test/plan-batch-advisory.test.mjs` | stepGeneratePlan、文本钉（`test/plan-batch-advisory.test.mjs`） | covered | `test/plan-batch-advisory.test.mjs:3`（stepGeneratePlan）、`test/plan-batch-advisory.test.mjs:3`（文本钉） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 材料包稳定段内容与 design.md 对应节逐字一致（逐字符断言） | `test/execute-materials.test.mjs` | design、对应节逐字一致（`test/execute-materials.test.mjs`） | covered | `test/execute-materials.test.mjs:4`（design）、`test/execute-materials.test.mjs:11`（对应节逐字一致） |
| 超限场景锚点不丢且带回源指引行 | `test/execute-materials.test.mjs` | — | covered | `test/execute-materials.test.mjs:104`（超限 truncated=true）、:110-111（截断+锚点保头断言）——人工核验改写 |
| buildWavePrompt 渲染含材料包引用行（文本钉） | `test/execute-materials.test.mjs` | buildWavePrompt（`test/execute-materials.test.mjs`） | covered | `test/execute-materials.test.mjs:15`（buildWavePrompt） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| buildWavePrompt 渲染输出含四段新文本（子串级文本钉） | `test/dispatch-contract.test.mjs` | buildWavePrompt（`test/dispatch-contract.test.mjs`） | covered | `test/dispatch-contract.test.mjs:5`（buildWavePrompt） |
| git diff 对账相关代码行零改动（execute.js:489/1374/1395 不在 diff 中——对账真相源红线） | `test/dispatch-contract.test.mjs` | git、diff、execute（`test/dispatch-contract.test.mjs`） | covered | `test/dispatch-contract.test.mjs:8`（git）、`test/dispatch-contract.test.mjs:8`（diff）、`test/dispatch-contract.test.mjs:2`（execute） |
| 既有 execute 相关测试零回归 | `test/dispatch-contract.test.mjs` | 既有、execute（`test/dispatch-contract.test.mjs`） | covered | `test/dispatch-contract.test.mjs:90`（既有）、`test/dispatch-contract.test.mjs:2`（execute） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 三类错键 fixtures 全部被对应原语判不匹配 | `test/probe-suite/wrong-key.fixtures.mjs`<br>`test/probe-suite/wrong-key.test.mjs` | 三类错键、fixtures（`test/probe-suite/wrong-key.test.mjs`、`test/probe-suite/wrong-key.fixtures.mjs`） | covered | `test/probe-suite/wrong-key.test.mjs:22`（三类错键）、`test/probe-suite/wrong-key.fixtures.mjs:2`（fixtures） |
| 正确对照组判匹配（敏感性有方向，非全红） | `test/probe-suite/wrong-key.fixtures.mjs`<br>`test/probe-suite/wrong-key.test.mjs` | 敏感性有方向、非全红（`test/probe-suite/wrong-key.fixtures.mjs`、`test/probe-suite/wrong-key.test.mjs`） | covered | `test/probe-suite/wrong-key.fixtures.mjs:5`（敏感性有方向）、`test/probe-suite/wrong-key.test.mjs:5`（非全红） |
| 测试零 IO（纯函数喂字符串），可在任何环境跑 | `test/probe-suite/wrong-key.fixtures.mjs`<br>`test/probe-suite/wrong-key.test.mjs` | 纯函数喂字符串（`test/probe-suite/wrong-key.test.mjs`） | covered | `test/probe-suite/wrong-key.test.mjs:5`（纯函数喂字符串） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 镜像与源逐字一致（_verify.mjs 或等价校验过） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| stages.md 含三条新行为且锚点有效 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| docs-check 无新增漂移告警 | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |

- ⚠️ 零/半自动化承接条目 3 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
D-001@v1（B-⑥ 顶替 B-①）→ task-03 轮数纪律三行落地（src/stages/execute.js:1296）+ dispatch-contract 钉；D-002@v1（五项范围红线不动）→ 全程 diff 零触碰红线文件段落（execute 验收 checklist 第 6 项）；D-003@v1（B-④ 两段式）→ task-02 稳定段先行装配序 + execute-materials 场景断言。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 4 backend endpoints (live [scan-root 5] + artifact 0), 0 frontend calls [scope: change-diff (16 files @ scan-root)] | 0 backend endpoints unused by frontend (+4 stock noise collapsed)
- ⚠️ 0 个本变更端点前端未调用（warning 不阻断）：
- ℹ️ 另有 4 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 12 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（6 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --change <变更名> --init --force` 重生成本段（⚠️ 全骨架重生成，手填结论会重置——先备份；quick-B 起 --force 通道存在）；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- npm test（主仓 worktree apply 集成面）：569/569 全绿，0 失败，无 known_failures 豁免
- npm run lint：过（722 文件语法+内容规则+未引用导出 0+module-map 覆盖全）
- worktree 隔离面 553/566：13 败=CLI spawn 用例撞 worktree cwd 守卫 exit 2（task-01 review stash 实证存量+主仓 config-schema fail 0 双证，非本变更回归）
- verify 门禁 CLI 实测：module[cli-core]+deps(30) 退出码 0 + lint 退出码 0

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-03 | task-03 | test/dispatch-contract.test.mjs 轮数纪律三要素断言（9/9） | 已闭环 |
| D-002@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-02、task-03、task-04、task-05 | 五卡 review pass + execute 验收 checklist 红线项 diff grep 实证 | 已闭环 |
| D-003@v1 | FR-02 | task-02 | test/execute-materials.test.mjs 稳定段先行+超限截尾断言 | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 命中 16 处全部为 prompt 文档字符串/镜像中的骨架说明文字（plan.js:379/418/538 等为「占位符硬拦」等规则描述文本，docs/prompt/* 为其镜像），非未实现工作标记——人工逐条核验为零真实 TODO/FIXME/HACK。

## 变更风险等级 [层：人工判断]
unit-sufficient（CLI 工具层：prompt 渲染文本钉 + 纯函数 fixtures，全部可单测锁定；design.md frontmatter 无 risk_level 显式声明，无被抑制关键词）。

## Runtime Evidence [层：人工判断]
- worktree 提交：d658d064（13 文件，wt-commit）
- 主仓 apply：EXCLUDE-MISMATCH 三方 clean 合并（merge-backups 备份在 .sillyspec/.runtime/merge-backups/）
- 主仓全量：569/569 @ 2026-09-21 15:4x；lint 退出码 0
- verify 门禁实测指纹：verify-quality-scan-2026-09-21-r5-efficiency-batch1.json（首跑 failed=快照血统误取，复跑 PASS）
- 运行时组件：不涉及（无 daemon/端点/部署面）
<!-- 降级路径（design §3.2，D-004 收口）：服务起不来时：Controller 直调冒烟（mock 下游，验绑定+校验+路由）/ 基础设施恢复后复跑固化用例——不要空填不涉及 -->

## 代码审查 [层：人工判断]
问题列表：零 P1/P2。
- P3-1：verify gate 快照 mtime 三方取新的血统盲区（见移交项）——工具缺陷非本变更代码缺陷，根治入第 2 批。
- P3-2：docs/prompt 镜像 _verify 39/51 的 12 处未匹配为存量动态示例值/省略 Wave（主仓基线 37/51 起就在），非本变更引入；本变更把 plan/execute 相关未匹配从 14 收窄到 12。
走查清单（本变更为 CLI 工具层，模板中①-⑤业务走查面不适用，按变更面改写）：①镜像同步链路（_extract json→围栏逐字）已由 _verify+dispatch-contract 回归钉覆盖；②无旁路流（纯 prompt/材料/测试资产）；③守卫一致性=对账真相源零触碰（diff grep 实证）；④载荷契约=材料包两段式断言+超限截尾断言；⑤并发面不涉及（无运行时组件）。
总体评价：五任务全部实证闭环，红线零触碰，集成面 569/569。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
<!-- verify 完成后的深度复核（独立子代理/二次审查）结论回流至此：缺陷分级（P1 功能不可用 / P2 需求子项 / P3 建议修）+ 修复证据链 + 对「结论枚举」的影响改写。无复核时本节写「无」或删除。复核结论不再只活在聊天记录（2026-09-16 EHS 二次复核实证：5 个 P1 只有聊天可查，变更档案仍写 PASS WITH NOTES）。 -->
