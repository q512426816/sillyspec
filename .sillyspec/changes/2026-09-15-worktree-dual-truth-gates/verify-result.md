# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS——五坑修复全落地（独立验收审查五 FR 全 PASS），主仓权威门禁 npm test 489/0 + lint 626 文件 0 告警，risk_level: unit-sufficient 显式声明且无运行时组件触碰。

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- task-01: satisfied | verifiedFiles: src/worktree.js, test/worktree-dual-truth-gates.test.mjs（三道 foreign 剔除+隔离打印；组1 三例绿+双声明源冒烟实证）
- task-02: satisfied | verifiedFiles: src/worktree-apply.js, test/worktree-dual-truth-gates.test.mjs（no-op choke point 剔除+warnings；组2 两例绿+正负对照冒烟）
- task-03: satisfied | verifiedFiles: src/config-schema.js, src/worktree.js, test/worktree-dual-truth-gates.test.mjs（supplyFiles 注册+step5.9 供给步+meta 记录；组3 两例绿+21/21 冒烟）
- task-04: satisfied | verifiedFiles: src/task-review.js, src/run/complete.js, src/verify-postcheck.js, test/worktree-dual-truth-gates.test.mjs（helper 口径单一化+baselineFiles 剔除+多归属 join；组4 三例绿+GWT1/2/4 冒烟实证）
- task-05: satisfied | verifiedFiles: src/verify-postcheck.js, test/worktree-dual-truth-gates.test.mjs（V2 双根+倒序命中根；组5 两例绿+冒烟 7/7 含损坏 fail-open）
- task-06: satisfied | verifiedFiles: test/worktree-dual-truth-gates.test.mjs, docs/sillyspec/troubleshooting.md（12/12 五组收口+§66 32 行+主仓全量 489/0+lint 0 告警）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
- 无（unit-sufficient 级，无 daemon/backend 跨进程集成面）

## 任务完成度 [层：人工判断]
6/6 全部完成（勾选状态 CLI 注入已核）：task-01~05 各自源文件改动经独立验收审查（agent-tool 通道，逐 FR pass 带 file:line 锚点）+ 新测试五组 12/12；task-06 收口交付（测试文件+troubleshooting §66+主仓全量门禁）。无未完成/存疑项。

## 设计一致性 [层：人工判断]
一致，两处已审偏差（独立验收审查记 gap 不阻断）：①FR-02 hash-object 用 argv 分批而非 --stdin-paths（公共 git helper stdio 硬编码不可喂 stdin，与 worktree.js _changesAlreadyOnMain :1806 同型先例，功能等价且行数校验更严）；②FR-01 in-place 路径调用点（worktree.js:965）也传 changeName（设计明示 create step 5.6 一处，扩展与「checkpoint 只含 own」意图一致）。Grill 三 P1（R-07 baselineFiles 剔除/R-08 in-place porcelain 保留/口径收口表述）均已按修正后设计兑现。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/verify-postcheck.js:371` * 纯机械启发式（确定性：同输入同输出）；矩阵行 <!--TODO--> 未回填 → 保守计行为类
- ⚠️ `src/verify-postcheck.js:396` // 矩阵行 <!--TODO--> 未回填 → 影响面未知，保守计行为类
- ⚠️ `src/verify-postcheck.js:397` if (String(rowText).includes('<!--TODO')) { out.behavioral.push('<!--TODO--> 未回填行'); classified++ }
- ⚠️ `src/verify-postcheck.js:417` // 骨架产出 `- \`path\` <!--TODO-->` 列表行；手写形态可能是 `| 文件 | 处置说明 |` 表行
- ⚠️ `src/verify-postcheck.js:1864` console.warn('   提示：检查是否后端漏实现，或前端调用了尚未实现的端点。确认无误可在 design.md 标注豁免。')

#### 探针 2：设计关键词覆盖
关键词逐个 grep 确认：splitOwnVsForeignDiffFiles（worktree.js:22 import + splitForeignLane 消费 ✓）；detectNoOpFiles（worktree-apply.js:466 ✓）；getBlobHashMap/chunkPaths 复用（:488 ✓）；worktree.supplyFiles（config-schema.js:139 + worktree.js readSupplyFilesConfig ✓）；collectWorktreeChangedFiles（task-review.js:1281 export + complete.js:26 import 消费 ✓）；meta.baselineFiles 剔除（complete.js prefetchDiffFileSet ✓）；attributeSuspectTasks 多归属（verify-postcheck.js:2492 string[] + :2618 join ✓）；runRequiredEvidenceCheckV2 双根（:2133-2147 roots + :2172-2181 倒序命中根 ✓）；meta.supplyFiles（worktree.js meta 组装 ✓）。全部命中实现，无关键词空转。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-04: 模块目录（src、src/run）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-05: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-06: 模块目录（NEW:test、docs/sillyspec、test）找到 11 个测试文件（docs/sillyspec/scan/TESTING.md、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles 结构归属承接面（每条 acceptance 由哪些测试承接）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。证据列给首命中 file:line 锚点或人工核验提示。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-01 GWT1：主仓有他者声明（他 quick guard.json allowedFiles 或他变更 design §6）且非本变更 own 声明的在途文件，create 后不进 worktree（untracked 形不存在）/worktree 保持基线 HEAD 版本（staged/unstaged 形），meta.baselineFiles 与 baseline checkpoin… | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| FR-01 GWT1：create 控制台输出隔离打印一行——列 foreign 文件与归属者（去重、截断） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| FR-01 GWT2：主仓无并行声明（foreign=[]）时 create 行为与现状完全一致（零回归） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| FR-01 GWT3：_overlayBaseline 不传 changeName 直调时不做 foreign 切分，行为与现状一致 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| own 优先——本变更 own 声明集（design §6 / task 卡 allowed_paths/target_files / quick guard）命中的文件即使他者也声明，仍照常 overlay（不剔除） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| oracle 异常 fail-open——splitOwnVsForeignDiffFiles 抛错时退回现状全量 overlay，create 不失败 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| test/baseline-overlay-isolation.test.mjs、test/worktree-overlay-eisdir.test.mjs、test/worktree-merge-baseline-align.test.mjs 与新增测试全绿 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-02 GWT1：worktree 工作区内容与主仓 HEAD blob 相等的文件（相对 baseline checkpoint 有 diff）从 changedFiles/deletedFiles/absentAfterMerge 剔除，result.warnings 含 no-op 清单行（文件名可见）；apply 与 assess（checkOnly 复用 applyWorktree）… | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| FR-02 GWT2：内容 ≠ 主仓 HEAD blob 的文件与「主仓 HEAD 无该路径」的新文件保留在 changedFiles（判定不受影响）；删除类（worktree 无文件）不参与判定、行为不变 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| hash-object 批失败 fail-safe——该批文件保守保留在 changedFiles（不误放行） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 不缓存——assess 与 apply 两次调用间主仓 HEAD 推进时判定以各自当下事实为准（现算） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| test/worktree-apply-meta-exclude.test.mjs、test/worktree-allow-list-violations.test.mjs 与新增测试全绿 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-03 GWT-1：local.yaml 配 supplyFiles 含 src/build-id.ts 且主仓该文件存在 → create 后 worktree 内该文件存在且内容与主仓一致，meta.supplyFiles 含该路径 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| FR-03 GWT-2：supplyFiles 的 glob 在主仓无匹配 → console.warn 提示缺失，create 正常完成不阻断 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| FR-03 GWT-3：local.yaml 未配置 supplyFiles（默认 []）→ 供给步空转，create 产物与现状一致（零回归） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| glob 展开命中超 200 文件 → 警告输出且只供给前 200（截断行为可断言观测） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| 单文件复制抛错 → warn 后继续，create 不失败（fail-open） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| sillyspec config schema 输出与 renderExample 文本均含 worktree.supplyFiles 键路径（config-schema example 耦合测试通过） | 无归属测试——判定大概率 uncovered | — | non-testable | （无归属测试） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-04 GWT1：worktree 有未提交改动（子代理默认不 commit）且某 task 草稿 changedFiles 命中 → prefetchDiffFileSet 的 diffFileSet = base..head ∪ porcelain ∪ committed 补齐（剔 baselineFiles 后），shouldAutoCheckTask 草稿守卫通过、task 被自动勾选 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| FR-04 GWT2：仅被 baseline checkpoint 夹带的文件（∈ meta.baselineFiles）被剔出 diffFileSet，声明了它但未实现的 task 不被误勾（防伪底线保持） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| FR-04 GWT3：in-place 模式 helper porcelain 取 cwd（现状并入不丢）；无 meta / git 失败 → helper 返 []、守卫退回 base..head 现状（fail-open 不放大勾选面） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| FR-04 GWT4：attributeSuspectTasks 返 Map 值为 string[] 全命中收集（最新 run 优先序保持），reconcileTargetFiles 边界 join('、') 成 string——gates.js:1606 / archive-delta.js:325 下游零改动（test/archive-delta.test.mjs:111 的 suspectT… | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| generateTaskReviewDrafts 并入段与 prefetchDiffFileSet 消费同一 helper（口径单一化），两处既有「口径同步」注记更新指向 helper；resolveVerifyChangedFiles 行为零改动（test/verify-evidence-committed-diff.test.mjs 全绿） | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |
| test/execute-batch-zero-diff.test.mjs、test/task-review-draft.test.mjs、test/archive-delta.test.mjs、test/verify-evidence-committed-diff.test.mjs 与新增测试全绿 | 无归属测试——判定大概率 uncovered | — | uncovered | （无归属测试） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-05 GWT-1：证据账 verifiedFiles 声明的文件仅存在于 worktree（主仓不存在）→ 核验 filesExist=true、mtime 取 worktree 根，明细不再产生「文件不存在」红项，verify 不再被错误阻断 | `test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | 证据账、verifiedFiles、worktree（`test/verify-evidence-triple.test.mjs`、`test/verify-evidence-committed-diff.test.mjs`） | covered | `test/verify-evidence-triple.test.mjs:44`（证据账）、`test/verify-evidence-triple.test.mjs:51`（verifiedFiles）、`test/verify-evidence-committed-diff.test.mjs:3`（worktree） |
| FR-05 GWT-2：worktree meta 缺失或 mode=in-place-fallback → 候选根退 [cwd] 单根，核验结果与现状一致（零回归） | `test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | worktree、meta、mode（`test/verify-evidence-committed-diff.test.mjs`） | covered | `test/verify-evidence-committed-diff.test.mjs:3`（worktree）、`test/verify-evidence-committed-diff.test.mjs:40`（meta）、`test/verify-evidence-committed-diff.test.mjs:40`（mode） |
| 双根同文件都在 → mtimeOk 取 worktree 根的 statSync 读数（主仓旧 mtime 不误判为过期） | `test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | mtimeOk、worktree（`test/verify-evidence-triple.test.mjs`、`test/verify-evidence-committed-diff.test.mjs`） | covered | `test/verify-evidence-triple.test.mjs:95`（mtimeOk）、`test/verify-evidence-committed-diff.test.mjs:3`（worktree） |
| diffHit 行为与改动前一致：code 类仍查 changedSet、artifact 类仍豁免 diff | `test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | diffHit、code（`test/verify-evidence-triple.test.mjs`、`test/verify-evidence-committed-diff.test.mjs`） | covered | `test/verify-evidence-triple.test.mjs:54`（diffHit）、`test/verify-evidence-triple.test.mjs:28`（code） |
| 既有 test/verify-evidence-triple.test.mjs、test/verify-evidence-committed-diff.test.mjs 单根 fixture 全绿 | `test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | test、verify、evidence（`test/verify-evidence-triple.test.mjs`、`test/verify-evidence-committed-diff.test.mjs`） | covered | `test/verify-evidence-triple.test.mjs:8`（test）、`test/verify-evidence-triple.test.mjs:2`（verify）、`test/verify-evidence-triple.test.mjs:17`（evidence） |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| npm test 全绿（node test/run-tests.mjs 退出 0，含 test/worktree-dual-truth-gates.test.mjs 五组用例全部通过） | `test/worktree-dual-truth-gates.test.mjs`<br>`test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | test、node、run（`test/worktree-dual-truth-gates.test.mjs`、`test/verify-evidence-triple.test.mjs`、`test/verify-evidence-committed-diff.test.mjs`） | covered | `test/worktree-dual-truth-gates.test.mjs:18`（test）、`test/worktree-dual-truth-gates.test.mjs:19`（node）、`test/worktree-dual-truth-gates.test.mjs:30`（run） |
| npm run lint 0 告警 （node test/check-syntax.mjs） | `test/worktree-dual-truth-gates.test.mjs`<br>`test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | run、告警、node（`test/worktree-dual-truth-gates.test.mjs`、`test/verify-evidence-triple.test.mjs`、`test/verify-evidence-committed-diff.test.mjs`） | covered | `test/worktree-dual-truth-gates.test.mjs:30`（run）、`test/worktree-dual-truth-gates.test.mjs:85`（告警）、`test/worktree-dual-truth-gates.test.mjs:19`（node） |
| 五组用例各含至少一条正向断言（修复后行为）+ 一条零回归断言（存量场景不变），逐条对应 requirements.md FR-01~FR-05 GWT | `test/worktree-dual-truth-gates.test.mjs`<br>`test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | — | partial | （无机械命中——人工核验 `test/worktree-dual-truth-gates.test.mjs`） |
| troubleshooting.md 新章节含双真相门禁口径与两条已知边界（未声明在途文件 / resolveVerifyChangedFiles 残留），章节编号接续无冲突 | `test/worktree-dual-truth-gates.test.mjs`<br>`test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | resolveVerifyChangedFiles（`test/verify-evidence-committed-diff.test.mjs`） | covered | `test/verify-evidence-committed-diff.test.mjs:8`（resolveVerifyChangedFiles） |
| 既有 test/scan-staleness.test.mjs、test/scan-refresh.test.mjs 若并发假红：单跑复核通过并留注记（不改其断言与阈值）；串行重跑仍红才定位修复 | `test/worktree-dual-truth-gates.test.mjs`<br>`test/verify-evidence-triple.test.mjs`<br>`test/verify-evidence-committed-diff.test.mjs` | test、mjs（`test/worktree-dual-truth-gates.test.mjs`、`test/verify-evidence-triple.test.mjs`、`test/verify-evidence-committed-diff.test.mjs`） | covered | `test/worktree-dual-truth-gates.test.mjs:18`（test）、`test/worktree-dual-truth-gates.test.mjs:18`（mjs） |

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3] + artifact 0), 0 frontend calls [scope: change-diff (22 files @ scan-root)] | 2 backend endpoints unused by frontend
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果 [层：确定性检查——CLI 实测对账]
主仓权威实测（apply 后）：`npm test` = node test/run-tests.mjs → **489 通过 / 0 失败**（scan-refresh/scan-staleness 并发假红被串行复核吸收，既有已知 flake，known_failures 清单内模式）；`npm run lint` = node test/check-syntax.mjs → **626 文件 0 告警**（test 内容规则+未引用导出 0+module-map 覆盖全）。新增 test/worktree-dual-truth-gates.test.mjs 12/12。worktree 内全量 475/13（13 失败为 WT 环境 CLI 集成段被 worktree-cwd 守卫拦，stash 实证基线同败，环境性非本变更——主仓权威面已排除）。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01 | task-01、task-06 | worktree.js:2121/:2144 三道 foreign 剔除+隔离打印；测试组1 三例；冒烟：guard+design 双声明源、own 优先、两参直调零回归 | 已闭环 |
| D-002@v1 | FR-02 | task-02、task-06 | worktree-apply.js:466/:1273-1298 choke point+复用 getBlobHashMap/chunkPaths；测试组2 两例；冒烟正负对照 | 已闭环 |
| D-003@v1 | FR-03 | task-03、task-06 | config-schema.js:139+worktree.js:832/:1022；测试组3 两例+冒烟 21/21（含 200 帽/越界拒绝/未配置静默） | 已闭环 |
| D-004@v1 | FR-04 | task-04、task-06 | task-review.js:1281 helper+complete.js:988-1010（baselineFiles 剔除）+verify-postcheck.js:2492/2618 多归属；测试组4 三例+GWT 冒烟 | 已闭环 |
| D-005@v1 | FR-05 | task-05、task-06 | verify-postcheck.js:2133-2181 双根+倒序命中根；测试组5 两例+冒烟 7/7（含 meta 损坏 fail-open 退单根） | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 命中 5 处均为 verify-postcheck.js 自身的机械启发式代码注释（:371/:396/:397/:417 为 contract-matrix 行解析器对骨架 `<!--TODO-->` 占位串的字面处理逻辑，:1864 为既有提示文案）——非未实现标记，属工具自扫描自命中（检测器代码本身含被检测字符串），无需处置。本次新增代码 0 处 TODO/FIXME/HACK。

## 变更风险等级 [层：人工判断]
risk_level 由 design frontmatter 显式声明 = unit-sufficient（覆盖关键词判级）。理由：纯 CLI 逻辑+测试改动（判定口径/过滤/供给/双根读数），无 daemon/session/lease/启动路径/跨进程组件触碰；行为契约由 489 测试含 12 新例机械锁定。关键词命中（lifecycle/state transition/claim/heartbeat 等）源自模板自查清单与「生命周期契约：不适用」豁免语句的字面，同句否定语境抑制（「不涉及生命周期契约」紧邻豁免短语可审计），无运行时语义。

## Runtime Evidence [层：人工判断]
不涉及（unit-sufficient：无长驻进程/端点/部署路径）。机械证据链：主仓 npm test 489/0（2026-09-15 23:5x 实测，verify 阶段 CLI 复测 module[cli-core,run-gates] exit 0 + npm run lint exit 0）；apply 三方净合并备份 .sillyspec/.runtime/merge-backups/；worktree 分支 sillyspec/2026-09-15-worktree-dual-truth-gates（baseline checkpoint 819c497）。

## 代码审查 [层：人工判断]
遗留（非阻断，均已在 design 风险表/troubleshooting §66 登记）：R-01 未声明在途文件仍可能带坏基线（隔离面=显式声明面）；R-09 resolveVerifyChangedFiles 补齐段与 helper 同源未统一（下次触碰时收口）；本次实证新残角落——execute --done 于 apply+cleanup 后生成草稿时，已 apply 未 commit 的主仓暂存改动对 worktree 模式归因不可见（D-004 fail-closed 时序两难既有形态），task-01/03/06 曾成无归属草稿（勾选经批量完成通道兜底，未影响流转），建议后续变更收口。总体评价：五坑根因（双真相判定基准漂移）按「worktree 感知收敛」主题一致修复，各坑独立可回退，零新依赖，测试面 12 新例+全量绿。
