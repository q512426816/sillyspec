---
author: qinyi
created_at: 2026-07-09 19:50:00
scale: large
---

# 设计 — 机器接口 v1（SillyHub driver 模式地基）

## 1. 背景与目标

SillyHub 平台将实现控制流反转（driver 模式）：平台 orchestrator 按步 spawn 子 agent、组装最小上下文、核验产物通过后才下发下一步。前提是 SillySpec 的门控与事实核验能被**程序化调用**——当前它们埋在 `run <stage> --done` 的人类可读输出流里，退出码语义混用，SillyHub 无法可靠消费。

本变更在 SillySpec 侧落地 P1：**机器接口层 + 接口契约**，并补齐两个平台对接已知缺口。策略引擎保持唯一（本仓库），SillyHub 只调用不重实现。

决策台账见 `decisions.md`（D-001@v1 ~ D-007@v1），本设计覆盖全部当前版本决策。

## 2. 总体结构

```text
SillyHub daemon（另一仓库）
   │  child_process exec（D-001@v1：纯 CLI 子命令）
   ▼
sillyspec gate <stage> --change <name> --json      ← 聚合门控（只读，D-002@v1）
sillyspec derive <facet> --change <name> --json    ← 单项事实核验（D-003@v1）
   │
   ▼
src/machine-interface.js（新增，方案 B：独立模块单点封装）
   ├─ envelope 组装（schema_version=1，D-005@v1）
   ├─ 退出码映射 0/1/2（D-004@v1）
   └─ 复用既有策略引擎（不新增校验逻辑）：
        stage-contract.js  runValidators / checkTransition / checkExecuteCodeEvidence
        task-review.js     validateTaskReviews
        verify-postcheck.js runVerifyTestCheck
```

## 3. 命令设计

### 3.1 `sillyspec gate <stage> --change <name> [--json]`

回答一个问题："该变更的 `<stage>` 阶段**此刻**能否被标记完成？"

聚合检查项（checks 数组，逐项独立结论）：

| check id | 适用阶段 | 复用实现 |
|---|---|---|
| `artifacts` | 全部 | `runValidators(stage, cwd, change, { projectName, specRoot })` |
| `transition` | 全部 | `checkTransition(currentStage, stage)`（信息性：当前阶段 → 目标阶段是否合法） |
| `task-reviews` | execute | `validateTaskReviews`（含 git 真实性交叉校验，gitDir 优先 worktree） |
| `execute-evidence` | execute | `checkExecuteCodeEvidence`（真实代码变更核验） |
| `verify-test` | verify | `runVerifyTestCheck`（CLI 实测 local.yaml commands.test） |

综合结论 `ok` = 所有非信息性 check 均通过。`transition` 单独标 `informational: true`：daemon 可能在阶段推进前预查下一阶段，转换不合法不应把产物核验判为失败。

重叠说明（D-008@v1）：execute 的 `artifacts` check（validateExecuteOutputs）内部已含代码变更核验，与 `execute-evidence` check 同源。实现层对 `checkExecuteCodeEvidence` 只调用一次、结果复用；两个 check 的结论不得矛盾（测试含一致性断言）。

### 3.2 `sillyspec derive <facet> --change <name> [--json]`

单项事实查询，facet 枚举（D-003@v1）：

| facet | 复用实现 | 返回要点 |
|---|---|---|
| `execute-evidence` | `checkExecuteCodeEvidence` | status=changed/unchanged/unknown + detail |
| `verify-test` | `runVerifyTestCheck` | status=passed/failed/skipped + exitCode/durationMs/resultPath |
| `task-reviews` | `validateTaskReviews` | ok/errors/warnings/requiredEvidence |
| `artifacts` | `runValidators` | ok/errors/warnings |

### 3.3 只读语义边界（D-002@v1）

- **不写状态**：不写 sillyspec.db、不写 gate-status.json、不 triggerSync、不推进 step/stage。
- **允许写取证文件**：`derive verify-test` / `gate verify` 会真实执行测试并把结果落盘 `.runtime/verify-runs/<ts>/test-result.json`——这是产物取证，不是状态写入，与只读语义不冲突。契约文档中显式说明此副作用。
- 实现上 machine-interface.js 只调用 ProgressManager 的读路径（`read`/`listChanges`），不调用 `_write`/`completeStage`。

### 3.4 JSON envelope（D-005@v1）

所有机器接口 stdout 输出统一结构（`--json` 时 stdout 无任何装饰文本，日志走 stderr）：

```json
{
  "schema_version": 1,
  "command": "gate",
  "stage": "execute",
  "facet": null,
  "change": "2026-07-09-machine-interface-v1",
  "ok": false,
  "errors": ["task-01: base..head 无任何代码变更 …"],
  "warnings": [],
  "checks": [
    { "id": "artifacts", "ok": true, "errors": [], "warnings": [] },
    { "id": "task-reviews", "ok": false, "errors": ["…"], "warnings": [] },
    { "id": "execute-evidence", "ok": false, "errors": ["…"], "warnings": [], "data": { "status": "unchanged", "detail": "…" } },
    { "id": "transition", "ok": true, "informational": true, "errors": [], "warnings": [] }
  ],
  "generated_at": "2026-07-09T11:50:00.000Z"
}
```

固定顶层字段：`schema_version` / `command` / `change` / `ok` / `errors` / `warnings` / `generated_at`；`stage`、`facet`、`checks`、`data` 按命令出现。`errors`/`warnings` 是各 check 的扁平汇总，daemon 想省事可只看顶层。

演进规则：加字段随时；改语义/删字段必须 bump `schema_version`，旧版本至少保留一个 minor 周期。

### 3.5 退出码契约（D-004@v1）

| 码 | 语义 | daemon 典型处置 |
|---|---|---|
| 0 | 核验通过（可含 warnings） | 推进 |
| 1 | 核验失败（事实性阻断，JSON 含 errors） | 反馈给子 agent 修复后重试 |
| 2 | 无法核验（用法错/变更不存在/环境错/内部异常） | 报警人工介入，不盲目重试 |

区分 1 与 2 是 driver 模式的关键：1 是"事实上不通过"，2 是"没得出结论"。内部异常兜底：catch 后输出 `{ok:false, errors:["internal: …"]}` 到 stdout 并 exit 2，保证 stdout 永远是合法 JSON。

## 4. 平台缺口补齐（D-006@v1）

### 4.1 `platform approve / reject`

`src/sync.js` 中实现（当前仅打印"尚未实现"）：

- `approve(changeName, cwd)`：`POST {platform.url}/api/changes/{changeName}/approval` body `{ decision: "approved" }`，成功后调 `ProgressManager._updateApprovalStatus()` 落 approvals 表。
- `reject(changeName, cwd, reason)`：同端点 body `{ decision: "rejected", reason }`。
- 沿用 sync.js 既有 `fetchJson` 超时/告警风格；网络失败 warning + exit 1（这是显式用户/daemon 动作，不同于 best-effort 自动 sync，失败必须可见）。
- ⚠️ 待对账项：端点路径/请求体以 SillyHub 仓库实际 API 为准，契约文档中标记 `TBD-hub-api`，实现放在 sync.js 单点便于后续对齐。

### 4.2 workflow-runs runtimeRoot 透传

`src/run.js` 两处 `saveWorkflowRun(result, { cwd, source, stage, step })` 调用（scan 深度扫描 postcheck、archive extract-module-impact postcheck）补传 `runtimeRoot: platformOpts.runtimeRoot, scanRunId: platformOpts.scanRunId`，使平台模式的 workflow run 落 `<runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/`（`workflow.js saveWorkflowRun` 已支持，纯接线）。

## 5. 文件变更清单

| 变更 | 文件 | 说明 |
|---|---|---|
| 新增 | `src/machine-interface.js` | gate/derive 实现：envelope 组装、退出码映射、check 聚合、错误兜底 |
| 修改 | `src/index.js` | 路由 `gate`/`derive` 子命令；usage 文本；platform approve/reject 接真实实现 |
| 修改 | `src/sync.js` | 实现 `approve()`/`reject()`（替换"尚未实现" warning） |
| 修改 | `src/run.js` | 两处 `saveWorkflowRun` 补传 `runtimeRoot`/`scanRunId` |
| 新增 | `docs/sillyspec/interface-contract.md` | v1 接口契约：命令、envelope schema、退出码、演进规则、副作用声明、TBD-hub-api 清单 |
| 修改 | `docs/sillyspec/file-lifecycle.md` | 同步机器接口行为与 workflow-runs 路径变化 |
| 修改 | `docs/sillyspec/file-lifecycle/known-implementation-gaps.md` | 移除已补齐的两个缺口 |
| 修改 | `docs/sillyspec/file-lifecycle/platform-workflows-sync.md` | approve/reject 与 runtimeRoot 接线说明 |
| 新增 | `test/machine-interface.test.mjs` | envelope/退出码/只读性/gate 聚合/derive 各 facet 测试 |

## 6. 数据模型

无 DB schema 变更。approvals 表已存在（db.js），approve/reject 仅写入既有列。

本变更不涉及生命周期契约（无 session/lease/heartbeat 状态机，见 D-007@v1）：gate/derive 为无状态单次调用；文中出现的 daemon 均指 SillyHub 侧调用方，本仓库不实现任何守护进程。

## 7. 兼容策略与回退

- 纯增量：`gate`/`derive` 是新子命令，不触碰 `run`/`progress` 存量行为与输出格式；agent 手动模式完全不受影响。
- `saveWorkflowRun` 透传参数在非平台模式下为 undefined，落盘路径与现状一致（workflow.js 已有默认分支）。
- 回退路径：删除 machine-interface.js 与 index.js 路由分支即可完全回退，无数据迁移。

## 8. 风险登记

| 风险 | 等级 | 对策 |
|---|---|---|
| SillyHub API 形态未定，approve/reject 端点可能不匹配 | 中 | 端点封装在 sync.js 单点；契约文档标记 TBD-hub-api；先按 REST 惯例实现，对齐后只改 URL/body |
| `derive verify-test` 执行测试耗时（最长 10 分钟），daemon exec 需配超时；driver 流程中与 run --done 各跑一次导致测试翻倍 | 中 | 契约文档声明时间上界与重复执行行为（D-009@v1）；结果复用优化留到 P3 |
| gate 聚合语义与 completeStep 校验链漂移（两处调用同一批函数但组合顺序不同） | 中 | machine-interface 只做聚合不做新校验；test 中对照断言"gate 阻断 ⇔ completeStep 阻断"的一致性样例 |
| sql.js 读路径也会加载全库到内存，超大 db 下 exec 频繁调用有开销 | 低 | P1 接受；P2 派生式状态重构时统一处理 |
| stdout 混入第三方库打印污染 JSON | 低 | --json 模式下劫持 console.log 到 stderr（machine-interface 内局部处理），最终 envelope 用 process.stdout.write |

## 9. 验收标准

1. `sillyspec gate execute --change <c> --json`：产物齐全+有真实代码变更时 exit 0；伪造 review.json 或零代码变更时 exit 1 且 errors 指明原因；变更不存在时 exit 2。
2. `sillyspec derive execute-evidence|verify-test|task-reviews|artifacts --change <c> --json`：各 facet 返回对应事实结构；非法 facet exit 2。
3. 只读性：任一 gate/derive 调用前后 `sillyspec.db` 文件内容 hash 不变，gate-status.json 不产生/不变化。
4. `--json` 模式 stdout 可被 `JSON.parse` 直接解析（含内部异常场景）。
5. `platform approve/reject` 对 mock HTTP 端点完成调用并更新 approvals 表；网络失败 exit 1 且有可读错误。
6. 平台模式（带 runtimeRoot/scanRunId）scan postcheck 的 workflow run 落 `<runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/`。
7. 全量 `npm test` 通过；`docs/sillyspec/interface-contract.md` 与实现一致。

## 10. 决策覆盖对账

| 决策 | 覆盖位置 |
|---|---|
| D-001@v1 纯 CLI 子命令 | §2 总体结构、§7 兼容策略 |
| D-002@v1 gate 只读 | §3.3 只读语义边界、验收 3 |
| D-003@v1 命令面 gate+derive | §3.1/3.2 |
| D-004@v1 退出码 0/1/2 | §3.5、验收 1/2 |
| D-005@v1 schema_version 演进 | §3.4、§5 契约文档 |
| D-006@v1 补齐平台缺口 | §4、验收 5/6 |
| D-007@v1 无生命周期契约 | §6 |
| D-008@v1 checks 受控重叠 | §3.1 重叠说明 |
| D-009@v1 verify 实测重复执行 | §8 风险表 |

未解决决策：无。剩余风险见 §8（TBD-hub-api 为最高优先待对账项）。

## 11. 自审

- [x] 需求覆盖：对话式探索确认的 6 点需求全部落入 §3/§4/§5
- [x] Grill 覆盖：D-001~D-007 全部被引用（§10 对账表）
- [x] 约束一致性：无外部依赖、原生 node、复用既有轻量模式（fetchJson/schema_version 先例），符合 CONVENTIONS
- [x] 真实性：`runValidators`/`checkTransition`/`checkExecuteCodeEvidence`/`validateTaskReviews`/`runVerifyTestCheck`/`saveWorkflowRun`/`_updateApprovalStatus` 均为真实存在的函数；`machine-interface.js`/`interface-contract.md` 标注新增
- [x] YAGNI：不做长驻进程、不做全命令 json 化（方案 C 已否决）、不做 P2 派生式状态
- [x] 验收标准：9 条全部可测试（含只读性 hash 对比这类客观断言）
- [x] 非目标清晰：见 proposal.md「不在范围内」
- [x] 兼容/回退：§7，纯增量可整体回退
- [x] 风险识别：§8 五项含对策
- [x] 生命周期契约：不涉及，已在 §6 显式声明并附理由（D-007@v1）
