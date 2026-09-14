# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——四任务兑现、QA acceptance 13 项零阻断、CLI 隔离实测全绿；五观察项+一死码缺陷回报记技术债务节。

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- 无（四任务全双 pass，无 cannot_verify）。

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
- 无（risk_level=unit-sufficient 显式声明——owner_session 为 DB 列非 lifecycle 事件，关键词误伤已豁免，见「变更风险等级」节）。

## 任务完成度 [层：人工判断]
- task-01 完成（v6 迁移幂等/owner API 三守卫/投影扩列/config 键——冒烟 12/12）
- task-02 完成（三级标识+五分支+三接线+flag+启动 claim+sync 忽略键——四态冒烟逻辑 16+CLI 级）
- task-03 完成（归档门两道+放行过滤两路径+归因四路分流——自测 44 项+allowlist 翻转转绿）
- task-04 完成（15 用例七组+六卡+AGENTS.md 铁律）
完成率 4/4（100%）。

## 设计一致性 [层：人工判断]
一致，透传层两文件（run/command.js+run/complete.js）物理必经已补登卡与清单；清单外 4 文件（sync.js IGNORE_KEYS/连带断言/meta.json）QA 核认有据；O2 夹带段主仓已提交同内容幂等零实害。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/index.js:105` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:111` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:1030` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1037` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:1281` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1307` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1662` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1667` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1693` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:1728` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:1731` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:1734` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:1737` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:1740` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:1752` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:1756` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:1757` Given <!--TODO-->
- ⚠️ `src/index.js:1758` When <!--TODO-->
- ⚠️ `src/index.js:1759` Then <!--TODO-->
- ⚠️ `src/index.js:1762` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:1783` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3327` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ℹ️ 1 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（test、src、src/progress、.sillyspec）找到 28 个测试文件（test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs、test/align-execute-review-gate.test.mjs、test/apply-archive-docs-fallback.test.mjs …）
- ✅ task-02: 模块目录（src、src/progress、src/run）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src/run、src、test）找到 13 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs …）
- ✅ task-04: 模块目录（test、.sillyspec/docs/sillyspec/modules）找到 10 个测试文件（test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs、test/align-execute-review-gate.test.mjs、test/apply-archive-docs-fallback.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 2 backend endpoints (live [scan-root 3 + worktree 3] + artifact 0), 0 frontend calls [scope: change-diff (25 files @ worktree)] | 2 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果 [层：确定性检查——CLI 实测对账]
- CLI 实测（隔离快照）：module[cli-core,run-gates] 退出码 0（12.9s）；npm run lint 退出码 0（50.9s，604 文件）。
- worktree 全量：456 过/14-15 失败全部环境性基线（stash/baseline 对照归因，两轮独立定性一致）；本变更面（change-ownership-guards 15/15+platform-sync 系+worktree-apply 系）零回归；doc-ref-check 12 失效=代码增量行号漂移（收尾 docs check --fix，b4f9f04 先例）。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03 | task-02、task-03 | 五接线点逐一核源码（四点锁内+quick 链软跳）；四态 CLI 级实证 | 闭环 |
| D-002@v1 | FR-02、FR-03 | task-03 | 归档门 checkOnly 阻断+record 留痕（15 用例⑦组）| 闭环 |
| D-003@v1 | FR-02、FR-03 | task-03 | admission 增量归零代码实证+reviewOverdeclaredFiles 嫌疑报告 | 闭环 |
| D-004@v1 | FR-02、FR-03 | task-03 | 归因四路分流+空集注记绝不回退主仓窗口（⑥组两形态）| 闭环 |
| D-005@v1 | FR-01 | task-01 | v6 四处同步+投影扩列+sync IGNORE（迁移组用例）| 闭环 |

## 技术债务 [层：人工判断]
本变更零新增 TODO/FIXME（探针 1 命中 22 处均为 src/index.js 既有 usage 文案）。非阻断观察五项（QA O1-O5）：quick 链所有权不在锁内（既有无锁结构+软跳语义，D-001 局部张力——拒绝=跳过不炸，风险可接受）/runtime.md 未提交夹带段幂等/AGENTS.md 待 apply 时序/归档探测门 fail-open 有意权衡/allow 空面跳过相交判定（文档化语义）。另 task-review.js 无 ctx 且 meta 缺失时分支锚定为死码（生产两调用点均传 ctx 影响低——遗留低优先级修复）。

## 变更风险等级 [层：人工判断]
unit-sufficient——design frontmatter risk_level 显式声明（覆盖关键词误伤：owner_session 的 session 字面命中 integration-critical 判级）；纯 CLI/DB 逻辑无跨进程/状态机/部署面。无否定语境抑制项。

## Runtime Evidence [层：人工判断]
不涉及（非 integration/deployment-critical）。运行证据=15 用例真 git 临时仓集成（CLI 级 spawn 三接线含 assess 旁路零落盘反证）。

## 代码审查 [层：人工判断]
四层审查：task review×4 双 pass；execute QA acceptance 13 项零阻断；plan 审查 3 阻断处置；design Grill 两轮（6 阻断消解+4 残留修复）。质量抽查：锁内判定（四点核源码）/assess 软跳/claim 守卫不覆盖他人/迁移幂等均实证。总体：四护栏齐备，§65 两事件对应防线全部闭合。
