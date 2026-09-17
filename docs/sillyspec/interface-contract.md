---
author: qinyi
created_at: 2026-07-09T13:05:00+08:00
updated_at: 2026-09-17T22:40:00+08:00
schema_version: 1
---

# 机器接口契约 v1（interface-contract.md）

> 本文档是 SillySpec ↔ SillyHub 两仓库的**对账基准**（decisions.md D-005@v1）。
> 它冻结机器接口 v1 的命令面、envelope schema、退出码、副作用声明、演进规则与待对账清单。
> 所有 JSON 示例均来自真实 CLI 输出（见每段末尾「来源命令」），非手编。
> 对应实现：`src/machine-interface.js`（buildEnvelope / runGate / runDerive / runStatusOverview / FACETS）+ `src/diagnostic-codes.js`（码表单一源）+ `src/index.js` 路由。
> v1 存续期内的语义变更公开记账于 §9（Known-inconsistencies 式披露）。

---

## 1. 命令面（command surface）

机器接口对外暴露三个顶层子命令，均为**纯 CLI 子命令、无状态单次调用**（D-001@v1：不做长驻进程；D-007@v1：无生命周期契约）：`gate` / `derive` / `progress show`（后者经 `sillyspec progress show --json` 出口，见 §1.4）。

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
  | `design-file-list` | brainstorm | `validateDesignFileList`（design 文件清单行级核验；核验自身异常 fail-open 不误拦） | 是 |
  | `transition` | 全部 | `checkTransition(currentStage, stage, { fromStageData })` | **是**（与 `completeStep` 硬阻断一致——语义变更记录见 §9 条目 1） |
  | `task-reviews` | execute | `validateTaskReviews`（含 git 真实性交叉校验，gitDir 优先 worktree） | 是 |
  | `execute-evidence` | execute | `checkExecuteCodeEvidence`（真实代码变更核验） | 是 |
  | `verify-test` | verify | `runVerifyTestCheck`（CLI 实测 local.yaml commands.test） | 是 |

- **综合结论**：`ok = 所有「非 informational」check 均 ok`。现行实现没有任何 check 标 `informational`——`transition` **参与**综合 `ok`（与 `run <stage> --done` 的 `checkTransition` 硬阻断同源：gate 绿则 --done 不应因转换被拦，防 gate/run 判定分裂）。
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

  非 `FACETS` 内的值（如 `nope`）属**非法 facet → exit 2**（见 §3、§3.1 真实示例）。

### 1.3 `sillyspec docs check [--paths <glob,...>] [--json]`（2026-08-15 docs-check-productize）

文档行号引用校验（原 dogfood 私有测试产品化）。只读、无状态单次调用。

- 扫描 local.yaml `docs-check.paths`（缺省 `docs/**/*.md` + `.sillyspec/docs/**/*.md`——scan/modules 产物同纳入，2026-08-16 用户裁决：文档失效就该暴露，不靠显式 opt-in）或 `--paths` 覆盖的文档
- 两层校验：层1 存在性（文件存在 + 行号边界 + 候选解析三段回退）；层2 关键词断言（`docs-check.keywordAssert` 缺省开，反引号代码符号在 [start-2, end+5] 窗口）
- exit code：0 全绿 / 1 存在无效引用 / 2 配置错误（不支持的 glob 形态）
- `--json` 输出 `{ ok, total, invalid: [{doc, docLine, ref, reason, suggest}], warnings, kwChecked }`（`suggest` = 失效引用的建议行号：token 在候选文件命中行，供人工确认改锚）
- 实现：`src/docs-check.js`（runDocsCheck）；glob 手写 walker 零依赖，相对源码仓根展开（平台模式同锚）

### 1.3b `sillyspec docs gate [--init-baseline] [--paths <glob,...>] [--json]`（2026-08-15 doc-consistency-debt 第七节）

docs check 的 ratchet 门：**欠账只许减少不许增加**。挂进 pre-push/CI 用；失效数 ≤ 基线放行、超基线拦。

- 基线文件 `.sillyspec/docs-check-baseline`（纯数字一行，可手工改）
- 首次使用必须显式 `--init-baseline` 以当前实测数立基线（不悄悄合法化存量，fail-closed）；幂等，重跑覆盖——清偿后重跑即下调基线锁住成果
- **陈旧基线自动重锚**（2026-09-17 docs-bracket-reanchor）：基线已存在且 current > baseline 时先实测远端基准（origin/main 优先）——本次不劣于实测值即放行（exit 0），并**自动以当前实测数重锚落盘 + 消息披露重锚前后值与依据**（棘轮只紧不松：新基线 = current ≤ 远端实测，每分增量都有实测背书；陈旧提示与远端实测各只发生一次，同态复跑即走快路径）。守卫边界：`--paths` 等 checkOpts 一次性口径覆盖（paths / skip / keywordAssert / crossRepoRoots 四键）不自动重锚——异口径计数写盘会错调基线，维持手动 `--init-baseline` 建议；local.yaml 持久口径不受限（远端实测与本次计数同读该配置）。红线不变：首次立线仍 fail-closed，快路径（≤基线）与真增量拦截（劣于远端实测或实测不可用，exit 1）语义不变
- exit code：0 过（≤基线）/ 1 拦（>基线，报新增数）/ 2 无基线或基线损坏或配置错误
- `--json` 输出 `{ exitCode, ok, current, baseline, delta, message, inited, reanchored }`（reanchored：本次是否触发自动重锚；true 时 baseline 字段返回重锚后的新值）
- 未知 flag 直接 exit 2（白名单：`--init-baseline` / `--paths` / 全局 `--json`）
- 设计边界：**behind（commit 数）不参与 gate**——源码活跃不代表卡错，代理信号只配 advisory；gate 只信 docs check 的直接失效数
- 实现：`src/docs-gate.js`（evaluateRatchet 纯判定 + runDocsGate IO 面）；文档引导挂接（不 init 自动注入 hook，往用户仓装 git hook 是侵入性动作）：`echo 'sillyspec docs gate' >> .husky/pre-push` 或 CI 一步

### 1.4 `sillyspec progress show [--json]`（全局状态总览，2026-09-02 跨 agent 协作改进 P0-1；2026-09-17-mi-diagnostic-codes 入约）

全局状态总览：全部活跃变更列表 + 各自阶段/步骤进度 + ghost/stall 标记。与 gate/derive（单变更粒度）互补——回答「这个项目现在有谁在动哪些变更」，供 SillyHub 面板 / 跨 agent 消费。

```
用法: sillyspec progress show [--json] [--change <name>]
  --json  选填；给出时 stdout 输出单段 envelope JSON（command: "progress show"）
```

- **信封**：`ok` 恒为 true（总览本身成功即成功，exit 0）；ghost 变更与未决同步冲突升 `warnings`（不阻断 ok——它们是待清理事实，不是总览失败）。
- **data 形状**（组装单点 `StageMachine.overview`）：`{ project, active_changes, changes: [{ name, readable, ghost, current_stage, stage_label, last_active, stages: {<stage>: {status, steps_total, steps_completed}}, steps, stall? }], pending_conflicts }`。
- **退出码**：0 总览成功（含空列表）/ 2 无法核验（进度库不存在——只读契约不建库，codes `db_missing`）。
- **只读契约**：同 gate/derive（§4），仅 ProgressManager 读路径。

## 2. envelope schema v1

所有机器接口 `--json` 的 stdout 输出统一结构（D-005@v1）。`--json` 模式下 stdout 无任何装饰文本；被调模块的人类可读打印在输出期间被局部劫持到 stderr（实现：`machine-interface.js emitJson`，try/finally 必然恢复）。

### 2.1 顶层固定字段

| 字段 | 类型 | 必出 | 说明 |
|---|---|---|---|
| `schema_version` | number | 是 | 固定 `1`（D-005@v1，演进见 §6） |
| `command` | string | 是 | `"gate"` / `"derive"` / `"progress show"` |
| `change` | string | gate/derive 必出 | 请求的变更名（即使不存在也原样回显）；`progress show` 无此键 |
| `ok` | boolean | 是 | 综合结论（gate）或单项事实结论（derive）或总览成功（progress show） |
| `errors` | string[] | 是 | 各 check 的扁平汇总；非空 ⇒ exit 1/2。**中文散文，非稳定契约面——程序化分支请用 `codes`** |
| `warnings` | string[] | 是 | 各 check 的扁平汇总；非空时仍可 exit 0 |
| `codes` | string[] | 三面主路径 | 稳定诊断码（snake_case，见 §8 目录）：gate=失败 check 的 code 按出现序**去重聚合**（**非与 errors 逐下标 1:1**——多条 errors 可共享一个 check 级码，逐条归因读 `checks[].code`）；derive=facet 失败面单码、成功空数组；信封级错误路径（exit 2）单码。成功且无失败时为 `[]`。2026-09-17 加法式增补，可选键遵循 optional-once（`!== undefined` 才挂） |
| `generated_at` | string | 是 | ISO-8601，`new Date().toISOString()` |
| `stage` | string | 按需 | gate 总出现；derive 仅 `artifacts` facet 出现 |
| `facet` | string | 按需 | derive 总出现（含非法 facet 回显） |
| `checks` | object[] | 按需 | 仅 gate 出现（见 §2.2） |
| `data` | object | 按需 | 仅 derive / progress show 出现 |

> `errors` / `warnings` 是各 check 的扁平汇总——daemon 想省事可只看顶层 `ok` / `errors` / `warnings`，不必解析 `checks`。需要按错误类型分支时消费 `codes`（稳定身份，文案演进不影响）。

### 2.2 checks 元素结构（gate）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | `artifacts` / `design-file-list` / `transition` / `task-reviews` / `execute-evidence` / `verify-test` |
| `code` | string | 该 check 的失败身份码（见 §8）——**恒在场（通过时也在场），是身份码不是失败标志；失败判定唯一看 `ok`** |
| `ok` | boolean | 该项独立结论 |
| `errors` | string[] | 该项错误（非空 ⇒ 汇入顶层 errors） |
| `warnings` | string[] | 该项警告（非空 ⇒ 汇入顶层 warnings） |
| `data` | object | 可选；`execute-evidence` / `verify-test` 携带结构化事实 |

### 2.3 transition 参与综合 ok（2026-09-17 语义，变更溯源见 §9 条目 1）

`transition` check **参与综合 `ok`**（现行实现不写 `informational` 键）：

- **综合结论只看全部 check**——`transition` 不合法 ⇒ `ok=false`、exit 1，与 `run <stage> --done` 的 `checkTransition` 硬阻断**同源一致**（防「gate 绿、--done 红」判定分裂：daemon 据 gate exit 0 让 agent 推进，却被子进程硬阻断）。
- **daemon 预查下一阶段**：若只想预查产物完备性而容忍当前转换不合法，请自行忽略 `transition` check 的结论（按 `checks[].id === 'transition'` 过滤），不要依赖不存在的 informational 语义。

### 2.4 真实 JSON 示例（gate，transition 阻断）

> 来源命令：`node "<WT>/bin/sillyspec.js" gate brainstorm --change 2026-09-17-mi-diagnostic-codes --json --dir <主仓根>`（2026-09-17 采样）
> 退出码：**exit 1**（ok=false——transition 参与 ok：变更在 execute 阶段，brainstorm 转换不合法；artifacts 与 design-file-list 两 check 通过但 code 恒在场）

```json
{
  "schema_version": 1,
  "command": "gate",
  "change": "2026-09-17-mi-diagnostic-codes",
  "ok": false,
  "errors": [
    "brainstorm 的前置阶段是 ，不能从 execute 跳转"
  ],
  "warnings": [
    "design.md 显式声明不涉及生命周期契约 — 已豁免「生命周期契约表」要求"
  ],
  "codes": ["transition_blocked"],
  "generated_at": "2026-09-17T14:36:12.000Z",
  "stage": "brainstorm",
  "checks": [
    {
      "id": "artifacts",
      "code": "artifacts_invalid",
      "ok": true,
      "errors": [],
      "warnings": [
        "design.md 显式声明不涉及生命周期契约 — 已豁免「生命周期契约表」要求"
      ]
    },
    {
      "id": "design-file-list",
      "code": "design_file_ref_invalid",
      "ok": true,
      "errors": [],
      "warnings": []
    },
    {
      "id": "transition",
      "code": "transition_blocked",
      "ok": false,
      "errors": [
        "brainstorm 的前置阶段是 ，不能从 execute 跳转"
      ],
      "warnings": []
    }
  ]
}
```

> 说明：`codes` 只含失败 check 的码（聚合非 1:1）；通过的 check（artifacts/design-file-list）也带 `code`（身份码恒在场）。exit 1 ⇒ daemon 反馈修复后重试（§3）。

### 2.5 真实 JSON 示例（derive execute-evidence）

> 来源命令：`node "<WT>/bin/sillyspec.js" derive execute-evidence --change 2026-09-17-mi-diagnostic-codes --json --dir <主仓根>`（2026-09-17 采样）
> 退出码：**exit 0**（status=changed；成功路径 `codes` 为空数组）

```json
{
  "schema_version": 1,
  "command": "derive",
  "change": "2026-09-17-mi-diagnostic-codes",
  "ok": true,
  "errors": [],
  "warnings": [],
  "generated_at": "2026-09-17T14:36:12.631Z",
  "facet": "execute-evidence",
  "data": {
    "status": "changed",
    "detail": "0 个已提交变更文件 + 未提交改动（base 51225ae0）"
  },
  "codes": []
}
```

### 2.6 真实 JSON 示例（derive task-reviews，事实性阻断；v1 初期历史采样）

> 来源命令：`node "<WT>/bin/sillyspec.js" derive task-reviews --change 2026-07-09-machine-interface-v1 --json`（2026-07-09 历史采样）
> 退出码：**exit 1**（ok=false，errors 非空，事实性阻断）
> 历史注记：本示例采样于 2026-07-09（v1 初期），**早于 `codes` 键增补（2026-09-17）**——现行同场景发射 `codes: ["task_reviews_invalid"]`，现行成功/阻断/exit-2 面的带码示例见 §2.4/§2.5/§3.1/§3.2。

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

`gate` / `derive` / `progress show` 的进程退出码只允许三值（实现：`machine-interface.js` `process.exitCode = exitCode`）。

| 码 | 语义 | envelope 特征 | daemon 典型处置（design §3.5） |
|---|---|---|---|
| `0` | 核验通过（可含 warnings） | `ok=true`；errors 空；`codes` 空数组 | 推进到下一步 |
| `1` | 事实性阻断（JSON 含 errors） | `ok=false`；errors 非空（真实校验失败）；`codes` 含失败面码 | 反馈给子 agent 修复后重试 |
| `2` | 无法核验（用法错/变更不存在/环境错/内部异常） | `ok=false`；errors 含用法/环境/`internal:` 文案；`codes` 为单码（`db_missing`/`change_not_found`/`unknown_facet`/`internal_error`，见 §8） | 报警人工介入，不盲目重试 |

**区分 1 与 2 是 driver 模式的关键**：1 是「事实上不通过」（重试有意义，改了代码/补了产物可能转 0）；2 是「没得出结论」（重试无意义，需先修用法/环境）。

### 3.1 exit 2 真实示例（非法 facet）

> 来源命令：`node "<WT>/bin/sillyspec.js" derive nope --change 2026-09-17-mi-diagnostic-codes --json --dir <主仓根>`（2026-09-17 采样）
> 退出码：**exit 2**（facet 不在白名单）

```json
{
  "schema_version": 1,
  "command": "derive",
  "change": "2026-09-17-mi-diagnostic-codes",
  "ok": false,
  "errors": [
    "非法 facet: nope，合法值: execute-evidence, verify-test, task-reviews, artifacts"
  ],
  "warnings": [],
  "generated_at": "2026-09-17T14:36:54.635Z",
  "facet": "nope",
  "codes": ["unknown_facet"]
}
```

### 3.2 exit 2 真实示例（变更不存在）

> 来源命令：`node "<WT>/bin/sillyspec.js" gate brainstorm --change nonexistent-xyz --json --dir <主仓根>`（2026-09-17 采样）
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
  "generated_at": "2026-09-17T14:37:02.900Z",
  "stage": "brainstorm",
  "codes": ["change_not_found"]
}
```

### 3.3 内部异常兜底（D-004@v1 / design §3.5）

`runGate` / `runDerive` / `runStatusOverview` 均包 `try/catch`，异常时仍产出合法 envelope：`{ ok: false, errors: ["internal: <message>"], codes: ["internal_error"], ... }` 写到 stdout，**exit 2**。这保证 **stdout 永远是可 `JSON.parse` 的合法 JSON**——即便在内部异常场景下 daemon 也能解析 envelope（验收 design §9.4）。

---

## 4. 副作用声明（只读语义边界，D-002@v1）

`gate` / `derive` / `progress show` 是**只读核验**，实现上只调 `ProgressManager` 的读路径（`read` / `listChanges` / `overview`），不调 `_write` / `completeStage`：

| 行为 | gate / derive / progress show | 说明 |
|---|---|---|
| 写 `sillyspec.db` | ❌ 不写 | 调用前后 db 文件 byte-identical（验收 design §9.3）；db 不存在时 fail-closed 返回 exit 2（codes `db_missing`），不为其建库 |
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
| 新增字段 | ✅ 随时 | 不 bump 版本；daemon 对未知字段应忽略（forward-compatible）。先例：`codes` / `checks[].code`（2026-09-17 加法式增补，本文件 §2.1/§2.2/§8） |
| 改语义 / 删字段 | ⚠️ 受限 | 必须 bump `schema_version`；旧版本**至少保留一个 minor 周期**。语义级变更在 v1 存续期内已发生的一例（transition 参与 ok）公开记账于 §9，冻结版内不静默改语义 |

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

## 8. 诊断码目录（Diagnostic Codes）

> 单一源：`src/diagnostic-codes.js`（`DIAGNOSTIC_CODES` 冻结表）。本目录与码表**双向 parity**（`test/diagnostic-codes-parity.test.mjs`：注册码 ⊆ 本目录 ∧ 本目录码 ⊆ 注册表）——单侧漂移即 CI 红。扩码走变更流程追加，本表外不得出现新码。
> 覆盖边界（首期）：machine-interface 三面（gate/derive/progress show）**自产错误**。check 内部逐条 validator 的中文散文不逐条编码（码标识失败面，不标识每条消息）。

| 诊断码 | surface | exit 语义 | 触发条件 |
|---|---|---|---|
| `db_missing` | gate / derive / progress show | 2 | 进度库不存在（只读契约：不为其建库，fail-closed） |
| `change_not_found` | gate / derive | 2 | 变更名在进度库无记录 |
| `unknown_facet` | derive | 2 | facet ∉ FACETS 白名单（用法错） |
| `internal_error` | gate / derive / progress show | 2 | 内部异常兜底（stdout 仍为合法 JSON） |
| `artifacts_invalid` | gate / derive | 1 | runValidators 失败（gate artifacts check 与 derive artifacts facet 同源） |
| `design_file_ref_invalid` | gate | 1 | design 文件清单行级核验失败（直承 design-facts 既有稳定码） |
| `transition_blocked` | gate | 1 | checkTransition 不允许（含 failed_post_check 门控） |
| `execute_evidence_unchanged` | gate / derive | 1 | base..head 无代码变更（checkbox ≠ implementation） |
| `task_reviews_invalid` | gate / derive | 1 | validateTaskReviews 失败（review.json 缺失/schema/verdict=fail） |
| `verify_test_failed` | gate / derive | 1 | commands.test 实测失败 |

---

## 9. v1 存续期语义变更记录（Known-inconsistencies 式披露）

> 冻结版内不静默改语义：凡 v1 存续期内「行为可观察差异」的语义级变更在此逐条记账（格式类勘误不入本节）。正文（§1–§8）永远描述现行语义，本节是变更溯源。

**条目 1：transition 从「informational 不参与综合 ok」改为「参与综合 ok」（2026-09-17 对账收口，change 2026-09-17-mi-diagnostic-codes）**

- **旧语义**（本文档 2026-07-09 初版 §2.3）：`transition` check 标 `informational: true`，不参与综合 `ok`——转换不合法时 `ok=true`、exit 0，顶层 errors 仍含转换原因。
- **新语义**（现行，§2.3）：`transition` 参与综合 `ok`——转换不合法 ⇒ `ok=false`、**exit 1**。
- **变更动因**：实现侧（`machine-interface.js`）与 `run <stage> --done` 的 `checkTransition` 硬阻断对齐——旧语义下 daemon 据 gate exit 0 判「可推进」，agent 执行 `--done` 却被 runStage 硬阻断（exit 1），gate/run 判定分裂（原 change design §8 已记此漂移）。
- **消费侧影响评估（SillyHub，2026-09-17 实证）**：`backend/app/modules/daemon/run_sync/service/gate.py` 按 `exit_code` 三分支（0 推进 / 1 打回 / 2 卡住，design §5.4），不读 `informational`、无 transition 特判、errors 按不透明串转发——**旧语义下非法转移会被 exit 0 判「推进」属错决策，新语义（exit 1 → 打回）与消费方决策模型一致且更有利**；全仓 grep 证实无按旧语义分支的隐藏消费点。
- **实现时间线**：代码先行（2026-07-26 refactor W0-W5 期间已按参与 ok 实现，注释钉死动因），本文档 2026-09-17 对账跟改——漂移窗口内本文档 §2.3 旧描述不作为消费依据。

---

## 附：真实 CLI 输出来源（证明示例非手编）

§2.4/§2.5/§3.1/§3.2 示例在主仓库 `C:/Users/qinyi/IdeaProjects/sillyspec` 下、调用 worktree 的 bin 执行（2026-09-17 采样）；§2.6 为 2026-07-09 历史采样（含历史注记）：

```bash
WT="C:/Users/qinyi/IdeaProjects/sillyspec/.sillyspec/.runtime/worktrees/2026-09-17-mi-diagnostic-codes"
node "$WT/bin/sillyspec.js" gate brainstorm --change 2026-09-17-mi-diagnostic-codes --json --dir "$MAIN"    # exit 1（transition 阻断，参与 ok）
node "$WT/bin/sillyspec.js" derive execute-evidence --change 2026-09-17-mi-diagnostic-codes --json --dir "$MAIN"  # exit 0
node "$WT/bin/sillyspec.js" derive nope --change 2026-09-17-mi-diagnostic-codes --json --dir "$MAIN"       # exit 2（非法 facet，codes=unknown_facet）
node "$WT/bin/sillyspec.js" gate brainstorm --change nonexistent-xyz --json --dir "$MAIN"                   # exit 2（变更不存在，codes=change_not_found）
node "$WT/bin/sillyspec.js" progress show --json --dir "$MAIN"                                             # exit 0（command=progress show，codes=[]）
```

退出码独立捕获确认（重定向后取 `$?`）：gate brainstorm（ok=false，transition 阻断）→ `exit=1`；derive execute-evidence（ok=true）→ `exit=0`；derive nope → `exit=2`；gate nonexistent-xyz → `exit=2`；progress show → `exit=0`。
