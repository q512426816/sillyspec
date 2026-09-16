# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

结论枚举：`PASS WITH NOTES`——三任务双 pass、定向 5/5+5/5、lint 全绿、探针9 对本变更自判不适用（纯 JS 无 .java 面，自指正确）；NOTES=worktree 环境性基线（13 个 index.js:334 守卫族，task review 全量对照证实恰为基线）

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
| env-blocked | worktree 内 13 个 CLI 子进程类测试环境性失败（index.js:334 守卫族，已知基线族） | apply 后主仓 npm test 全量复核 |
| manual-acceptance | 探针9 在真实 Java 变更上的首次实战（本变更为纯 JS，自判不适用） | 下一个含 .java 改动的变更走 verify 时观察「#### 探针 9」输出与 advisory 裁定体验 |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（三 task review 均 pass/pass，无 cannot_verify）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
- claim: 探针9 五用例全绿（worktree 实测）
  command: node --test test/probe9-guard-consistency.test.mjs
  exit: 0
  log: .sillyspec/.runtime/verify-logs/probe9-guard.log
- claim: 既有探针8 契约维度零回归
  command: node --test test/probe8-contract-pivot.test.mjs
  exit: 0
  log: .sillyspec/.runtime/verify-logs/probe8-regress.log
- claim: lint 全绿（三导出引用落地死码消除）
  command: npm run lint
  exit: 0
  log: .sillyspec/.runtime/verify-logs/guard-lint.log

## 任务完成度 [层：人工判断]
| task | 状态 | 依据 |
|---|---|---|
| task-01 探针9 核心 | 完成 | review pass/pass；三导出+fail-soft+渲染+metrics（主代理 EHS 冒烟精确命中） |
| task-02 一致性接线 | 完成 | review pass/pass；锚点正则+WARNING 对账+facts 双指标 |
| task-03 五用例 | 完成 | review pass/pass；5/5 全绿（回执日志 1） |

## 设计一致性 [层：人工判断]
一致，两处已记录的实现细节偏离（task-02 review 留痕）：
1. 降级判别以 notes 含「探针 9 执行失败」替代 probe8 的缺键判别（probe9 兜底对象恒为数组，语义等价）
2. facts 对账取 inconsistentGroups+groupCount 双指标、javaFileCount 排除（环境敏感维度，对齐 probe1 排除 worktreeHits 先例）

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中
- ℹ️ 1 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）

#### 探针 2：设计关键词覆盖
关键词覆盖（worktree grep 实证）：clusterMutationMethods/detectGuardSignals/runProbe9GuardConsistency（三导出）、PROBE9_HEADING、probe9-skip、守卫不一致实体组（汇总行）、四类信号（当前用户比对/角色判定/能力类调用/注解式）。设计能力词全部落实现。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-02: 模块目录（src）找到 3 个测试文件（src/spec-dir-typo.js、src/spec-sync.js、src/stage-contract-spec.js）
- ✅ task-03: 模块目录（test）找到 10 个测试文件（test/acceptance-matrix-gate.test.mjs、test/acceptance-matrix-probe.test.mjs、test/agent-automation-batch4.test.mjs、test/agent-gate-hardening.test.mjs、test/agent-session-log.test.mjs …）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。证据列给首命中 file:line 锚点或人工核验提示。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| FR-01 聚类——同实体 ≥2 变更方法成组输出（方法名+行区间+体）；单方法不成组不计 groupCount | 无归属测试——判定大概率 uncovered | test/probe9-guard-consistency.test.mjs（task-03 卡跨卡承接） | 用例直调断言 | covered | `test/probe9-guard-consistency.test.mjs`（人工改写：归属 task-03 测试；锚点 `test/probe9-guard-consistency.test.mjs`） |
| FR-02 信号——四类任一命中判有守卫；纯标识符出现（变量名恰含 manager 等）不计；注释掩码后字符串/文档示例不误报 | test/probe9-guard-consistency.test.mjs（task-03 卡跨卡承接） | 用例 1/4 信号类别断言+弱信号负例 | covered | `test/probe9-guard-consistency.test.mjs`（人工改写：跨卡承接；锚点 `test/probe9-guard-consistency.test.mjs`） |
| FR-03 告警——组内守卫/无守卫并存 → inconsistentGroups 含 {entity, guarded, unguarded, signals}，渲染为 advisory ⚠️ 行（不阻断） | 无归属测试——判定大概率 uncovered | test/probe9-guard-consistency.test.mjs（task-03 卡跨卡承接） | 用例直调断言 | covered | `test/probe9-guard-consistency.test.mjs`（人工改写：归属 task-03 测试；锚点 `test/probe9-guard-consistency.test.mjs`） |
| FR-04 边界——清单无 .java → 不适用注记；.java 首行 // probe9-skip 整文件跳过；单文件解析异常 fail-soft 跳过不炸整体 | 无归属测试——判定大概率 uncovered | test/probe9-guard-consistency.test.mjs（task-03 卡跨卡承接） | 用例直调断言 | covered | `test/probe9-guard-consistency.test.mjs`（人工改写：归属 task-03 测试；锚点 `test/probe9-guard-consistency.test.mjs`） |
| FR-05 渲染与 metrics——渲染含「#### 探针 9」段与口径注记（不适用时注记不空段）；verify-facts.json probes.probe9.metrics 含 javaFileCount/groupCount/inconsistentGroups 三键 | 无归属测试——判定大概率 uncovered | test/probe9-guard-consistency.test.mjs（task-03 卡跨卡承接） | 用例直调断言 | covered | `test/probe9-guard-consistency.test.mjs`（人工改写：归属 task-03 测试；锚点 `test/probe9-guard-consistency.test.mjs`） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| probe9 汇总行锚点 round-trip——探针9 真渲染产物 → parseProbePrefillAnchors，probe9InconsistentGroups=机械计数；缩进/段外同形行不命中（行首紧锚） | 无归属测试——判定大概率 uncovered | test/probe9-guard-consistency.test.mjs（task-03 卡跨卡承接） | 用例直调断言 | covered | `test/probe9-guard-consistency.test.mjs`（人工改写：归属 task-03 测试；锚点 `test/probe9-guard-consistency.test.mjs`） |
| 不符时产出 WARNING 级 mismatch（不阻断回滚，走既有 mismatch+warning 放行告警路径）；重跑降级无 probe9 键时跳过该维度零误报 | 无归属测试——判定大概率 uncovered | test/probe9-guard-consistency.test.mjs（task-03 卡跨卡承接） | 用例直调断言 | covered | `test/probe9-guard-consistency.test.mjs`（人工改写：归属 task-03 测试；锚点 `test/probe9-guard-consistency.test.mjs`） |
| facts 基线 probe9 快照 vs 重跑不符 → WARNING；旧 facts（无 probe9 metrics）零崩溃零误报 | 无归属测试——判定大概率 uncovered | test/probe9-guard-consistency.test.mjs（task-03 卡跨卡承接） | 用例直调断言 | covered | `test/probe9-guard-consistency.test.mjs`（人工改写：归属 task-03 测试；锚点 `test/probe9-guard-consistency.test.mjs`） |
| 既有 probe1/6=ERROR、probe3/5/8=WARNING 分级与信封 code 零变动；subsections 判别子（any）行为零变动 | 无归属测试——判定大概率 uncovered | test/probe9-guard-consistency.test.mjs（task-03 卡跨卡承接） | 用例直调断言 | covered | `test/probe9-guard-consistency.test.mjs`（人工改写：归属 task-03 测试；锚点 `test/probe9-guard-consistency.test.mjs`） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 五用例全绿——node --test test/probe9-guard-consistency.test.mjs 逐条对应 design 测试与验收 1-5 | `test/probe9-guard-consistency.test.mjs` | node、test、probe9、guard（`test/probe9-guard-consistency.test.mjs`） | covered | `test/probe9-guard-consistency.test.mjs:13`（node）、`test/probe9-guard-consistency.test.mjs:13`（test）、`test/probe9-guard-consistency.test.mjs:7`（probe9） |
| 不一致命中断言含信号类别（当前用户比对/能力类/注解式逐类可见），非仅计数 | `test/probe9-guard-consistency.test.mjs` | 当前用户比对、能力类（`test/probe9-guard-consistency.test.mjs`） | covered | `test/probe9-guard-consistency.test.mjs:5`（当前用户比对）、`test/probe9-guard-consistency.test.mjs:6`（能力类） |
| 全守卫/单方法组/豁免三负例零告警零空段（宁漏勿误口径锁定） | `test/probe9-guard-consistency.test.mjs` | 全守卫、单方法组（`test/probe9-guard-consistency.test.mjs`） | covered | `test/probe9-guard-consistency.test.mjs:8`（全守卫）、`test/probe9-guard-consistency.test.mjs:9`（单方法组） |
| 既有 probe8/postcheck 相关测试面零触碰（本卡不改 src、不改既有测试文件） | `test/probe9-guard-consistency.test.mjs` | probe8、postcheck（`test/probe9-guard-consistency.test.mjs`） | covered | `test/probe9-guard-consistency.test.mjs:111`（probe8）、`test/probe9-guard-consistency.test.mjs:24`（postcheck） |

- ⚠️ 零/半自动化承接条目 8 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
D-001@v1 → FR-01~06 → 三 task → 证据：五用例+接线 diff+主代理冒烟。链路闭环。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 3 backend endpoints (live [scan-root 4 + worktree 4] + artifact 0), 0 frontend calls [scope: change-diff (4 files @ worktree)] | 3 backend endpoints unused by frontend
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 3 个本变更端点前端未调用（warning 不阻断）：GET /api/path、GET /api、GET /api/api/xxx

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）

## 测试结果 [层：确定性检查——CLI 实测对账]
<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->

## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；
     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04、FR-05、FR-06 | task-01、task-02、task-03 | <待填：证据回指> | <待填> |

## 技术债务 [层：人工判断]
<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->

## 变更风险等级 [层：人工判断]
<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」+ 理由；若有命中被同句否定语境抑制（如「不新增 daemon 协议」），写明被抑制关键词与理由（抑制可审计，不许用来静默降级）-->

## Runtime Evidence [层：人工判断]
<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->

## 代码审查 [层：人工判断]
<!--TODO: 问题列表 + 总体评价。走查清单（零覆盖路径必查——探针 7 ⚠️ 条目即定向面）：
     ① 编辑/更新链路（回显、字段映射、残留态）——非新增主链路，实证盲区；
     ② 非主分支流（相关方/旁路支线等未走查路径）；
     ③ 守卫一致性：同资源端点的操作人/权限校验模式对比（实证 doSubmit 无操作人校验而 delete/withdraw 有——越权）；
     ④ 载荷字段契约（探针 8 ⚠️ 配对逐条核实）；
     ⑤ 分页/并发/事务原子性（无测试基建端的纯逻辑面）-->

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
<!-- verify 完成后的深度复核（独立子代理/二次审查）结论回流至此：缺陷分级（P1 功能不可用 / P2 需求子项 / P3 建议修）+ 修复证据链 + 对「结论枚举」的影响改写。无复核时本节写「无」或删除。复核结论不再只活在聊天记录（2026-09-16 EHS 二次复核实证：5 个 P1 只有聊天可查，变更档案仍写 PASS WITH NOTES）。 -->
