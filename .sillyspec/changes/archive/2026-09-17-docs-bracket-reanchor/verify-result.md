# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——5 任务验收全覆盖（45/45 直测绿）、设计零偏差、红线零触碰；两条 NOTE 均为本变更范围外的既有事实（originCount 契约字段历史漂移、worktree 内环境性测试红），不影响本变更正确性。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| other | interface-contract.md §1.3b `--json` 字段清单缺 `originCount`（2026-09-15 陈旧基线实测兜底加入返回面时遗留文档漂移，本变更只按 task-05 范围补了 reanchored 未越权代改） | 建议 quick 收口：§1.3b 字段行补 originCount（null=未实测/快路径）——一行文档改动 |
| other | apply 回主仓后跑一次真仓 dogfood：`node bin/sillyspec.js docs check` 确认方括号扩展对存量文档零新失效（R-2 收口；worktree 内全量套件已绿但真仓文档面含 docs/prompt 等更广集合） | apply 后主仓跑 `node bin/sillyspec.js docs check`，invalid 数 ≤ 基线即闭环 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]

无（execute 阶段 5 task review 全双 pass，无 cannot_verify，verify-required-evidence.json 不存在）。

## 集成验证回执 [层：自述声明——CLI 一致性校验]

无（unit-sufficient 级 CLI 纯逻辑变更，无启动入口/daemon 集成面——design/plan 无 cli.ts/server/bootstrap/daemon 关键词命中）。

## 任务完成度 [层：人工判断]

5/5 全 ✅（100%）：task-01（src/docs-check.js df7d14b）、task-02（src/docs-gate.js a7a367c）、task-03（test/docs-fix-capability.test.mjs 3bdd543）、task-04（test/docs-gate.test.mjs 5fd3fc1）、task-05（docs/sillyspec/interface-contract.md f2de5bf）——逐 task 单文件 commit，review 双 pass，勾选 5/5 由 CLI 按 review verdict 落。

## 设计一致性 [层：人工判断]

与 design.md 一致（零结构性偏差）。Phase A：迭代体圆/方括号段并列形态逐字一致、展开循环形保持（D-006）、markdown/checkbox/脚注/嵌套与旧一致（11 用例锁死）、resolveCandidates 字面量语义零改动。Phase B：四键守卫（against 不算守卫键）、writeBaseline(current)+披露、reanchored 返回面、首次立线/快路径/真增量零触碰。实现级偏差两条（已在 task review 留痕，语义等价）：①二跑断言按派单独立成用例（taskcard 建议追加进同用例）；②披露消息含「基线 X→Y」全形（taskcard 验收原文）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中

#### 探针 2：设计关键词覆盖
全部命中：`reanchored`（src/docs-gate.js ×9：守卫判定/七分支返回面/披露分支）、`scopeGuarded`（src/docs-gate.js ×2：判定+注释）、`已自动重锚`（src/docs-gate.js 披露消息 + test/docs-gate.test.mjs:158 断言）、方括号段形态 `\[[类]+\]` 并列（src/docs-check.js REF_RE/SYMBOL_REF_RE 两正则逐字）、`FR-1.1c`（test/docs-fix-capability.test.mjs:74 用例组）。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ✅ task-04: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ⚠️ task-05: 模块目录（docs/sillyspec）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

task-05 ⚠️ 标注：文档镜像任务，验收即 grep 区间核验（已复核「自动重锚|reanchored」仅命中 §1.3b :86/:88 两处），无测试属任务本质（non-testable），非盲区。

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| collectDocRefs 提取 app/post/[id]/page.tsx:12 全量：1 条引用，refs[0].file === 'app/post/[id]/page.tsx'、start === 12 | `test/docs-fix-capability.test.mjs` | collectDocRefs、提取、app、page（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:75`（FR-1.1c 全量提取用例：app/post/[id]/page.tsx:12 断言 file+start） |
| 圆方混合段 app/(g)/[id]/z.tsx:3 全量提取：file === 'app/(g)/[id]/z.tsx'（同含 (g) 与 [id] 两段） | `test/docs-fix-capability.test.mjs` | app、tsx、全量提取、file（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:89`（圆方混合段全量提取用例） |
| 段首方括号段 [id]/page.tsx:1 全量提取：file === '[id]/page.tsx' | `test/docs-fix-capability.test.mjs` | page、tsx、全量提取、file（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:96`（段首方括号全量提取用例） |
| 符号锚 app/[lang]/layout.tsx::sym 提取：kind === 'symbol'、file === 'app/[lang]/layout.tsx'、symbol === 'sym' | `test/docs-fix-capability.test.mjs` | app、tsx（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:172`（符号锚 app/[lang]/layout.tsx::exportFn 提取用例，断言 kind/symbol 双字段） |

**task-02**（预填「无归属测试」系误判——下游消费卡 task-04 的测试按 probe7-provider-tests-in-consumer-card 口径承接 provider 验收，逐格改写）
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 陈旧态（基线已存在 && current > baseline && 实测成功 && current ≤ originCount && 无 checkOpts 四键覆盖）跑 runDocsGate：exit 0、基线文件落盘值 = current、reanchored === true、baseline 返新值（= current） | `test/docs-gate.test.mjs`（task-04 消费卡） | — | covered | `test/docs-gate.test.mjs:145`（陈旧分支用例：reanchored===true + baseline===3 + readBaseline 落盘 3 三断言） |
| 披露消息含「已自动重锚」与「基线 X→Y」（旧基线→current）、远端 ref 与实测值（形如 origin/main 实测 N），并保留「基线陈旧」token | `test/docs-gate.test.mjs`（task-04 消费卡） | — | covered | `test/docs-gate.test.mjs:157-159`（「基线陈旧」「origin/main 实测 3」「已自动重锚 基线 0→3」三 token 断言） |
| 守卫：checkOpts 显式传 paths/skip/keywordAssert/crossRepoRoots 任一 → 基线文件不变、reanchored === false、维持旧建议文案（含 --init-baseline）；仅 local.yaml 持久口径不触发守卫（自动重锚照常） | `test/docs-gate.test.mjs`（task-04 消费卡） | — | covered | `test/docs-gate.test.mjs:174`（paths 守卫用例：reanchored===false+readBaseline 仍 0+建议文案五断言；skip/keywordAssert/crossRepoRoots 三键由 :145 无覆盖用例反面承接——该用例不传 checkOpts 即四键全空走重锚） |
| 其余全分支返回对象均含 reanchored: false（缺省）；首次立线（无基线 exit 2）、快路径（零远端实测）、真增量拦截（图文逐字不变）、--init-baseline、配置错误各分支行为与现状一致 | `test/docs-gate.test.mjs`（task-04 消费卡） | — | covered | `test/docs-gate.test.mjs:187`（真增量）、`:215`（快路径消息与 evaluateRatchet 逐字一致）、`:161`（二跑 reanchored===false）、`:62`（无基线 exit 2）——分支面全过 18/18 |
| 同态第二次跑 gate 走快路径（current ≤ 新基线），陈旧提示与远端实测成本各只发生一次 | `test/docs-gate.test.mjs`（task-04 消费卡） | — | covered | `test/docs-gate.test.mjs:161`（同态二跑用例：二跑 originCount===null 零远端实测） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 全量：collectDocRefs 提取 app/post/[id]/page.tsx:12 → 1 条，file === 'app/post/[id]/page.tsx'、start === 12 | `test/docs-fix-capability.test.mjs` | 全量、collectDocRefs、提取、app（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:75` |
| 圆方混合：app/(g)/[id]/z.tsx:3 → 1 条，file === 'app/(g)/[id]/z.tsx' | `test/docs-fix-capability.test.mjs` | app、tsx、file（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:89` |
| 段首：[id]/page.tsx:1 → file === '[id]/page.tsx' | `test/docs-fix-capability.test.mjs` | page、tsx、file（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:96` |
| markdown 回归：[t](foo.js:12) → 1 条，file === 'foo.js'、start === 12（[t] 不进提取产物） | `test/docs-fix-capability.test.mjs` | markdown、回归、foo、file、start（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:103`（含 [t] app/x.js:5 空格分隔变体） |
| 嵌套：[[x]]/foo.js:9 → 部分提取 file === '/foo.js'，与旧正则行为一致（断言不锁零提取） | `test/docs-fix-capability.test.mjs` | 嵌套、foo、部分提取、file（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:116` |
| checkbox/脚注：- [ ] f.js:1 仅照常提取 f.js:1（[ ] 段不成立）、[^1] 文本零提取 | `test/docs-fix-capability.test.mjs` | — | covered | `test/docs-fix-capability.test.mjs:124`（checkbox 与脚注双形态断言，预填 partial 系关键词未命中——人工核验用例实际存在且过） |
| ReDoS：方括号 evil 形 n=30 长 token 耗时 <100ms | `test/docs-fix-capability.test.mjs` | ReDoS、evil、token、耗时（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:136`（实测 0.2ms） |
| fuzzy：文档含 app/[...slug]/page.tsx:1 → runDocsCheck skippedFuzzy === 1、total 不含该引用 | `test/docs-fix-capability.test.mjs` | app、page（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:145`（单层全量提取 + skippedFuzzy=1 断言） |
| fixture：方括号目录真实校验 invalid.length === 0（层1+层2 全过） | `test/docs-fix-capability.test.mjs` | fixture、invalid、length（`test/docs-fix-capability.test.mjs`） | covered | `test/docs-fix-capability.test.mjs:161`（mkdtemp 方括号目录 + runDocsCheck invalid=0） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 改写后陈旧分支用例全绿：reanchored === true + 落盘 = current + 消息含「已自动重锚」+ 第二次跑 originCount === null（快路径） | `test/docs-gate.test.mjs` | true、current（`test/docs-gate.test.mjs`） | covered | `test/docs-gate.test.mjs:145` 与 `:161`（改写用例 + 独立二跑用例，18/18 绿） |
| 守卫用例绿：checkOpts.paths 显式传入 → 基线文件不变、reanchored === false、维持建议文案（含 --init-baseline） | `test/docs-gate.test.mjs` | — | covered | `test/docs-gate.test.mjs:174`（预填 partial 系关键词未命中——用例存在且五断言全过） |
| 快路径/真增量/无基线三既有用例零改动零破坏（回归通过） | `test/docs-gate.test.mjs` | 快路径、真增量（`test/docs-gate.test.mjs`） | covered | `test/docs-gate.test.mjs:187`（真增量）、`:205`（fail-open）、`:215`（快路径）——diff 显示三用例零改动 |
| 本文件全量（node --test）与 npm test 全绿 | `test/docs-gate.test.mjs` | node、test、全绿（`test/docs-gate.test.mjs`） | covered | `node --test test/docs-gate.test.mjs` 18/18 pass（worktree 实测 2026-09-17）；npm test 面见「测试结果」节环境性说明 |

**task-05**（文档镜像任务，non-testable——验收即文档区间核验）
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 条目覆盖四要素：触发条件、落盘+披露+reanchored 行为、守卫边界、首次立线 fail-closed 不变 | — | — | non-testable | 文档类验收：grep「自动重锚|reanchored」仅命中 docs/sillyspec/interface-contract.md §1.3b :86/:88，条目四要素逐句在 :86 |
| §1.3b 的 --json 字段清单含 reanchored | — | — | non-testable | interface-contract.md :88 字段行含 reanchored 并注明 true 时 baseline 返新值 |
| 其余节（含 §1.3、§2 envelope schema）零改动 | — | — | non-testable | git diff f2de5bf 单文件 +1/-1 行，hunk 仅 @@ -83,8 +83,9 @@ 区间 |

- ⚠️ 零/半自动化承接条目 9 条——复核结论：9 条全部经人工走查改写完毕（task-02 五条改 covered 承接于下游卡 task-04 测试、task-03 checkbox 一条与 task-04 守卫一条 partial→covered、task-05 三条 uncovered→non-testable），无残留零覆盖路径。

#### 探针 4：决策追踪覆盖
闭环：D-001@v1（括号段并列形态）→ FR-01/FR-03 → task-01/task-03 → 证据 `src/docs-check.js` REF_RE/SYMBOL_REF_RE 并列形态 + `test/docs-fix-capability.test.mjs:74` 用例组 ✅；D-002@v1（自动重锚+四键守卫）→ FR-02/FR-03 → task-02/task-04/task-05 → 证据 `src/docs-gate.js` scopeGuarded+writeBaseline + `test/docs-gate.test.mjs:145/:161/:174` + interface-contract §1.3b 条目 ✅；D-003@v1（非复潮声明）→ FR-02 → task-02 → 证据实现面零新增 flag/模式/阈值（diff a7a367c 仅改既有陈旧分支内部）✅。无未闭环行。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (6 files @ worktree)]
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx
- 走查注记：三「端点」系探针对测试用例文档串（`app/api/path.ts`、`api/.../route.ts` 等 FR-1.1c 用例素材）的误识别——本变更是 CLI 引用校验器，无 HTTP API 面，误报不构成风险。

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定——非 blocker（纯增强无删除）。

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 5 个非 Java 清单文件不在探针 9 扫描面）

## 测试结果 [层：确定性检查——CLI 实测对账]
- `node --test test/docs-fix-capability.test.mjs`（worktree，2026-09-17）：27/27 pass（既有 16 + FR-1.1c 新增 11）
- `node --test test/docs-gate.test.mjs`（worktree）：18/18 pass（改写 1 + 新增 2 + 既有 15）
- `npm run lint`（worktree）：✅ 658 JS 文件全过（未引用导出 0）
- worktree 全量 `npm test`：除上述本变更面全绿外，config-schema/init-no-skills/init-platform-keep-local-yaml/init-tool-multi/platform-recovery-chain/mcp-server 六文件红——**环境性非回归**：worktree CWD 守卫（坑 worktree-cwd-silent-split）有意拦截「worktree 内跑 CLI」类用例（子进程继承 worktree CWD）；主仓同批逐文件复跑全绿（config-schema ✓ init-no-skills ✓ platform-recovery-chain ✓ mcp-server ✓ 0 fail）已实证与本变更无关。task-04 子代理 stash 本文件后复跑同红（HEAD 态即败）旁证。
- known_failures 豁免：无需（无新增已知失败）。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-03 | task-01、task-03 | src/docs-check.js REF_RE/SYMBOL_REF_RE 并列形态（commit df7d14b）+ test/docs-fix-capability.test.mjs:74 FR-1.1c 组（3bdd543） | closed ✅ |
| D-002@v1 | FR-02、FR-03 | task-02、task-04、task-05 | src/docs-gate.js scopeGuarded/writeBaseline/reanchored（a7a367c）+ test/docs-gate.test.mjs:145/:161/:174（5fd3fc1）+ interface-contract.md §1.3b（f2de5bf） | closed ✅ |
| D-003@v1 | FR-02 | task-02 | diff a7a367c 实现面零新增 flag/模式/阈值（非 delta-only 复潮的机械印证） | closed ✅ |

## 技术债务 [层：人工判断]
探针 1 零命中，无新增 TODO/FIXME。范围外既有漂移一项（移交项①：originCount 缺于 §1.3b 字段清单，2026-09-15 遗留）。

## 变更风险等级 [层：人工判断]
unit-sufficient——纯 CLI 校验器逻辑（正则提取面超集 + gate 条件写基线文件一处），无网络/进程/schema/状态机面；测试直测 45 断言全绿 + 全量套件环境外零回归。design.md frontmatter 无 risk_level 显式声明。gate 写面（基线文件）经守卫+披露+棘轮只紧不松三重约束，pre-push hook exit code 语义不变。

## Runtime Evidence [层：人工判断]
不涉及（无启动入口/daemon/端点运行时组件）。CLI 实测证据链：worktree 内 `node -e` 行为自测（六断言+三 evil 0ms，2026-09-17 09:5x）+ `node --test` 两文件 45/45 + 主仓六环境性红文件逐复跑全绿对照。

## 代码审查 [层：人工判断]
问题列表：**零 P1/P2**。走查结论（探针 7 ⚠️ 条目定向面）：
① 编辑/更新链路——不涉及（无编辑 UI 链路；applyFixes 定点替换与字符集正交，方括号 ref 串 indexOf 定位不受影响）；
② 非主分支流——陈旧分支守卫双路（:199 守卫命中旧文案 / :210 自动重锚）+ fail-open（实测失败回原拦）+ against 模式（非守卫键，重锚照常，与 --init-baseline --against 同口径）全走查，task-04 :145/:161/:174 三用例承接；
③ 守卫一致性——scopeGuarded 四键与 design Grill CC-9 修正后逐键一致，`keywordAssert != null` 对齐 runDocsCheck 的 `??` 回退语义（null 不触发守卫，子代理自测实证）；
④ 载荷字段契约——探针 8 不适用；
⑤ 分页/并发/事务——基线文件并发写 last-write-winds（双方均写已验证不劣于远端的值，design R-3 论证成立）。
总体评价：实现紧凑（5 文件 +204/-32），头注/JSDoc/文档镜像三面同步完整，测试覆盖验收面 100%；两处实现级偏差语义等价已留痕。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
无（light 级变更，brainstorm 阶段已过 independent Design Grill；verify 未触发独立复核档）。
