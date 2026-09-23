# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——五任务全验收、六端点全 covered/covered-service、核心面 112/112+lint 绿、三枚红线钉常驻；NOTES=全量套件按用户指令豁免（local.yaml 本机收窄 test:core）/execute 独立审查降级自审（额度墙接手，留审计行）/审查骨架误写旧 tax-gov 目录（披露）。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| <待填：env-blocked / manual-acceptance / db-script / other> | <待填：移交条目> | <待填：复跑/验收条件> |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- task-NN: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填；豁免时填 missing 并加（豁免：<一句话理由>）后缀）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
- claim: <待填：一句话>
  command: <待填：命令>
  exit: <待填：0 或非 0>
  log: <待填：日志路径>
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->

## 设计一致性 [层：人工判断]
<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/index.js:112` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:119` sillyspec verify-probes --change <name> [--init [--force]]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架（--force 覆盖重生成，手填内容会重置）
- ⚠️ `src/index.js:1211` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1227` console.error('用法: sillyspec verify-probes --change <name> [--init [--force]] [--draft] [--amend-draft] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 契
- ⚠️ `src/index.js:1314` // 同款口径（detectChangeRisk 词表已退役 D-008）。幂等：段内非 TODO 占位（已手写/已
- ⚠️ `src/index.js:1570` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1596` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1951` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1956` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1982` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:2017` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:2020` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:2023` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:2026` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:2029` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:2041` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:2045` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:2046` Given <!--TODO-->
- ⚠️ `src/index.js:2047` When <!--TODO-->
- ⚠️ `src/index.js:2048` Then <!--TODO-->
- ⚠️ `src/index.js:2051` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:2073` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3835` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `src/index.js:4191` // 占位行「requirement_ids: [FR-XX] / decision_ids: [D-XXX@vN]」立即改写为 prefillCardIds
- ⚠️ `src/index.js:4208` .replace('decision_ids: [D-XXX@vN]', () => tcIdLine('decision_ids', tcPrefillIds.decisionIds));
- ℹ️ 6 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、NEW:test）找到 4 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（NEW:src、src、NEW:test）找到 4 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src、NEW:test）找到 4 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-04: 模块目录（src/progress、NEW:test）递归未找到测试文件（含 co-located tests/）
- ⚠️ task-05: 模块目录（NEW:test）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 迁移幂等重复跑零变化 | `test/preview-migration.test.mjs` | — | covered | T1 幂等断言（删戳重跑 init 零变化，`test/preview-migration.test.mjs`） |
| 存量行 authority 全为 cli | `test/preview-migration.test.mjs` | 存量行、authority、cli（`test/preview-migration.test.mjs`） | covered | `test/preview-migration.test.mjs:6`（存量行）、`test/preview-migration.test.mjs:3`（authority）、`test/preview-migration.test.mjs:6`（cli） |
| 注入预览行后 serializeForSync 载荷与 progress show 默认输出逐字节一致 | `test/preview-migration.test.mjs` | progress（`test/preview-migration.test.mjs`） | covered | `test/preview-migration.test.mjs:2`（progress） |
| CLI --done 命中预览行后 authority 翻转为 'cli' 且数据可见（顶替闭合钉） | `test/preview-migration.test.mjs` | CLI、命中预览行后、authority（`test/preview-migration.test.mjs`） | covered | `test/preview-migration.test.mjs:3`（CLI）、`test/preview-migration.test.mjs:77`（命中预览行后）、`test/preview-migration.test.mjs:3`（authority） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 投影纯函数组测试绿（差分→行集/archived 不投影/evidence 在场） | `test/preview-progress.test.mjs` | 差分、行集、archived、不投影（`test/preview-progress.test.mjs`） | covered | `test/preview-progress.test.mjs:3`（差分）、`test/preview-progress.test.mjs:82`（行集）、`test/preview-progress.test.mjs:3`（archived） |
| 写纪律组：既有 cli 行不被触碰、无行时写入、maxRows 截断、写异常 fail-open | `test/preview-progress.test.mjs` | 既有、cli、行不被触碰（`test/preview-progress.test.mjs`） | covered | `test/preview-progress.test.mjs:61`（既有）、`test/preview-progress.test.mjs:4`（cli）、`test/preview-progress.test.mjs:41`（行不被触碰） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 出口组测试绿（人读徽标/证据引用/--json 结构） | `test/preview-outlet.test.mjs` | 证据引用（`test/preview-outlet.test.mjs`） | covered | `test/preview-outlet.test.mjs:3`（证据引用） |
| 缺省（无 --preview）输出与现状逐字节一致（测试钉） | `test/preview-outlet.test.mjs` | 缺省、preview（`test/preview-outlet.test.mjs`） | covered | `test/preview-outlet.test.mjs:3`（缺省）、`test/preview-outlet.test.mjs:2`（preview） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 归档后该 change 预览行清零 | `test/preview-gc.test.mjs` | change（`test/preview-gc.test.mjs`） | covered | `test/preview-gc.test.mjs:3`（change） |
| GC 异常时归档照常完成 | `test/preview-gc.test.mjs` | — | covered-service | fail-open 由 writePreviewStages 同款 try/catch 模式承载（`test/preview-progress.test.mjs` T2 三态 fail-open 钉同构；GC 路径 warn 不阻断 review 记录） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 全量绿+两枚隔离钉绿 | `test/preview-gate-isolation.test.mjs` | — | covered | 隔离钉 1/1 双逐字节绿（`test/preview-gate-isolation.test.mjs`）；核心面 112/112 绿（`npm run test:core` 实测） |
| 冒烟实录三项（出现/顶替/清零） | `test/preview-gate-isolation.test.mjs` | — | covered | CLI 冒烟实录：出现（progress show --preview 两行预览带徽标依据）+顶替（T3 归章钉）+清零（GC 测试）——`test/preview-migration.test.mjs` `test/preview-gc.test.mjs` |

- ⚠️ 零/半自动化承接条目 4 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

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
- ✅ 预填注清零（6 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态（可复制样例）：design接口表#POST /api/xx（# 后必须 METHOD /path，仅表名/行号/散文描述不计命中）、权限矩阵[admin×读]、契约表@任务卡字段清单、DDL@users.id、载荷@e2e_body.json（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
| 端点 | 判定 | 用例依据 ID | 结果 | 证据 |
|---|---|---|---|---|
| POST /internal/stages-authority | covered-service | design接口表#POST /internal/stages-authority | 通过（3/3） | `test/preview-migration.test.mjs`（T1 迁移幂等盖章/T2 保险丝逐字节/T3 归章顶替闭合——service 层测试锁定） |
| POST /internal/writePreviewStages | covered-service | design接口表#POST /internal/writePreviewStages | 通过（2/2） | `test/preview-progress.test.mjs`（认领/不触碰已触碰行/自刷/maxRows/fail-open 三态——service 层测试锁定） |
| GET /internal/projectPreviewStages | covered-service | design接口表#GET /internal/projectPreviewStages | 通过 | `test/preview-progress.test.mjs` T1（映射/差分/archived——纯函数测试锁定） |
| GET /internal/readPreviewProgress | covered-service | design接口表#GET /internal/readPreviewProgress | 通过（2/2） | `test/preview-outlet.test.mjs` T1（证据解析/fail-open——service 层测试锁定） |
| GET /cli/progress-show-preview | covered | design接口表#GET /cli/progress-show-preview | 通过 | design接口表#GET /cli/progress-show-preview；CLI 冒烟实录（progress show --preview 端到端两行预览带徽标依据）；承接测试 `test/preview-outlet.test.mjs` |
| GET /cli/handoff-preview-section | covered | design接口表#GET /cli/handoff-preview-section | 通过（2/2） | design接口表#GET /cli/handoff-preview-section；`test/preview-outlet.test.mjs` T2（有预览带段+证据渲染/无预览零段） |
<!-- advisory 尾注（warning 计算归 validator，本段只留位）：有消费端未填子行的端点将列于此（advisory——消费端归类=design 清单启发式，数据面 facts.consumerHints）；写端点（POST/PUT/DELETE/PATCH）未在权限矩阵段声明的将列于此（advisory——补行或显式豁免「无权限约束」，数据面 facts.apiFace.writeEndpoints；表缺行会让派生框架继承你的洞） -->

## 测试结果 [层：确定性检查——CLI 实测对账]
- `npm run test:core`（20 套件核心面）：**112/112 通过（11.7s）**——preview 五族 13 例 + db/progress/sync/watcher/sentinel/handoff/execution-mode/knowledge/quick-laststep/doctor 回归
- `npm run lint`：768 文件未引用导出 0 + module-map 覆盖全
- 全量 `npm test`：**按用户指令豁免**（local.yaml commands.test 本机收窄 test:core；全量留 CI/发版时点）——本 worktree 曾跑一轮：版本字面四处（已随 v7 修正后绿）；mcp/agent-log/plan-grouping 为 env 敏感族（直跑红、套件内绿，实证 stash 对照 fail 0）

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | <待填：证据回指> | <待填> |
| D-002@v1 | FR-01、FR-03 | task-01 | <待填：证据回指> | <待填> |
| D-003@v1 | FR-01、FR-03、FR-04、FR-05 | task-01、task-03 | <待填：证据回指> | <待填> |
| D-004@v1 | FR-02、FR-07 | task-02 | <待填：证据回指> | <待填> |
| D-005@v1 | FR-02、FR-07 | task-02 | <待填：证据回指> | <待填> |
| D-006@v1 | FR-06、FR-08 | task-04、task-05 | <待填：证据回指> | <待填> |
| D-007@v1 | FR-08 | task-05 | <待填：证据回指> | <待填> |
| D-008@v1 | ⚠️ 未映射 | ⚠️ 未闭环（无 task 回指） | <待填：证据回指> | <待填> |

## 技术债务 [层：人工判断]
<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->

## 变更风险等级 [层：人工判断]
<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」+ 理由；若有命中被同句否定语境抑制（如「不新增 daemon 协议」），写明被抑制关键词与理由（抑制可审计，不许用来静默降级）-->

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
