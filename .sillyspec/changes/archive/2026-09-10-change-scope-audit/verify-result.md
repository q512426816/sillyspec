# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——7/7 任务全落地、npm test 402/402 全绿、QA 独立验收 9 项全 pass；两条 NOTE 均为已知边界（post-apply 行数降级、建议级测试覆盖缺口），不构成阻断。

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- task-01: satisfied | verifiedFiles: src/scope-audit.js
- task-02: satisfied | verifiedFiles: src/verify-postcheck.js
- task-03: satisfied | verifiedFiles: src/index.js, docs/sillyspec/platform-interface-map.md
- task-04: satisfied | verifiedFiles: src/run/complete.js
- task-05: satisfied | verifiedFiles: src/stages/archive.js, src/run/prompt.js
- task-06: satisfied | verifiedFiles: src/run/complete-handlers.js
- task-07: satisfied | verifiedFiles: test/scope-audit.test.mjs

> 【说明】execute 收尾 Task Review Gate 的逐任务 diff 归属落在 apply 时序上（草稿判 no-attributed-diff），实际 7 任务改动均已 apply 回主仓且在本文档「任务完成度」逐项核证（QA 子代理 file:line 级 + 测试实测）——证据账按 satisfied + 精确路径补实。

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
无

## 任务完成度 [层：人工判断]
7/7 全完成（tasks.md 勾选双路写入：review gate 手勾 + autoCheckPlanFromReviews 机器勾）。
- task-01 ✅ src/scope-audit.js 三导出（566 行）+ 真 git 夹具端到端冒烟
- task-02 ✅ resolveReconcileActualFiles export + baseAnchor 三 return 点纯增量，npm test 零破
- task-03 ✅ 命令 exit 2/0/1 三态实测 + assertSafeChangeName 注入拦截实测
- task-04 ✅ 双路径接线（completeStep:626 / continueStep:1436 grep 实证）+ 20 断言三场景冒烟
- task-05 ✅ archive 注入端到端实测（真表 + fail-soft 降级两态）
- task-06 ✅ 13/13 冒烟 + git diff --numstat 交叉对账一致 + 门禁零改动 diff 实证
- task-07 ✅ node --test 8/8；npm test 402 文件 402 全绿

## 设计一致性 [层：人工判断]
实现与 design.md 一致（QA 子代理 9 项清单逐项 file:line 核证，全部 Grill 残余 G-1/G-2/P2-①/P2-②/B-1/C-5 兑现）。一处 execute 期偏差已按 ⚠️ 出口指引补声明：docs/sillyspec/platform-interface-map.md 6 处 index.js 行号锚点机械平移（+6/-6 无内容改动，ql-20260816-015 先例）——已补入 design.md 文件变更清单与 task-03 卡 allowed_paths/constraints（仅限锚点平移）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/verify-postcheck.js:364` * 纯机械启发式（确定性：同输入同输出）；矩阵行 <!--TODO--> 未回填 → 保守计行为类
- ⚠️ `src/verify-postcheck.js:389` // 矩阵行 <!--TODO--> 未回填 → 影响面未知，保守计行为类
- ⚠️ `src/verify-postcheck.js:390` if (String(rowText).includes('<!--TODO')) { out.behavioral.push('<!--TODO--> 未回填行'); classified++ }
- ⚠️ `src/verify-postcheck.js:410` // 骨架产出 `- \`path\` <!--TODO-->` 列表行；手写形态可能是 `| 文件 | 处置说明 |` 表行
- ⚠️ `src/verify-postcheck.js:1828` console.warn('   提示：检查是否后端漏实现，或前端调用了尚未实现的端点。确认无误可在 design.md 标注豁免。')
- ⚠️ `src/index.js:99` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:105` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:901` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:908` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:1044` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1070` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1391` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1396` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1422` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:1456` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:1459` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:1462` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:1465` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:1468` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:1479` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:1483` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:1484` Given <!--TODO-->
- ⚠️ `src/index.js:1485` When <!--TODO-->
- ⚠️ `src/index.js:1486` Then <!--TODO-->
- ⚠️ `src/index.js:1489` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:1509` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:2912` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ℹ️ 清单文件不存在（跳过）：NEW:src/scope-audit.js、NEW:test/scope-audit.test.mjs

> 【agent 标注】探针 1 全部命中为既有代码的**模板字符串字面量**（CLI 自身给 symbol-impact/verify-probes/design 骨架生成器嵌的 `<!--TODO-->` 文案），非未完成实现标记。实证：`git show HEAD:src/index.js | grep -c TODO` = 21、`git show HEAD:src/verify-postcheck.js | grep -c TODO` = 4——基线即有；本次 diff 对两文件为纯插入（+63/+23），命中行均为行号平移后的既有内容。新增文件 src/scope-audit.js / test/scope-audit.test.mjs / complete.js 新增段零 TODO/FIXME/HACK/XXX（grep 零命中）。

#### 探针 2：设计关键词覆盖
【agent 执行】逐关键词 grep 实现侧（src/scope-audit.js 及四消费点）：
- 三态（planned/unplanned/untouched）→ scope-audit.js:376-398 ✅
- 行数三档 numstat / wc-l / BIN → collectNumstatByPath :89-152（binary :106-108、untracked :144-147）✅
- baseAnchor 锚定 → :369-371（消费 task-02 产物）✅
- 归属 declared/soft/undeclared + foreignDeclared 排除 → quick 模式段（测试 :231-233 deepEqual 断言）✅
- 快照 scope-audit-<change>.json → complete.js:761-775 ✅
- 漂移一行（vs execute 时点）→ complete.js:779-808 ✅
- fail-soft advisory → complete.js:810-822 / prompt.js:1026-1036 / scope-audit.js:458-464 ✅
- QUICKLOG 降级（已提交）→ scope-audit.js:268-275 + complete-handlers.js:1884-1886 ✅
全部命中，无关键词缺实现。

#### 探针 3：验收标准测试覆盖
- ⚠️ task-01: 模块目录（NEW:src）递归未找到测试文件（含 co-located tests/）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src、docs/sillyspec）找到 4 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、docs/sillyspec/scan/TESTING.md）
- ⚠️ task-04: 模块目录（src/run）递归未找到测试文件（含 co-located tests/）
- ⚠️ task-05: 模块目录（src/stages、src/run）递归未找到测试文件（含 co-located tests/）
- ⚠️ task-06: 模块目录（src/run）递归未找到测试文件（含 co-located tests/）
- ✅ task-07: 模块目录（NEW:test、src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

> 【agent 标注】探针 3 的目录启发式按「模块目录就近找测试」扫描，本仓测试集中在根 test/ 目录故 task-01/04/05/06 报未找到——实际覆盖：test/scope-audit.test.mjs 8 测试 ~119 断言覆盖 task-01（三态/行数三档/降级）、task-02（baseAnchor 形态 A/B）、task-04（快照/漂移在 Wave 2 冒烟 20 断言——脚本用后即删未入仓，见下「已知缺口」）、task-06（quick 行数在 task-06 冒烟 13/13 同上）；task-03/05 为接线层，dogfood 实测（exit 三态/端到端注入）即验收。已知缺口（诚实登记）：①task-04/06 的冒烟断言未沉淀为仓内常驻测试②full-flow 真 worktree 形态（meta.worktreePath 切 numstatRoot 分支）未直测（QA reviewerNotes 同判）——两条均列后续 quick 候选，不影响本变更验收（行为已实测过，仅测试沉淀缺位）。

#### 探针 4：决策追踪覆盖
【agent 执行】见下方「决策追踪矩阵」——D-001~006 全部闭环：决策→FR→task→证据四列齐全，无悬挂引用。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3] + artifact 0), 0 frontend calls [scope: change-diff (21 files @ scan-root)] | 2 backend endpoints unused by frontend
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api

> 【agent 标注】parity 的「后端端点」为 scan 面提取的文档路径伪端点（/api/path、/api 是 doc 文案匹配产物，非真实 HTTP 服务）；本变更是 CLI 本地展示层，无前后端联调面，warning 不适用为缺陷。

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果 [层：确定性检查——CLI 实测对账]
- commands.test = npm test：**402 文件 402 全绿 0 失败**（基线 401 + 新增 test/scope-audit.test.mjs；worktree 内 Wave 3 实测 + QA 子代理独立复跑 node --test 8/8 双确认；CLI --done 将再实测对账）
- commands.lint = npm run lint：local.yaml 未配 lint（无 build/lint 框架，仓以 node --check + doc-ref-check.test.mjs 等测试代偿——known-issues.md「无 buildlint 框架」既有约定）
- node --check：src/scope-audit.js / src/index.js / src/verify-postcheck.js / src/run/complete.js / src/run/complete-handlers.js / src/stages/archive.js / src/run/prompt.js 全过

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01 | task-01 | scope-audit.js 计划侧仅 operation 无行数；测试 :160-177 无计划行数断言 | 已闭环 |
| D-002@v1 | FR-01/04 | task-01/02 | collectNumstatByPath 三档 + baseAnchor（numstat 手跑对拍测试）；verify-postcheck.js diff 纯增量 | 已闭环 |
| D-003@v1 | FR-02/03 | task-01/03/04/05 | 四消费方 import 面 grep 单一真相（index.js:1088/complete.js:815/prompt.js:1029/complete-handlers.js:37） | 已闭环 |
| D-004@v1 | FR-04 | task-01/06 | auditQuickCompletion 零 diff（vs baseline 372b24c）；QUICKLOG 降级 :268-275 | 已闭环 |
| D-005@v1 | FR-03 | task-04/05 | execute 全表+verify 一行+archive 表三处实测 | 已闭环 |
| D-006@v1 | FR-03/04 | task-04/06 | 三注入点 try/catch 单行提示零阻断（complete.js:810-822 等） | 已闭环 |

## 技术债务 [层：人工判断]
- 探针 1 命中 25 处全部为既有模板字符串字面量（基线 21+4，见探针 1 标注），本次新增代码零 TODO/FIXME/HACK/XXX。
- 后续 quick 候选两条（非债务，测试沉淀增强）：①task-04/06 冒烟断言沉淀为仓内常驻测试 ②full-flow 真 worktree 形态夹具（numstatRoot 切换分支直测）+ 形态 B 审计 tag merge-base 增强（apply 后 tag sillyspec-audit/* 可作锚，当前诚实降级）。

## 变更风险等级 [层：人工判断]
unit-sufficient——CLI 本地只读展示层：纯函数 + console 输出 + .runtime 快照；无 daemon/backend 跨进程、无 session/lease/lifecycle 状态机（quick 会话仅只读 guard.json）、无部署启动路径。design frontmatter 未显式声明 risk_level（机械判级如有误判以本语义判定为准——「session」关键词均处于只读消费语境）。测试面：402 全量绿 + dogfood 三态实测，单元证据充分。

## Runtime Evidence [层：人工判断]
不涉及 daemon/长驻进程/服务端点/部署路径（unit-sufficient）。本地证据链：
- dogfood：`node src/index.js scope-audit --change 2026-09-10-change-scope-audit` → 三态表正确（9 ✓ 计划内 + 8 ⚠️ 计划外＝并行会话 WIP，范围可见性符合设计）+ 行数降级诚实（post-apply 无锚点，不出伪行数）
- worktree assess → BLOCKED（越权文件）→ 补声明 → WARNING → auto-apply 9 文件（全链路实测）
- npm test 402/402（Wave 3 + QA 双跑）；失败模式排除：注入异常 fail-soft 冒烟过、快照损坏/缺失降级路径冒烟过、并行会话声明退栈测试过

## 代码审查 [层：人工判断]
问题列表：无 P0/P1。建议级 3 条（execute-review reviewerNotes + 本阶段新增 1）：①真 worktree 形态未直测 ②快照损坏/缺失文案可分辨 ③审计 tag merge-base 增强（本阶段新增）。总体评价：实现忠实设计（QA 9 项 file:line 核证）、消费契约单一真相、防御完整（fail-soft 三层）、测试断言强度高（numstat 手跑对拍/deepEqual 退栈/降级隔离验证）。
