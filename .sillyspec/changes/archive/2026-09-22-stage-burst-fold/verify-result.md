# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——五验收项全达成（AC-01/02 由 stage-burst.test.mjs ⑤⑦⑧⑨ 行为级钉死、AC-03 全量 578 过零归因回归〔基线 A/B 证〕、AC-04 用例⑥、AC-05 flow 15/15+lint 754）；notes=归档 apply 后主仓全量复跑移交项

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| manual-acceptance | 归档 worktree apply 后主仓全量 npm test 复跑（execute 期全量在 worktree 内跑，12 文件级挂为 worktree 守卫环境性存量——基线 A/B 实证，主仓跑应零挂面） | apply 完成后在主仓根跑 npm test：预期 578+11 全过（stage-burst 11 用例随 apply 进主仓）；若仍有挂按 quicklog 口径甄别归因 |
| other | burst 全量默认翻转（D-001 退役判据线） | 验收后另立变更——本轮不翻，缺省 OFF |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- 无（execute 阶段无 cannot_verify 任务——verify-required-evidence.json 不存在）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
- 无（变更风险等级=contract-required，非 integration/deployment-critical）

## 任务完成度 [层：人工判断]
- task-01 完成：readStageBurst+STAGE_BURST_STAGES 落 src/run/shared.js（review pass，提交 39cb858d）
- task-02 完成：burst 渲染分支+两助手抽取落 src/run/stage.js（review pass，提交 d8e4603c）
- task-03 完成：completeStepBurst+两处接线（review pass，提交 409303cd；P2 修复 4bc8584a）
- task-04 完成：flow 翻转+三测试 fixtures（review pass，提交 b49c67e0）
- task-05 完成：测试面 11 用例+全量回归判定（review pass，提交 111ccdff）
- 完成率 5/5=100%；tasks.md 5/5 checkbox 全勾（CLI review write 自动勾选）

## 设计一致性 [层：人工判断]
实现与 design.md 四 Phase 一致。两处执行期细化（均已落档、不推翻任何 D）：
1. D-012 执行期裁决：STAGE_BURST_STAGES 白名单常量落 src/run/shared.js（design 初稿 stage.js 局部）——渲染门与完成门共用单一事实源，防两处字面量漂移。
2. completeStepBurst 续推/停轮判定以重读 DB pending 索引前进为准（design Phase 3 草图以返回值真值性描述——探针实证 completeStep 正常完成也返回 truthy 进度对象 {stageCompleted:false,nextPendingIdx}，真值性不等于失败；已 docstring 注明+测试⑦行为级钉死）。
execute 独立审查判定 D-003 铁律成立（complete.js diff 105 行全插入零删除）+两助手抽取逐分支等价。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中
- ℹ️ 1 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
design 关键词与 worktree 实现命中（grep 证据）：
- readStageBurst 与 src/run/shared.js:1955（export async function readStageBurst）命中
- completeStepBurst 与 src/run/complete.js:1196（export async function completeStepBurst）命中
- executeNoAiCliAction 与 src/run/stage.js:675（async function executeNoAiCliAction）命中
- finalizeStageAllStepsDone 与 src/run/stage.js:733 命中
- renderStageBurst 与 src/run/stage.js:760 命中
- STAGE_BURST_STAGES 与 src/run/shared.js:1974（export const）+stage.js/command.js 两处 import 命中
- SILLYSPEC_STAGE_BURST 与 src/run/shared.js:1956-1958（env 0/1 覆写）命中
- burst 尾提示「burst 模式：本阶段全部说明书已一次下发」与 src/run/stage.js:783 命中
- printNext:false / P0-2 合成 / 50 轮上限 与 src/run/complete.js completeStepBurst 本体（1196-1257）命中
- flow 缺省 legacy 与 src/flow.js:66/:76 命中
零「可能未实现」关键词。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-02: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-03: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-04: 模块目录（src、test）找到 14 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs …）
- ✅ task-05: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| readStageBurst 三态行为与 FR-01 逐条一致（五组断言全绿） | `test/stage-burst.test.mjs` | readStageBurst（`test/stage-burst.test.mjs`） | covered | `test/stage-burst.test.mjs:4`（readStageBurst） |
| 缺省 OFF：无配置无 env 时返回 false | `test/stage-burst.test.mjs` | 缺省、OFF、env（`test/stage-burst.test.mjs`） | covered | `test/stage-burst.test.mjs:5`（缺省）、`test/stage-burst.test.mjs:5`（OFF）、`test/stage-burst.test.mjs:7`（env） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| burst 开启时 run <stage> 一次输出全部剩余 AI 步说明书+尾提示，noAI 步已就地 completed 落库 | `test/stage-burst.test.mjs` | burst、run、stage（`test/stage-burst.test.mjs`） | covered | `test/stage-burst.test.mjs:2`（burst）、`test/stage-burst.test.mjs:19`（run）、`test/stage-burst.test.mjs:2`（stage） |
| 非白名单阶段（verify/archive/quick/scan/doctor/explore）或 burst 关闭时渲染输出与现状一致 | `test/stage-burst.test.mjs` | — | covered | 反例用例在场：`test/stage-burst.test.mjs` ⑤ 后半（burst off 仅当前步+无尾提示）+⑥（env=0 逃生阀完整回单步形态）；非白名单阶段由白名单门 STAGE_BURST_STAGES.includes 短路（src/run/stage.js:592、src/run/command.js:1728——verify/archive/quick 不进 burst 分支=走原路径，与既有全量测试零回归互证） |
| waiting 步在 burst 前被 src/run/stage.js:245-254 既有硬拦（零新增判定） | `test/stage-burst.test.mjs` | 步在、burst、src（`test/stage-burst.test.mjs`） | covered | `test/stage-burst.test.mjs:158`（步在）、`test/stage-burst.test.mjs:2`（burst）、`test/stage-burst.test.mjs:19`（src） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| burst 开启：一次 --done 逐步推进打印每步完成行直至阶段完成；守卫失败（WAIT/waiting/requiresWait 无答案/门禁/漂移）exit 停在失败步、progress 态与单步失败态一致；重跑幂等续推 | `test/stage-burst.test.mjs` | burst、开启、一次、done（`test/stage-burst.test.mjs`） | covered | `test/stage-burst.test.mjs:2`（burst）、`test/stage-burst.test.mjs:139`（开启）、`test/stage-burst.test.mjs:139`（一次） |
| --answer 至多写入一个步的 waitAnswer（双 requiresWait 场景第二次等待步断点） | `test/stage-burst.test.mjs` | answer、waitAnswer、requiresWait（`test/stage-burst.test.mjs`） | covered | `test/stage-burst.test.mjs:11`（answer）、`test/stage-burst.test.mjs:214`（waitAnswer）、`test/stage-burst.test.mjs:207`（requiresWait） |
| completeStep 函数本体零 diff | `test/stage-burst.test.mjs` | completeStep（`test/stage-burst.test.mjs`） | covered | `test/stage-burst.test.mjs:226`（completeStep） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| readFlowConfig 空配置/读失败 → mode==='legacy'；显式 thin 照旧生效 | `test/flow-protocol.test.mjs`<br>`test/flow-route.test.mjs`<br>`test/flow-draft.test.mjs` | mode、legacy（`test/flow-protocol.test.mjs`） | covered | `test/flow-protocol.test.mjs:10`（mode）、`test/flow-protocol.test.mjs:10`（legacy） |
| flow-protocol ①~⑦、flow-route、flow-draft 全绿；test/fr-index.test.mjs 零改动零回归（核实豁免） | `test/flow-protocol.test.mjs`<br>`test/flow-route.test.mjs`<br>`test/flow-draft.test.mjs` | flow、protocol、route、draft（`test/flow-protocol.test.mjs`、`test/flow-route.test.mjs`、`test/flow-draft.test.mjs`） | covered | `test/flow-protocol.test.mjs:2`（flow）、`test/flow-protocol.test.mjs:2`（protocol）、`test/flow-route.test.mjs:2`（route） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 全部新测试绿；全量 npm test + npm run lint 零回归（既有 3 存量失败按知识库口径甄别非本变更引入） | `test/stage-burst.test.mjs` | test、run（`test/stage-burst.test.mjs`） | covered | `test/stage-burst.test.mjs:2`（test）、`test/stage-burst.test.mjs:19`（run） |
| 本仓 .sillyspec/local.yaml 加 stage 段 burst: true 自举（gitignored 不入提交面） | `test/stage-burst.test.mjs` | sillyspec、local、yaml、stage（`test/stage-burst.test.mjs`） | covered | `test/stage-burst.test.mjs:26`（sillyspec）、`test/stage-burst.test.mjs:5`（local）、`test/stage-burst.test.mjs:5`（yaml） |

- ⚠️ 零/半自动化承接条目 1 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
当前版本决策闭环核验（D-002/003/004/010 的 v1 已 superseded——追踪以 v2 为准）：
- D-001→FR-01/04→task-01：readStageBurst 缺省 OFF+env 阀（src/run/shared.js:1955，测试①-④）闭环
- D-002@v2→FR-02→task-02：渲染器零改动+首访渲染形判据（outputStep 调用形照旧 src/run/stage.js:778；测试⑤）闭环
- D-003@v2→FR-03/06→task-03：completeStep 零 diff+尾随 stale 拉回+auto 跳过预合成（独立审查 diff 级核验；测试⑨）闭环
- D-004@v2→FR-03→task-03：answer 快照单次消费（src/run/complete.js:1235-1241；测试⑧）闭环
- D-005→FR-03→task-03：stepAssert 仅首轮（src/run/complete.js:1243）闭环
- D-006→FR-02/03/06→task-02/03：白名单三主阶段（src/run/shared.js:1974）闭环
- D-007→FR-01→task-01：readLocalYamlRaw+js-yaml 范式（src/run/shared.js:1961-1963）闭环
- D-008→FR-02→task-02：executeNoAiCliAction 抽取共用（src/run/stage.js:675）闭环
- D-009→FR-03→task-03：横幅不落步记录（src/run/complete.js:1202；测试⑦断言横幅在场）闭环
- D-010@v2→FR-05→task-04：翻转+三测试文件+config-schema（测试⑩+flow 15/15）闭环
- D-011→全部→task-01~05：方案 A 整体闭环
- D-012→task-02/03（执行期裁决，无 FR 映射=实现位置决策）：STAGE_BURST_STAGES 单一源（src/run/shared.js:1974 两处消费）闭环
零未闭环；零 P0/P1 unresolved。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 4 backend endpoints (live [scan-root 5 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (11 files @ worktree)] | 0 backend endpoints unused by frontend (+4 stock noise collapsed)
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
- ℹ️ 清单无 .java 文件（另有 10 个非 Java 清单文件不在探针 9 扫描面）
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
- node --test test/stage-burst.test.mjs（worktree）：11/11 全绿（提交 111ccdff+4bc8584a 后复跑）
- node --test test/flow-protocol.test.mjs test/flow-route.test.mjs test/flow-draft.test.mjs：15/15 全绿（fixtures 迁移后）
- npm run lint（check-syntax）：754 文件过，未引用导出 0，module-map 覆盖全
- npm test 全量（worktree 内）：578 过/12 文件级挂——基线 A/B 判定：同 worktree 环境跑基线提交 8a8ce1b1 同样 12 挂（config-schema/init-no-skills/init-platform-keep-local-yaml/init-tool-multi/mcp-server/platform-init-pointer/platform-managed-declaration/platform-recovery/platform-recovery-chain/run-help-shortcircuit/sillyhub-mcp-platform-fixes/spec-dir——全部为「当前在隔离 worktree 内」守卫拒绝类，CLI spawn 型测试在 worktree 内的环境性假红）+cursor-agent-transcript-detect 套件顺序 flake（单跑双绿，基线亦绿）→ 本变更归因回归 0。主仓复跑移交项见「移交项」节。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-04 | task-01 | src/run/shared.js:1955-1972 readStageBurst（缺省 OFF+env 阀）；测试①-④ | 已闭环 |
| D-002@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | superseded by D-002@v2（Grill P2 判据修正） | superseded |
| D-003@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | superseded by D-003@v2（Grill P1-1 尾随 stale） | superseded |
| D-004@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | superseded by D-004@v2（Grill X-2 快照比对） | superseded |
| D-005@v1 | FR-03、FR-06 | task-03 | src/run/complete.js:1243（首轮后剥离 stepAssert） | 已闭环 |
| D-006@v1 | FR-02 | task-02 | src/run/shared.js:1974 白名单三主阶段；测试⑤反例 | 已闭环 |
| D-007@v1 | FR-01、FR-04 | task-01 | src/run/shared.js:1961-1963 readLocalYamlRaw+js-yaml | 已闭环 |
| D-008@v1 | FR-02 | task-02 | src/run/stage.js:675 executeNoAiCliAction 抽取共用 | 已闭环 |
| D-009@v1 | FR-03、FR-06 | task-03 | src/run/complete.js:1202 横幅；测试⑦断言 | 已闭环 |
| D-010@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | superseded by D-010@v2（Grill P1-2 测试面枚举） | superseded |
| D-011@v1 | FR-01、FR-02、FR-03、FR-04、FR-05、FR-06 | task-03、task-05 | 六提交整体=方案 A；全验收面 | 已闭环 |
| D-002@v2 | FR-02 | task-02 | src/run/stage.js:760-787 renderStageBurst（outputStep 调用形照旧）；测试⑤ | 已闭环 |
| D-003@v2 | FR-03、FR-06 | task-03 | complete.js diff 全插入零删除+轮首 stale 拉回+auto 跳过预合成；测试⑦⑨ | 已闭环 |
| D-004@v2 | FR-03、FR-06 | task-03 | src/run/complete.js:1235-1241 快照比对；测试⑧ | 已闭环 |
| D-010@v2 | FR-05 | task-04 | src/flow.js:66/:76+三文案+config-schema+三 fixtures；测试⑩+15/15 | 已闭环 |
| D-012@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | 执行期裁决：src/run/shared.js:1974 单一源（无 FR 映射=实现位置决策，task-02/03 两处消费） | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 零命中（无 TODO/FIXME/尚未实现标记）。存量登记：burst 全量默认翻转（测试面迁移）为已声明后续变更（D-001 退役判据）；watcher 接 run 族+哨兵规则=下一批（非目标）。

## 变更风险等级 [层：人工判断]
contract-required（与 blast 声明面判级一致：tier=S2/level=contract-required——交互契约变更跨 run 族渲染/完成两侧）。非 integration/deployment-critical：纯 CLI 本地行为，无服务/部署面。

## Runtime Evidence [层：人工判断]
- 提交链（worktree 分支 sillyspec/2026-09-22-stage-burst-fold）：8a8ce1b1（基线）→39cb858d（task-01）→d8e4603c（task-02）→409303cd（task-03）→b49c67e0（task-04）→111ccdff（task-05）→4bc8584a（审查 P2 修复）
- 行为冒烟（2026-09-23 00:40 前后，临时 fixture）：burst 渲染一次下发多步+尾提示+persona 首步注入；burst done 一次推 6→7→8 断在门禁步 exit 1 幂等；--answer 单次消费+二次续推三步
- 隔离快照质量扫描：verify step 5 noAI 步执行（HEAD+变更文件 overlay 自 worktree，记录进 verify-facts.json）
- 启动命令/端点/服务面：不涉及（纯 CLI）

## 代码审查 [层：人工判断]
execute 阶段独立代码审查（agent-tool 通道，S2×1，reviewType=acceptance）：九项清单全 pass，零 P0/P1。三项 P2：
- P2-1 收尾 currentIdx 语义（尾随 skipped 漂移）→ 已修（4bc8584a：lastNoAiIdx 追踪）
- P2-2 零 pending 退化 --done 静默 → 已修（4bc8584a：首轮委托 completeStep 走既有 no-pending 处理）
- P2-3 finalize 分支无直测 → 接受论证：分支体=共享助手 finalizeStageAllStepsDone（与 noAI 末步路径同源，既有 noAI 末步测试经共享助手覆盖）；3 行分支逻辑（remainingIdx 判定+参数传递）经 execute 审查 diff 级核验
走查定向面（探针 7 原 partial 行）：burst 关闭/非白名单反例——用例⑤后半+⑥在场（见探针 7 复核行），白名单门短路不进分支。无越权/载荷/分页并发面（纯本地 CLI）。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
无二次复核（execute 独立审查已完成一轮独立通道复核，结论回流在「代码审查」节；verify 阶段未再派二次审查）。
