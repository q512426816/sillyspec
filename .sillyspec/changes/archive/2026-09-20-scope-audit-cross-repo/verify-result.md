# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`（全部验收条目有测试/实证承接，全量测试与 lint 绿；notes 为两项**设计内**边界——平台侧消费方在外仓独立变更、存量旧快照跨仓段按 D-002 契约不回算，均已移交）

## 移交项（结构化） [层：人工判断——CLI 清单核验]

| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| manual-acceptance | 平台侧消费方（SillyHub daemon 投影 rows[].crossRepo/verdict 与 repos[] → 后端 schema → 前端按仓分组 UI）在 multi-agent-platform 仓独立变更，等本契约定型（已定型：design.md 接口定义节 = 契约 v2 终稿） | 外仓按 design.md「接口定义」字段表开发；验收=平台对账卡对 f85a6650 类多仓变更显示三仓分组真实三态 |
| manual-acceptance | 存量旧快照（跨仓行恒 untouched、无 repos 键）不回算——「快照说什么是什么」契约（D-002@v1） | 需要旧变更跨仓真实态时人工按 execute-runs reviews 锡点到对应仓 git diff（CLI 已在 note 中给指引文案） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]

无（execute 五 task review 全 pass，无 cannot_verify）

## 集成验证回执 [层：自述声明——CLI 一致性校验]

无（非 integration-critical/deployment-critical；CLI 只读命令的端到端行为由真 CLI 冒烟与 e2e 测试覆盖，见 Runtime Evidence）

## 任务完成度 [层：人工判断]

- task-01 ✅：collectRepoActual 落地（src/cross-repo-reconcile.js:200，锚点四级+fail-soft）；reconcileCrossRepoDeclarations 消费内核（:276，既有字段形状零变化+anchor 增量）；verify 侧邻域 12 测试绿
- task-02 ✅：跨仓真实三态+行数+crossRepo（src/scope-audit.js:1067-1151）；repos[] 信封（:1193-1229，main 首位/仅多仓非预执行）；settled 快照三态语义（回放透传/补采跳 crossRepo/旧快照注记）；主仓补行跳过 e.repo（:1182-1184）
- task-03 ✅：渲染仓标 label+per-repo 汇总+主仓笼统计数排除跨仓行；getFileDiff 跨仓路由先于主仓 patch 捷径；verify-postcheck 传参贯通+锚点档动态；gates 标签；帮助文案——主仓 6 份产物 byte-identical 实证
- task-04 ✅：test/scope-audit-cross-repo.test.mjs 12 用例全绿；test/scope-audit.test.mjs 41/41（改进点 2 断言升级：degraded ⊘ 兼容+可达仓真实三态新断言——非凑绿，断言目标即「跨仓不恒 untouched」本意）
- task-05 ✅：core-engine.md 同步（内核条目补录/对外接口扩写）；design.md 按实现终态回写 8 处（单一真相）；doc-ref-check 88 引用过+module-changelog 9/9

完成率 5/5。

## 设计一致性 [层：人工判断]

一致（零偏差）。核对点：锚点四级口径/锚点判序（rev-list 语义按 git 真实语义实现并反序夹具实证——task 卡注释笔误被实现纠正）/repos[] 字段逐字段与 design 接口定义一致（execute stage review 8/8 pass 复核）/单仓逐字节等价（键集+JSON 文本双断言）/预执行视图不调内核/degraded 三类合并判据（G4）/行数不进内核（G3）/verify 传参贯通（G2）/settled 补采跳 crossRepo 行（G1）。design.md 已在 task-05 按实现回写（8 处微调：B 档行数 null 降级语义/main label 形态/null 行数不计合计等）——契约文档与实现单一真相。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/run/gates.js:87` // 防骨架直接过门（2026-08-21 agent-手工产出审计项⑤）：CLI 会代生成逐 task TODO 骨架
- ⚠️ `src/run/gates.js:92` // 捕获 token 排除冒号/逗号：骨架行格式「- task-01: <!--TODO-->」，\S+ 会连冒号一起捕获导致永不命中
- ⚠️ `src/run/gates.js:95` for (const m of report.matchAll(/^[-*][ \t]*([^\s:：,，]+)[^\n]*<!--TODO-->/gm)) {
- ⚠️ `src/run/gates.js:100` errors.push(`${id} 的结论仍是骨架 <!--TODO--> 占位——替换为真实结论（无签名级变更也显式写「无」）`)
- ⚠️ `src/run/gates.js:106` * 生成 symbol-impact.md 逐 task TODO 骨架（2026-08-21 审计项⑤「报错即生成」）。
- ⚠️ `src/run/gates.js:109` * 骨架从 tasks.md 注册表生成逐 task 占位行，agent 只需逐行填结论；占位 <!--TODO-->
- ⚠️ `src/run/gates.js:130` '> 逐行把 `<!--TODO-->` 替换为真实结论：涉及签名级变更（构造函数参数/接口/DTO/方法签名增删改）',
- ⚠️ `src/run/gates.js:132` '> **gate 拒绝仍含 <!--TODO--> 的行**——骨架不能直接过门。',
- ⚠️ `src/run/gates.js:135` for (const id of taskIds) lines.push(`- ${id}: <!--TODO-->`)
- ⚠️ `src/run/gates.js:160` // 报错即生成（2026-08-21 审计项⑤）：报告缺失时自动落一份逐 task TODO 骨架，agent 从
- ⚠️ `src/run/gates.js:161` // 「从零手写整份」变「逐行填结论」；TODO 占位由 validate 拒绝，骨架不能直接过门。
- ⚠️ `src/run/gates.js:168` skeletonNote = `\n   📄 已代生成逐 task 骨架：${reportPath}（逐行替换 <!--TODO--> 为结论，无签名级变更也显式写「无」）`
- ⚠️ `src/index.js:110` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:117` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:1115` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1122` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:1378` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1404` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1759` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1764` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1790` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:1825` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:1828` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:1831` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:1834` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:1837` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:1849` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:1853` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:1854` Given <!--TODO-->
- ⚠️ `src/index.js:1855` When <!--TODO-->
- ⚠️ `src/index.js:1856` Then <!--TODO-->
- ⚠️ `src/index.js:1859` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:1881` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3643` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `src/index.js:3999` // 占位行「requirement_ids: [FR-XX] / decision_ids: [D-XXX@vN]」立即改写为 prefillCardIds
- ⚠️ `src/index.js:4016` .replace('decision_ids: [D-XXX@vN]', () => tcIdLine('decision_ids', tcPrefillIds.decisionIds));
- ℹ️ 语义复核（agent）：命中全为**骨架生成器字符串字面量**（gates.js/index.js 的 `<!--TODO-->` 骨架模板代码与 fourpiece-init 模板行），非未实现标记——本变更 diff 未触碰这些行（gates.js 改动仅 printCrossRepoReconcile ~10 行，index.js 仅 2 处帮助文案）。属探针 1 已知误报面，非阻断。

#### 探针 2：设计关键词覆盖
能力关键词逐个 grep 全命中：collectRepoActual（cross-repo-reconcile.js+scope-audit.js）、reviews-range/head~1-window/head-uncommitted-window（两文件同）、degradedReason（6 文件）、crossRepo（16 文件）、pathMatches（scope-audit.js 等 10 文件）。⚠️ 可能未实现：无。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs …）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src、src/run）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-04: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ⚠️ task-05: 模块目录（.sillyspec/docs/sillyspec/modules、.sillyspec/changes/2026-09-20-scope-audit-cross-repo）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️
- ℹ️ 语义复核（agent）：task-05 纯文档 non-testable（doc-ref-check.test.mjs 88 引用全过+module-changelog 9/9 承接文档校验面）；集成盲区——本变更是 CLI 只读命令无路由/跨进程装配面，CLI 三出口（--json/文本表/--file）与快照落盘集成面由 `test/scope-audit-cross-repo.test.mjs` e2e（真 CLI 子进程+真快照回放）覆盖；断言有效性抽查——①双仓 e2e 断言真实行数/锚点 label 逐字/键序 deepEqual（非空断言）②单仓等价三重断言（键集+JSON 文本+剥锚全等，覆盖兼容边界）③degraded 三类边界+锚点四级全枚举（异常分支全覆盖）④走公开 API 测行为非实现细节——达标。

#### 探针 7：验收×测试覆盖矩阵
**task-02**（预填 uncovered 系归属误判——task-02 的 src 面（src/scope-audit.js）由 task-04 卡的 `test/scope-audit-cross-repo.test.mjs` 承接，probe7-provider-tests-in-consumer-card 口径）：
| acceptance 条目 | 归属测试文件 | 判定 | 证据 |
|---|---|---|---|
| 多仓变更跨仓行真实 verdict+crossRepo，无恒 untouched | test/scope-audit-cross-repo.test.mjs | covered | `test/scope-audit-cross-repo.test.mjs`（全链三态用例+双仓 e2e） |
| repos[] 形状+单仓零新增字段 | test/scope-audit-cross-repo.test.mjs | covered | `test/scope-audit-cross-repo.test.mjs`（信封逐字段+键序断言+单仓三重等价断言） |
| settled 回放透传/补采跳行/旧快照 ⊘ | test/scope-audit-cross-repo.test.mjs | covered | `test/scope-audit-cross-repo.test.mjs`（快照三用例：新透传/旧注记/G1 补采） |

**task-03**（同上，consumer-card 承接）：
| acceptance 条目 | 归属测试文件 | 判定 | 证据 |
|---|---|---|---|
| 文本表仓标 label+per-repo 汇总+degraded ⊘ | test/scope-audit-cross-repo.test.mjs | covered | `test/scope-audit-cross-repo.test.mjs`（渲染断言「✓ 计划内 [key]」「跨仓 crossA：锚点」）+test/scope-audit.test.mjs（degraded ⊘ 兼容） |
| --file 跨仓仓路由+主仓零变化 | test/scope-audit-cross-repo.test.mjs | covered | `test/scope-audit-cross-repo.test.mjs`（root=跨仓根/baseRef=区间/diff 内容断言+主仓行零变化） |
| verify notes 动态/gates 标签/帮助文案 | — | non-testable | 渲染文案与传参（行为由 cross-repo-verify 12/12 邻域回归+人工走查承接，无独立断言面） |

**task-05**：core-engine/design 一致性 | — | non-testable | doc-ref-check.test.mjs 88 引用全过+module-changelog 9/9（文档校验面） |

- ⚠️ 清零说明：预填 7 条 uncovered 中 6 条改写如上（consumer-card 承接）；余 1 条（task-05 首行）non-testable（文档一致性无自动化断言，走查已做）。

#### 探针 4：决策追踪覆盖
D-001@v1（共享内核+锚点分级）→ FR-01/02/03/07 → task-01（内核）/task-02（集成）→ 证据：src/cross-repo-reconcile.js:200、src/scope-audit.js:1090、test/scope-audit-cross-repo.test.mjs 锚点四态用例——闭环 ✅。
D-002@v1（快照产物：json 自动继承/patch 主仓单仓/跨仓载体=锡点）→ FR-05/06 → task-02（settled 三态语义）/task-03（--file 跨仓区间 diff）→ 证据：src/scope-audit.js 快照回放段+getFileDiff 跨仓路由段、test/scope-audit-cross-repo.test.mjs 快照三用例——闭环 ✅。
无 stale 引用（无 superseded 决策）。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4] + artifact 0), 0 frontend calls [scope: change-diff (14 files @ scan-root)] | 3 backend endpoints unused by frontend
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx
- ℹ️ 语义复核（agent）：「3 backend endpoints unused」为误报——命中的 GET /api/path 等来自 CLI 帮助文案/注释中的**示例路径文本**（endpoints 提取器把 diff 内文档示例误认为端点）；本变更是 Node CLI，无 HTTP 端点面。非阻断。

#### 探针 6：代码删除对账
- ✅ 无整文件删除；本变更纯增量+修改。无 FAIL blocker。

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件）
#### 探针 10：预填注清零（error 门）
- ✅ 预填注清零（6 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
- 无接口面（CLI 命令输出契约非 HTTP 端点）——--json 契约 v2 的验证由 test/scope-audit-cross-repo.test.mjs 的信封/行级断言承接（探针 7 已覆盖），无需端点矩阵。

## 测试结果 [层：确定性检查——CLI 实测对账]
- 全量 `npm test`（主仓根，本变更 apply 后）：**EXIT=0**（554 文件，含新增 test/scope-audit-cross-repo.test.mjs；worktree 期 13 挂实证为 worktree-cwd 守卫设计行为，主仓根全绿）
- 专项：node --test test/scope-audit-cross-repo.test.mjs 12/12；node --test test/scope-audit.test.mjs 41/41
- lint：npm run lint 绿（706 文件）
- 邻域回归：cross-repo-verify 12/12、cross-repo-probe7-anchor、cross-repo-apply 8/8、worktree-dual-truth-gates 12/12、plan-target-files、ir-strict-mode 等（execute 期逐 task 跑）
- known_failures 豁免：无

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-07 | task-01、task-02、task-04 | src/cross-repo-reconcile.js:200（内核四级锚点）/src/scope-audit.js:1090（分组调用）/test/scope-audit-cross-repo.test.mjs（锚点四态+信封+单仓等价用例） | 闭环 |
| D-002@v1 | FR-04、FR-05、FR-06 | task-02、task-03、task-04、task-05 | src/scope-audit.js（settled 回放透传+补采跳行+旧快照注记）/getFileDiff 跨仓区间路由/design.md 契约节（task-05 按实现回写） | 闭环 |

（机械预填行中 D-001 映射 task-05/D-002 映射全 FR 系 task 卡 frontmatter requirement_ids 并集口径，语义收敛如上两行——FR-04（预执行/降级形态）由 task-02 承接、FR-05（文本表/--file）由 task-03 承接，矩阵已复核无未闭环行。）

## 技术债务 [层：人工判断]
- 探针 1 命中（gates.js/index.js 骨架生成器 TODO 字面量）：存量机制代码，非本变更引入，不新增债务。
- 既有债务核对：本变更未触碰 scan CONCERNS 红区（改动面=core-engine 对账族+渲染文案）。
- 遗留（设计内）：平台侧消费方在外仓（见移交项）；A 档多 task 行数锚为最早 base 开放区间（design R-02 已登记——与主仓行数同语义，anchorLabel 注明）。

## 变更风险等级 [层：人工判断]
contract-required——--json 契约是平台消费方的对接依据（第一交付物），契约字段已逐字段测试锁定（信封逐字段+键序+单仓逐字节等价三重断言）+ execute stage review 独立复核契约一致性。非 integration-critical（纯 CLI 只读命令，无部署/守护面）。

## Runtime Evidence [层：人工判断]
- 真 CLI 冒烟（dogfood 本变更自身，2026-09-20）：`node src/index.js scope-audit --change 2026-09-20-scope-audit-cross-repo --json` → ok:true、单仓变更零 repos 键（additive 契约实证）、9 行真实三态（8 planned+1 unplanned[meta.json worktree 机制文件]）、totals +1309/-93。
- e2e 真子进程面：test/scope-audit-cross-repo.test.mjs 双仓夹具经 CLI 三出口（表格/--json/--file）全通（execute 期 task-03 冒烟）。
- 不涉及：服务启动/守护进程/端点请求（CLI 工具无此类面）。

## 代码审查 [层：人工判断]
- 走查结论（探针 7 ⚠️ 定向面全部经测试承接，见探针 7 改写）：
  ① 编辑/更新链路：settled 快照回放（旧→新兼容三分支）+ 补采跳行——快照三用例覆盖，无残留态。
  ② 非主分支流：预执行/B/C 档/degraded 四分支各有专测；--file 跨仓四分支（A/B/C/旧快照）覆盖。
  ③ 守卫一致性：不涉及权限面；锚点判序经反序夹具实证。
  ④ 载荷字段契约：探针 8 不适用；--json 字段由信封断言锁定。
  ⑤ 并发/原子性：纯读命令无写面；多仓 git 调用 30s timeout 与既有口径一致。
- 三次独立审查链（brainstorm S2 design review 4 gap 全修→plan S2 review 8/8→execute S2 acceptance review 8/8）+ 主代理逐 task diff 复核，未发现 P1/P2。总体评价：实现与契约逐字段一致，边界（degraded 三类/预执行/旧快照）全枚举覆盖，主仓行为零扰动有逐字节实证。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
execute 阶段 S2 独立验收评审（agent-tool 通道，stage-reviews/execute-review-2026-09-20-181049）8/8 pass 零 blocker——结论已并入上文各节，无新增缺陷。
