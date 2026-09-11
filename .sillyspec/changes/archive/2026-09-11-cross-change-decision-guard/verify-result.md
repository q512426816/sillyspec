# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——五个 FR 全实现、44 个新测试用例+存量回归+全量 440 文件 0 失败、execute 独立代码审查双 pass、Grill 五项修正逐项实证；NOTES 三条：①D-002@v1 自动归档闸门热修按决策移交后续独立变更（complete-handlers.js 让位并行会话，防护已实战验证有效）②断言检测对「agent 先 commit 再 --done」时序存在 diff 类固有盲区（X-001 口径已知代价，FR-03 进场注入互补覆盖）③本变更源码在 worktree 分支（sillyspec/2026-09-11-cross-change-decision-guard，f4d3ffb..c7304c7 共 7 commits），主仓 apply 在归档链路执行——探针 1 对 NEW: 文件的主仓路径检查显示「不存在（跳过）」属预期（worktree 内全存在，见探针 2 证据）。

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]

无（7/7 task review 均 pass，无 cannot_verify）。

## 集成验证回执 [层：自述声明——CLI 一致性校验]

无（unit-sufficient 级：CLI 内部 advisory 逻辑，无路由/跨进程装配/部署面；冒烟回执见 Runtime Evidence 的 buildSemanticGuardHits+printQuickTestLintGate 链路实证）。

## 任务完成度 [层：人工判断]

7/7 全完成（tasks.md 勾选与 TaskCard acceptance 逐条对照）：
- task-01 ✅ 文件字段契约（936c20c；5 条验收全测：精确行/字节级不变形/反斜杠归一/全角分隔/幂等）
- task-02 ✅ matchDecisionsByFiles（77de2e4；D-905 实库锚点命中验证+reason 不污染反例）
- task-03 ✅ semantic-guard 模块（9794e5f；23 用例真实 git 临时仓）
- task-04 ✅ config-schema 段（d2319a7；防漂耦合断言含 semantic_guard token）
- task-05 ✅ quick step1 注入（6f4bc33；零命中字节一致断言）
- task-06 ✅ --done 断言 WARNING（84218da；早退路径无字段断言+非阻断断言）
- task-07 ✅ 端到端+文档（c7304c7；npm test 440/0+lint 绿+冒烟链路+四 changelog）

## 设计一致性 [层：人工判断]

与 design.md 一致，一处文档措辞对齐（非实现偏差）：requirements FR-04「行号样例」→ design 模块三有意细化为「行内容样例」（-U0 编辑后行号漂移，行内容定位性更强）——requirements 已对齐该措辞（execute 审查 P3 处置）。六模块挂载点、明确不改清单（8 文件零触碰）、Grill 五修正（X-001 git diff HEAD/X-002 锚点独立标签/X-006 双侧归一/X-012 开关双端短路/X-013 parsePorcelainPath）逐项落实并有对应测试。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中
- ℹ️ 清单文件不存在（跳过）：NEW:src/semantic-guard.js、NEW:test/semantic-guard.test.mjs、NEW:test/semantic-guard-prompt-inject.test.mjs、NEW:test/decision-file-field.test.mjs
- ℹ️ 语义复核：NEW: 四文件主仓路径不存在、worktree 全存在（变更源码在 worktree 分支待 apply）——探针按主仓路径扫描故跳过，worktree 内 grep 零 TODO/FIXME 命中（人工复核）

#### 探针 2：设计关键词覆盖
- ✅ 全部能力关键词在 worktree 源码命中（grep 实证，src/ 为变更真实源根）：
  matchDecisionsByFiles→knowledge-match.js+semantic-guard.js；collectRecentForeignDelivery→semantic-guard.js+prompt.js+quick-audit.js；detectAssertionRewrites→semantic-guard.js+quick-audit.js；renderSemanticGuardBlock→semantic-guard.js+prompt.js；readSemanticGuardEnabled→四文件（含 config-schema.js readers 登记）；buildSemanticGuardHits→quick-audit.js；buildQuickSemanticGuardInjection→prompt.js；semantic_guard→config-schema.js+semantic-guard.js；git diff HEAD 口径→semantic-guard.js:90

#### 探针 3：验收标准测试覆盖
- ✅ task-01/02/03/05/06：模块目录测试文件充足（机械预填）+ 三个专项测试文件（decision-file-field 8 用例/semantic-guard 30 用例/prompt-inject 6 用例）
- ✅ task-04：config-schema.test.mjs 覆盖（259/0 含 live 键 example 防漂耦合断言）
- ⚠️ task-07：模块目录（changelog 文档）无测试文件——纯验证+文档 task，本质无代码可测，冒烟链路即其验证证据（合理）
- 集成盲区标注：本变更是 CLI 内部逻辑（prompt 渲染/quick --done gate 内挂载），无路由/跨进程装配面；跨模块链路（semantic-guard→prompt/quick-audit 消费）由 prompt-inject 端到端渲染断言+gate 集成用例（SILLYSPEC_QUICK_GATE_SNAPSHOT_OFF=1 临时仓）覆盖；真实 quick 会话 Live 冒烟未跑（避免污染 .runtime 会话区），渲染层已端到端断言——判 ⚠️ 可接受
- 断言有效性抽查（3 个核心用例）：①「暂存后仍命中」（semantic-guard.test）：真 git 仓 add 后断言 hits 非空——验证真实副作用非空断言 ②「时间窗钉死提交日期」：GIT_AUTHOR_DATE 30 天前+双断言（7 天窗外不记/90 天窗内命中）——边界真测 ③「零命中字节一致」（prompt-inject）：注入前后 promptText 全等——行为级断言。均达标，无恒真/空断言

#### 探针 4：决策追踪覆盖
- ✅ D-001@v1 → FR-01..05 → task-01..06 全闭环（链见决策追踪矩阵）；D-002@v1 → 防护落地（tasks.md 自有未勾选任务行）+ 实战验证（ql-020 于 brainstorm 期间 --done，本变更未被自动归档——竞态窗口实战关闭）+ 闸门热修移交（按决策让位并行会话，复潮条件已记录）
- 无 superseded 决策被下游引用

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3 + worktree 3] + artifact 0), 0 frontend calls [scope: change-diff (15 files @ worktree)] | 2 backend endpoints unused by frontend
- ℹ️ 语义复核：2 个「前端未调用」端点（GET /api/path、GET /api）为 CLI HTTP 面存量端点字符串误报级 warning（本变更无任何 HTTP 端点改动——纯内部函数/渲染/gate 逻辑），不构成 FAIL

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定：无删除类变更，通过

## 测试结果 [层：确定性检查——CLI 实测对账]

- 专项：node --test test/decision-file-field.test.mjs → 8/8；test/semantic-guard.test.mjs → 30/30；test/semantic-guard-prompt-inject.test.mjs → 6/6（合计 44 用例）
- 存量回归：decision-distill-heading-variants 2/2、config-schema 259/0、quick-audit/prompt 既有全绿
- 全量：npm test（worktree 内）→ 440 测试文件 / 827 tests / 0 失败，exit 0（execute 末次 98.4s；verify --done CLI 隔离快照复跑对账）
- lint：npm run lint → 570 文件 0 告警（semantic-guard 补录 _module-map 后）
- known_failures：不涉及（local.yaml 未配置豁免清单）

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04、FR-05 | task-01、task-02、task-03、task-04、task-05、task-06、task-07 | advisory 三层全落地且非阻断实测（hits 不参与 action/failed，测试 :404-406 断言）；commits 936c20c/d2319a7/77de2e4/9794e5f/6f4bc33/84218da/c7304c7；44 用例+冒烟链路 | 闭环 |
| D-002@v1 | （非本变更 FR——排查决策） | task-07 | tasks.md 自有未勾选任务行（防护）；ql-020 于 14:0x --done 实战验证本变更存活；闸门热修移交注记（complete-handlers.js 让位并行会话，复潮条件三条候选信号已记录于 decisions.md） | 闭环（防护生效；热修移交待后续变更） |

## 技术债务 [层：人工判断]

- 探针 1（worktree 侧人工复核）：新增/修改文件零 TODO/FIXME/HACK 命中
- 移交项（非本变更债务）：quick --done 自动归档闸门竞态（quick-done-autoarchive-misfire 缺陷②）修复——等 complete-handlers.js 并行会话落盘后独立变更处理（D-002@v1 复潮条件）
- P4 注记不构成债务行动项：detectAssertionRewrites 输入面无独立封顶（上游 changedFiles 规模实践受限+5s 超时 fail-soft）；commit-后-done 时序盲区（FR-03 互补）

## 变更风险等级 [层：人工判断]

unit-sufficient——纯 CLI 内部逻辑（解析/渲染/只读 git 查询/advisory 输出），无 schema/状态机/权限/跨进程变更，44 用例+真实 git fixture+冒烟链路覆盖判定面。design.md frontmatter 无 risk_level 显式声明。关键词 lifecycle 命中被同句否定语境抑制（「生命周期契约：无（本变更不新增/修改任何 lifecycle 事件…）」）——如实声明：本变更确实零 lifecycle 事件改动，抑制正确，非降级逃逸。

## Runtime Evidence [层：人工判断]

- commits：worktree 分支 sillyspec/2026-09-11-cross-change-decision-guard f4d3ffb..c7304c7（7 commits，逐 task 一提交，精确 pathspec）
- 冒烟链路实证（task-07，临时 git 仓 fixture，跑完即删）：
  - buildSemanticGuardHits 输出 {"hits":[{"file":"test/smoke.test.mjs","deliveredBy":"2026-01-01-fake-other-change","sampleLines":["  expect(foo).toBe(1)"]}]}（暂存后命中——git diff HEAD 口径实证）
  - printQuickTestLintGate 渲染 ⚠️ 段含文件/交付变更名/被改样例行/quicklog --solution 建议（SMOKE OK, EXIT=0）
- 全量测试：440 文件/827 tests/0 失败（worktree，98.4s）；lint 570 文件 0 告警
- 运行时组件：不涉及启动/端点/请求响应/生命周期终态（CLI 内部函数与 prompt 渲染路径）；失败模式排除：git 失败/local.yaml 异常/知识库缺失三条 fail-soft 路径均有用例断言不抛出
- D-002 防护实战证据：ql-020（quick-c802bc83）--done 于本变更 brainstorm 期间执行（QUICKLOG 已勾 [x]），本变更目录与进度库存活——防护在真实多 agent 竞态下生效

## 代码审查 [层：人工判断]

execute 阶段独立代码审查（agent-tool 通道，对照 design+TaskCards 逐 commit）：specVerdict=pass / qualityVerdict=pass，新测试 44/44、存量回归 18/18 抽测、全量 827/0、lint 绿、越权零出现、调用方 complete-handlers 零影响（:1078-1089 只读 action 实测）、D-001@v1 advisory 立场全程一致。
发现与处置：P3 FR-04 措辞不一致→已对齐 requirements（行内容样例）；P4 两条→注记留档（detect 输入面封顶/commit-后-done 盲区）；无 P0-P2 问题，无 Unresolved Blockers。
