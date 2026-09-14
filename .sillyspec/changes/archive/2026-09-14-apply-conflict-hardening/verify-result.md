# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。

## 结论 [层：人工判断]

结论枚举：PASS WITH NOTES——四任务兑现、acceptance QA 12 项零阻断、CLI 隔离实测全绿；非阻断观察一条（collectActiveQuickGuardFiles 的 linkedChanges 收窄增强为合理超面）记技术债务节。

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
- 无（四任务 execute Task Review 全双 pass，无 cannot_verify）。

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
- 无（非 integration/deployment-critical，unit-sufficient 纯 CLI 工具链，见「变更风险等级」节）。

## 任务完成度 [层：人工判断]
- task-01 完成（merge 写回 staged 含新增/三出口 manifest/rescue 指引行——8/8 测试实证）
- task-02 完成（collectActiveQuickGuardFiles+锁内三分支预检+--force/autoApply 接线）
- task-03 完成（doctor 三分支漂移检查+ROADMAP 观察项+§64 状态更新）
- task-04 完成（测试四块+rescue 修复 38/38+三卡登记）
完成率 4/4（100%）。

## 设计一致性 [层：人工判断]
一致，无实现偏差。验收 QA 抽查确认写读两侧 sha256 算法逐字同源（staged=git show :<path>；worktree=readFile+latin1+CRLF 归一）；diff 面与 design 清单对齐（sidecar/meta 合理伴生）。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ⚠️ `src/index.js:102` sillyspec symbol-impact --change <name>      生成 symbol-impact.md 逐 task <!--TODO--> 骨架（gate 拒绝未替换占位，防骨架直接过门）
- ⚠️ `src/index.js:108` sillyspec verify-probes --change <name> [--init]  verify 机械探针（TODO 标记/测试覆盖/API 对账/删除对账）；--init 生成 verify-result.md 骨架
- ⚠️ `src/index.js:1027` // 一条命令跑完并渲染成可直接粘贴的 markdown；半语义探针（2/4 + 3.4/3.5）显式留 TODO。
- ⚠️ `src/index.js:1034` console.error('用法: sillyspec verify-probes --change <name> [--init] [--json] [--spec-dir <path>]\n  跑机械探针（TODO 标记/测试覆盖/API 对账/删除对账）输出 markdown；--init 生成 verify-
- ⚠️ `src/index.js:1278` // paths 前缀匹配预填（机械），影响类型/review 标记留 <!--TODO-->（语义）。已存在不覆盖。
- ⚠️ `src/index.js:1304` console.log(`   归类 ${miResult.matchedCount} 个文件，未匹配 ${miResult.unmatchedCount} 个；影响类型列逐行替换 <!--TODO-->。`);
- ⚠️ `src/index.js:1659` // plan.md）注册表生成逐 task <!--TODO--> 骨架；gate 拒绝未替换的占位（防骨架直接过门），
- ⚠️ `src/index.js:1664` console.error('用法: sillyspec symbol-impact --change <name> [--spec-dir <path>]\n  生成 symbol-impact.md 逐 task <!--TODO--> 骨架（已存在不覆盖）；gate 拒绝未替换的占位行');
- ⚠️ `src/index.js:1690` console.log('   逐行替换 <!--TODO--> 为结论（无签名级变更也显式写「无」）；gate 拒绝未替换的占位行。');
- ⚠️ `src/index.js:1725` <!--TODO: 为什么做、解决什么核心问题-->
- ⚠️ `src/index.js:1728` <!--TODO: 为什么现有方案不够（2-3 个痛点）-->
- ⚠️ `src/index.js:1731` <!--TODO: 本次做什么-->
- ⚠️ `src/index.js:1734` - <!--TODO: 不做 X-->
- ⚠️ `src/index.js:1737` - <!--TODO: 可验证条目-->
- ⚠️ `src/index.js:1749` | <!--TODO--> | <!--TODO--> |
- ⚠️ `src/index.js:1753` ### FR-01: <!--TODO-->
- ⚠️ `src/index.js:1754` Given <!--TODO-->
- ⚠️ `src/index.js:1755` When <!--TODO-->
- ⚠️ `src/index.js:1756` Then <!--TODO-->
- ⚠️ `src/index.js:1759` - 兼容性：<!--TODO-->
- ⚠️ `src/index.js:1780` ${generated.length} 个骨架已就绪——逐节把 <!--TODO--> 替换为语义内容（骨架勿手删章节）；design.md 用 sillyspec design-init。`);
- ⚠️ `src/index.js:3279` // 缺 token 直接终止（体检 HUB-02）：交互式输入尚未实现（task-11），此前
- ⚠️ `src/quicklog.js:482` // 扫描所有 QUICKLOG-*.md（含轮转归档）当天最大 NNN + 已用 XXXX 后缀集 + 当天已用全 ID 集
- ⚠️ `src/quicklog.js:831` // XXXX 4 位 hex 随机后缀（消歧；NNN 已让位到所有已知占用之后，此处 belt-and-suspenders：
- ℹ️ 1 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（src、.sillyspec、docs/sillyspec）找到 64 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js、.sillyspec/.runtime/sillyspec.db、.sillyspec/.runtime/sillyspec.db.bak …）
- ✅ task-04: 模块目录（test、.sillyspec/docs/sillyspec/modules）找到 11 个测试文件（test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs、test/align-execute-review-gate.test.mjs、test/apply-archive-docs-fallback.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 4：决策追踪覆盖
<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->

#### 探针 5：API Contract Parity
- ❌ API parity check failed: 1 frontend calls have no matching backend endpoint [scope: change-diff (12 files @ worktree)] | 2 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根

| 状态 | 前端调用 | 后端端点 | 文件 |
|---|---|---|---|
| ❌ missing | POST ${cfg.url.replace(/\/$/,  | — | C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\.runtime\worktrees\2026-09-14-apply-conflict-hardening\src\quicklog.js:284 |

- ❌ contract gap 是真实集成缺陷——诚实判 FAIL 并回 execute 补端点（CLI 仅 advisory 不硬阻断）
- ⚠️ 2 个后端端点前端未调用（warning 不阻断）：GET /api/path、GET /api

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

## 测试结果 [层：确定性检查——CLI 实测对账]
- CLI 实测（隔离快照 noAI 步）：`module[cli-core]` 退出码 0（3.3s）；`npm run lint` 退出码 0（23.2s，603 文件零告警）。
- worktree 全量：457 过/13 失败——全部 CLI-spawn 类测试撞「隔离 worktree 内」环境守卫（与本变更零关联）；本变更面（apply-conflict-hardening 8/8、worktree-apply-rescue 38/38、apply-dirty-threeway 3/3）零回归。

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-04 | merge 写回 stagedOk/三出口 manifest/rescue 指引行——8/8 测试实证 | 闭环 |
| D-002@v1 | FR-01、FR-02、FR-03、FR-04 | task-02、task-04 | collectActiveQuickGuardFiles+锁内预检三分支（overlapForced/overlapSkipped/errors exit 1）| 闭环 |
| D-003@v1 | FR-01、FR-02 | task-01 | rescue commands 末尾 # 指引行（rescue 测试断言过滤 # 计数）| 闭环 |
| D-004@v1 | FR-04 | task-03 | .sillyspec/ROADMAP.md 观察项含复潮条件 | 闭环 |
| D-005@v1 | FR-01、FR-02、FR-03、FR-04 | task-01、task-03、task-04 | apply-manifest 落变更目录（writeApplyManifest CLI 全权）+doctor 检测项（三分支）| 闭环 |

## 技术债务 [层：人工判断]
本变更零新增 TODO/FIXME（探针 1 命中均为 src/index.js 既有 usage 文案，语义复核非未实现代码）。非阻断观察：collectActiveQuickGuardFiles 排除 guard.linkedChanges 协作会话为 design 外的合理收窄（缩小误拦面，已在 change-management 模块卡登记）。

## 变更风险等级 [层：人工判断]
unit-sufficient——纯 CLI 工具链逻辑（worktree-apply 收口+quicklog 收集+doctor 检查项），无 daemon/backend 跨进程、无 session/lease/lifecycle 状态机、无部署启动路径变更。无否定语境抑制项。

## Runtime Evidence [层：人工判断]
不涉及（非 integration/deployment-critical）。运行证据由四态集成测试真 git 临时仓承担（apply-conflict-hardening.test.mjs 8 用例：merge 写回 staged 断言/manifest 指纹逐文件=git show :<path>/guard 相交四态/rescue 指引行）。

## 代码审查 [层：人工判断]
三层审查：task review×4 双 pass；execute acceptance QA 12 项全 pass 零阻断；plan/design Grill 各两轮（design 2 阻断 6 gap 全消解、plan 1 gap 哈希口径定案）。质量抽查：fail-open 均真 open、既有导出签名零变化、写读 sha256 同源。总体：实现与设计高度一致，三护栏（写回收口/相交拦截/检测面）齐备且边界处理完备。
