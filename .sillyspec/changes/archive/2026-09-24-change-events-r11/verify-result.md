---
author: qinyi
created_at: 2026-09-24 03:16:40
---
# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）

<!-- VERIFY-DRAFT-MODE -->
> **填槽模式**：机器段（MACHINE-DRAFT 标记包裹，篡改会被 --done 拒收）之外，你只填三处
> AGENT 槽：①结论枚举 ②移交项 ③审查叙述。工作流 = 本 draft → 填槽 → `--done` 复核，
> verify-result 读写 ≤3 次。改机器段唯一通道：`sillyspec verify-probes --change <变更名> --amend-draft`（留痕重锚）。

> 引用规范：矩阵证据/测试结果等处的源码位置写仓根相对全路径+行号（src/foo.js:123）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工）。

> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——
> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。
>
> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、
> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。

## 结论 [层：人工判断]

<!--AGENT:槽1/3 结论枚举——替换上行占位，槽行格式勿改（gate 判定消费面） -->
结论枚举：`PASS WITH NOTES`——五任务卡全部实现且模块级测试全绿（backend platform_sync 252 passed / frontend 组件 5+既有面 374 passed / typecheck 绿），E2E 独立库实测全过（五条/正序/去重/since/鉴权矩阵）；NOTES 为两项环境性披露：①浏览器工具在子代理环境不可用，面板交互面以组件测试四组+Next 代理链路同路径实测替代（移交项登记）；②wt-commit 在本实验工作树形态下不可用（按变更名推导 worktree 路径与实际不符），全部任务提交改用 git add/commit 同一显式 pathspec 清单（逐笔核对无夹带）。

## 移交项（结构化） [层：人工判断——CLI 清单核验]
<!-- 结论=PASS WITH NOTES 时本节必填（prose 移交叙述转结构化，复跑/验收有据可查、agent 可恢复复跑）；结论=PASS/FAIL 写「无」 -->
<!-- 类型枚举：env-blocked（环境阻断，条件列必填复跑口径）/ manual-acceptance（人工验收，条件列必填验收步骤）/ db-script（待执行脚本，条件列必填执行环境与顺序）/ other -->
| 类型 | 条目 | 复跑/验收条件 |
|---|---|---|
<!--AGENT:槽2/3 移交项——按需增行；结论=PASS/FAIL 时本表写「无」 -->
| manual-acceptance | 面板真人浏览器视觉核验（默认展开/琥珀高亮/角标/provisional 悬停） | 具浏览器环境会话：起 dev 后端（独立 E2E 库）+ Next dev（INTERNAL_API_BASE_URL 指向后端），登录 r11-e2e 账号进变更详情页，对照 e2e-record.md §6 清单走查；逻辑面已由 change-events-card.test.tsx 四组覆盖 |
| other | E2E 临时环境清理：dev 后端/Next dev 进程、backend/.env、backend/r11_e2e_creds.json、PG 库 platform_r11_e2e | 归档后停服进程、删凭据文件与临时库（.env 已 gitignore，凭据文件不提交） |

## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]
<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->
无（五任务 review verdict 均 pass）

## 集成验证回执 [层：自述声明——CLI 一致性校验]
<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->
<!-- 回执双形态（2026-09-16-friction5-hardening FR-01）：下方多行 YAML 形态为推荐写法（字段序无关）；
     亦认单行管道形态：- claim: <一句话> | command: <命令> | exit: <0 或非 0> | log: <日志路径> -->
- claim: 后端 platform_sync 模块测试全绿（新事件五组+既有零回归）
  command: cd backend && uv run pytest app/modules/platform_sync -q
  exit: 0
  log: e2e-record.md §7（252 passed, 64.60s）
- claim: 前端变更域测试全绿（新组件四组+详情页既有面零回归）
  command: cd frontend && pnpm vitest run "src/app/(dashboard)/workspaces" src/components/changes
  exit: 0
  log: e2e-record.md §7（33 files / 374 passed, 25.38s）
- claim: E2E 实服五条推送/正序/去重/since/鉴权矩阵全过（独立库 platform_r11_e2e，uvicorn 127.0.0.1:8011）
  command: curl POST/GET /api/changes/2026-09-24-change-events-r11/events（Bearer shpsync_/JWT/无凭据三形态）
  exit: 0
  log: .sillyspec/changes/2026-09-24-change-events-r11/e2e-record.md §1–§6

## 任务完成度 [层：人工判断]
<!-- MACHINE-DRAFT:task-completion:284e694cd8dcf6fb299e650c4c5be9fe3392d15b76498cc8b083d934e95c1a8b:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
客观任务完成度（真相源 = review.json verdict，runId=exec-2026-09-24-025159-8d9b5d）:
- 总任务：5
- 已通过（spec + quality verdict 均非 fail）：5
- 未通过 / 缺失：0
- 未完成列表:
  （无）
注：以 review.json verdict 为准；plan.md checkbox 仅作显示态（回填断裂时会与客观 verdict 不一致，以下方客观点为准）。
- 总任务：5；已完成（review verdict 口径）：5
- 未完成：无
<!-- MACHINE-DRAFT:task-completion:end -->


## 设计一致性 [层：人工判断]
<!--AGENT:槽3/3 审查叙述——设计偏差（无偏差显式写「一致」）+ 技术债务叙述（探针 1 统计已机器预填在「技术债务」节）；替换下方 TODO 注释为正文 -->
一致（含两处执行期收敛，均已在 decisions/review 留痕）：
- 偏差①（X-001，Grill 期修正）：design 文件清单原写「page.tsx 挂卡（change.name 传入）」→ 实现按 ChangeRead 真实字段 change_key 传入（backend/app/modules/change/schema.py:74），design.md 已同步修正。
- 偏差②（执行期实现细节）：service append_events 首版漏 commit（get_session 不自动提交、模块惯例 service 自行 commit），按「修逻辑不修测试」补单一 commit 点后全绿——非设计偏离，是惯例对齐。
- 其余：表结构 11 列、两端点路径/鉴权/dedup 双轨/5000 截最旧/since 严格大于/30s 轮询/折叠交互细则均与 design.md 逐条一致（探针 2 关键词 grep 佐证：dedup_key×19、MAX_EVENTS_PER_CHANGE×3、provisional×18、require_platform_sync_write×22、_read_args×9、platform_change_events×4、EVENTS_REFETCH_MS×2、旁路观测信号×2，全部命中实现代码）。
- 红线终核（FR-07）：新增代码 grep 无 approval/execute/verify 状态消费分支；severity/provisional 仅影响存储与展示样式（组件内 className/折叠初值/角标），无业务动作。

## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]
#### 探针 1：未实现标记扫描（design 清单文件）
- ✅ 无 TODO/FIXME/尚未实现 标记命中
- ℹ️ glob 项未展开（agent 手动展开扫描）：frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx

#### 探针 2：设计关键词覆盖
逐关键词 grep 实现代码（backend/app/modules/platform_sync/{model,schema,service,router}.py + tests/test_change_events.py + frontend/src/lib/change-events.ts + frontend/src/components/changes/detail/change-events-card.tsx），全部命中：
- dedup_key ×19（model 唯一约束/service 去重/测试断言）
- MAX_EVENTS_PER_CHANGE ×3（上限常量+计数比对）
- provisional ×18（列/DTO/徽标/红线注释）
- require_platform_sync_write ×22（POST 写通道）、_read_args ×9（GET 读 scope）
- platform_change_events ×4（表名：ORM/迁移/测试）
- EVENTS_REFETCH_MS ×2（30s 轮询）、旁路观测信号 ×2（徽标悬停文案+测试断言）
- since ×29（增量过滤/游标）、change_key ×55（identifier 口径）
结论：design 能力关键词全部落地，无缺失面。

#### 探针 3：验收标准测试覆盖
- ✅ task-01: 模块目录（backend/app/modules/platform_sync、backend/migrations/versions、backend/app/modules/platform_sync/tests）找到 15 个测试文件（backend/app/modules/platform_sync/tests/test_agent_blocked_notify.py、backend/app/modules/platform_sync/tests/test_agent_liveness_states_migration.py、backend/app/modules/platform_sync/tests/test_agent_log_attribution.py、backend/app/modules/platform_sync/tests/test_agent_log_content.py、backend/app/modules/platform_sync/tests/test_agent_log_messages.py …）
- ✅ task-02: 模块目录（backend/app/modules/platform_sync、backend/app/modules/platform_sync/tests）找到 10 个测试文件（backend/app/modules/platform_sync/tests/test_agent_blocked_notify.py、backend/app/modules/platform_sync/tests/test_agent_liveness_states_migration.py、backend/app/modules/platform_sync/tests/test_agent_log_attribution.py、backend/app/modules/platform_sync/tests/test_agent_log_content.py、backend/app/modules/platform_sync/tests/test_agent_log_messages.py …）
- ✅ task-03: 模块目录（backend、frontend/src/lib）找到 79 个测试文件（backend/app/core/spec_paths.py、backend/app/core/tests/test_auth_deps_db_release.py、backend/app/core/tests/test_config_auth.py、backend/app/core/tests/test_errors.py、backend/app/core/tests/test_monitoring.py …）
- ✅ task-04: 模块目录（frontend/src/components/changes/detail、frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]、frontend/src/components/changes/detail/__tests__、frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__）找到 11 个测试文件（frontend/src/components/changes/detail/__tests__/change-agent-run-log.test.tsx、frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx、frontend/src/components/changes/detail/__tests__/change-files-card.test.tsx、frontend/src/components/changes/detail/__tests__/change-sessions-card.test.tsx、frontend/src/components/changes/detail/__tests__/change-stage-actions.test.tsx …）
- ⚠️ task-05: 模块目录（.sillyspec/changes/2026-09-24-change-events-r11）递归未找到测试文件（含 co-located tests/）
- ℹ️ 集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️

#### 探针 7：验收×测试覆盖矩阵
<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles ∪ 直接下游卡测试 结构归属承接面（每条 acceptance 由哪些测试承接；下游消费卡的测试可承接上游 provider 的 acceptance——probe7-provider-tests-in-consumer-card）；两者并排冲突以 7 为准。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable（covered-service 适用：端点行为由 service 层等非端点层测试锁定，证据附测试锚点；non-testable 是文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->
<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。covered/covered-service/partial 证据须含测试锚点三形态之一（file:line / `.test.` 测试文件名 / 反引号包裹的路径或测试名），行号可省；uncovered/non-testable 证据自由形态。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/covered-service/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->

**task-01**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| uv run alembic heads 仍单头（新迁移为唯一 head） | `backend/app/modules/platform_sync/tests/test_change_events.py` | run（`backend/app/modules/platform_sync/tests/test_change_events.py`） | covered | `backend/app/modules/platform_sync/tests/test_change_events.py:10`（run） |
| uv run pytest app/modules/platform_sync/tests/test_router.py -q 既有测试零回归 | `backend/app/modules/platform_sync/tests/test_change_events.py` | run、pytest、app、modules、platform_sync（`backend/app/modules/platform_sync/tests/test_change_events.py`） | covered | `backend/app/modules/platform_sync/tests/test_change_events.py:10`（run）、`backend/app/modules/platform_sync/tests/test_change_events.py:17`（pytest）、`backend/app/modules/platform_sync/tests/test_change_events.py:22`（app） |
| 迁移文件在 SQLite 测试库可执行（conftest 建表即等价形态） | `backend/app/modules/platform_sync/tests/test_change_events.py` | — | partial | （无机械命中——人工核验 `backend/app/modules/platform_sync/tests/test_change_events.py`） |

**task-02**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| cd backend && uv run pytest app/modules/platform_sync -q 全绿（新五组+既有零回归） | `backend/app/modules/platform_sync/tests/test_change_events.py` | run、pytest、app、modules（`backend/app/modules/platform_sync/tests/test_change_events.py`） | covered | `backend/app/modules/platform_sync/tests/test_change_events.py:10`（run）、`backend/app/modules/platform_sync/tests/test_change_events.py:17`（pytest）、`backend/app/modules/platform_sync/tests/test_change_events.py:22`（app） |
| FR-07 红线：service/router 无任何依据事件改流程状态的代码路径（人工审读确认） | `backend/app/modules/platform_sync/tests/test_change_events.py` | — | partial | （无机械命中——人工核验 `backend/app/modules/platform_sync/tests/test_change_events.py`） |

**task-03**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| cd frontend && pnpm typecheck 绿 | `frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx`<br>`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx`<br>`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx` | frontend（`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx`、`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx`） | covered | `frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx:86`（frontend） |
| api-types.ts 含 /api/changes/{name}/events 路径条目 | `frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx`<br>`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx`<br>`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx` | api、changes、name、events（`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx`、`frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx`、`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx`） | covered | `frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx:28`（api）、`frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx:17`（changes）、`frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx:37`（name） |

**task-04**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| cd frontend && pnpm vitest run src/components/changes 四组全绿 | `frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx`<br>`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx`<br>`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx` | frontend、vitest、run（`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx`、`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx`、`frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx`） | covered | `frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx:86`（frontend）、`frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx:15`（vitest）、`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx:49`（run） |
| 既有 src/app/(dashboard)/workspaces 测试零回归 | `frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx`<br>`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx`<br>`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx` | 既有、app、dashboard、workspaces（`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx`、`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-team-toggle.test.tsx`） | covered | `frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx:11`（既有）、`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx:21`（app）、`frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/__tests__/page-last-signal.test.tsx:21`（dashboard） |

**task-05**
| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |
|---|---|---|---|---|
| 任务书验收清单逐条过：curl 五条→GET 正序去重；面板高亮与徽标 | 无归属测试——判定大概率 uncovered | — | non-testable | 人工验收实录 `.sillyspec/changes/2026-09-24-change-events-r11/e2e-record.md` §1–§6（curl 五条/正序/去重/since/鉴权矩阵全过；面板=代理链路实测+`change-events-card.test.tsx` 四组承接交互面） |
| e2e-record.md 落盘（命令+响应摘要+结论） | 无归属测试——判定大概率 uncovered | — | non-testable | 文档类交付：`.sillyspec/changes/2026-09-24-change-events-r11/e2e-record.md` 已落盘（提交 2ebd94822） |

- ⚠️ 零/半自动化承接条目 4 条——这些路径无测试兜底，verify 复核必须**显式走查**（尤其编辑/更新链路与非主分支流：二次复核实证它们正是 P1 藏身处），走查结论登记进「代码审查」节

#### 探针 4：决策追踪覆盖
- D-001@v1（platform_sync 落位+shpsync_ 写通道）→ FR-01/02/04 → task-02 → router.py 端点 + 鉴权矩阵测试组 ✅
- D-002@v1（dedup_key 复合唯一）→ FR-03 → task-01/02 → 迁移唯一约束 + 去重组（id 轨/ts|rule 轨）✅
- D-003@v1（5000 截最旧）→ FR-05 → task-02 → 上限组（5002→5000 保最新 truncated=2）✅
- D-004@v1（GET 读 scope）→ FR-02/04 → task-02/03 → shk_live_ 空列表测试 + apiFetch JWT 调用 ✅
- D-005@v1（detail JSON 透传）→ FR-01/07 → task-01/02 → detail 列 + extra 字段进 detail 测试 ✅
- D-006@v1（30s 轮询不做 SSE）→ FR-06 → task-04 → EVENTS_REFETCH_MS + 组件测试 ✅
- D-007@v1（折叠/角标/高亮交互）→ FR-06 → task-04 → 角标组/高亮组测试 ✅
闭环：7 决策 × FR × task × 测试锚点全链有据，无未闭环行。

#### 探针 5：API Contract Parity
- ✅ API parity check passed: 1651 backend endpoints (live [scan-root 620 + main 620] + artifact 1240), 0 frontend calls [scope: change-diff (2 files @ scan-root)] | 0 backend endpoints unused by frontend (+418 stock noise collapsed)
- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 2 个根
- ⚠️ 0 个本变更端点前端未调用（warning 不阻断）：
- ℹ️ 另有 418 个存量端点未调用（他模块存量噪音，已折叠不逐条列出）

#### 探针 6：代码删除对账
- ✅ git diff 无整文件删除（D/R/C）记录
- ℹ️ 以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定

#### 探针 8：载荷字段契约对账（advisory）
- 不适用（清单无 Java/SQL 后端面，或 design.md 缺失）
#### 探针 9：守卫一致性（advisory）
- 不适用（清单无 .java 改动文件，或 design.md 缺失）
- ℹ️ 清单无 .java 文件（另有 13 个非 Java 清单文件不在探针 9 扫描面）
#### 探针 10：预填注清零（error 门）
<!-- 口径注记：预填注（来源注协议）在场 = 白名单槽未确认（预填≠结论）；删注 = 确认动作。本探针是门禁梯度 error 档——verify --done 时 gate 复跑同源检测，注未清零阻断完成（归档前清零兜底）。已知误报面：散文引用注字面量会命中（如文档描述注协议本身）——核对后真未确认则删注，纯散文则改写措辞，不得删探针段。 -->
- ✅ 预填注清零（6 个在检文件无未确认预填）
#### 探针 11：红线一致性（advisory）
- 不适用（仓未配置 .sillyspec/redlines.yaml——红线机检零打扰，D-002）

## 接口验证覆盖矩阵 [层：人工判断——CLI 预填复核]
<!-- 口径注记（与探针 7 互指，R-07）：探针 7 = 验收项 × 测试承接面（每条 acceptance 由哪些测试承接）；本矩阵 = 接口端点 × 验证用例面（design 接口段每个端点由哪些验证用例/冒烟步骤覆盖）——两者并排互补，双矩阵并行存在。端点集来自 design.md 接口段 tolerant 解析（parseDesignApiTable：段头宽收 + 方法/路径双条件），预填≠结论，agent 逐行复核。判定枚举（五选一）：covered / covered-service / partial / uncovered / non-testable——covered-service 适用：端点行为由 service 层等非端点层测试锁定；证据须含测试文件锚点三形态之一（`.test.` / file:line / 反引号包裹的路径或测试名）。 -->
<!-- 预填说明：端点行由 CLI 机械预填，判定/用例依据 ID/结果/证据由 agent 逐格填写——用例依据 ID 锚点五形态（可复制样例）：design接口表#POST /api/xx（# 后必须 METHOD /path，仅表名/行号/散文描述不计命中）、权限矩阵[admin×读]、契约表@任务卡字段清单、DDL@users.id、载荷@e2e_body.json（须真实命中对应表/段，防空指）。 -->
<!-- 文法注释：子行 = 端点行下一行、两空格缩进、以「↳ <消费端>:」前缀书写（消费端细分承接面，不计矩阵行账）；探索行 = 判定 uncovered 且证据列含 [探索] 标记（探索性验证不算覆盖）。 -->
| 端点 | 判定 | 用例依据 ID | 结果 | 证据 |
|---|---|---|---|---|
| POST /api/changes/{name}/events | covered | design接口表#POST /api/changes/{name}/events | 五组之收/去重/鉴权/上限全过 | design接口表#POST /api/changes/{name}/events；backend/app/modules/platform_sync/tests/test_change_events.py:45、:89、:175、:250、:321（收/数组/去重 id 轨/鉴权矩阵/上限）；e2e-record.md §1/§3 |
| GET /api/changes/{name}/events | covered | design接口表#GET /api/changes/{name}/events | 取组+鉴权 GET 矩阵全过 | design接口表#GET /api/changes/{name}/events；backend/app/modules/platform_sync/tests/test_change_events.py:133、:287（正序+since/GET 鉴权矩阵）；e2e-record.md §2/§4/§5 |
  ↳ 面板（ChangeEventsCard）: `frontend/src/components/changes/detail/__tests__/change-events-card.test.tsx`（渲染/高亮/空态/角标四组 5 用例）+ e2e-record.md §6（Next 代理链路 total:5）
<!-- advisory 尾注（warning 计算归 validator，本段只留位）：有消费端未填子行的端点将列于此（advisory——消费端归类=design 清单启发式，数据面 facts.consumerHints）；写端点（POST/PUT/DELETE/PATCH）未在权限矩阵段声明的将列于此（advisory——补行或显式豁免「无权限约束」，数据面 facts.apiFace.writeEndpoints；表缺行会让派生框架继承你的洞） -->

## 测试结果 [层：确定性检查——CLI 实测对账]
<!-- MACHINE-DRAFT:test-result:d2d7944a803ab3fba8d54994fc036ee8c9063f8484f214c4887387df7e439c3f:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
- 本 draft 生成时点无 P2 账本/质量扫描记录（verify 步「运行测试和质量扫描」尚未跑）——该步实测后门对账自动落账，此处以门结论为准（无需手改本段）
<!-- MACHINE-DRAFT:test-result:end -->


## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]
<!-- MACHINE-DRAFT:decision-chain:d5171fed7adc9042e0398bcd1b980516a0301c534d9f6c135e55273522e8e162:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
- 决策链机械半边：7 条决策 × 5 张 task 卡（D→FR→Task 自 decisions.md × tasks/*.md frontmatter 构建）
| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01、FR-02、FR-03、FR-04、FR-05、FR-06 | task-05 | backend/app/modules/platform_sync/router.py（push_change_events/list_change_events 两端点 + _write_auth/_read_auth）+ test_auth_matrix_post/get | closed |
| D-002@v1 | FR-01、FR-03、FR-05 | task-01 | backend/migrations/versions/20260924030000_add_platform_change_events.py（uq_platform_change_events_dedup）+ test_dedup_by_event_id/by_ts_rule_without_id | closed |
| D-003@v1 | FR-01、FR-02、FR-03、FR-04、FR-05、FR-06 | task-05 | backend/app/modules/platform_sync/service.py append_events（MAX_EVENTS_PER_CHANGE=5000 子查询截断）+ test_cap_truncates_oldest_keeps_newest | closed |
| D-004@v1 | FR-01、FR-02、FR-03、FR-04、FR-05、FR-06 | task-03、task-05 | service.py list_events（scope 过滤对齐 list_agent_logs）+ frontend/src/lib/change-events.ts（apiFetch JWT）+ test_auth_matrix_get | closed |
| D-005@v1 | FR-01、FR-03、FR-05 | task-01 | model.py PlatformChangeEventORM（单列+detail JSON）+ test_push_array_form_and_extra_fields_into_detail | closed |
| D-006@v1 | FR-06、FR-07 | task-04 | frontend/src/components/changes/detail/change-events-card.tsx（EVENTS_REFETCH_MS=30_000 + lastTsRef since 增量） | closed |
| D-007@v1 | FR-01、FR-02、FR-03、FR-04、FR-05、FR-06、FR-07 | task-04、task-05 | change-events-card.tsx（折叠/角标/琥珀高亮/autoExpandedRef）+ 测试角标组/高亮组/空态组 | closed |
- Evidence / 状态两列是人工判断（机器不代笔）——逐格复核，未闭环行在「审查叙述」槽标注风险
<!-- MACHINE-DRAFT:decision-chain:end -->


## 技术债务 [层：人工判断]
- 探针 1 命中：0（新增代码无 TODO/FIXME/HACK 标记）。
- 已知克制债（design 有据，非未实现）：①同名 change 跨 workspace 在 JWT 读 scope 下聚合（R-01，观测无业务消费可接受，需精确隔离时补 workspace query 参数）；②ts 原文存储假定 CLI 恒发 UTC Z 格式（R-02，轮询侧行 id 去重兜底）；③前端渲染上限 200 条（组件内 MAX_RENDER_ITEMS，服务端恒 ≤5000）。

## 变更风险等级 [层：人工判断]
<!-- MACHINE-DRAFT:risk-level:c4d43e9a5ae668ddf70d5086801d54b605c9ba9df218ea83e9bb5d271489f962:begin 机器预填段——整段改写会被 verify --done 拒收；确要修改：sillyspec verify-probes --change <变更名> --amend-draft 留痕重锚 -->
- 机器判级：tier=S1（design.md 无显式 risk_level 声明）
- 未命中 evidence:true 声明危险面——无集成证据链硬要求（「集成验证回执」节机器判「无」）
- 判级输入：design 文件清单 × blast 声明（同 verify 门 evaluateConclusionDraft 口径；判定被新事实推翻时在「审查叙述」槽说明）
<!-- MACHINE-DRAFT:risk-level:end -->


## Runtime Evidence [层：人工判断]
- 起服：`uv run uvicorn app.main:app --host 127.0.0.1 --port 8011`（2026-09-24 03:07 起，独立 E2E 库 platform_r11_e2e；alembic upgrade head 全量迁移含 20260924030000）——health 200。
- 请求响应：见 e2e-record.md §1–§6（五条推送 200×5、GET 正序 total:5、同 id 重推 deduplicated:1、since 回 2 条、401/403/200 鉴权矩阵、Next 代理链路 total:5）。
- commit hash 证据链：task-01 446026814 / task-02 7c8504887 / task-03 2def71bcb / task-04 f343fd702 / task-05+E2E 2ebd94822 / 收口文档 0b139e41a（基线 53a5c5c9d，brainstorm a146aab5e，plan ee6aacd7c）。
- 生命周期终态断言：不涉及（本变更零生命周期语义，design 豁免短语在档）。
- 失败模式排除：并发撞唯一约束（IntegrityError→回滚重试，不 500，R-03）；前端查询错误静默降级空态（既有详情页测试 374 passed 零回归佐证不扰主流程）。

## 代码审查 [层：人工判断]
走查清单（对照探针 7 ⚠️ 定向面）：
- ① 编辑/更新链路：不适用——append-only 通道无 UPDATE 路径（设计如此，唯一「改」是上限截断 DELETE，有测试锁定保最新侧）。
- ② 非主分支流：空数组 POST（短路零计数 200）、body 未知字段（extra 进 detail，有测试）、scope 外 GET（空列表不 403，有测试）、查询错误（组件静默空态）均已走查。
- ③ 守卫一致性：POST/GET 鉴权形态与 quicklog-entries/get_progress 完全同款（_write_auth fail-closed 403 防御 + _read_args 复用），无操作人维度（写通道=token 派生 workspace，无越权面）。
- ④ 载荷字段契约：探针 8 不适用（非 Java/SQL 后端面）；字段宽度（kind 64/rule 255/severity 32/ts 64/dedup_key 255）在 DTO max_length 与列宽两侧对齐。
- ⑤ 并发/事务原子性：IntegrityError 回滚重试路径审读无半提交（单一 commit 点在截断后）；截断 DELETE 子查询跨方言（SQLite 测试库实证 + PG E2E 库实证双过）。
- 总体评价：实现面收敛在 platform_sync 模块四文件 + 前端三文件，零既有行为触碰；红线（FR-07）grep+审读双重确认无业务消费分支。问题列表：无 P1/P2；P3 一条——组件 200 条渲染上限对超高频事件变更只展示最新侧（有「仅展示最新 N 条」提示文案，克制可接受）。

## 独立复核（可选回流槽） [层：人工判断——复核后追加]
无（宿主无子代理可用，独立复核通道降级为自审——execute 阶段 Stage Review 与本 verify 报告均留「降级」审计行；如需二次复核，具 Agent tool 环境可对 review.json 复核后回流本节）。
