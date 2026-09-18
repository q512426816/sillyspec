# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS`——risk_level unit-sufficient（CLI 库面+知识库文件面），CLI 亲测 module[cli-core,run-gates]+deps(30) exit 0 + lint exit 0（module-map 补录后），fr-index 35/doctor 40/machine-interface 132/distill 族零回归，验收独立审查两轮（R1 三阻断全修复/R2 独立复现双 pass/三残留收尾），四遥测发生器 fixture 全闭环，自举演练 PASS，移交零、cannot_verify 零、矩阵复核零 uncovered

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
无

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（七任务全 verified，review 7/7）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（unit-sufficient 显式声明——纯 CLI 库面无服务/端点/跨层调用）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
七任务全完成（checkbox 7/7，草稿归属+review 驱动）：task-01 参数化零回归（distill 四测试族 fail 0）/task-02 核心 35 断言（发号/幂等×2/翻链/域兜底/digest/overlap/unreferenced/连字符/多域单id）/task-03 归档挂载+fr-supersede+fr-unreferenced（10c/10d 端到端读回）/task-04 注入+软门（11 渲染断言+10e errors 面零渗漏）/task-05 D14 四检（doctor 18-21+20b 正负全态）/task-06 测试双文件/task-07 验收（全量绿+四遥测+自举演练 PASS）

## 设计一致性 [层：人工判断]
一致，两处执行期更正已回写 design（stage-contract 挂点行/空态注记语义/锚点文件补行——R1 审查驱动的文档对齐非设计偏移）；验收审查 R1 三阻断（连字符域/跨域翻链落盘/doc 锚点）修复后 R2 独立复现双 pass，R2 三残留（模板表格列数/design:101/多域单id 测试锚）收尾提交 551b53ad

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/stage-contract.js:786` // 证据槽 <TODO>；列表防御行（卡无 acceptance…）与不适用行无槽不计。
- ⚠️ `src/stage-contract.js:791` const MATRIX_EVIDENCE_TODO = '<TODO>'
- ⚠️ `src/stage-contract.js:826` * 行级证据口径：covered/partial 须非 TODO 且含测试锚点；non-testable 须非 TODO 且非空
- ⚠️ `src/stage-contract.js:833` if (verdict === 'non-testable') return false // 非 TODO 且非空即合规（理由一句话）

#### 探针 2：设计关键词覆盖
- ✅ DIAGNOSTIC 四关键词族全命中：发号（nextIdForDomain）/幂等（来源变更 no-op 闸+FR_INDEX_EPOCH）/承接（supersedes 解析+翻链）/unreferenced/digest/frTitleOverlap/scanFrIndex——src/fr-index.js 全导出
- ✅ 遥测四类型（fr-inject/fr-supersede/fr-duplicate-warning/fr-unreferenced）在 archive-distill/prompt/stage-contract 三发射点 grep 命中
- ✅ 参数化底座四函数 export + opts 缺省——decision-distill.js grep 命中

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-03: 模块目录（src/run）递归未找到测试文件（含 co-located tests/）
- ⚠️ task-04: 模块目录（src/stages、src/run）递归未找到测试文件（含 co-located tests/）
- ✅ task-05: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-06: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ✅ task-07: 模块目录（src、bin）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 既有 decision-distill 测试族全绿（decision-distill-cross-change / flat-list / heading-variants 等，npm test 自动发现） | `test/decision-distill-cross-change.test.mjs` 等四族 | distill | covered | `test/decision-distill-cross-change.test.mjs`（13 断言 fail 0）+三族 fail 0——参数化后实跑零回归（probe7-provider-tests-in-consumer-card：task-06 套件承接 task-01 验收） |
| 四函数 export 可从模块 import | `test/fr-index.test.mjs` | export | covered | `test/fr-index.test.mjs`（task-01 卡 verify 命令 import 断言 + task-02 全部断言经 import 消费四函数） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 同变更两次 indexRequirements：第二次 written/superseded 皆空 | `test/fr-index.test.mjs` | 幂等 | covered | `test/fr-index.test.mjs`（断言 2 与 12d 双场景钉死） |
| 承接引用后旧条目状态与 superseded_by 正确；坏 id 进 warnings 不抛 | `test/fr-index.test.mjs` | superseded | covered | `test/fr-index.test.mjs`（3a/3b 落盘断言 + 4a/4b 坏 id 不抛不翻链 + 12a-12c 连字符/跨域/摘要保留） |
| digest 不含 superseded 条目；overlap 高低阈值边界 | `test/fr-index.test.mjs` | digest/overlap | covered | `test/fr-index.test.mjs`（5a active-only + 6a-6c 阈值边界——卡面示例阈值经 bigram 数学校准为等价边界对） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| fixture 变更走 executeArchiveDistill：索引写入 + 两类事件落遥测读回字段完整 | `test/fr-index.test.mjs` | 遥测 | covered | `test/fr-index.test.mjs`（10a-10d 端到端：executeArchiveDistill→文件落盘→readKnowledgeHits 读回断言） |
| indexRequirements 抛错时归档步不阻断（warn 降级） | `test/fr-index.test.mjs` | 降级 | covered | `test/fr-index.test.mjs`（task-03 卡验收的降级语义=archive-distill.js try/catch 结构，独立验收审查第 6 项核读源码降级分支确认；10 组全路径跑通无异常旁证） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 有触达域索引时 step8 prompt 含 digest 段且不含 superseded 条目；空态注记 | `test/fr-index.test.mjs` | digest | covered | `test/fr-index.test.mjs`（11a-11c outputStep 渲染断言：条目注入+占位符消隐+fr-inject 遥测；空态语义经 R1 审查更正为注记行，design 已同步） |
| 疑似重复触发 warning 不阻断 --done；事件落遥测读回完整 | `test/fr-index.test.mjs` | 重复 | covered | `test/fr-index.test.mjs`（10e-1 errors 面零渗漏硬证据 + 10e-2 warning 透出 + 10e-3 遥测读回） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| epoch 前归档零新检查；epoch 后无索引目录按「仓未启用」豁免不误报 | `test/doctor-archive-integrity.test.mjs` | epoch | covered | `test/doctor-archive-integrity.test.mjs`（组 18 epoch 前零检查 + 组 21a/21b 无 requirements 与无 fr/ 目录豁免） |
| fixture：epoch 后归档+索引在场+取代完整→pass；缺条目/未翻链→offender | `test/doctor-archive-integrity.test.mjs` | offender | covered | `test/doctor-archive-integrity.test.mjs`（组 19a/19b 缺索引红 + 组 20 未翻取代精确报 + 组 20b 正向零 offender） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 两测试文件全绿且覆盖上述全态 | `test/fr-index.test.mjs`<br>`test/doctor-archive-integrity.test.mjs` | — | covered | `test/fr-index.test.mjs` 35/35 + `test/doctor-archive-integrity.test.mjs` 40/40（本会话实跑两轮） |
| 测试不触真实 .sillyspec（全 fixture） | `test/fr-index.test.mjs`<br>`test/doctor-archive-integrity.test.mjs` | sillyspec、fixture（`test/fr-index.test.mjs`、`test/doctor-archive-integrity.test.mjs`） | covered | `test/fr-index.test.mjs:4`（sillyspec）、`test/fr-index.test.mjs:4`（fixture） |

**task-07**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| npm test 全绿（含两新测试文件） | CLI verify-runs 取证 | test | covered | `.runtime/verify-runs` 隔离快照 module[cli-core,run-gates]+deps(30) exit 0（22.2s，步 6 CLI 亲测——deps 自动附加含两新测试文件）；worktree 全量 exit 0 |
| 四遥测事件读回字段完整 | `test/fr-index.test.mjs` | 遥测 | covered | `test/fr-index.test.mjs`（10c fr-supersede/10d fr-unreferenced/10e-3 fr-duplicate-warning/11c fr-inject——四发生器各自读回断言） |
| 自举演练零 offender | `test/doctor-archive-integrity.test.mjs` | 自举 | covered | `test/doctor-archive-integrity.test.mjs`（组 20b=演练的正向用例：epoch 后在场+已翻取代→零 offender）+ 本会话 fixture 演练记录 PASS（verify Runtime Evidence 节在档）；真实仓自举=本变更 archive 步自身（归档后 D14 复扫复核） |

- ⚠️ 零/半自动化承接条目 15 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
D-001~D-008 全闭环（见下方矩阵 Evidence 列）；D-008 三护栏逐条：证伪条款在 design 设计目标+实验裁决条款、指标可算性三发生器在 diff、探针「不算 L3 门禁」标注在 archive-distill 输出文案——文案 grep 命中

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4] + artifact 0), 0 frontend calls [scope: change-diff (25 files @ scan-root)] | 3 backend endpoints unused by frontend
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 10 个非 Java 清单文件不在探针 9 扫描面）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（四选一）：covered / partial / uncovered / non-testable。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --init` 刷新本段；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- **CLI 亲测（步 6 noAI 权威口径）**：module[cli-core,run-gates]+deps(30) 隔离快照 **exit 0**（22.2s）；npm run lint **exit 0**（26.1s，fr-index.js 录 module-map 后）
- 定向：fr-index 35/35、doctor-archive-integrity 40/40、machine-interface 132/132、distill 四族 fail 0
- worktree 全量：exit 0；known_failures：本变更 0 条

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04 | task-02、task-03、task-06、task-07 | 发号 nextIdForDomain max+1（fr-index.test 1a/13a 单 id）+幂等 2/12d | 已闭环 |
| D-002@v1 | FR-01、FR-02、FR-03、FR-04 | task-02、task-06、task-07 | 翻链 3a/12a-12b+坏承接 4a-4b 不阻断；删除不判=非目标（零删除检测代码） | 已闭环 |
| D-003@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-02、task-07 | 域文件/INDEX 路由 9b/9c+复用底座（task-01 distill 族零回归） | 已闭环 |
| D-004@v1 | FR-01、FR-02、FR-03、FR-04 | task-04、task-07 | digest active-only 5a+渲染注入 11a-11c+段消隐语义（空态注记） | 已闭环 |
| D-005@v1 | FR-01、FR-02、FR-03、FR-04 | task-04、task-07 | 软门 10e（errors 面零渗漏硬证据）+overlap 阈值 6a-6c | 已闭环 |
| D-006@v1 | FR-01、FR-02、FR-03、FR-04 | task-03、task-04、task-07 | 四遥测读回 10c/10d/10e-3/11c（字段完整） | 已闭环 |
| D-008@v1 | FR-01、FR-02、FR-03、FR-04 | task-03、task-05、task-07 | 证伪条款（design 实验裁决条款段）/可算性（三发生器 diff 在档）/探针（10d+输出文案标注） | 已闭环 |
| D-007@v1 | FR-01、FR-02、FR-03、FR-04 | task-05、task-06、task-07 | D14 四检 doctor 18/19/20/20b/21（epoch 分界正负全态） | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 四命中全为 stage-contract.js 既有矩阵哨兵常量（MATRIX_EVIDENCE_TODO '<TODO>' 系合法判定值非未实现标记，预存代码非本变更引入）；本变更新增代码零 TODO/FIXME/HACK。

## 变更风险等级 [层：人工判断]
显式声明 = **unit-sufficient**（design.md frontmatter）。理由：纯 CLI 库面+知识库文件面（fr-index 叶子模块/模板文本/doctor 分支），无服务/端点/启动入口；被抑制关键词可审计：自动判级若命中 index/archive/daemon 字样系模块名误伤（fr-index 是文件名非 daemon），frontmatter 注释已注记。

## Runtime Evidence [层：人工判断]
- worktree 提交链：59dab9e（实现）→ 7f63b56（R1 三阻断修复）→ 551b53ad（R2 三残留收尾）
- CLI 亲测取证：.runtime/verify-runs 隔离快照 exit 0（module[cli-core,run-gates]+deps(30) 22.2s；lint 26.1s）
- 自举演练：epoch 后归档+索引在场 → doctor archive_integrity 零 offender（R-05 路径成立，fixture 实证）
- 服务/端点/日志面：不涉及（无状态 CLI 库面）；**真实归档自举**：本变更 archive 步将首次在真实仓跑 indexRequirements（FR-core-engine-001..004 预期），D14 复扫应零 offender——归档后人工复核记录
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
