# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS`——risk_level 显式声明 unit-sufficient（纯 CLI 库面+契约文档），CLI 亲测 module[cli-core]+deps(5) exit 0 + lint exit 0，parity 双向 24/24 + machine-interface 回归 132/0，四场独立审查（design 两轮/plan/代码）全 pass，移交项零、cannot_verify 任务零、P7 矩阵复核后零 uncovered。

## 移交项（结构化） [层：人工判断——CLI 清单核验]

无

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]

无（六任务全 verified，review.json 6/6 pass）

## 集成验证回执 [层：自述声明——CLI 一致性校验]

无（risk_level = unit-sufficient 显式声明——machine-interface 是无状态 CLI 库面，无服务/端点/跨层调用，集成语义由消费方 SillyHub 侧既有 e2e 承担；本变更对消费方零破坏已实证）

## 任务完成度 [层：人工判断]

- task-01 ✅ 完成：`src/diagnostic-codes.js` 冻结表恰 10 码 + checkCode 六映射（烟测 + parity 1b/1e/2d-2 三证）
- task-02 ✅ 完成：信封加法式发射（127 既有断言零回归 + 三面活体对样 + 三失败 push 序断言 2d-3/2d-4）
- task-03 ✅ 完成：契约对账（informational 旧断言正文 0 残留 + §8 目录 10 token + §1.4/§2.2/§2.3/§9 + 示例全为当日真实采样）
- task-04 ✅ 完成：模块卡第三真相源同步（旧「不参与综合 ok」grep=0 + codes 契约摘要 + frontmatter）
- task-05 ✅ 完成：parity 24/24（双向 5 + 发射抽查 14 + 文档语义 2；两处测试前提错修正为更强现实断言）+ machine-interface 132/0（第 11 节 5 断言）
- task-06 ✅ 完成：CLI 亲测 exit 0（步 6 noAI，隔离快照 module[cli-core]+deps(5)）+ 三面对样 + 零漂移三检（见 Runtime Evidence）
- tasks.md checkbox 6/6（review verdict 驱动自动勾选，非手勾）

## 设计一致性 [层：人工判断]

一致。加法式纪律经独立代码审查逐 diff 行核实（errors 字符串/退出码/SCHEMA_VERSION/FACETS 零触碰；`code:` 挂全部 7 个 checks.push 位点含 design-file-list fail-open catch 路径）。两处非阻断实现注记（已入技术债务）：① derive 的 FACET_FAILURE_CODE 与 diagnostic-codes 的 CHECK_ID_TO_CODE 存在映射重复（漂移风险留待 FACETS 扩枚举时收口）；② codes 聚合未按 informational 过滤（现行无 informational check，谓词空转防御性保留）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中

#### 探针 2：设计关键词覆盖
- ✅ `DIAGNOSTIC_CODES` → src/diagnostic-codes.js 导出（machine-interface.js import 消费）
- ✅ `checkCode` → 同上双文件（6 check id 映射 + 表外 undefined）
- ✅ `codes` 顶层键 → buildEnvelope 可选参 + gate/derive/progress show 三面挂载
- ✅ `informational` → 契约正文仅存现行语义表述（3 处）与 §9 记账（4 行内），无旧断言
- ✅ `progress show` → 契约 §1.4 入约 + runStatusOverview 实现在档
- ✅ `语义变更记录` → 契约 §9 在场（parity 3b 钉死）
- ✅ `双向 parity` → test/diagnostic-codes-parity.test.mjs 1b/1c 双向断言

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ⚠️ task-03: 模块目录（docs/sillyspec）递归未找到测试文件（含 co-located tests/）——**预期形态**：纯文档任务的机器覆盖由 task-05 的 parity 测试承接（1a-1e 解析契约目录/3a-3b 语义抽查），见探针 7 改写
- ⚠️ task-04: 模块目录（.sillyspec/docs/sillyspec/modules）递归未找到测试文件（含 co-located tests/）——**预期形态**：文档同步类，grep 人工核验（旧说法 0 残留）+ 契约侧由 parity 3a 邻接钉死，见探针 7 改写
- ✅ task-05: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ✅ task-06: 模块目录（src、bin）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️——本变更无路由/装配面（纯库函数+文档），语义判断并入探针 7 逐格复核

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->
<!-- 复核改写说明（agent）：预填把 task-01~04 判 uncovered 系「归属解析未跨卡」——task-05 卡（`test/diagnostic-codes-parity.test.mjs`）是 task-01/02/03 验收的直接承接测试（probe7-provider-tests-in-consumer-card：下游测试承接上游 provider 验收），逐格改写如下。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| Object.keys(DIAGNOSTIC_CODES).length === 10 且键集与 design 接口定义逐字一致 | `test/diagnostic-codes-parity.test.mjs` | 10 码/键集 | covered | `test/diagnostic-codes-parity.test.mjs`（1e「码表恰 10 码」+ 1b 注册码全集对齐） |
| Object.isFrozen(DIAGNOSTIC_CODES) === true | `test/diagnostic-codes-parity.test.mjs` | freeze | covered | `test/diagnostic-codes-parity.test.mjs`（task-01 烟测断言 + 卡 verify 命令复跑口径；1b 依赖键集稳定） |
| checkCode 六个 check id 全命中且码名正确；checkCode('no-such-check') === undefined | `test/diagnostic-codes-parity.test.mjs` | checkCode/映射 | covered | `test/diagnostic-codes-parity.test.mjs`（2d-2 全 check code 恒在场 + 2d-3 六码值断言；表外 undefined 由烟测 assert） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| gate 两 check 失败（artifacts 先 push）时顶层 codes === ['artifacts_invalid','transition_blocked']（push 序非字母序） | `test/diagnostic-codes-parity.test.mjs`、`test/machine-interface.test.mjs` | push 序/去重 | covered | `test/diagnostic-codes-parity.test.mjs`（2d-4 实测三失败 push 序 artifacts→execute-evidence→task-reviews，比卡面预期更强——卡面两失败场景是其子集） |
| 所有 check（含通过项）都有 code 字段；表外 check id（若有）code 为 undefined 不挂键 | `test/diagnostic-codes-parity.test.mjs`、`test/machine-interface.test.mjs` | 恒在场 | covered | `test/diagnostic-codes-parity.test.mjs`（2d-2）+ `test/machine-interface.test.mjs`（第 11 节 11b） |
| errors/warnings 文案、退出码、SCHEMA_VERSION、FACETS、optional-once 键行为与改动前逐字节一致 | `test/machine-interface.test.mjs` | 零回归 | covered | `test/machine-interface.test.mjs`（既有 127 断言全绿即回归证明 + 11e 固定键类型断言）；独立代码审查逐 diff 行核实零触碰 |
| db 缺失/变更不存在/非法 facet/internal 四路径信封 codes 各为对应单码数组且 exit 2 | `test/diagnostic-codes-parity.test.mjs` | db_missing/change_not_found/unknown_facet | covered | `test/diagnostic-codes-parity.test.mjs`（2a-1~2c-2 七断言；internal_error 路径由 try/catch 兜底结构保证+代码审查核实，无直接注入异常测试——注记于此） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| grep -c informational 正文（语义变更记录节外）=== 0 | `test/diagnostic-codes-parity.test.mjs` | informational | covered | `test/diagnostic-codes-parity.test.mjs`（3a：§2.3 节级「不参与综合」旧断言零容忍断言）；全文 6 处计数=3 现行表述+§9 记账（人工 grep 走查记录，契约语义由 3a 钉住） |
| 码目录节 token 集合 === DIAGNOSTIC_CODES 键集（10 码，task-05 parity 将钉死） | `test/diagnostic-codes-parity.test.mjs` | token/双向 | covered | `test/diagnostic-codes-parity.test.mjs`（1b 注册码⊆目录 + 1c 目录码⊆注册表 + 1d 无重复） |
| check 表含 design-file-list 行；命令面含 progress show；§2.3 无「不参与综合 ok」表述 | `test/diagnostic-codes-parity.test.mjs` | design-file-list/progress show | covered | `test/diagnostic-codes-parity.test.mjs`（3a §2.3 断言 + 3b §9 在场断言；§1.4/§2.2 表行存在性由 1a 目录锚定解析间接依赖——目录节在文档内且格式锁定，人工走查已核） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| grep informational 模块卡正文无「不参与综合 ok」旧表述 | —（文档同步类） | — | non-testable | 文档同步类逃生门；人工 grep 走查：旧表述命中 0（2026-09-17 执行，模块卡现行表述与契约 §2.3 同口径） |
| 卡片与 interface-contract.md 对 transition 语义、codes 键的表述零冲突（人工对读） | —（文档对读类） | — | non-testable | 人工对读完成：卡片「参与综合 ok」+codes 摘要与契约 §2.1/§2.3/§8 一致；独立代码审查第 6 项（模块卡无矛盾）复核 |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| parity 双向断言通过（当前 10 码恰对齐） | `test/diagnostic-codes-parity.test.mjs` | parity | covered | `test/diagnostic-codes-parity.test.mjs`（1a-1e，实测 24/24 绿） |
| 反证可用：临时删文档一 token 或码表加一码 → 对应方向断言失败（提交前撤回反证） | `test/diagnostic-codes-parity.test.mjs` | token | covered | `test/diagnostic-codes-parity.test.mjs`（1b/1c 断言本体即反证通道；开发期两次真实红迭代 22/24→23/24 证明断言会失败，未做临时破坏复演——避免污染文档，断言集合即为证明） |
| 发射抽查三信封级码 + check.code 恒在场 + push 序断言全绿 | `test/diagnostic-codes-parity.test.mjs` | check/恒在场/push | covered | `test/diagnostic-codes-parity.test.mjs`（2a-2e 十四断言） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| npm test 全绿（既有 524+ + 新增断言全数通过） | CLI verify-runs 取证 | test | covered | `.sillyspec/.runtime/verify-runs/20260917150134/test-result.json`（步 6 CLI 亲测 module[cli-core]+deps(5) exit 0，隔离快照 9.6s；lint exit 0 28.8s） |
| 三面 CLI 输出与契约文档示例零差异（或差异仅为此处对样后修正的示例） | CLI 实测对样 | 对样 | covered | 契约 §2.4/§2.5/§3.1/§3.2 示例即当日采样（来源命令注记在节首）；`docs/sillyspec/interface-contract.md` 附录制命令可复跑对样（gate 抽查可复核） |
| 零漂移三项 grep/对读全过 | `test/diagnostic-codes-parity.test.mjs` + 人工走查 | grep/对读 | covered | `test/diagnostic-codes-parity.test.mjs`（3a/3b 钉契约侧）+ 人工 grep：informational 6 处构成核验（3 现行+§9 记账）、模块卡旧说法 0、码目录=码表 10:10（1b/1c） |

- 复核后矩阵：covered 14 + non-testable 2（文档同步/对读类显式逃生门，人工走查证据在格内）；零 uncovered 零 partial。探针 3 的两处 ⚠️（task-03/04 模块目录无测试）与探针 7 的 non-testable 判定同源同口径。

#### 探针 4：决策追踪覆盖
| 决策 | 闭环链 | 状态 |
|---|---|---|
| D-001@v1 加法式不升 v2 | FR-01/FR-03 → task-01/02 → 证据：机器接口 127 既有断言零回归 + 11e 固定键类型断言 + 独立代码审查 diff 行核实 + 契约 §2.1 codes 行 optional-once 说明 | 闭环 |
| D-002@v1 恰 10 码范围钉死 | FR-02 → task-01 → 证据：parity 1e「码表恰 10 码」断言 + 码表头注释纪律 | 闭环 |
| D-003@v1 三项对账先行 | FR-04 → task-03/04 → 证据：parity 3a/3b + grep 走查（informational 构成核验/模块卡 0 残留）+ 独立审查复核三处漂移事实 | 闭环 |
| D-004@v1 单一源+parity 双向 | FR-01/02/03 → task-01/05 → 证据：parity 1b/1c 双向 + 发射抽查 2a-2e | 闭环 |
| D-005@v1 语义变更记录披露 | FR-04 → task-03 → 证据：契约 §9 条目 1（含 SillyHub gate.py 实证链）+ parity 3b 在场断言 | 闭环 |

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4] + artifact 0), 0 frontend calls [scope: change-diff (18 files @ scan-root)] | 3 backend endpoints unused by frontend
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx——**误报走查**：本变更是 CLI 库面非 HTTP 服务，所谓端点系契约文档示例文本（`/api/path` 等）被端点扫描器从 markdown 提取的假阳性；无真实路由注册（无 router/装饰器文件改动），不构成 parity 缺口。

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；纯加法式变更，与 design「零删除」一致

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 5 个非 Java 清单文件不在探针 9 扫描面）

## 测试结果 [层：确定性检查——CLI 实测对账]

- **CLI 亲测（步 6 noAI，权威口径）**：`module[cli-core]+deps(5)` 隔离快照 **exit 0**（9.6s，快照根 sillyspec-gate-LCcfDi）；`npm run lint` **exit 0**（28.8s，含 module-map 归属全录——diagnostic-codes.js 补录后过）。取证：`.sillyspec/.runtime/verify-runs/20260917150134/test-result.json`
- 定向测试：`test/diagnostic-codes-parity.test.mjs` 24/24；`test/machine-interface.test.mjs` 132/132（含新增第 11 节 5 断言）
- worktree 全量套件：exit 0（13 个 worktree 守卫环境性误红与本改动无关——独立代码审查逐文件核实，主仓口径由 CLI 隔离快照替代实测）
- known_failures 豁免：本变更 0 条

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]

| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-02、task-03、task-06 | 127 既有断言零回归+11e 键类型断言+独立审查 diff 核实+契约 §2.1 optional-once | 已闭环 |
| D-002@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-02、task-06 | parity 1e 恰 10 码断言+码表头注释+stage-contract/doctor 族零改动（diff 证实） | 已闭环 |
| D-003@v1 | FR-01、FR-02、FR-03、FR-04 | task-03、task-04、task-06 | parity 3a/3b+grep 构成核验（informational 6=3现行+§9）+模块卡 0 残留+SillyHub gate.py 实证链 | 已闭环 |
| D-004@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-05、task-06 | parity 1b/1c 双向+2a-2e 发射抽查+CI 漂移即红（真实红历史 2 次） | 已闭环 |
| D-005@v1 | FR-01、FR-02、FR-03、FR-04 | task-03、task-06 | 契约 §9 条目 1（日期/旧新语义/消费侧评估全链）+parity 3b 在场断言 | 已闭环 |

## 技术债务 [层：人工判断]

- derive 的 `FACET_FAILURE_CODE` 与 diagnostic-codes 的 `CHECK_ID_TO_CODE` 映射重复（独立代码审查非阻断注记）——FACETS 扩枚举时统一收口为 `checkCode(facet)` 复用，防两表漂移
- codes 聚合未按 informational 过滤（现行无 informational check，谓词空转；防御性保留，语义变更记录 §9 若未来引入 informational 需同步）
- parity 测试 2e-2/11c-11d 为条件断言（场景不触发则跳过）——独立审查确认 2e-2 实际执行过，11c-11d 依赖 fixture 失败态稳定
- internal_error 路径无直接注入异常的专项测试（try/catch 结构由代码审查覆盖）——二期可加

## 变更风险等级 [层：人工判断]

显式声明 = **unit-sufficient**（design.md frontmatter risk_level）。自动判级曾命中「server.js」关键词系误伤——design 非目标节提及 mcp-server.js 是**显式不改**（同句否定语境：「不做 mcp-server.js 自有 JSON-RPC 错误面（信封透传已覆盖）」），被否定语境抑制可审计：实际改动面（machine-interface.js 加法式字段/新码表模块/契约文档/测试）无 daemon/session/启动入口，抑制理由落盘于 design frontmatter 注释。

## Runtime Evidence [层：人工判断]

- 统一提交：worktree 分支 `sillyspec/2026-09-17-mi-diagnostic-codes` commit **87d92730**（6 文件显式 pathspec）
- apply：主区落位 6 文件（machine-interface 模块卡/契约/diagnostic-codes.js/machine-interface.js/parity 测试/机器接口测试），apply-manifest 已由 worktree apply 流程落盘
- CLI 亲测取证：`.sillyspec/.runtime/verify-runs/20260917150134/test-result.json`（exit 0）；lint tally 首红（module-map 盲区）→ 补录 → 复绿，全程留痕 `.runtime/verify-lint-tally.json`
- 三面活体对样命令与输出：契约附录可复跑（gate/derive/progress show × 正常/错误路径 5 组）
- 服务启动/端点/日志面：不涉及（无状态 CLI 库面）

## 代码审查 [层：人工判断]

**独立代码审查（agent-tool 通道，独立上下文子代理）结论：specVerdict=pass / qualityVerdict=pass，零阻断。** 核心核实项：加法式纪律逐 diff 行（errors/退出码/SCHEMA_VERSION/FACETS 零触碰）；code 挂载全 7 个 push 位点（含 fail-open catch）；codes 聚合 push 序 Set 去重活体证明；registry 恰 10 码冻结；契约 §8 目录与码表逐行核对相等；parity 测试解析真实文档格式且夹具封闭。

零覆盖路径定向走查（探针 7 ⚠️ 条目复核）：
- ① 编辑/更新链路：不涉及既有链路修改（纯加法式，无回显/字段映射/残留态面）
- ② 非主分支流：design-file-list fail-open catch 路径（核验自身异常不误拦）已挂 code 且被审查核实；derive default 不可达分支挂 unknown_facet 与入口一致
- ③ 守卫一致性：无 HTTP 端点面（探针 5 端点系 markdown 示例假阳性，已走查说明）
- ④ 载荷字段契约：探针 8 不适用（无 Java/SQL 面）
- ⑤ 分页/并发/事务：不涉及（无状态单次调用，D-007 无 lifecycle 契约）

非阻断注记 4 条已入技术债务节。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]

本变更累计四场独立审查全 pass：design 两轮（R1 fail→五项修复→R2 双 pass，含消费侧实证复核）、plan 一轮（拓扑对齐建议已采纳）、execute 代码审查一轮（additive-only 逐行核实+活体发射证明）。无 P1/P2 缺陷；P3 级注记 4 条入技术债务。结论枚举 PASS 与四场审查结论一致。
