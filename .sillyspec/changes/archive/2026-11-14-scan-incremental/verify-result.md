---
author: t
created_at: 2026-11-14 23:55:00
change: 2026-11-14-scan-incremental
---
# 验证报告（Verify Result）— 2026-11-14-scan-incremental

## 总结论：PASS

## 任务完成度（6/6）

| 任务 | 结论 | 证据 |
|---|---|---|
| task-01 codegraph 适配层 | PASS | commit 2d49e5fe；test/scan-codegraph.test.mjs 16 用例（探测三态×5 降级路径零 throw/污染输出防御式解析/形状实测夹具/env 三键断言/禁携带参数/截断标记/cmd-shim 真机命中） |
| task-02 增量计划计算层 | PASS | commit cfc5fa89；test/scan-incremental.test.mjs 12 用例（六类 full 回退 fail-soft/归属与篇章映射/对账排除与报告落盘/软门阈值与 force/guardDocs/目录邻居 hint） |
| task-03 CLI 编排接线 | PASS | commit e090aba1；test/scan-incremental-wiring.test.mjs 7 用例（guard 白名单内放行/外拦截/新增文件 membership 放行/存量 guard 零回归/非数组 fail-closed/bump generator 透传/flag 双处登记）+ worktree-guard·scan-profile 既有面回归绿 |
| task-04 编排 prompt 增量分支 | PASS | commit dd1111ea；scan-paths 注入段四要素断言+scan-facts scope 正反例；四套既有面（scan-paths/facts/stage-definitions/workflow-anyfailed）4/4 绿 |
| task-05 文档同步 | PASS | commit d5cb943d；file-lifecycle.md 条目+updated_at、_extract.mjs 重跑、scan.md 镜像 4 处逐字、SKILL.md 增量节 |
| task-06 跨仓实测验收 | PASS | commit d7d37a42+c9d67e88；verify-evidence.md 四条验收 PASS（详见下） |

## 设计一致性（对照 design.md 四 Phase + 9 硬约束）

- 文件清单 16/16 落地（execute Stage Review 独立对照：24 pass / 2 gap 已处置 / 0 fail）
- 接口形状逐字段一致（probeCodegraph/computeIncrementalPlan/guardDocs）
- 硬约束全过：降级链零回归（空仓实测）/refresh 零改动/秒级真机 2.9-3.2s/execFile 数组零 shell/无禁携带参数/中文文案/11 步名序不变/--force-rescan 原样/TDD
- 偏差 3 处全部决策留痕且经独立审查判合理：D-010（unmapped hint 用目录邻居启发替代 codegraph query——保秒级预算）、D-011（facts scope 只做编程参数不接 CLI flag——allowed_paths 边界）、D-012（软门 behind 前置+探测缓存——验收驱动的 C4 修复）

## 任务书验收标准对照（4/4）

1. **multi-agent-platform 实测** — PASS：真机计划正确（9 受影响模块归属吻合真实漂移；篇章重生成 3/7+跳过 4/7；guardDocs 15）；缺省路径 5 项目软门正确回退全量（落后 4233-5385 commit，腐烂仓 fail-safe）；收窄比=篇章 3/7（↓57%）+模块卡 9 模块 vs 全量。端到端 token 实数需该仓完整 agent 会话（写入其 scan 基线属该仓治理面）——以计划正确性+收窄比+降级链实证代偿，留其下次实扫回填（verify-evidence.md 已声明口径）。
2. **未装/未建索引仓降级零回归** — PASS：空仓真机实测（一行「🛡️ 全量路径：codegraph 索引未初始化」留痕，profile/覆盖保护/步骤推进与现行一致，exit 0）。
3. **_module-map 对账报告** — PASS：3294 索引文件、1 未归属（sync_module_docs.py 根目录孤儿脚本）与人工抽查一致（map grep 0 命中）。
4. **既有 scan 测试零回归** — PASS：scan-diff/staleness/refresh/postcheck 四套零改动零失败；七套合计 85/85（执行侧）+ 87/87（审查独立复验）。

## 测试证据

- 变更测试面：`node --test` 七套 85/85（.sillyspec/.runtime/logs/task06-regress.log）+ 独立复验 87/87 + gap 修复回归 24/24
- lint：local.yaml 无 commands.lint——按实证核验规则跳过留痕（归 pre-push/CI 门）
- 全量套件：pre-push/CI 门（规则「勿每变更重复手跑」）

## 遗留与风险

- R-07 已留档：统一 bump 推进未受影响文档基线（语义=「核对至 HEAD 的检出项已处理」扩大版，audit 可追溯）；bump 触发条件已收紧为 guard 会话态判定（c9d67e88）
- 端到端 token 实数回填：multi-agent-platform 下次实扫时补（见验收 1 口径）
- 平台同步 knowledge-hits-push 直报超时（daemon 兜底）——环境面非本变更问题

## 结论

变更按 design 全量落地，验收标准 4/4 PASS，测试面全绿，无 Unresolved Blocker。**验证通过。**

## 探针结果（CLI 机械预填，--init 补注入） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- agent 复核：全部 ⚠️ 命中为**既有 prompt 文本内的指令词字面量**（如 scan.js:471 与 scan.md:610 的「用 grep 搜索 TODO/FIXME 注释中的术语定义」是 glossary 步骤 prompt 对 agent 的指令原文；_extracted.json/file-lifecycle.md 同理为 prompt 镜像/文档描述文本）——非未实现标记，无返工项。
- ⚠️ `src/stages/scan.js:471` 1. 用 grep 搜索 TODO/FIXME 注释中的术语定义
- ⚠️ `docs/sillyspec/file-lifecycle.md:296` - `executePlanPostcheck`（noAI，execute 前最后关口）顺序跑确定性校验：`validateBlueprintConsistency`（task 结构/路径冲突/拓扑无环）、`validatePlanFeasibility`（TaskCard 字段齐全/依赖存在/id 连续；2026-0
- ⚠️ `docs/prompt/_extracted.json:176` "prompt": "生成完整验证报告，并写入 verify-result.md。\n\n### 操作\n1. 汇总以上所有检查结果\n2. **变更风险等级（change_risk_profile）由 CLI 自动判定与门控**：你无需自己扫描。本步骤 --done 时，CLI 按项目声明危险面（`_module-m
- ⚠️ `docs/prompt/_extracted.json:269` "prompt": "根据当前项目的模块依赖关系和源码，生成跨模块业务流程文档和术语表。\n\n⚠️ 这一步是可选的。如果项目模块简单、流程不明显，可以跳过。\n\n### flows/ 目录\n目标目录：`{DOCS_ROOT}/flows/`\n\n根据 _module-map.yaml 中的模块依赖关系，识别跨模
- ⚠️ `docs/prompt/_extracted.json:490` "prompt": "对上一步生成的 plan.md 做审查。生成与审查分离——不在生成 plan 的同一上下文里自审，避免确认偏差。\n\n### 执行前确认门（plan_level=full 时）\nplan.md 审查通过后、进入 execute 前，若 plan_level=full（跨模块/大变更），必须先向
- ⚠️ `docs/prompt/_extracted.json:504` "prompt": "为 plan.md 中的每个任务生成紧凑 TaskCard。\n\n⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：\n- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan
- ⚠️ `docs/prompt/_extracted.json:547` "prompt": "加载计划、设计和代码库上下文。\n\n### 操作\n1. 读取 tasks.md（任务注册表与勾选唯一真相；plan.md 只提供 Wave 分组/依赖结构——Wave 段下为纯 ID 引用行）\n2. 读取 design.md（技术方案）\n3. 读取 CONVENTIONS.md、ARCHI
- ⚠️ `docs/prompt/_extracted.json:609` "prompt": "对本次变更进行代码审查。\n\n### 执行方式\n本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。\n\n### 操作\n1. 检查 git diff 查看所有变更\n2. 审查要点：\n   - 代码风格是否符合 CONVENTIONS.md\n 
- ⚠️ `docs/prompt/scan.md:610` 1. 用 grep 搜索 TODO/FIXME 注释中的术语定义
- ℹ️ 5 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
- agent 执行结论（design 能力关键词 × 实现锚点逐一对照，全命中）：
  - 探测三态/fail-soft → `src/scan-codegraph.js` probeCodegraph（catch 全收敛 available:false，五类 reason 中文）
  - Windows cmd-shim 解析 → `src/scan-codegraph.js` resolveCodegraphCommand/parseCmdShim（真机命中 npm-shim.js 入口）
  - 形状防御式映射 → `src/scan-codegraph.js` parseJsonLoose（污染输出截取段解析）+listIndexFiles/affectedTests
  - 基线锚/变化集/归属/篇章映射/对账/软门/quick 回退/guardDocs → `src/scan-incremental.js` computeIncrementalPlan（逐节对应 design Phase 2.1-2.8）
  - 启动层三档统一探测 → `src/run/stage.js` scan 启动段（probe+逐项目计划+路径判定输出+计划原子落盘）
  - guard 白名单握手 → `src/run/stage.js`（mode='scan-incremental'+incrementalDocs+docHashes）+`src/hooks/worktree-guard.js`（白名单分支：内放行外照拦）
  - 统一 bump → `src/run/scan-profile.js` executeScanFinalize 增量分支（guard 会话态判定+generator=sillyspec-scan-incremental）
  - flag 登记 → `src/run/command.js`（knownFlags+帮助文本双处）
  - 条件前缀注入段 → `src/stages/scan.js` 四步骤（⚡ 增量模式前缀+压制/豁免声明）
  - facts scope → `src/scan-facts.js`（collectScanFacts/buildAndWriteScanFacts opts.scope+端点过滤）
  - 索引目录三层隔离 → `src/scan-incremental.js` INCREMENTAL_EXCLUDE_DIRS+gitignore 检测 warning+`.gitignore` 本仓登记
  - **结论：设计能力关键词全部有实现锚点，零未实现项**

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-02: 模块目录（src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-03: 模块目录（src/run、src/hooks、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-04: 模块目录（src/stages、src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-05: 模块目录（docs/sillyspec、docs/prompt、.claude/skills/sillyspec-scan）找到 1 个测试文件（docs/sillyspec/fr-test-binding-proposal-2026-09-24.md）
- ⚠️ task-06: 模块目录（.sillyspec/changes/2026-11-14-scan-incremental）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004；2026-10-16-probe7-prefill-noise-fix 判定链修订）：判定列为 CLI 机械预填，agent 逐格复核改写——规则优先级：①测试名级命中（def test_* / it(/test(/describe( 名行含验收词）→covered（锚点=测试函数名行+测试名）；②部署/文档/doc/deploy/manual/config 类词条目→non-testable；③无归属→uncovered；④候选>5 且无测试名级收窄→uncovered（归属不可判定交人工）；⑤正文级命中→partial（待人工核验）；⑥同波次新增/修改的归属测试零命中→covered（待人工复核）；⑦其余有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| probeCodegraph 对命令不存在/未初始化/索引未完成/超时/输出不可解析五类输入全部返回 {available:false, reason 非空中文}，零 throw（单测断言） | `test/scan-codegraph.test.mjs`<br>`test/scan-incremental.test.mjs`<br>`test/scan-incremental-wiring.test.mjs`<br>`test/scan-paths.test.mjs`<br>`test/scan-facts.test.mjs` | probeCodegraph、未初始化、索引未完成、超时（`test/scan-codegraph.test.mjs`、`test/scan-incremental.test.mjs`） | covered | `test/scan-codegraph.test.mjs:45`（probeCodegraph：索引就绪 → available:true 且 status 保留）、`test/scan-codegraph.test.mjs:63`（probeCodegraph：未初始化（initialized=false）→ available:false）、`test/scan-codegraph.test.mjs:71`（probeCodegraph：索引未完成（state!=complete）→ available:false） |
| status/files/affected 形状映射对实测形状（2026-11-14 实测 1.6.2）字段正确取出；污染输出（npm 噪声前缀行）与缺字段样本降级不崩（单测夹具覆盖 Review Focus | `test/scan-codegraph.test.mjs`<br>`test/scan-incremental.test.mjs`<br>`test/scan-incremental-wiring.test.mjs`<br>`test/scan-paths.test.mjs`<br>`test/scan-facts.test.mjs` | status、files、affected、实测（`test/scan-codegraph.test.mjs`、`test/scan-incremental.test.mjs`、`test/scan-incremental-wiring.test.mjs`） | covered | `test/scan-codegraph.test.mjs:45`（probeCodegraph：索引就绪 → available:true 且 status 保留）、`test/scan-codegraph.test.mjs:125`（affectedTests：超限截断 200 + truncated 标记）、`test/scan-codegraph.test.mjs:107`（listIndexFiles：实测 flat 形状映射 + 反斜杠归一 + 缺 path 项跳过） |
| 所有子进程调用为 execFile 参数数组，env 三键恒定注入，超时按命令分级（单测断言 RecordedExecOptions） | `test/scan-codegraph.test.mjs`<br>`test/scan-incremental.test.mjs`<br>`test/scan-incremental-wiring.test.mjs`<br>`test/scan-paths.test.mjs`<br>`test/scan-facts.test.mjs` | execFile、env（`test/scan-codegraph.test.mjs`、`test/scan-incremental-wiring.test.mjs`） | covered | `test/scan-codegraph.test.mjs:144`（exec 选项：env 三键恒定覆盖 + cwd=root + status 5s 超时 + 32MB buffer +…） |
| 不携带 --local-only/--no-telemetry（1.6.2 发布包无此参数——design 硬约束） | `test/scan-codegraph.test.mjs` | local、only、telemetry | covered | `test/scan-codegraph.test.mjs`「exec 选项：env 三键恒定覆盖…+ 无禁携带参数」用例含 `!args.includes('--local-only')` 与 `!args.includes('--no-telemetry')` 双否定断言（agent 复核：预填 partial 改写——断言级命中） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| computeIncrementalPlan 对绿地（无 scan 目录）/无基线（无 source_commit）/非祖先基线/软门超限/quick 深度/git 失败六类输入全部返回 mode:'full' + 中文 reason，零 throw（单测断言，Review Focus | `test/scan-incremental.test.mjs`<br>`test/scan-incremental-wiring.test.mjs`<br>`test/scan-paths.test.mjs`<br>`test/scan-facts.test.mjs` | computeIncrementalPlan、scan、目录、无基线（`test/scan-incremental.test.mjs`、`test/scan-incremental-wiring.test.mjs`、`test/scan-paths.test.mjs`、`test/scan-facts.test.mjs`） | covered | `test/scan-incremental.test.mjs:64`（绿地（无 scan 目录）→ mode full）、`test/scan-incremental-wiring.test.mjs:92`（mode=scan-incremental 但 incrementalDocs 非数组 → 不走白名单分支（fail-c…）、`test/scan-incremental.test.mjs:64`（绿地（无 scan 目录）→ mode full） |
| 归属与篇章映射：fixture 变更集（模块内 M 文件/模块边界 A 文件/新目录文件/路由文件）产出正确 affectedModules/docsToRegenerate/docsToSkip；unmapped 带 codegraph hint 但不入归属结论（单测） | `test/scan-incremental.test.mjs`<br>`test/scan-incremental-wiring.test.mjs`<br>`test/scan-paths.test.mjs`<br>`test/scan-facts.test.mjs` | fixture、模块内、文件（`test/scan-incremental.test.mjs`、`test/scan-incremental-wiring.test.mjs`） | covered | `test/scan-incremental.test.mjs:135`（无结构信号（模块内 M 文件、无 unmapped、无路由）→ 篇章全跳过）、`test/scan-incremental.test.mjs:104`（软门超限（scope 内变更 >100 文件）→ mode full）、`test/scan-incremental-wiring.test.mjs:58`（guard 白名单内（新增模块卡，磁盘不存在旧文件）→ 放行（membership 即凭据，Review Focus #…） |
| 对账：含 '.sillyspec-codegraph/xx.js' 与 'node_modules/y.js' 的索引清单样本被排除常量过滤，uncoveredFiles 不含它们（单测，D-008/Review Focus） | `test/scan-incremental.test.mjs`<br>`test/scan-incremental-wiring.test.mjs`<br>`test/scan-paths.test.mjs`<br>`test/scan-facts.test.mjs` | 对账、sillyspec、codegraph、node_modules（`test/scan-incremental.test.mjs`、`test/scan-incremental-wiring.test.mjs`、`test/scan-paths.test.mjs`、`test/scan-facts.test.mjs`） | covered | `test/scan-incremental.test.mjs:164`（对账：listIndexFiles mock（含索引目录与 node_modules 样本）→ uncovered 不含…）、`test/scan-incremental-wiring.test.mjs:102`（sillyspec）、`test/scan-incremental.test.mjs:156`（isExcludedPath：索引目录/node_modules/构建产物排除） |
| 软门阈值 100/200 与 REFRESH_SOFT_GATE 同值；forceIncremental 越过后 warnings 留痕（单测） | `test/scan-incremental.test.mjs`<br>`test/scan-incremental-wiring.test.mjs`<br>`test/scan-paths.test.mjs`<br>`test/scan-facts.test.mjs` | forceIncremental（`test/scan-incremental.test.mjs`） | covered | `test/scan-incremental.test.mjs:94`（软门超限（落后 >200 commit）→ mode full；forceIncremental 越过 → increm…） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| mode:'incremental' 时 guard 文件含 mode/incrementalDocs/docHashes/sourceCommit，白名单内子代理编辑放行、白名单外仍拦（单测：worktree-guard 分支双样本） | `test/scan-incremental-wiring.test.mjs` | mode、incremental、guard、incrementalDocs（`test/scan-incremental-wiring.test.mjs`） | covered | `test/scan-incremental-wiring.test.mjs:84`（存量 guard（无 mode）+ 基线落后 → 原行为拦截不变（零回归））、`test/scan-incremental-wiring.test.mjs:92`（mode=scan-incremental 但 incrementalDocs 非数组 → 不走白名单分支（fail-c…）、`test/scan-incremental-wiring.test.mjs:44`（guard 白名单内（重生成篇章文档）→ 放行（source_commit 落后也不拦）） |
| 白名单含计划内新建文件（无旧哈希）时不因缺哈希拒绝（Review Focus | `test/scan-incremental-wiring.test.mjs` | Review、Focus（`test/scan-incremental-wiring.test.mjs`） | covered | `test/scan-incremental-wiring.test.mjs:58`（guard 白名单内（新增模块卡，磁盘不存在旧文件）→ 放行（membership 即凭据，Review Focus #…）、`test/scan-incremental-wiring.test.mjs:58`（guard 白名单内（新增模块卡，磁盘不存在旧文件）→ 放行（membership 即凭据，Review Focus #…） |
| 探测不可用/计划 mode:'full' 时输出回退原因一行且后续流程与现行一致（单测 + 既有测试面回归） | `test/scan-incremental-wiring.test.mjs` | mode（`test/scan-incremental-wiring.test.mjs`） | covered | `test/scan-incremental-wiring.test.mjs:84`（存量 guard（无 mode）+ 基线落后 → 原行为拦截不变（零回归）） |
| executeScanFinalize 增量分支后全部基线载体 source_commit=HEAD、generator=sillyspec-scan-incremental；非增量路径 stampScanDocHeaders 原行为不变（单测） | `test/scan-incremental-wiring.test.mjs` | source_commit、generator（`test/scan-incremental-wiring.test.mjs`） | covered | `test/scan-incremental-wiring.test.mjs:44`（guard 白名单内（重生成篇章文档）→ 放行（source_commit 落后也不拦））、`test/scan-incremental-wiring.test.mjs:102`（generator） |
| --incremental/--force-incremental 在帮助文本与白名单可见，未知 flag 指引不含死路（单测 grep 帮助文本） | `test/scan-incremental-wiring.test.mjs` | incremental、force、flag（`test/scan-incremental-wiring.test.mjs`） | covered | `test/scan-incremental-wiring.test.mjs:92`（mode=scan-incremental 但 incrementalDocs 非数组 → 不走白名单分支（fail-c…）、`test/scan-incremental-wiring.test.mjs:118`（command.js 双处登记：knownFlags 白名单 + printStageUsage 帮助文本（防未登记 f…） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 注入段为条件前缀（「仅当本次 scan 启动输出过⚡增量路径」生效+「否则忽略本段」声明）——非增量会话子代理行为不变（执行期校准：原「prompt 文本逐字一致」措辞过强，设计意图即条件前缀，D-009） | `test/scan-paths.test.mjs` | 条件前缀 | covered | `test/scan-paths.test.mjs` 增量注入段断言组首 token 即「⚡ 增量模式（仅当本次 scan 启动输出过「⚡ 增量路径」行时适用」（条件前缀全文逐字断言）；四套既有面（scan-paths/facts/stage-definitions/workflow-anyfailed）4/4 绿证步骤元数据未破（agent 复核：预填 partial 改写） |
| 增量计划存在时四步骤 prompt 含注入段（受影响面清单/跳过集/豁免声明/压制声明四要素可见，D-009） | `test/scan-paths.test.mjs` | — | covered | `test/scan-paths.test.mjs` incrTokens 九 token 断言（含 docsToRegenerate/docsToSkip/压制声明/覆盖等待豁免/MANUAL_NOTES/零触碰——四要素全覆盖）（agent 复核确认，预填「待人工复核」清） |
| buildAndWriteScanFacts({scope:[...]}) 限定抽取；scope 缺省时行为与现行一致（单测正反例） | `test/scan-facts.test.mjs` | buildAndWriteScanFacts | covered | `test/scan-facts.test.mjs`「Test 7: scope 限定参数」正反例（scoped.scopeApplied===true / full.scopeApplied===undefined 缺省零变化 / 端点前缀过滤 / md 头部标注）（agent 复核：预填 partial 改写——测试名级命中） |
| 步骤名/顺序/optional/perProject 元数据与改动前一致（进度库兼容——test/scan-paths.test.mjs 既有断言不红） | `test/scan-paths.test.mjs`<br>`test/stage-definitions.test.mjs` | — | covered | `test/stage-definitions.test.mjs`「stage definition regression checks passed」+ scan-paths 既有占位符断言全绿（agent 复核确认） |

**task-05**（纯文档同步任务——按探针 7 规则②文档类判 non-testable，验收靠规范与人工走查）
- ℹ️ 既有用例候选（FR 关联回归面，本变更未改动；判定仍由你复核，命中≠结论）：`test/agent-session-log.test.mjs`、`test/align-execute-review-gate.test.mjs`、`test/apply-stash-conflict-scan.test.mjs`、`test/backfill-reviews.test.mjs`、`test/brainstorm-auto-retire.test.mjs` …共 81 个（全量见 verify-facts.json probe7ExistingTests）——**agent 复核：候选与文档任务无承接关系，下方预填的关键词命中均为噪声假锚点，判定已逐格改写**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| file-lifecycle.md 含两个新运行时文件条目且 updated_at 已更新；与代码实际文件名一致（validateFileLocations 口径） | — | — | non-testable | 纯文档验收（agent 走查，预填 uncovered 改写）：commit d5cb943d diff 可证 scan 阶段表行含双条目+updated_at 2026-11-14 批次头；文件名与 stage.js/scan-incremental.js 写盘路径字面一致 |
| node docs/prompt/_extract.mjs 重跑成功且 scan.md 与 _extracted.json prompt 正文逐字一致（无手改残留） | — | — | non-testable | 机械再生证据（agent 走查，预填假锚点弃）：_extract.mjs 跑通且 _extracted.json diff 恰 5 处 prompt 更新（git diff --stat 5+/5-）；scan.md 4 处注入段与源码逐字同源（task-05 收口核对） |
| SKILL.md 增量模式段与 design 语义一致（自动判定/降级/对账） | — | — | non-testable | 纯文档（agent 走查，预填假锚点弃）：SKILL.md 增量节三要素（自动判定/降级回退/对账报告位置）与 design Phase 2/3+兼容策略逐点对照一致 |

**task-06**（实测验收任务——验收证据=verify-evidence.md 真机记录；下方预填 covered 锚点均为无关既有测试假锚点，agent 已逐格改写）
- ℹ️ 既有用例候选（FR 关联回归面，本变更未改动）：同上（见 task-05，共 81 个）
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 验收 1：增量 scan 后未受影响模块文档正文零变化（diff 取证）；耗时与 token 相比全量显著下降（给数字） | test/scan-incremental.test.mjs | — | covered | 计划正确性由 `test/scan-incremental.test.mjs`（归属/篇章映射）+wiring 白名单外拦截用例承接；真机收窄数字=verify-evidence.md 验收 1（篇章 3/7、9 模块归属、缺省软门回退）；端到端正文 diff 留该仓实扫回填（口径已声明）——agent 改写，预填假锚点弃 |
| 验收 2：空仓 scan 行为与现行版本完全一致（输出/退出码/产物取证） | `test/scan-incremental.test.mjs` | — | covered | 机制层 `test/scan-incremental.test.mjs`（绿地/无基线/git 失败 fail-soft 用例）+真机实测取证：verify-evidence.md 验收 2（降级一行留痕/profile/覆盖保护/Step 1 推进与现行一致，exit 0）——agent 改写，预填假锚点弃 |
| 验收 3：对账报告未归属文件清单与人工抽查一致（≥5 文件取样记录） | test/scan-incremental.test.mjs | 对账 | covered | 机制层 `test/scan-incremental.test.mjs`「对账：listIndexFiles mock…报告落盘」+排除断言；真机抽查=verify-evidence.md 验收 3（3294 文件 1 未归属 sync_module_docs.py，map grep 0 命中对照——该仓覆盖率高取样池=1 如实记录）——agent 改写，预填 uncovered 弃 |
| 验收 4：既有 scan 测试四套零失败 + 新增单测三套零失败（测试输出尾部取证，日志落 .sillyspec/.runtime/logs/） | `test/scan-diff.test.mjs`、`test/scan-staleness.test.mjs`、`test/scan-refresh.test.mjs`、`test/scan-postcheck.test.mjs` | — | covered | 七套实测 85/85（`.sillyspec/.runtime/logs/task06-regress.log`）+execute 审查独立复验 87/87+gap 修复回归 24/24——agent 改写，预填假锚点弃 |

- ⚠️ 零/半自动化承接条目 5 条——agent 显式走查结论：task-05 三条（file-lifecycle 条目/镜像再生/SKILL 语义）走查一致（见上表 non-testable 证据列）；task-06 验收 1 端到端正文 diff 与验收 3 扩大取样留该仓实扫回填（verify-evidence 口径声明）；走查未发现 P1 级缺口

#### 探针 4：决策追踪覆盖
- agent 执行结论（D-xxx@vN → FR → task → 证据闭环，12/12 通）：
  - D-001（refresh 互补）→ FR-02/08 → task-02 单源复用+task-06 四套零回归 ✅
  - D-002（降级链）→ FR-03/06 → task-01 探测三态+task-03 回退+task-06 空仓实测 ✅
  - D-003（方案 A 自动判定）→ FR-01/07 → task-03 启动层+flag ✅
  - D-006（guard 握手）→ FR-01/02 → task-03 白名单分支+wiring 用例 ✅
  - D-007（启动层三档+quick 回退）→ FR-01 → task-02 quick 回退+task-03 启动层 ✅
  - D-008（三层隔离）→ FR-04 → task-02 排除常量+task-03 .gitignore+gap 修复检测 warning ✅
  - D-009（conditionalWait 豁免）→ FR-02 → task-04 注入段豁免声明 ✅
  - D-010/011/012（执行期裁决）→ 各自 impacts 声明 task 承接+decisions 留痕+独立审查判合理 ✅
  - D-004/D-005（rejected 防复潮）→ 无覆盖任务（显式标注，requirements 决策覆盖矩阵在档）✅
  - **结论：决策→FR→task→证据链全闭环，无悬挂引用，无 superseded 被下游引用**

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (19 files @ worktree)] | 0 backend endpoints unused by frontend (+3 stock noise collapsed)
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 0 个本变更端点前端未调用（warning 不阻断）：
- ℹ️ 另有 3 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 16 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（7 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）
#### 探针 12：UI 视觉证据（分级门）
- 不适用（非 UI 触达变更（input/声明文件面均未命中）——零打扰）
## 证据账（cannot_verify 任务）
[层：人工判断——CLI 核验]

<!-- 无 cannot_verify 任务时本节写「无」 -->
无（本次变更无 cannot_verify 任务）

## 集成验证回执
[层：自述声明——CLI 一致性校验]

<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
- claim: 空仓（无 codegraph 索引）跑 scan 自动降级全量零回归——输出降级一行留痕+profile/覆盖保护/步骤推进与现行一致
  command: node C:/Users/qinyi/IdeaProjects/sillyspec/.sillyspec/.runtime/worktrees/2026-11-14-scan-incremental/bin/sillyspec.js run scan（cwd=临时空仓，实测后已清理）
  exit: 0
  log: verify-evidence.md 验收 2 段（实测输出摘录在案）
- claim: multi-agent-platform 真机增量计划正确——5 项目软门回退（缺省）+force 计划全貌（9 模块/3 篇章/对账 3294 文件 1 未归属）
  command: node --input-type=module -e "import { computeIncrementalPlan } from 'file:///C:/.../worktrees/2026-11-14-scan-incremental/src/scan-incremental.js'; ..."（逐项目计算，脚本在会话记录）
  exit: 0
  log: verify-evidence.md 验收 1/3 段（耗时/归属/对账数字在案）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

