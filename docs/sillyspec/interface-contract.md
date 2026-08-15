---
author: qinyi
created_at: 2026-07-09T13:05:00+08:00
updated_at: 2026-08-15T16:40:00+08:00
schema_version: 1
---

# 机器接口契约 v1（interface-contract.md）

> 本文档是 SillySpec ↔ SillyHub 两仓库的**对账基准**（decisions.md D-005@v1）。
> 它冻结机器接口 v1 的命令面、envelope schema、退出码、副作用声明、演进规则与待对账清单。
> 所有 JSON 示例均来自真实 CLI 输出（见每段末尾「来源命令」），非手编。
> 对应实现：`src/machine-interface.js`（buildEnvelope / runGate / runDerive / FACETS）+ `src/index.js` 路由。

---

## 1. 命令面（command surface）

机器接口对外暴露两个顶层子命令，均为**纯 CLI 子命令、无状态单次调用**（D-001@v1：不做长驻进程；D-007@v1：无生命周期契约）。

### 1.1 `sillyspec gate <stage> --change <name> [--json]`

聚合门控：回答「变更 `<name>` 的 `<stage>` 阶段**此刻**能否被标记完成？」，一次调用产出综合结论（`ok` + `checks` 数组）。daemon 无需理解内部校验链顺序。

```
用法: sillyspec gate <stage> --change <name> [--json]
  stage 取值: brainstorm | plan | execute | verify | archive | ...
  --change <name> 必填，变更目录名
  --json        选填；给出时 stdout 只输出单段 envelope JSON（无任何装饰文本），日志走 stderr
```

- **stage 取值**：与 `run <stage>` 一致，由 `src/stages/` 定义。常见为 `brainstorm` / `plan` / `execute` / `verify` / `archive`（及各阶段细分）。
- **聚合的 check 项**（checks 数组，逐项独立结论）：

  | check id | 适用阶段 | 复用实现 | 是否参与综合 ok |
  |---|---|---|---|
  | `artifacts` | 全部 | `runValidators(stage, cwd, change, { projectName, specRoot })` | 是 |
  | `transition` | 全部 | `checkTransition(currentStage, stage)` | 否（`informational: true`） |
  | `task-reviews` | execute | `validateTaskReviews`（含 git 真实性交叉校验，gitDir 优先 worktree） | 是 |
  | `execute-evidence` | execute | `checkExecuteCodeEvidence`（真实代码变更核验） | 是 |
  | `verify-test` | verify | `runVerifyTestCheck`（CLI 实测 local.yaml commands.test） | 是 |

- **综合结论**：`ok = 所有「非 informational」check 均 ok`。`transition` 标 `informational: true`，不参与综合 `ok`——daemon 可能在阶段推进前预查下一阶段，转换不合法不应把产物核验判为失败。
- **重叠去重（D-008@v1）**：execute 的 `artifacts` check 内部（`validateExecuteOutputs`）已含代码变更核验，与 `execute-evidence` 同源。实现层对 `checkExecuteCodeEvidence` 只调用一次、结果复用；两个 check 的结论不得矛盾。

### 1.2 `sillyspec derive <facet> --change <name> [--json]`

单项事实查询：针对变更 `<name>` 查询某一 facet 的结构化真实状态。daemon 用来做细粒度事实采集（如轮询 `execute-evidence` 判断代码是否变更）。

```
用法: sillyspec derive <facet> --change <name> [--json]
  facet 枚举: execute-evidence | verify-test | task-reviews | artifacts
  --change <name> 必填
  --json        选填，同上
```

- **facet 枚举（D-003@v1，白名单）**：

  | facet | 复用实现 | 返回 data 要点 |
  |---|---|---|
  | `execute-evidence` | `checkExecuteCodeEvidence` | `{ status, detail }`，status ∈ changed/unchanged/unknown |
  | `verify-test` | `runVerifyTestCheck` | `{ status, exitCode, durationMs, resultPath, mode?, fallbackReason? }`，status ∈ passed/failed/skipped；mode ∈ full/module-subset，fallbackReason 非 null 表示本次全量为非显式 fallback（仅供解读，不影响 ok 判定） |
  | `task-reviews` | `validateTaskReviews` | `{ ok, errors, warnings, requiredEvidence }` |
  | `artifacts` | `runValidators(currentStage, ...)` | `{ ok, errors, warnings }`；仅此 facet 会回填顶层 `stage`（产物校验绑定阶段语义） |

  非 `FACETS` 内的值（如 `nope`）属**非法 facet → exit 2**（见 §3、§5 真实示例）。

---

### 1.3 `sillyspec docs check [--paths <glob,...>] [--json]`（2026-08-15 docs-check-productize）

文档行号引用校验（原 dogfood 私有测试产品化）。只读、无状态单次调用。

- 扫描 local.yaml `docs-check.paths`（缺省 `docs/**/*.md`）或 `--paths` 覆盖的文档
- 两层校验：层1 存在性（文件存在 + 行号边界 + 候选解析三段回退）；层2 关键词断言（`docs-check.keywordAssert` 缺省开，反引号代码符号在 [start-2, end+5] 窗口）
- exit code：0 全绿 / 1 存在无效引用 / 2 配置错误（不支持的 glob 形态）
- `--json` 输出 `{ ok, total, invalid: [{doc, docLine, ref, reason}], warnings, kwChecked }`
- 实现：`src/docs-check.js`（runDocsCheck）；glob 手写 walker 零依赖，相对源码仓根展开（平台模式同锚）

## 2. envelope schema v1

所有机器接口 `--json` 的 stdout 输出统一结构（D-005@v1）。`--json` 模式下 stdout 无任何装饰文本；被调模块的人类可读打印在输出期间被局部劫持到 stderr（实现：`machine-interface.js emitJson`，try/finally 必然恢复）。

### 2.1 顶层固定字段

| 字段 | 类型 | 必出 | 说明 |
|---|---|---|---|
| `schema_version` | number | 是 | 固定 `1`（D-005@v1，演进见 §6） |
| `command` | string | 是 | `"gate"` 或 `"derive"` |
| `change` | string | 是 | 请求的变更名（即使不存在也原样回显） |
| `ok` | boolean | 是 | 综合结论（gate）或单项事实结论（derive） |
| `errors` | string[] | 是 | 各 check 的扁平汇总；非空 ⇒ exit 1/2 |
| `warnings` | string[] | 是 | 各 check 的扁平汇总；非空时仍可 exit 0 |
| `generated_at` | string | 是 | ISO-8601，`new Date().toISOString()` |
| `stage` | string | 按需 | gate 总出现；derive 仅 `artifacts` facet 出现 |
| `facet` | string | 按需 | derive 总出现（含非法 facet 回显） |
| `checks` | object[] | 按需 | 仅 gate 出现（见 §2.2） |
| `data` | object | 按需 | 仅 derive 出现（见 §1.2 各 facet 返回要点） |

> `errors` / `warnings` 是各 check 的扁平汇总——daemon 想省事可只看顶层 `ok` / `errors` / `warnings`，不必解析 `checks`。

### 2.2 checks 元素结构（gate）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | `artifacts` / `transition` / `task-reviews` / `execute-evidence` / `verify-test` |
| `ok` | boolean | 该项独立结论 |
| `errors` | string[] | 该项错误（非空 ⇒ 汇入顶层 errors） |
| `warnings` | string[] | 该项警告（非空 ⇒ 汇入顶层 warnings） |
| `informational` | boolean | 可选；仅 `transition` 标 `true` |
| `data` | object | 可选；`execute-evidence` / `verify-test` 携带结构化事实 |

### 2.3 informational 语义

`transition` check 标 `informational: true`：
- **不参与综合 `ok`**——综合结论只看 `!informational` 的 check（`ok = checks.filter(c => !c.informational).every(c => c.ok)`）。
- **但 `errors` 仍汇入顶层**——转换不合法时顶层 `errors` 会含转换原因（即便 `ok=true`）。daemon 若把顶层 errors 当硬阻断，需对 informational 项自行甄别；若只看 `ok`/退出码，则不受影响。

### 2.4 真实 JSON 示例（gate）

> 来源命令：`node "<WT>/bin/sillyspec.js" gate brainstorm --change 2026-07-09-machine-interface-v1 --json`
> 退出码：**exit 0**（ok=true，warnings 非空，informational transition 错误被汇入顶层但综合结论仍通过——印证 §2.3）

```json
{
  "schema_version": 1,
  "command": "gate",
  "change": "2026-07-09-machine-interface-v1",
  "ok": true,
  "errors": [
    "brainstorm 的前置阶段是 ，不能从 execute 跳转"
  ],
  "warnings": [
    "design.md 显式声明不涉及生命周期契约 — 已豁免「生命周期契约表」要求"
  ],
  "generated_at": "2026-07-09T13:04:17.908Z",
  "stage": "brainstorm",
  "checks": [
    {
      "id": "artifacts",
      "ok": true,
      "errors": [],
      "warnings": [
        "design.md 显式声明不涉及生命周期契约 — 已豁免「生命周期契约表」要求"
      ]
    },
    {
      "id": "transition",
      "ok": false,
      "informational": true,
      "errors": [
        "brainstorm 的前置阶段是 ，不能从 execute 跳转"
      ],
      "warnings": []
    }
  ]
}
```

> 说明：`errors[0]` 来自 `transition`（informational，不参与综合 ok），故顶层虽有 error 但 `ok=true`、exit 0。

### 2.5 真实 JSON 示例（derive execute-evidence）

> 来源命令：`node "<WT>/bin/sillyspec.js" derive execute-evidence --change 2026-07-09-machine-interface-v1 --json`
> 退出码：**exit 0**（status=changed）

```json
{
  "schema_version": 1,
  "command": "derive",
  "change": "2026-07-09-machine-interface-v1",
  "ok": true,
  "errors": [],
  "warnings": [],
  "generated_at": "2026-07-09T13:04:18.125Z",
  "facet": "execute-evidence",
  "data": {
    "status": "changed",
    "detail": "11 个已提交变更文件 + 未提交改动（base 7a99ddc2）"
  }
}
```

### 2.6 真实 JSON 示例（derive task-reviews，事实性阻断）

> 来源命令：`node "<WT>/bin/sillyspec.js" derive task-reviews --change 2026-07-09-machine-interface-v1 --json`
> 退出码：**exit 1**（ok=false，errors 非空，事实性阻断）

```json
{
  "schema_version": 1,
  "command": "derive",
  "change": "2026-07-09-machine-interface-v1",
  "ok": false,
  "errors": [
    "task-04: 缺少 review.json — task 未经过评审",
    "task-06: base..head（6b1c4396..6b1c4396）无任何代码变更 — 评审了一个零改动的任务，review 疑似伪造",
    "task-07: 缺少 review.json — task 未经过评审",
    "task-08: 缺少 review.json — task 未经过评审"
  ],
  "warnings": [],
  "generated_at": "2026-07-09T13:04:34.048Z",
  "facet": "task-reviews",
  "data": {
    "ok": false,
    "errors": [
      "task-04: 缺少 review.json — task 未经过评审",
      "task-06: base..head（6b1c4396..6b1c4396）无任何代码变更 — 评审了一个零改动的任务，review 疑似伪造",
      "task-07: 缺少 review.json — task 未经过评审",
      "task-08: 缺少 review.json — task 未经过评审"
    ],
    "warnings": [],
    "requiredEvidence": []
  }
}
```

> 说明：`data` 把同一份事实结构原样回显（含 `requiredEvidence`），与顶层 errors 同源，daemon 可二选一消费。

---

## 3. 退出码语义表（D-004@v1）

`gate` / `derive` 的进程退出码只允许三值（实现：`machine-interface.js` `process.exitCode = exitCode`）。

| 码 | 语义 | envelope 特征 | daemon 典型处置（design §3.5） |
|---|---|---|---|
| `0` | 核验通过（可含 warnings） | `ok=true`；errors 空（或仅 informational 项） | 推进到下一步 |
| `1` | 事实性阻断（JSON 含 errors） | `ok=false`；errors 非空（真实校验失败） | 反馈给子 agent 修复后重试 |
| `2` | 无法核验（用法错/变更不存在/环境错/内部异常） | `ok=false`；errors 含用法/环境/`internal:` 文案 | 报警人工介入，不盲目重试 |

**区分 1 与 2 是 driver 模式的关键**：1 是「事实上不通过」（重试有意义，改了代码/补了产物可能转 0）；2 是「没得出结论」（重试无意义，需先修用法/环境）。

### 3.1 exit 2 真实示例（非法 facet）

> 来源命令：`node "<WT>/bin/sillyspec.js" derive nope --change 2026-07-09-machine-interface-v1 --json`
> 退出码：**exit 2**（facet 不在白名单）

```json
{
  "schema_version": 1,
  "command": "derive",
  "change": "2026-07-09-machine-interface-v1",
  "ok": false,
  "errors": [
    "非法 facet: nope，合法值: execute-evidence, verify-test, task-reviews, artifacts"
  ],
  "warnings": [],
  "generated_at": "2026-07-09T13:04:34.173Z",
  "facet": "nope"
}
```

### 3.2 exit 2 真实示例（变更不存在）

> 来源命令：`node "<WT>/bin/sillyspec.js" gate brainstorm --change nonexistent-xyz --json`
> 退出码：**exit 2**（`ProgressManager.read` 返回 null）

```json
{
  "schema_version": 1,
  "command": "gate",
  "change": "nonexistent-xyz",
  "ok": false,
  "errors": [
    "变更不存在: nonexistent-xyz"
  ],
  "warnings": [],
  "generated_at": "2026-07-09T13:04:34.319Z",
  "stage": "brainstorm"
}
```

### 3.3 内部异常兜底（D-004@v1 / design §3.5）

`runGate` / `runDerive` 均包 `try/catch`，异常时仍产出合法 envelope：`{ ok: false, errors: ["internal: <message>"], ... }` 写到 stdout，**exit 2**。这保证 **stdout 永远是可 `JSON.parse` 的合法 JSON**——即便在内部异常场景下 daemon 也能解析 envelope（验收 design §9.4）。

---

## 4. 副作用声明（只读语义边界，D-002@v1）

`gate` / `derive` 是**只读核验**，实现上只调 `ProgressManager` 的读路径（`read` / `listChanges`），不调 `_write` / `completeStage`：

| 行为 | gate / derive | 说明 |
|---|---|---|
| 写 `sillyspec.db` | ❌ 不写 | 调用前后 db 文件 byte-identical（验收 design §9.3） |
| `triggerSync` | ❌ 不触发 | 无自动同步副作用 |
| 推进 step / stage | ❌ 不推进 | 状态推进仍走 `run <stage> --done`（agent）或平台显式调用（driver） |

> gate 不应成为绕过 `completeStep` 校验链的新写入路径（D-002@v1 理据）。

### 4.1 唯一例外：取证落盘（design §3.3）

`derive verify-test` 与 `gate verify` 会**真实执行测试**（`runVerifyTestCheck`），并把结果落盘到 `.runtime/verify-runs/<ts>/test-result.json`。这是**产物取证**，不是状态写入，与只读语义不冲突：
- 取证文件记录测试结果事实，供 daemon / 人工追溯；
- 它不进入 `sillyspec.db`、不推进进度。
- daemon 消费 `verify-test` 的 `data.resultPath` 即可定位该取证文件。

---

## 5. 慢命令与重复执行（D-009@v1）

### 5.1 verify-test 是慢命令

`runVerifyTestCheck` 会真实执行 `local.yaml` 的 `commands.test`，**时间上界 ≈ `TEST_TIMEOUT_MS`（约 10 分钟）**（`src/verify-postcheck.js`）。daemon exec 必须配置**不短于此的调用超时**，否则会把正在跑的测试当作卡死杀掉，得到 exit 2（无法核验）的误判。

### 5.2 重复执行行为

driver 流程中可能出现「daemon 先 `gate verify`（跑一次测试）→ 随后 `run verify --done`（又跑一次测试）」的测试翻倍（D-009@v1）。**P1 接受此行为**，理由：
- 测试幂等，两次执行各自落盘取证、可追溯；
- 避免过早设计缓存失效策略。

> 优化（`--reuse-last-run` 或结果 TTL 复用）**留到 P3** verify 反转试点，按真实耗时数据决定。

---

## 6. 演进规则（D-005@v1）

两仓库独立演进，JSON 契约靠 `schema_version` 不破裂：

| 变更类型 | 是否允许 | 要求 |
|---|---|---|
| 新增字段 | ✅ 随时 | 不 bump 版本；daemon 对未知字段应忽略（forward-compatible） |
| 改语义 / 删字段 | ⚠️ 受限 | 必须 bump `schema_version`；旧版本**至少保留一个 minor 周期** |

- 当前版本：`schema_version = 1`（常量 `SCHEMA_VERSION`，`machine-interface.js`）。
- 先例：`manifest.json` / `review.json` 均沿用 `schema_version` 模式。
- bump 版本时须同步更新本契约文档与 `docs/sillyspec/file-lifecycle.md`（见仓库 CLAUDE.md「文件生命周期文档同步」检查清单）。

---

## 7. TBD-hub-api 待对账清单

下列项需与 **SillyHub 仓库实际 API** 对齐后核对。当前按 REST 惯例先行实现，封装在单点便于后续只改一处。

| 待对账项 | 当前实现（待对齐） | 封装位置 | 备注 |
|---|---|---|---|
| platform approve 端点 | `POST {platform.url}/api/changes/{changeName}/approval`，body `{ decision: "approved" }` | `src/sync.js` `approve(changeName, cwd)` → 内部 `_submitApproval` | 成功后调 `ProgressManager._updateApprovalStatus()` 落 `approvals` 表 |
| platform reject 端点 | 同端点，body `{ decision: "rejected", reason }` | `src/sync.js` `reject(changeName, cwd, reason)` → `_submitApproval` | `reason` 可选 |
| approve/reject 失败语义 | 网络失败 ⇒ warning + **exit 1**（显式用户/daemon 动作，失败必须可见，不同于 best-effort 自动 sync） | `src/sync.js` | 沿用既有 `fetchJson` 超时/告警风格 |
| fetch 风格 | 超时 / 告警 | `src/sync.js` `fetchJson` | 与既有自动 sync 同源 |

> **对齐动作**：待 SillyHub 仓库实际 API 形态确定后，**只改 `src/sync.js` 的 `_submitApproval`（端点 URL + body 字段）这一处**；本契约文档同步修订本表。端点/字段以 SillyHub 为准。

---

## 附：真实 CLI 输出来源（证明示例非手编）

以下命令在主仓库 `C:/Users/qinyi/IdeaProjects/sillyspec` 下、调用 worktree 的 bin 执行，输出即本文档 §2.4–§2.6、§3.1–§3.2 示例来源：

```bash
WT="C:/Users/qinyi/IdeaProjects/sillyspec/.sillyspec/.runtime/worktrees/2026-07-09-machine-interface-v1"
node "$WT/bin/sillyspec.js" gate brainstorm --change 2026-07-09-machine-interface-v1 --json       # exit 0
node "$WT/bin/sillyspec.js" derive execute-evidence --change 2026-07-09-machine-interface-v1 --json  # exit 0
node "$WT/bin/sillyspec.js" derive task-reviews --change 2026-07-09-machine-interface-v1 --json     # exit 1
node "$WT/bin/sillyspec.js" derive nope --change 2026-07-09-machine-interface-v1 --json             # exit 2（非法 facet）
node "$WT/bin/sillyspec.js" gate brainstorm --change nonexistent-xyz --json                         # exit 2（变更不存在）
```

退出码独立捕获确认（重定向到 `/dev/null` 后取 `$?`）：
- `gate brainstorm`（ok=true）→ `exit=0`
- `derive execute-evidence`（ok=true）→ `exit=0`
- `derive task-reviews`（ok=false，阻断）→ `exit=1`
- `derive nope`（非法 facet）→ `exit=2`
- `gate brainstorm nonexistent-xyz`（变更不存在）→ `exit=2`
