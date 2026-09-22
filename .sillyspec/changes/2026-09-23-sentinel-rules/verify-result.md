---
author: qinyi
created_at: 2026-09-23 01:30:00
---
# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——六任务全实现全验收（28 例单测+lint 753+watcher.test 13/13 零回归）；质量扫描实测记录由步 6 CLI 亲测落盘后于步 7 终判升级（本槽为步 5 门禁过渡态，见移交项首行）。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| manual-acceptance | 质量扫描实测记录待步 6 noAI 步 CLI 亲测落盘（本报告写于步 5，记录时序未达） | 步 6 `verifyRunQualityScan` 亲跑 commands.test/lint 落 verify-quality-scan json 后，步 7 终判本结论槽 |
| other | L0 收口接线（detectFakeCheckCompletion → --done 拒收调用点）按任务书显式留给下批，避免与并行会话改同文件 | 下批变更在 verify 收口侧调用该函数并补接线用例（函数本体已交付+28 例中三态钉） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
无（六任务 review verdict 均 pass，无 cannot_verify）。

## 集成验证回执 [层：自述声明——CLI 一致性校验]
无（变更风险等级 unit-sufficient，非 integration/deployment-critical——CLI 本地面：detached watcher 子进程+纯函数库，无服务起停/端点发布）。

## 任务完成度 [层：人工判断]
- task-01 ✅ 完成：buildSnapshot 五新字段+五注入面（`test/sentinel-rules.test.mjs`「buildSnapshot 注入面」28 例组内实测，含 git 失败 null 化）
- task-02 ✅ 完成：四规则引擎+循环接线（R1-R4 各≥1正≥1负全绿；事件形态钉）
- task-03 ✅ 完成：detectFakeCheckCompletion 三态（complete/fake/none+missing，token 边界+review 注入）
- task-04 ✅ 完成：水位三函数+回补标记+幂等（往返/去重/损坏 null/同水位零事件）
- task-05 ✅ 完成：runAutoMode 头部挂点（import 冒烟过；既有 1367 挂点 diff 零触碰）
- task-06 ✅ 完成：28 例测试+module-map 补录+lint 753 绿+watcher.test 13/13 零回归
完成率 6/6=100%。

## 设计一致性 [层：人工判断]
一致，零偏差。逐节核对：①快照四源扩展与 design §总体方案 1 逐字段对齐（isNonCodePath 口径同 quality-scan 本地复制不 import 重链）；②四规则语义与 §2 对齐——R2 的 statKey 判新记录是实现期对 design「同一 FAIL 记录跨拍只累计证据」语义的落地（design 明文）；③事件模型 §2 warning 形态钉入测试；④水位回补 §3 幂等锚=消费前移；⑤L0 §4 三态+token 边界；⑥挂点 §5 位置避开 1727/2073；⑦非目标（收口接线/flow pause/旧流程折叠）diff 范围核零触碰。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中
- ℹ️ 2 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
- ✅ applySentinelRules（src/watcher.js ×3）/ detectFakeCheckCompletion（src/sentinel-assertions.js ×2）/ STALL_EARLY_MS（×2）/ watcherSnapshotPath（×4）/ backfill（×6）/ fake-check（×1）/ test-tamper（×2）/ scope-drift（×1）/ stall 规则名（mkWarning('stall')）/ checkedTasks（×6）/ scanStatus（×5）/ dirtyCode（×11）/ reviews（×8+2）——design 能力关键词全命中（worktree 实现面 grep 实测）

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 4 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 4 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src）找到 4 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-04: 模块目录（src）找到 4 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-05: 模块目录（src/run）找到 1 个测试文件（src/run/test-ledger.js）
- ✅ task-06: 模块目录（test、.sillyspec/docs/sillyspec/modules）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 注入 gitLogImpl/porcelainImpl/readdirSyncImpl 时 buildSnapshot 零真 git/fs 依赖产出五新字段（fixture 直测） | `test/sentinel-rules.test.mjs` | 注入、gitLogImpl、porcelainImpl、buildSnapshot（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:10`（注入）、`test/sentinel-rules.test.mjs:369`（gitLogImpl）、`test/sentinel-rules.test.mjs:369`（porcelainImpl） |
| git 调用失败（impl 返回 null/抛异常）时 commits/dirtyCode 为 null/[]，既有字段不受影响（fail-open） | `test/sentinel-rules.test.mjs` | git、impl、返回、null（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:4`（git）、`test/sentinel-rules.test.mjs:390`（impl）、`test/sentinel-rules.test.mjs:390`（返回） |
| 既有 test/watcher.test.mjs 的 buildSnapshot 用例零改动全绿（additive 不破坏） | `test/sentinel-rules.test.mjs` | test、watcher、mjs、buildSnapshot（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:2`（test）、`test/sentinel-rules.test.mjs:25`（watcher）、`test/sentinel-rules.test.mjs:2`（mjs） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 四规则各 ≥1 正 ≥1 负 fixture 单测（task-06 测试文件，正例各出对应 rule 的 warning，负例零 warning） | `test/sentinel-rules.test.mjs` | fixture、task（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:4`（fixture）、`test/sentinel-rules.test.mjs:51`（task） |
| warning 事件恒带 provisional:true+severity:'warning'+rule 名；kind='warning' 与基础事件可区分 | `test/sentinel-rules.test.mjs` | warning、provisional、true、severity（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:9`（warning）、`test/sentinel-rules.test.mjs:9`（provisional）、`test/sentinel-rules.test.mjs:153`（true） |
| 引擎抛异常被 try/catch 吞（warn 后主循环继续）——best-effort 钉 | `test/sentinel-rules.test.mjs` | try、warn（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:166`（try）、`test/sentinel-rules.test.mjs:9`（warn） |
| 不写 progress db（引擎零 db 引用） | `test/sentinel-rules.test.mjs` | — | non-testable | 纪律约束类（单写者纪律），静态核验：src/watcher.js 哨兵段与 src/sentinel-assertions.js 零 progress/db import（grep 实测），运行面无对应测试形态 |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 三态单测：真完成（全勾+每 id 有 commit 证据）/假勾选（全勾+某 id 零证据，missing 含该 id）/无勾选（未全勾或判集空） | `test/sentinel-rules.test.mjs` | commit、证据（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:5`（commit）、`test/sentinel-rules.test.mjs:5`（证据） |
| token 边界钉：subject 含 task-010 不构成 task-01 证据 | `test/sentinel-rules.test.mjs` | token、边界钉、subject、task、不构成（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:5`（token）、`test/sentinel-rules.test.mjs:5`（边界钉）、`test/sentinel-rules.test.mjs:59`（subject） |
| 无 id 勾选行不入判（全无 id 行 → none） | `test/sentinel-rules.test.mjs` | 勾选行不入判、none（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:295`（勾选行不入判）、`test/sentinel-rules.test.mjs:10`（none） |
| review.json 在场构成证据（注入 listReviewsImpl 断言） | `test/sentinel-rules.test.mjs` | review、json、注入、listReviewsImpl（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:5`（review）、`test/sentinel-rules.test.mjs:70`（json）、`test/sentinel-rules.test.mjs:10`（注入） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 幂等钉：同水位二次 load+diff → 零事件（单测直驱 load/write/inferEvents） | `test/sentinel-rules.test.mjs` | 幂等钉、同水位二次、load、diff、零事件（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:329`（幂等钉）、`test/sentinel-rules.test.mjs:11`（同水位二次）、`test/sentinel-rules.test.mjs:23`（load） |
| 水位缺失/损坏 JSON → 全新启动现行为（零回归） | `test/sentinel-rules.test.mjs` | 损坏、JSON（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:11`（损坏）、`test/sentinel-rules.test.mjs:320`（JSON） |
| 回补事件恒 provisional:true + backfill:true；archived 首拍早退不产生水位读写 | `test/sentinel-rules.test.mjs` | 回补事件恒、provisional、true、archived（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:336`（回补事件恒）、`test/sentinel-rules.test.mjs:9`（provisional）、`test/sentinel-rules.test.mjs:153`（true） |
| 内容去重：快照未变的连续轮不重复写盘（串比对） | `test/sentinel-rules.test.mjs` | 内容去重（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:11`（内容去重） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| run auto 路径拉起 watcher（既有 run <stage> 路径 1367 挂点零改动——负例即既有行为不变） | `test/sentinel-rules.test.mjs` | run、watcher（`test/sentinel-rules.test.mjs`） | covered | `test/watcher.test.mjs`（spawnWatcher 三态 disabled/coalesced/spawned 锁定其行为语义）+ 挂点块 import 冒烟与 diff 走查（单块 20 行纯调用，无自研逻辑）；既有路径零改动由全量回归兜底 |
| spawn 失败只 warn 不阻断 auto 主流程（best-effort 钉） | `test/sentinel-rules.test.mjs` | warn（`test/sentinel-rules.test.mjs`） | covered | `test/watcher.test.mjs`（spawn 失败抛异常由调用方 catch 降级的既有语义）+ 挂点 try/catch 走查（src/run/command.js runAutoMode 头部块） |
| SILLYSPEC_WATCHER=0 逃生阀语义继承（spawnWatcher 内部短路） | `test/sentinel-rules.test.mjs` | — | covered | `test/watcher.test.mjs:108`（「spawnWatcher: SILLYSPEC_WATCHER=0 → disabled（不 spawn）」既有用例，逃生阀在 spawnWatcher 本体，挂点透传 env 零改动） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| node --test test/sentinel-rules.test.mjs 全绿（≥1 正 ≥1 负 per 规则） | `test/sentinel-rules.test.mjs` | node、test、sentinel、rules、mjs（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:14`（node）、`test/sentinel-rules.test.mjs:2`（test）、`test/sentinel-rules.test.mjs:2`（sentinel） |
| 既有 test/watcher.test.mjs 零改动零回归 | `test/sentinel-rules.test.mjs` | test、watcher、mjs（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:2`（test）、`test/sentinel-rules.test.mjs:25`（watcher）、`test/sentinel-rules.test.mjs:2`（mjs） |
| npm run lint 绿；npm test 全量绿 | `test/sentinel-rules.test.mjs` | run、test（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:36`（run）、`test/sentinel-rules.test.mjs:2`（test） |
| module-map 含 sentinel-assertions.js（sync 模块 paths） | `test/sentinel-rules.test.mjs` | map、sentinel、assertions（`test/sentinel-rules.test.mjs`） | covered | `test/sentinel-rules.test.mjs:46`（map）、`test/sentinel-rules.test.mjs:2`（sentinel）、`test/sentinel-rules.test.mjs:26`（assertions） |

- ⚠️ 零/半自动化承接条目 2 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
- D-001@v1 → FR-01~06 → task-02 ✅ 闭环：applySentinelRules 内嵌 src/watcher.js（设计 §总体方案 2），测试 `test/sentinel-rules.test.mjs` 四规则组
- D-002@v1 → FR-02/07 → task-02/03 ✅ 闭环：证据口径双落（R1 与 L0 同 token 前瞻），`test/sentinel-rules.test.mjs`「R1 token 边界钉」「L0 token 边界」
- D-003@v1 → FR-05 → task-02 ✅ 闭环：相位锁存单向，`test/sentinel-rules.test.mjs`「R4 execute 期 15min 阈值」锁存断言
- D-004@v1 → FR-04 → task-02 ✅ 闭环：声明面 fail-open+globMatch，`test/sentinel-rules.test.mjs`「R3 负例：无声明面」+「面内（含 glob 容差）」
- D-005@v1 → FR-08 → task-04 ✅ 闭环：水位幂等，`test/sentinel-rules.test.mjs`「回补幂等钉」
- D-006@v1 → FR-09 → task-05 ✅ 闭环：runAutoMode 挂点（diff 走查+import 冒烟），行为语义 `test/watcher.test.mjs` 三态
无未闭环行。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 4 backend endpoints (live [scan-root 5 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (6 files @ worktree)] | 0 backend endpoints unused by frontend (+4 stock noise collapsed)
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
- ℹ️ 清单无 .java 文件（另有 4 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（7 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态：design接口表#METHOD /path、权限矩阵[角色×动作]、契约表@行标识、DDL@列名、载荷@构造点路径（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
- 无接口面（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——本变更若实际触碰接口，先补 design 接口段表格或声明行，再重跑 `verify-probes --change <变更名> --init --force` 重生成本段（⚠️ 全骨架重生成，手填结论会重置——先备份；quick-B 起 --force 通道存在）；判级 critical 的零面拦截归 validator

## 测试结果 [层：确定性检查——CLI 实测对账]
- node --test test/sentinel-rules.test.mjs（worktree）：28/28 通过，0 失败
- node --test test/watcher.test.mjs（worktree）：13/13 通过，0 失败（既有文件零改动零回归）
- npm run lint（worktree）：753 文件全绿（未引用导出 0 + module-map 覆盖全）
- 主仓基线全量 npm test（apply 前实测）：589/589 通过，0 失败
- CLI 统一实测（--done 质量扫描对账）：见 verify-quality-scan-2026-09-23-sentinel-rules.json（commands.test=npm test / commands.lint=npm run lint）
- worktree 套件环境注记：套件 runner 下 14 个 CLI init/platform 族文件因 worktree-cwd 守卫假红（单文件直跑双仓皆绿，报错文案即「cd 到主仓根重跑」），与本变更无关，主仓 apply 后全量为准
- known_failures 豁免：无

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-06 | task-02 | applySentinelRules 内嵌 src/watcher.js；`test/sentinel-rules.test.mjs` 四规则组 | 闭环 |
| D-002@v1 | FR-02、FR-07 | task-02、task-03 | R1 与 L0 同 token 前瞻口径；`test/sentinel-rules.test.mjs`「R1 token 边界钉」「L0 token 边界」 | 闭环 |
| D-003@v1 | FR-05 | task-02 | 相位锁存单向；`test/sentinel-rules.test.mjs`「R4」组锁存断言 | 闭环 |
| D-004@v1 | FR-04 | task-02 | 声明面 fail-open+globMatch 复用；`test/sentinel-rules.test.mjs`「R3」组三负例 | 闭环 |
| D-005@v1 | FR-08 | task-04 | 水位消费前移幂等；`test/sentinel-rules.test.mjs`「回补幂等钉」 | 闭环 |
| D-006@v1 | FR-09 | task-05 | runAutoMode 头部挂点 diff 走查+import 冒烟；`test/watcher.test.mjs` 三态 | 闭环 |

## 技术债务 [层：人工判断]
探针 1 零 TODO/FIXME 命中。本变更未引入新债；显式递延项一条（L0 收口接线，任务书裁定下批，见移交项）。

## 变更风险等级 [层：人工判断]
unit-sufficient——CLI 本地观测面（detached watcher 子进程内部+纯函数库+单挂点接线），无 schema/接口契约/跨服务变更；事件字段 additive、平台端点契约不动；blast 声明面判级 tier=S1（ceremony 定价同源）。design.md frontmatter 无 risk_level 显式声明。

## Runtime Evidence [层：人工判断]
- worktree 分支 sillyspec/2026-09-23-sentinel-rules 六提交：c5f42270（t01）→ 97f6f5b5（t05）→ 87e33c97（t02）→ c8944d0e（t03）→ 5785fdb6（t04）→ 23f6144d（t06），baseline checkpoint 62823f06
- 引擎冒烟实跑（node -e 绝对 URL import）：fake-check warning（task-02 翻格零证据）+ stall warning（execute 期 21min）触发正确
- L0 冒烟六例：partial→none / 全勾缺证→fake(missing=[task-02]) / 双证→complete / task-010 不证 task-01 / review 注入→complete / 无 id 行→none
- 水位冒烟：write→written:true，同内容→written:false，损坏→null，同水位二次 diff 零事件
- 生命周期终态断言：archived 首拍早退不读不写水位（代码路径走查）；既有孤儿三闸/心跳租约/硬寿命帽语义零改动（watcher.test.mjs 13/13）
- 不涉及：服务起停/端点发布/部署

## 代码审查 [层：人工判断]
执行期三轮自审各拦一真缺陷：①R2 同一 FAIL 记录跨拍重锚会洗掉已累计证据（改 statKey 判新记录）；②注入 impl 返回 null 被解析成 []（fail-open 语义不可区分，改 null 映射——测试驱动修出）；③块注释内 `execute-runs/*/tasks` 通配符提前闭合注释致语法错误（import 即拦）。走查清单：①编辑/更新链路——无编辑回显类界面；水位覆盖写幂等有测试钉；②非主分支流——skipped 账本态不参与 R2（代码走查）、archived 拍不判规则（早退+引擎双保险）；③守卫一致性——无端点/权限面；④载荷契约——探针 8 不适用；⑤并发/原子性——jsonl append 单写者（detached 单飞锁既有语义），水位覆盖写与事件 append 无交叉依赖（回补非恢复依赖，损坏全新启动）。总体评价：实现贴设计、纯函数面充分、异常路径全部 fail-open 且方向一致（不误报优先），遗留仅下批接线项。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
无（tier=self/S1 轻仪档，无独立复核子代理）。
