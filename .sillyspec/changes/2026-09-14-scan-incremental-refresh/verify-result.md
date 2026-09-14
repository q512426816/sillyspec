# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES（全量 468 文件 0 失败 + lint 0 + docs check 过 + QA 独立验收双 pass；两条 notes：执行期 interface-map 登记偏差经独立裁决改落 file-lifecycle；index.js 行号漂移重锚 1 处）

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
- task-01: satisfied | verifiedFiles: src/scan-diff.js, test/scan-diff.test.mjs
- task-02: satisfied | verifiedFiles: src/scan-staleness.js, test/scan-staleness.test.mjs
- task-03: satisfied | verifiedFiles: src/scan-postcheck.js, test/scan-refresh.test.mjs
- task-04: satisfied | verifiedFiles: src/hooks/worktree-guard.js, test/worktree-guard.test.mjs
- task-05: satisfied | verifiedFiles: src/scan-refresh.js, test/scan-refresh.test.mjs
- task-06: satisfied | verifiedFiles: src/scan-refresh.js, src/index.js, test/scan-refresh.test.mjs
- task-07: satisfied | verifiedFiles: test/scan-refresh.test.mjs
- task-08: satisfied | verifiedFiles: docs/sillyspec/file-lifecycle.md

## 集成验证回执 [层：自述声明——CLI 一致性校验]
无（risk_level=unit-sufficient 显式声明，无长驻进程/端点/集成链路；CLI 旁路命令的「集成」= 临时 git 仓 e2e，已由 test/scan-refresh.test.mjs 16 用例覆盖）

## 任务完成度 [层：人工判断]
8/8 全完成（tasks.md 全勾，CLI 注入核对）：
- task-01 ✅ scan-diff 聚合落后最多 + collectStaleRefs/parseNameStatus 导出（commit 77ff9f0；18/18 用例含 2 新增异基线）
- task-02 ✅ scan-staleness 全文档聚合（6d16b2e；12/12 含 3 新增）
- task-03 ✅ bumpScanDocBaselines + 测试首版（631ce06；5 用例）
- task-04 ✅ guard 白名单握手 + 7/40 归一化（e5fcde7；存量占位串适配按 R-03 语义变更路径，断言意图逐字保留）
- task-05 ✅ computeRefreshPlan 计算层（a429977；8 用例——开发期抓出并修复 porcelain 解析/.runtime ENOENT/杂项 md 误拦三真 bug）
- task-06 ✅ IO 面 + index.js 接线（9e97b3e + 775ecfa + 3cf4293 两补丁：QA gap 修复 facts 重跑/审计声明字段/async 化）
- task-07 ✅ 全链路 e2e（82f2bd5；闭环/新基线起算/hook 直调/写面限界——抓出 fresh 判定 7/40 粒度 bug）
- task-08 ✅ file-lifecycle 双行登记（c9a5fe3）

## 设计一致性 [层：人工判断]
与 design.md 一致，两处已裁决偏差 + 一处清单补行：
1. platform-interface-map.md 未登记（design 清单原列）——QA 独立核实该文档头注释严格限定「SillyHub 平台接口触发点」，refresh 零平台交互，登记即越范围；scan diff 先例同样只登记 file-lifecycle。偏差成立，契约之家口径一致。
2. module-map.yaml +1 行（scan-refresh.js 登记 core-engine paths）——lint module-map 覆盖检查驱动，已在 design §6 补行（task-06 执行期补录）。
3. index.js 行号漂移重锚 1 处（platform-interface-map.md `index.js:3175→3216`，apply 后 +37 行致锚漂——本仓既有维护模式）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/index.js:102` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:108` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:1027` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1034` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:1278` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1304` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1657` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1662` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1688` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:1723` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:1726` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:1729` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:1732` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:1735` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:1747` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:1751` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:1752` Given <!--TODO-->
- ⚠️ `src/index.js:1753` When <!--TODO-->
- ⚠️ `src/index.js:1754` Then <!--TODO-->
- ⚠️ `src/index.js:1757` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:1778` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3277` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `docs/sillyspec/file-lifecycle.md:293` - `executePlanPostcheck`（noAI，execute 前最后关口）顺序跑确定性校验：`validateBlueprintConsistency`（task 结构/路径冲突/拓扑无环）、`validatePlanFeasibility`（TaskCard 字段齐全/依赖存在/id 连续；2026-0

#### 探针 2：设计关键词覆盖
逐关键词核验：`scan refresh` 两拍→index.js:2549+scan-refresh.js ✅；`refreshDocs`/`docHashes` 握手→computeRefreshPlan+worktree-guard 前置分支 ✅；`slice(0, 7)` 归一化→check-1 ✅；`rev-list --count` 落后最多→readSourceCommit+computeScanStaleness ✅；`bumpScanDocBaselines`→scan-postcheck 导出+finalizeRefresh 消费 ✅；`writeAtomicSync` 原子写 ✅；`resolveRuntimeRoot` 审计定根 ✅；检出极限三处声明+实现 grep 无「与源码一致」正向断言（FR-6）✅

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-02: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-03: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-04: 模块目录（src/hooks、test）找到 10 个测试文件（test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs、test/align-execute-review-gate.test.mjs、test/apply-archive-docs-fallback.test.mjs …）
- ✅ task-05: 模块目录（src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-06: 模块目录（NEW:src、src、NEW:test）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-07: 模块目录（test）找到 10 个测试文件（test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs、test/align-execute-review-gate.test.mjs、test/apply-archive-docs-fallback.test.mjs …）
- ✅ task-08: 模块目录（docs/sillyspec）找到 1 个测试文件（docs/sillyspec/scan/TESTING.md）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 4：决策追踪覆盖
9/9 决策闭环：D-001@v1→FR-1→task-05/07（写面限界 e2e 断言）；D-002@v1→FR-2/3→task-03/05/06（两拍命令面）；D-003@v2→FR-4/7→task-01/02/04（三消费方+异基线用例）；D-004@v1→FR-5→task-05/07（dirty fail-closed）；D-005@v1→FR-5→task-05/07（三硬一软）；D-006@v1→FR-6→task-06/08（三处声明+审计字段）；D-007@v1→FR-3/7→task-04/05/07（白名单+归一化用例）；D-008@v1→FR-5→task-05/07（scope 三口径）；D-009@v1→FR-3/4/5→task-01/05/06/07（拓扑聚合键+比对门）。全部 accepted 无 unresolved。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3] + artifact 0), 0 frontend calls [scope: change-diff (29 files @ scan-root)] | 2 backend endpoints unused by frontend
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果 [层：确定性检查——CLI 实测对账]
- `npm test`（主仓，apply 后）：**468 文件 0 失败**（耗时 102s；本变更新增 test/scan-refresh.test.mjs 16 用例 + 三存量文件新增 10 用例）
- `npm run lint`：0 告警（599 文件：未引用导出 0 + module-map 覆盖全 + test 内容规则过）
- docs check（doc-ref-check）：重锚 1 处后全过（467→468 含本变更测试文件）
- known_failures：无豁免项
- 环境性说明（不属失败）：execute 期 worktree 内 13 项 spawn 类 CLI 集成用例因「cwd 在隔离 worktree」守卫拒绝——stash 基线对照实证与改动无关，apply 回主仓后全量即绿

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-1 | task-05, task-07 | computeRefreshPlan 写面代码审查 + e2e 断言 knowledge/ 零写入（test/scan-refresh.test.mjs 闭环用例） | 已闭环 |
| D-002@v1 | FR-2, FR-3 | task-03, task-05, task-06 | 两拍命令 index.js:2549 接线 + runRefresh/finalizeRefresh + bump 函数 | 已闭环 |
| D-003@v2 | FR-4, FR-7 | task-01, task-02, task-04 | 三消费方改动（readSourceCommit/computeScanStaleness 落后最多 + guard 握手）+ 异基线用例 ×2 文件 | 已闭环 |
| D-004@v1 | FR-5 | task-05, task-07 | dirtyCheck fail-closed（porcelain 稳健解析）+ dirty 用例 ×2（scope 非空/空回退） | 已闭环 |
| D-005@v1 | FR-5 | task-05, task-07 | 三硬门 + 软门 force 可越，门控用例 4+1 | 已闭环 |
| D-006@v1 | FR-6 | task-06, task-08 | help 三行/工单尾行/--done 尾行 + 审计 detectionLimit 字段；grep 无「一致」断言 | 已闭环 |
| D-007@v1 | FR-3, FR-7 | task-04, task-05, task-07 | guard 前置分支 + slice(0,7) 归一化 + 白名单/混合位用例 + e2e hook 直调 | 已闭环 |
| D-008@v1 | FR-5 | task-05, task-07 | scope 三口径实现（dirtyCheck 双路/受影响集全量变更集/软门 scope 过滤计数）+ 对应用例 | 已闭环 |
| D-009@v1 | FR-3, FR-4, FR-5 | task-01, task-05, task-06, task-07 | 聚合键=rev-list 计数最大（拓扑）+ 内容比对门用例 + finalize specDir 转换 | 已闭环 |

## 技术债务 [层：人工判断]
探针 1 的 21 处命中全部为 CLI 骨架模板字面量（历史设计如此——模板字符串里的 TODO 是产品功能不是债）。本次变更零新增 TODO/FIXME/HACK。遗留观察项（非债）：worktree 内全量测试的 13 项环境性失败是既有守卫与测试基建的交互面，可另行立项（不在本变更范围）。

## 变更风险等级 [层：人工判断]
显式声明 = unit-sufficient（design.md frontmatter）。理由：纯 CLI 旁路命令 + hook 加法分支 + 盖章函数，全部行为由单元测试 + 临时 git 仓 e2e 覆盖（46+ 用例），无长驻进程/跨进程协议/部署面。关键词判级 integration-critical 属误伤（「生命周期/claim/state transition」等词出现在豁免短语与检测极限声明文字中），已按 change-risk-profile.js:130 显式声明条款覆盖——非静默降级，声明可审计。

## Runtime Evidence [层：人工判断]
- 不涉及（unit-sufficient）：无服务进程/端点/长驻组件。关键命令证据：`npm test` 主仓 468/0（2026-09-14，apply 后）；`npm run lint` 0 告警；`node --test test/scan-refresh.test.mjs` 16/16；worktree 分支 10 commit（77ff9f0…3cf4293）+ 主仓 apply 暂存（apply-pathspec 清单 16 文件）。

## 代码审查 [层：人工判断]
execute 步骤 11 已完成汇总审查（风格对齐先例/4 真 bug 全修复带回归/错误处理 fail-soft·fail-closed 分层落位/单源复用零拷贝/架构合规旁路不侵主流程）+ QA 独立验收 pass/pass（A-K 11 项 file:line 证据）。遗留问题清单：空（两 minor gap 已修：facts 重跑 + 审计声明字段）。
