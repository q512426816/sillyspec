# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——四波机制（快照口径死循环断根/指纹树键化/纯事实门前移/跨仓 per-repo）全部落地，全量回归 740/740 绿（含 8 新测试文件）；NOTES 见移交项

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| other | 快照慢性失败根因（createVerifyGateSnapshot null 路径）未修——无现存复现环境 | 复现环境出现后另立变更（本变更已兜：失败可见+复用不死循环+口径如实标记） |
| other | 轻量道（flow done）无摩擦记账/聚合清单——独立缺口 | 另行立项（proposal Non-Goals 第 2 条） |
| other | gate verify 预检无缓存层且未默认 --docs-only | 低优尾巴（proposal Non-Goals 第 3 条） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（本变更无 cannot_verify 任务——全部验收有自动化测试承接）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
无（风险面 unit-sufficient 显式声明——CLI 内部管线变更，集成语义由 8 个端到端测试文件锁定：CLI 子进程/真实 git 仓/真实 worktree fixture）
<!-- smoke 机器段缺态：not-configured（commands.smoke 未配置——配置 local.yaml 后下次 verify 亲跑并自动注入机器段）source: cli-noai-smoke -->

## 任务完成度 [层：人工判断]
9/9 全部完成（tasks.md 全勾；验收对照探针 7 矩阵 covered；task-09：740/740 全量绿+四卡 changelog+platform-interface-map 重锚）

## 设计一致性 [层：人工判断]
两处落点偏差已回写声明（gate-snapshot.js→task-02 卡、verify-probes.js→task-06 卡+design 清单）；task-08 推断逻辑抽 inferChangeFromWorktreeCwd 导出（独立审查验证面清偿）。其余一致。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/run/gates.js:121` // 防骨架直接过门（2026-08-21 agent-手工产出审计项⑤）：CLI 会代生成逐 task TODO 骨架
- ⚠️ `src/run/gates.js:126` // 捕获 token 排除冒号/逗号：骨架行格式「- task-01: <!--TODO-->」，\S+ 会连冒号一起捕获导致永不命中
- ⚠️ `src/run/gates.js:129` for (const m of report.matchAll(/^[-*][ \t]*([^\s:：,，]+)[^\n]*<!--TODO-->/gm)) {
- ⚠️ `src/run/gates.js:134` errors.push(`${id} 的结论仍是骨架 <!--TODO--> 占位——替换为真实结论（无签名级变更也显式写「无」）`)
- ⚠️ `src/run/gates.js:140` * 生成 symbol-impact.md 逐 task TODO 骨架（2026-08-21 审计项⑤「报错即生成」）。
- ⚠️ `src/run/gates.js:143` * 骨架从 tasks.md 注册表生成逐 task 占位行，agent 只需逐行填结论；占位 <!--TODO-->
- ⚠️ `src/run/gates.js:164` '> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）',
- ⚠️ `src/run/gates.js:166` '> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。',
- ⚠️ `src/run/gates.js:169` for (const id of taskIds) lines.push(`- ${id}: <!--TODO-->`)
- ⚠️ `src/run/gates.js:194` // 报错即生成（2026-08-21 审计项⑤）：报告缺失时自动落一份逐 task TODO 骨架，agent 从
- ⚠️ `src/run/gates.js:195` // 「从零手写整份」变「逐行填结论」；TODO 占位由 validate 拒绝，骨架不能直接过门。
- ⚠️ `src/run/gates.js:202` skeletonNote = `\n   📄 已代生成逐 task 骨架：${reportPath}（逐行替换 <!--TODO--> 为结论，无签名级变更也显式写「无」）`
- ⚠️ `src/verify-probes.js:1101` // 声明匹配面剥 HTML 注释（task-04 宽收配套）：design 骨架的接口段 TODO 指引自带可粘贴句式
- ⚠️ `src/verify-probes.js:3693` //   refreshProbeSections——定向刷新：只动「仍含待填占位（<待填 / <!--TODO）的探针机械段」，
- ⚠️ `src/verify-probes.js:3749` * 段级合并：用 fresh 渲染替换段内容，但旧段里已填的表格行（不含 <待填/<TODO 占位）按首列
- ⚠️ `src/verify-probes.js:3764` if (/<待填|<TODO/.test(l)) continue
- ⚠️ `src/verify-probes.js:3796` *   - 含待填占位（<待填 或 <!--TODO）的旧探针段 → 用 fresh 同号段替换（表格已填行携载）；
- ⚠️ `src/verify-probes.js:3820` if (/<待填|<!--TODO/.test(oldText)) {
- ⚠️ `src/index.js:110` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:117` sillyspec verify-probes --change <name> [--init [--force]]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架（--force 覆盖重生成，手填内容会重置）
- ⚠️ `src/index.js:1309` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1333` console.error('用法: sillyspec verify-probes --change <name> [--init [--force]] [--refresh-probes] [--draft] [--amend-draft] [--json] [--spec-dir <path>]\n  跑机械探针
- ⚠️ `src/index.js:1460` // 同款口径（detectChangeRisk 词表已退役 D-008）。幂等：段内非 TODO 占位（已手写/已
- ⚠️ `src/index.js:1725` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1773` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:2128` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:2133` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:2159` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:2195` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:2198` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:2201` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:2204` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:2207` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:2219` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:2223` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:2224` Given <!--TODO-->
- ⚠️ `src/index.js:2225` When <!--TODO-->
- ⚠️ `src/index.js:2226` Then <!--TODO-->
- ⚠️ `src/index.js:2229` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:2251` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:4203` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `src/index.js:4591` // 占位行「requirement_ids: [FR-XX] / decision_ids: [D-XXX@vN]」立即改写为 prefillCardIds
- ⚠️ `src/index.js:4608` .replace('decision_ids: [D-XXX@vN]', () => tcIdLine('decision_ids', tcPrefillIds.decisionIds));

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-02: 模块目录（src/run、src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-03: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-04: 模块目录（src、src/run、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-05: 模块目录（src/run、test）找到 11 个测试文件（src/run/test-ledger.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-06: 模块目录（src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-07: 模块目录（src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-08: 模块目录（src、test）找到 15 个测试文件（src/run/test-ledger.js、src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、src/test-bindings.js …）
- ✅ task-09: 模块目录（.sillyspec/docs/sillyspec、.sillyspec/changes）找到 169 个测试文件（.sillyspec/changes/2026-10-09-verify-reuse-friction/test-trace.json、.sillyspec/changes/archive/2026-06-02-spec-bootstrap-agent-stream-interaction/prototype-2026-06-02-spec-bootstrap-agent-stream-interaction.html、.sillyspec/changes/archive/2026-06-28-daemon-client-spec-sync-strategy/prototype-daemon-client-spec-strategy.html、.sillyspec/changes/archive/2026-08-25-session-spec-binding/prototype-session-spec-binding.html、.sillyspec/changes/archive/2026-09-12-session-live-display-fixes/evidence/prod-live-test-20260913.md …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 连续快照失败场景：passed 幂等闸第二轮起命中复用（reason 不为 snapshot-scope-changed），零测试执行 | `test/verify-quality-scan-reuse-actual-scope.test.mjs`<br>`test/gates-snapshot-fallback-visibility.test.mjs`<br>`test/code-face-key-doc-commit-survival.test.mjs` | passed、reason（`test/verify-quality-scan-reuse-actual-scope.test.mjs`、`test/gates-snapshot-fallback-visibility.test.mjs`） | covered | `test/verify-quality-scan-reuse-actual-scope.test.mjs:62`（passed）、`test/verify-quality-scan-reuse-actual-scope.test.mjs:62`（reason） |
| 口径真实切换（上轮快照/本轮失败或反向）：仍失配重跑 | `test/verify-quality-scan-reuse-actual-scope.test.mjs`<br>`test/gates-snapshot-fallback-visibility.test.mjs`<br>`test/code-face-key-doc-commit-survival.test.mjs` | 口径真实切换（`test/verify-quality-scan-reuse-actual-scope.test.mjs`） | covered | `test/verify-quality-scan-reuse-actual-scope.test.mjs:8`（口径真实切换） |
| failed 失败签名去重闸同用实际口径判定，两闸同函数同口径无分叉 | `test/verify-quality-scan-reuse-actual-scope.test.mjs`<br>`test/gates-snapshot-fallback-visibility.test.mjs`<br>`test/code-face-key-doc-commit-survival.test.mjs` | failed（`test/verify-quality-scan-reuse-actual-scope.test.mjs`） | covered | `test/verify-quality-scan-reuse-actual-scope.test.mjs:64`（failed） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 快照创建失败/跳过：⚠️ 告警块非静默 | `test/gates-snapshot-fallback-visibility.test.mjs`<br>`test/gates-verify-cheap-gates-first.test.mjs` | — | covered | 人工复核：e2e 用例断言 warns 含 gate-snapshot-fallback 告警行（`test/gates-snapshot-fallback-visibility.test.mjs`） |
| friction-tally 落 gate_snapshot_fallback（detail 携 change 与失败摘要） | `test/gates-snapshot-fallback-visibility.test.mjs`<br>`test/gates-verify-cheap-gates-first.test.mjs` | friction、tally、gate_snapshot_fallback、detail、change（`test/gates-snapshot-fallback-visibility.test.mjs`、`test/gates-verify-cheap-gates-first.test.mjs`） | covered | `test/gates-snapshot-fallback-visibility.test.mjs:2`（friction）、`test/gates-snapshot-fallback-visibility.test.mjs:48`（tally）、`test/gates-snapshot-fallback-visibility.test.mjs:6`（gate_snapshot_fallback） |
| 两处静默 catch 均改告警 | `test/gates-snapshot-fallback-visibility.test.mjs`<br>`test/gates-verify-cheap-gates-first.test.mjs` | catch（`test/gates-snapshot-fallback-visibility.test.mjs`、`test/gates-verify-cheap-gates-first.test.mjs`） | covered | `test/gates-snapshot-fallback-visibility.test.mjs:53`（catch） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 纯文档提交：两指纹均存活，下轮命中复用 | `test/code-face-key-doc-commit-survival.test.mjs`<br>`test/verify-test-result-reuse-observability.test.mjs` | 纯文档提交、两指纹均存活（`test/code-face-key-doc-commit-survival.test.mjs`） | covered | `test/code-face-key-doc-commit-survival.test.mjs:7`（纯文档提交）、`test/code-face-key-doc-commit-survival.test.mjs:69`（两指纹均存活） |
| 代码提交：必失配真跑 | `test/code-face-key-doc-commit-survival.test.mjs`<br>`test/verify-test-result-reuse-observability.test.mjs` | 代码提交（`test/code-face-key-doc-commit-survival.test.mjs`） | covered | `test/code-face-key-doc-commit-survival.test.mjs:2`（代码提交） |
| ls-tree -z 解析非 ASCII 路径不误入；整树 oid 快路径；git 失败 null | `test/code-face-key-doc-commit-survival.test.mjs`<br>`test/verify-test-result-reuse-observability.test.mjs` | tree、ASCII（`test/code-face-key-doc-commit-survival.test.mjs`、`test/verify-test-result-reuse-observability.test.mjs`） | covered | `test/code-face-key-doc-commit-survival.test.mjs:6`（tree）、`test/code-face-key-doc-commit-survival.test.mjs:34`（ASCII） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| test-result.json 携 fingerprint+reuseDecision（两态都有值） | `test/verify-test-result-reuse-observability.test.mjs`<br>`src/test-bindings.js`<br>`test/test-bindings-crossrepo-row-resolution.test.mjs` | test、result、json、fingerprint（`test/verify-test-result-reuse-observability.test.mjs`、`src/test-bindings.js`、`test/test-bindings-crossrepo-row-resolution.test.mjs`） | covered | `test/verify-test-result-reuse-observability.test.mjs:5`（test）、`test/verify-test-result-reuse-observability.test.mjs:5`（result）、`test/verify-test-result-reuse-observability.test.mjs:5`（json） |
| 质量扫描记录携 scopeDecision/missReason | `test/verify-test-result-reuse-observability.test.mjs`<br>`src/test-bindings.js`<br>`test/test-bindings-crossrepo-row-resolution.test.mjs` | 质量扫描记录携、scopeDecision、missReason（`test/verify-test-result-reuse-observability.test.mjs`） | covered | `test/verify-test-result-reuse-observability.test.mjs:6`（质量扫描记录携）、`test/verify-test-result-reuse-observability.test.mjs:7`（scopeDecision）、`test/verify-test-result-reuse-observability.test.mjs:7`（missReason） |
| 旧格式读侧兼容 | `test/verify-test-result-reuse-observability.test.mjs`<br>`src/test-bindings.js`<br>`test/test-bindings-crossrepo-row-resolution.test.mjs` | — | covered | 人工复核：appendReuseDecision 坏输入分支 + 旧记录无新键不炸（additive 缺键语义，`test/verify-test-result-reuse-observability.test.mjs`） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| ②类声明缺失：对账门先于实测门拦截，零测试执行 | `test/gates-verify-cheap-gates-first.test.mjs` | 类声明缺失、零测试执行（`test/gates-verify-cheap-gates-first.test.mjs`） | covered | `test/gates-verify-cheap-gates-first.test.mjs:38`（类声明缺失）、`test/gates-verify-cheap-gates-first.test.mjs:7`（零测试执行） |
| 前移门并入 R16 聚合清单 | `test/gates-verify-cheap-gates-first.test.mjs` | R16（`test/gates-verify-cheap-gates-first.test.mjs`） | covered | `test/gates-verify-cheap-gates-first.test.mjs:6`（R16） |
| 调用链无实测依赖实证（有依赖回退并记录） | `test/gates-verify-cheap-gates-first.test.mjs` | — | covered | 人工复核：两门只读 git/文档事实不消费 testCheck；`test/gates-verify-cheap-gates-first.test.mjs` 端到端零测试执行 |

**task-06**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 跨仓行携 repo 字段并按行 repo 根解析不悬空 | `src/test-bindings.js`<br>`test/test-bindings-crossrepo-row-resolution.test.mjs`<br>`test/cross-repo-reconcile-baseline-anchor.test.mjs` | repo（`src/test-bindings.js`、`test/test-bindings-crossrepo-row-resolution.test.mjs`、`test/cross-repo-reconcile-baseline-anchor.test.mjs`） | covered | `src/test-bindings.js:160`（repo） |
| 存量无 repo 行回退主仓兼容 | `src/test-bindings.js`<br>`test/test-bindings-crossrepo-row-resolution.test.mjs`<br>`test/cross-repo-reconcile-baseline-anchor.test.mjs` | repo（`src/test-bindings.js`、`test/test-bindings-crossrepo-row-resolution.test.mjs`、`test/cross-repo-reconcile-baseline-anchor.test.mjs`） | covered | `src/test-bindings.js:160`（repo） |
| 复现测试先行钉住现行缺陷 | `src/test-bindings.js`<br>`test/test-bindings-crossrepo-row-resolution.test.mjs`<br>`test/cross-repo-reconcile-baseline-anchor.test.mjs` | — | covered | 人工复核：`test/test-bindings-crossrepo-row-resolution.test.mjs` 构造注册仓根有文件/主仓没有形态——旧行必悬空新行为通过 |

**task-07**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| baseline 可得：窗口=baseline..HEAD 多笔全覆盖 | `test/cross-repo-reconcile-baseline-anchor.test.mjs` | baseline、窗口、HEAD（`test/cross-repo-reconcile-baseline-anchor.test.mjs`） | covered | `test/cross-repo-reconcile-baseline-anchor.test.mjs:6`（baseline）、`test/cross-repo-reconcile-baseline-anchor.test.mjs:6`（窗口）、`test/cross-repo-reconcile-baseline-anchor.test.mjs:5`（HEAD） |
| baseline 不可得：回退现行窗口不回退语义 | `test/cross-repo-reconcile-baseline-anchor.test.mjs` | baseline（`test/cross-repo-reconcile-baseline-anchor.test.mjs`） | covered | `test/cross-repo-reconcile-baseline-anchor.test.mjs:6`（baseline） |
| 复现测试先行 | `test/cross-repo-reconcile-baseline-anchor.test.mjs` | — | covered | 人工复核：`test/cross-repo-reconcile-baseline-anchor.test.mjs` worktree 两笔提交——旧 B 档只见最近一笔新 B' 档全覆盖 |

**task-08**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 注册 repoKey 后缀剥除推断成功 | `test/wt-commit-crossrepo-infer.test.mjs` | 注册、repoKey（`test/wt-commit-crossrepo-infer.test.mjs`） | covered | `test/wt-commit-crossrepo-infer.test.mjs:6`（注册）、`test/wt-commit-crossrepo-infer.test.mjs:4`（repoKey） |
| 未注册不剥并报错引导 | `test/wt-commit-crossrepo-infer.test.mjs` | — | covered | 人工复核：三态直测 ③ 未注册原样透传（`test/wt-commit-crossrepo-infer.test.mjs`） |
| 全段命中已知变更不剥 | `test/wt-commit-crossrepo-infer.test.mjs` | 全段命中已知变更不剥（`test/wt-commit-crossrepo-infer.test.mjs`） | covered | `test/wt-commit-crossrepo-infer.test.mjs:6`（全段命中已知变更不剥） |
| 复现测试先行 | `test/wt-commit-crossrepo-infer.test.mjs` | — | covered | 人工复核：三态直测 ①+② 深路径注册剥除/全段命中不剥（`test/wt-commit-crossrepo-infer.test.mjs`） |

**task-09**
- ℹ️ 既有用例候选（FR 关联回归面，本变更未改动；判定仍由你复核，命中≠结论）：`test/align-execute-review-gate.test.mjs`、`test/archive-cli-git-add.test.mjs`、`test/archive-commit-suggest-race.test.mjs`、`test/archive-stage-claim.test.mjs`、`test/archive-timeline-bake.test.mjs`、`test/backfill-reviews.test.mjs`、`test/batch-tick-gate.test.mjs`、`test/bind-unbind-help.test.mjs`、`test/change-name-date-gate.test.mjs`、`test/check-syntax.mjs`、`test/confirm-on-use.test.mjs`、`test/deps-cwd-prefix.test.mjs`、`test/dispatch-contract.test.mjs`、`test/doc-ref-check.test.mjs`、`test/dynamic-test-inference.test.mjs`、`test/execute-batch-endtoend-checkbox.test.mjs`、`test/execute-run-dir-fail-loud.test.mjs`、`test/execute-run-marker-drift.test.mjs`、`test/execution-mode-render.test.mjs`、`test/filter-committed-face.test.mjs`、`test/flow-done-fail-brief.test.mjs`、`test/flow-draft-binding-extract.test.mjs`、`test/flow-draft.test.mjs`、`test/flow-protocol.test.mjs`、`test/flow-review.test.mjs`、`test/flow-route.test.mjs`、`test/flow-status-json.test.mjs`、`test/flow-tail-polish.test.mjs`、`test/flow-tick-prototype.test.mjs`、`test/flowdone-lint-fail-output.test.mjs`、`test/fourpiece-init.test.mjs`、`test/fr-compound-split.test.mjs`、`test/fr-domain-guard-and-redomain-bychange.test.mjs`、`test/fr-priority-overlap.test.mjs`、`test/fr-regress-cap-drop.test.mjs`、`test/gate-snapshot-layout-guard.test.mjs`、`test/governance-autopilot.test.mjs`、`test/input-format-copy.test.mjs`、`test/input-teach-copyable.test.mjs`、`test/plan-target-files.test.mjs`、`test/reconcile-source-isolation.test.mjs`、`test/redomain.test.mjs`、`test/residual-runner-parity.test.mjs`、`test/review-json-field-gate.test.mjs`、`test/review-unsupervised-exit.test.mjs`、`test/run-complete-noai-done-gate.test.mjs`、`test/run-complete-step-execute-batch.test.mjs`、`test/run-tests.mjs`、`test/skeleton-provenance.test.mjs`、`test/stage-completion-atomicity.test.mjs`、`test/status-empty-guide.test.mjs`、`test/tap-judge.test.mjs`、`test/task-done.test.mjs`、`test/task-review-retire.test.mjs`、`test/task-tick.test.mjs`、`test/task-truth-unify.test.mjs`、`test/thin-done-dirty-gate.test.mjs`、`test/tick-loop-nudge.test.mjs`、`test/verify-gate-restrict-source.test.mjs`、`test/verify-gate-restrictfiles.test.mjs`、`test/verify-postcheck-known-failures.test.mjs`、`test/watcher-timeline.test.mjs`、`test/watcher.test.mjs`
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 四卡+changelog 同步本变更行为变化 | `test/align-execute-review-gate.test.mjs`<br>`test/archive-cli-git-add.test.mjs`<br>`test/archive-commit-suggest-race.test.mjs`<br>`test/archive-stage-claim.test.mjs`<br>`test/archive-timeline-bake.test.mjs`<br>`test/backfill-reviews.test.mjs`<br>`test/batch-tick-gate.test.mjs`<br>`test/bind-unbind-help.test.mjs`<br>`test/change-name-date-gate.test.mjs`<br>`test/check-syntax.mjs`<br>`test/confirm-on-use.test.mjs`<br>`test/deps-cwd-prefix.test.mjs`<br>`test/dispatch-contract.test.mjs`<br>`test/doc-ref-check.test.mjs`<br>`test/dynamic-test-inference.test.mjs`<br>`test/execute-batch-endtoend-checkbox.test.mjs`<br>`test/execute-run-dir-fail-loud.test.mjs`<br>`test/execute-run-marker-drift.test.mjs`<br>`test/execution-mode-render.test.mjs`<br>`test/filter-committed-face.test.mjs`<br>`test/flow-done-fail-brief.test.mjs`<br>`test/flow-draft-binding-extract.test.mjs`<br>`test/flow-draft.test.mjs`<br>`test/flow-protocol.test.mjs`<br>`test/flow-review.test.mjs`<br>`test/flow-route.test.mjs`<br>`test/flow-status-json.test.mjs`<br>`test/flow-tail-polish.test.mjs`<br>`test/flow-tick-prototype.test.mjs`<br>`test/flowdone-lint-fail-output.test.mjs`<br>`test/fourpiece-init.test.mjs`<br>`test/fr-compound-split.test.mjs`<br>`test/fr-domain-guard-and-redomain-bychange.test.mjs`<br>`test/fr-priority-overlap.test.mjs`<br>`test/fr-regress-cap-drop.test.mjs`<br>`test/gate-snapshot-layout-guard.test.mjs`<br>`test/governance-autopilot.test.mjs`<br>`test/input-format-copy.test.mjs`<br>`test/input-teach-copyable.test.mjs`<br>`test/plan-target-files.test.mjs`<br>`test/reconcile-source-isolation.test.mjs`<br>`test/redomain.test.mjs`<br>`test/residual-runner-parity.test.mjs`<br>`test/review-json-field-gate.test.mjs`<br>`test/review-unsupervised-exit.test.mjs`<br>`test/run-complete-noai-done-gate.test.mjs`<br>`test/run-complete-step-execute-batch.test.mjs`<br>`test/run-tests.mjs`<br>`test/skeleton-provenance.test.mjs`<br>`test/stage-completion-atomicity.test.mjs`<br>`test/status-empty-guide.test.mjs`<br>`test/tap-judge.test.mjs`<br>`test/task-done.test.mjs`<br>`test/task-review-retire.test.mjs`<br>`test/task-tick.test.mjs`<br>`test/task-truth-unify.test.mjs`<br>`test/thin-done-dirty-gate.test.mjs`<br>`test/tick-loop-nudge.test.mjs`<br>`test/verify-gate-restrict-source.test.mjs`<br>`test/verify-gate-restrictfiles.test.mjs`<br>`test/verify-postcheck-known-failures.test.mjs`<br>`test/watcher-timeline.test.mjs`<br>`test/watcher.test.mjs` | — | covered | 人工复核：doc-ref-check.test.mjs 全绿即文档一致性回归（740/740 内）；四张模块 changelog 行为条目 git diff 可证 |
| node test/run-tests.mjs 全量绿（含新增 8 个测试文件与既有核心面） | `test/align-execute-review-gate.test.mjs`<br>`test/archive-cli-git-add.test.mjs`<br>`test/archive-commit-suggest-race.test.mjs`<br>`test/archive-stage-claim.test.mjs`<br>`test/archive-timeline-bake.test.mjs`<br>`test/backfill-reviews.test.mjs`<br>`test/batch-tick-gate.test.mjs`<br>`test/bind-unbind-help.test.mjs`<br>`test/change-name-date-gate.test.mjs`<br>`test/check-syntax.mjs`<br>`test/confirm-on-use.test.mjs`<br>`test/deps-cwd-prefix.test.mjs`<br>`test/dispatch-contract.test.mjs`<br>`test/doc-ref-check.test.mjs`<br>`test/dynamic-test-inference.test.mjs`<br>`test/execute-batch-endtoend-checkbox.test.mjs`<br>`test/execute-run-dir-fail-loud.test.mjs`<br>`test/execute-run-marker-drift.test.mjs`<br>`test/execution-mode-render.test.mjs`<br>`test/filter-committed-face.test.mjs`<br>`test/flow-done-fail-brief.test.mjs`<br>`test/flow-draft-binding-extract.test.mjs`<br>`test/flow-draft.test.mjs`<br>`test/flow-protocol.test.mjs`<br>`test/flow-review.test.mjs`<br>`test/flow-route.test.mjs`<br>`test/flow-status-json.test.mjs`<br>`test/flow-tail-polish.test.mjs`<br>`test/flow-tick-prototype.test.mjs`<br>`test/flowdone-lint-fail-output.test.mjs`<br>`test/fourpiece-init.test.mjs`<br>`test/fr-compound-split.test.mjs`<br>`test/fr-domain-guard-and-redomain-bychange.test.mjs`<br>`test/fr-priority-overlap.test.mjs`<br>`test/fr-regress-cap-drop.test.mjs`<br>`test/gate-snapshot-layout-guard.test.mjs`<br>`test/governance-autopilot.test.mjs`<br>`test/input-format-copy.test.mjs`<br>`test/input-teach-copyable.test.mjs`<br>`test/plan-target-files.test.mjs`<br>`test/reconcile-source-isolation.test.mjs`<br>`test/redomain.test.mjs`<br>`test/residual-runner-parity.test.mjs`<br>`test/review-json-field-gate.test.mjs`<br>`test/review-unsupervised-exit.test.mjs`<br>`test/run-complete-noai-done-gate.test.mjs`<br>`test/run-complete-step-execute-batch.test.mjs`<br>`test/run-tests.mjs`<br>`test/skeleton-provenance.test.mjs`<br>`test/stage-completion-atomicity.test.mjs`<br>`test/status-empty-guide.test.mjs`<br>`test/tap-judge.test.mjs`<br>`test/task-done.test.mjs`<br>`test/task-review-retire.test.mjs`<br>`test/task-tick.test.mjs`<br>`test/task-truth-unify.test.mjs`<br>`test/thin-done-dirty-gate.test.mjs`<br>`test/tick-loop-nudge.test.mjs`<br>`test/verify-gate-restrict-source.test.mjs`<br>`test/verify-gate-restrictfiles.test.mjs`<br>`test/verify-postcheck-known-failures.test.mjs`<br>`test/watcher-timeline.test.mjs`<br>`test/watcher.test.mjs` | node、test、run、tests、mjs（`test/align-execute-review-gate.test.mjs`、`test/archive-cli-git-add.test.mjs`、`test/archive-commit-suggest-race.test.mjs`、`test/archive-stage-claim.test.mjs`、`test/archive-timeline-bake.test.mjs`、`test/batch-tick-gate.test.mjs`、`test/bind-unbind-help.test.mjs`、`test/change-name-date-gate.test.mjs`、`test/check-syntax.mjs`、`test/confirm-on-use.test.mjs`、`test/deps-cwd-prefix.test.mjs`、`test/dispatch-contract.test.mjs`、`test/doc-ref-check.test.mjs`、`test/dynamic-test-inference.test.mjs`、`test/execute-run-dir-fail-loud.test.mjs`、`test/execute-run-marker-drift.test.mjs`、`test/execution-mode-render.test.mjs`、`test/filter-committed-face.test.mjs`、`test/flow-done-fail-brief.test.mjs`、`test/flow-draft-binding-extract.test.mjs`、`test/flow-draft.test.mjs`、`test/flow-protocol.test.mjs`、`test/flow-review.test.mjs`、`test/flow-route.test.mjs`、`test/flow-status-json.test.mjs`、`test/flow-tail-polish.test.mjs`、`test/flow-tick-prototype.test.mjs`、`test/flowdone-lint-fail-output.test.mjs`、`test/fourpiece-init.test.mjs`、`test/fr-compound-split.test.mjs`、`test/fr-domain-guard-and-redomain-bychange.test.mjs`、`test/fr-priority-overlap.test.mjs`、`test/fr-regress-cap-drop.test.mjs`、`test/gate-snapshot-layout-guard.test.mjs`、`test/governance-autopilot.test.mjs`、`test/input-format-copy.test.mjs`、`test/input-teach-copyable.test.mjs`、`test/plan-target-files.test.mjs`、`test/reconcile-source-isolation.test.mjs`、`test/redomain.test.mjs`、`test/residual-runner-parity.test.mjs`、`test/review-json-field-gate.test.mjs`、`test/review-unsupervised-exit.test.mjs`、`test/run-complete-noai-done-gate.test.mjs`、`test/run-complete-step-execute-batch.test.mjs`、`test/run-tests.mjs`、`test/skeleton-provenance.test.mjs`、`test/stage-completion-atomicity.test.mjs`、`test/status-empty-guide.test.mjs`、`test/tap-judge.test.mjs`、`test/task-done.test.mjs`、`test/task-review-retire.test.mjs`、`test/task-tick.test.mjs`、`test/task-truth-unify.test.mjs`、`test/thin-done-dirty-gate.test.mjs`、`test/tick-loop-nudge.test.mjs`、`test/verify-gate-restrict-source.test.mjs`、`test/verify-gate-restrictfiles.test.mjs`、`test/verify-postcheck-known-failures.test.mjs`、`test/watcher-timeline.test.mjs`、`test/watcher.test.mjs`、`test/backfill-reviews.test.mjs`、`test/execute-batch-endtoend-checkbox.test.mjs`） | covered | `test/align-execute-review-gate.test.mjs:16`（node）、`test/align-execute-review-gate.test.mjs:162`（test）、`test/align-execute-review-gate.test.mjs:13`（run） |

- ⚠️ 零/半自动化承接条目 8 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4] + artifact 0), 0 frontend calls [scope: change-diff (9 files @ scan-root)] | 0 backend endpoints unused by frontend (+3 stock noise collapsed)
- ⚠️ 0 个本变更端点前端未调用（warning 不阻断）：
- ℹ️ 另有 3 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 21 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（10 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）
#### 探针 12：UI 视觉证据（分级门）
- 不适用（非 UI 触达变更（input/声明文件面均未命中）——零打扰）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态（可复制样例）：design接口表#POST /api/xx（# 后必须 METHOD /path，仅表名/行号/散文描述不计命中）、权限矩阵[admin×读]、契约表@任务卡字段清单、DDL@users.id、载荷@e2e_body.json（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
| 端点 | 判定 | 用例依据 ID | 结果 | 证据 |
|---|---|---|---|---|
| 本变更接口面：0 端点（agent 声明） | non-testable | — | 0 端点即无接口验证面（design 接口契约节声明的 additive 导出面由单元测试锁定，非 API 端点） | — |
<!-- 解析零行降级（D-005）：接口面以 agent 声明为准（对账分母=声明数）；声明与实际不符时补 design 接口段表格后重跑 --init --force 重生成本段（quick-B：--force 才有刷新通道，手填内容会重置先备份） -->
<!-- advisory 尾注（warning 计算归 validator，本段只留位）：有消费端未填子行的端点将列于此（advisory——消费端归类=design 清单启发式，数据面 facts.consumerHints）；写端点（POST/PUT/DELETE/PATCH）未在权限矩阵段声明的将列于此（advisory——补行或显式豁免「无权限约束」，数据面 facts.apiFace.writeEndpoints；表缺行会让派生框架继承你的洞） -->

## 测试结果 [层：确定性检查——CLI 实测对账]
<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01..08 | task-01..09 | tasks.md 九任务+plan.md 依赖边 | closed |
| D-002@v1 | FR-03 | task-03 | `test/code-face-key-doc-commit-survival.test.mjs` | closed |
| D-003@v1 | FR-01 | task-01 | `test/verify-quality-scan-reuse-actual-scope.test.mjs` | closed |
| D-004@v1 | FR-05 | task-05 | `test/gates-verify-cheap-gates-first.test.mjs` | closed |
| D-005@v1 | FR-06 | task-06 | `test/test-bindings-crossrepo-row-resolution.test.mjs` | closed |
| D-006@v1 | FR-08 | task-08 | `test/wt-commit-crossrepo-infer.test.mjs` | closed |

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
