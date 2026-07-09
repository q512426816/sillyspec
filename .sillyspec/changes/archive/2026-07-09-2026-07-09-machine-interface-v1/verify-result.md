---
author: qinyi
created_at: 2026-07-09T14:08:00+08:00
---

# 验证报告 — 机器接口 v1（2026-07-09-machine-interface-v1）

## 结论

**PASS**

全部功能需求（FR-01~06）、非功能需求（NFR-01~04）、决策（D-001~D-009）、9 条全局验收标准均满足。测试套件 96 断言全绿 + 全量 npm test 30 文件 0 失败 + lint 通过。代码已 apply 主工作区并 commit 到 `feat/machine-interface-v1`（d14432c，11 文件 +1629/-47）。

## 任务完成度

8/8 = 100%：
- task-01 machine-interface.js gate/envelope/退出码 ✅
- task-02 derive 四 facet ✅
- task-03 index.js gate/derive 路由 + withJsonOutput ✅
- task-04 interface-contract.md 契约冻结 ✅
- task-05 sync.js approve/reject + parseSimpleYaml 修复 ✅
- task-06 run.js 透传（已存 baseline，验证型 low_risk）✅
- task-07 test/machine-interface.test.mjs 8节96断言 ✅
- task-08 file-lifecycle 三份文档同步 ✅

## 设计一致性

design §2-9 全部实现：
- §2 独立模块 + 只聚合不新增校验 ✅
- §3.1 gate 五 check（artifacts/transition/task-reviews/execute-evidence/verify-test）+ informational + D-008 去重 ✅
- §3.2 derive 四 facet ✅
- §3.3 只读边界（db/gate-status.json 不变，verify-test 取证例外）✅
- §3.4 envelope schema_version=1 固定字段 ✅
- §3.5 退出码 0/1/2 + 异常兜底合法 JSON ✅
- §4.1 approve/reject HTTP + approvals 表 + fail-visible + TBD-hub-api ✅
- §4.2 runtimeRoot 透传（workflow.js 已支持）✅
- §5 文件清单 9 文件全覆盖 ✅
- §6 无 DB schema 变更 ✅
- §7 纯增量可整体回退 ✅
- §9 验收 7 条 ✅

**合理实现偏差（非错误）**：
1. validateTaskReviews 按真实单 opts 解构签名实现（蓝图假设 `(changeDir,{gitDir})` 有误）
2. task-06 透传已存于 baseline commit 80b7825（验证型 task，补 low_risk）
3. parseSimpleYaml pre-existing bug 修复（task-05 额外，approve/reject 可用前提）
4. `process.exit` → `process.exitCode`（修复 Windows UV_HANDLE_CLOSING assertion 覆盖退出码 127）
5. index.js approve/reject 路由无需改（已存在，task-05 在 sync.js 实现）
6. code-review 修复：transition 补传 fromStageData（与 completeStep 同源）+ 删 emitJson 死代码

## 探针结果

- **探针 1（未实现标记）**：仅 `index.js:897 TODO: task-11`（platform connect --token 交互，**baseline 非本变更引入**）。核心文件 machine-interface.js / sync.js 无 TODO/FIXME。
- **探针 2（设计关键词）**：runGate/runDerive/FACETS/buildEnvelope/EXIT_UNKNOWN/_submitApproval/withJsonOutput/schema_version/informational 全覆盖。
- **探针 3（测试覆盖）**：test/machine-interface.test.mjs（96 断言，8 节）。
- **探针 4（决策追踪）**：D-001~D-009 全 accepted，plan.md 12 处 D-xxx 引用，FR-01~06 映射闭环。逐项覆盖：D-001 纯 CLI 子命令（machine-interface gate/derive 无长驻进程）、D-002 只读（sha256 断言 db 不变）、**D-003 命令面 gate+derive**（index.js 路由 + FACETS 四 facet）、D-004 退出码 0/1/2（EXIT_* 常量 + 异常兜底）、**D-005 schema_version 演进**（SCHEMA_VERSION=1 + interface-contract.md §6 演进规则章节）、D-006 平台缺口（sync.js approve/reject + run.js 透传）、D-007 无 lifecycle（gate/derive 无状态单次调用）、D-008 checks 去重（checkExecuteCodeEvidence 单次调用）、D-009 verify 重复执行（interface-contract.md §5 慢命令章节）。

## 测试结果

- `node test/machine-interface.test.mjs`：✅ 通过 96 / ❌ 失败 0
- `npm test`（全量）：30 个测试文件全部 0 失败（含 machine-interface 96 + 存量 agent-gate-hardening/plan-execute-contract/platform-scan-p0/spec-dir/doctor-align 等全绿）
- `npm run lint`（check-syntax）：45 JS 文件通过
- 8 节覆盖：envelope(18) / gate(15) / D-008 一致性(3) / derive(19) / 只读性 sha256(3) / CLI 端到端(12) / approve-reject mock(16) / saveWorkflowRun(10)

## 变更风险等级

**Medium** — 涉及 SillyHub 平台集成（daemon 为调用方），但 D-007@v1 明确本仓库不实现 daemon/session/lease/lifecycle 状态机（gate/derive 无状态单次调用）。主要待对账项：TBD-hub-api（approve/reject 端点待 SillyHub 实际 API 对齐，单点封装于 sync.js `_submitApproval`）。

## Runtime Evidence

本变更为 SillyHub driver 模式提供被调用的机器接口，运行证据（task-07 自动化断言 + 实跑）：

- **端到端 CLI**：`node bin/sillyspec.js gate brainstorm --change <c> --json` → exit 0 + stdout 合法 JSON（JSON.parse 成功，schema_version=1，checks 含 artifacts + transition(informational)）
- **退出码契约（D-004）**：gate ok→0 / derive execute-evidence→0 / 非法 facet→2 / 缺参数→2 / 变更不存在→2（CLI 端到端 12 断言实证）
- **只读性（D-002）**：gate/derive 调用前后 sillyspec.db sha256 不变 + gate-status.json 不产生（只读性节 3 断言客观验证）
- **D-008 一致性**：gate execute 输出中 artifacts 与 execute-evidence 结论不矛盾（一致性节 3 断言）
- **approve/reject（D-006）**：node:http mock server 断言 POST 路径 + body decision/reason + Bearer token + approvals 表落库（approved/rejection_reason）+ HTTP500/网络不可达→exit 1 表不变（mock 节 16 断言）
- **saveWorkflowRun（FR-06）**：带 runtimeRoot+scanRunId 落 `<rt>/scan-runs/<id>/workflow-runs/`，不带落默认 `cwd/.sillyspec/.runtime/workflow-runs/`（saveWorkflowRun 节 10 断言）
- **parseSimpleYaml 修复**：platform 段（url/token/last_connected）正确解析，无 platform 段返回 null 向后兼容

## 备注（NOTES，不影响 PASS）

1. **TBD-hub-api**：approve/reject 端点 `POST {url}/api/changes/{changeName}/approval` body `{decision[,reason]}` 为 REST 惯例假设，待 SillyHub 仓库实际 API 对齐（封装在 sync.js `_submitApproval` 单点，对齐时只改一处）。
2. **follow-up minor**（code-review 记录，非阻断）：task-reviews 参数组装在 runGate/runDerive 各一份可提取共享 helper；reject 无 reason 时 body 可显式构造；Node 版本注释（18 vs 22 fetch）统一；process.exitCode 的库 API 契约 JSDoc。
3. **worktree apply 工具问题**：sillyspec worktree assess/apply 因 baseline overlay 含 kanban-better-board 未跟踪文件冲突 + meta.json 问题阻断，用手动 `git diff actualBase..HEAD`（限本变更 8 文件）apply 绕过。代码正确，工具待修。
4. **index.js:897 TODO**：baseline 代码（platform connect --token 交互），非本变更引入，不阻断。

## 下一步

PASS → 可进入 `sillyspec run archive` 归档，或先 merge `feat/machine-interface-v1` → main。
