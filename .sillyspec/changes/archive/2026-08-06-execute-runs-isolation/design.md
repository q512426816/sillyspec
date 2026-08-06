---
author: qinyi
created_at: 2026-08-06 13:49:02
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— execute-runs/stage-reviews 与 worktree 生命周期解耦

> **生命周期契约：不适用（N/A）**——本变更仅改 `.runtime` 路径解析公式（runtimeRoot 落点），不引入 / 不修改 session / lease / agent_run / daemon / claim / heartbeat 等生命周期事件的状态流转与契约；execute-runs / stage-reviews 文件的"存活周期"由落盘位置（主仓 `.runtime`）决定，不涉及状态机事件。

## §1 背景

### 1.1 事故
worktree cleanup（`src/worktree.js:698-820` `cleanup()` 内 `rmSync(worktreePath, { recursive: true, force: true })`）整目录删除 worktree 物理目录时，连带吃掉落在 worktree 内 `.sillyspec/.runtime/execute-runs/<runId>/tasks/<task>/review.json` 与 `stage-reviews/<stage>-<runId>/` 的文件态。这些文件是：

- **execute Task Review Gate** 的真相源（`validateCheckedTaskReviews` / `validateTaskReviews` 读磁盘 `review.json`，gates.js:111-118 / 314-343）；
- **Stage Review Gate** 的真相源（`validateStageReview` 读 `stage-reviews/<stage>-<runId>/review.json`，gates.js:271-291）。

事故链（坑 1-4，源自 change `2026-08-06-sillyspec-self-tooling-fixes`）：
1. agent 在 worktree 内跑 execute → runtimeRoot 解析落 `<worktree>/.sillyspec/.runtime` → task review.json 写进副本；
2. worktree cleanup 整目录删 → review.json 物理消失；
3. archive step1 完成度 gate（真相源 = 磁盘 review.json）找不到文件 → 阻断；
4. 用户被迫事后批量补 review.json（手动 marker + 子代理重写），违反"真相源 = 落盘文件"铁律。

### 1.2 既有半截修复
`detectWorktreeSpecDrift`（`src/run/shared.js:234-255`）已能识别"specBase 命中 worktree 内 checkout 出来的 .sillyspec 副本"；`src/run/command.js:536-546` drift 守卫命中时已自动锚回主仓：

```js
// command.js:536-546（现状）
if (!platformOpts.specRoot && !specDir
    && ['plan', 'execute', 'verify', 'archive'].includes(stageName)) {
  const wt = detectWorktreeSpecDrift(specBase)
  if (wt) {
    specBase = wt.mainSpecBase      // ← 只改 command.js 本地变量
    specRoot = wt.mainSpecBase      // ← 同上
    specDir = wt.mainSpecBase       // ← 同上
    pm = new ProgressManager({ specDir: specRoot })  // ← pm 重建落主仓
    console.warn(`⚠️ 已自动锚定主仓 spec：${wt.mainSpecBase} ...`)
  }
}
```

进度（progress.db）因此正确落主仓。**但 runtimeRoot 解析漏改**——下游 dispatch（`command.js:783` `completeStep` / `:787` `runStage`）传出去的 `platformOpts` 对象，其 `specRoot` / `runtimeRoot` 字段仍是 `null`，`cwd` 仍是 worktree。下游 13 处站点用同形公式 `platformOpts?.runtimeRoot || join(<specBase>, '.runtime')` 重算 specBase（从 cwd）→ 仍落 `<worktree>/.sillyspec/.runtime` → review.json 写进副本 → cleanup 整目录删 → 阻断。

## §2 根因（Explore 调研已定，本节仅固定结论）

| 编号 | 根因 | 代码位置 |
|---|---|---|
| RC-1 | drift 守卫半截：重写本地 `specBase/specRoot/specDir/pm`，**漏设 `platformOpts` 任何字段** | `src/run/command.js:536-546` |
| RC-2 | dispatch 传出的 `platformOpts`（specRoot/runtimeRoot 仍 null）+ `cwd`（仍 worktree）未纠正 | `src/run/command.js:783`（completeStep）/ `:787`（runStage） |
| RC-3 | 下游 runtimeRoot 解析同形公式 `platformOpts?.runtimeRoot \|\| join(<specBase>, '.runtime')`，其中 `<specBase>` 从 `cwd`（worktree）重算 → 落 worktree | 13 处站点（见 §5） |
| RC-4 | cleanup `rmSync(worktreePath, { recursive: true, force: true })` 整目录删，含 `.sillyspec/.runtime/` 全部子目录 | `src/worktree.js:767`（cleanup 主体）/ `:358`（force 分支）/ `:792`（meta）/ `:990`/`:1001`（doctor stale） |

**关键洞察**：drift 守卫改的 `specBase` 是 `command.js` 的**局部变量**；下游 `gates.js` / `stage.js` / `complete.js` / `prompt.js` / `task-review.js` 等被调用函数**各自重算**自己的 `specBase`（如 `stage.js:82` `const execSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')`），看不到 command.js 的局部改动。要让下游也落主仓，必须经 `platformOpts`（跨函数传递的对象）或 `cwd` 纠正——本设计选 `platformOpts` 加新字段（D-02，理由见 §12）。

## §3 方案对比

### 方案 A（采用）specDriftAnchor 补全 drift 守卫
- **思路**：drift 守卫命中时，在 `platformOpts` 上追加一个**新字段** `specDriftAnchor = wt.mainSpecBase`（不直接设 `specRoot`/`runtimeRoot`）；13 处 runtimeRoot 解析公式统一改为先查 `specDriftAnchor`：
  ```js
  const runtimeRoot = platformOpts?.runtimeRoot
    || (platformOpts?.specDriftAnchor ? join(platformOpts.specDriftAnchor, '.runtime')
                                      : join(specBase, '.runtime'))
  ```
- **效果**：execute-runs / stage-reviews 从落盘起即在主仓 `.runtime`，cleanup 物理碰不到。
- **优势**：
  - 治本（堵源头 runtimeRoot 解析，而非下游打补丁）；
  - 最小侵入（只加 1 个字段 + 改公式，无控制流变更）；
  - 无 sentinel 副作用（`specDriftAnchor` 语义独立，只影响 runtimeRoot 解析；`specRoot||runtimeRoot` 形式的平台判定不受影响）；
  - 多 change 无冲突（marker 已按 change 隔离，见 §6）。

### 方案 B（否决）cleanup salvage execute-runs 到主仓
- **思路**：cleanup 前扫描 worktree `.runtime/execute-runs` + `stage-reviews`，salvage（搬运）到主仓。
- **否决理由**：
  1. **不治本**：cleanup 共 9 处调用点（见 §5.C），外加 `git worktree remove`（外部命令）/ 手动 `rm -rf` / worktree 目录损坏 / `doctor --fix stale`（worktree.js:1017）都绕过 salvage；root cause（runtimeRoot 指 worktree）仍在，下次仍重发。
  2. **原子性 / 失败处理复杂**：salvage 本身可能失败（跨盘移动、文件占用、部分搬迁），需要事务 / 回滚 / 幂等重试，引入新失败模式。
  3. **语义错位**：salvage 默认"worktree 内的 review.json 是权威"，但 drift 场景下 worktree 内本就不该有 review.json——正确做法是让它根本不落 worktree。

### 决策
- **D-01 采用方案 A**（specDriftAnchor），**D-03 否决方案 B**（理由见上，详见 §12）。

## §4 接口定义

### 4.1 新增字段：`platformOpts.specDriftAnchor`
```ts
type PlatformOpts {
  specRoot?: string | null         // 既有：平台模式 spec 根（sentinel：触发 sync/approval/platform 分支）
  runtimeRoot?: string | null      // 既有：平台模式运行时根（同 sentinel）
  scanRunId?: string | null        // 既有：scan 运行 id
  specDriftAnchor?: string | null  // 【新增】drift 命中时的主仓 specBase；仅参与 runtimeRoot 解析，不触发平台 sentinel
}
```

**字段语义边界（重要）**：
- `specRoot` / `runtimeRoot`：**平台模式 sentinel**——凡检查 `platformOpts?.specRoot || platformOpts?.runtimeRoot` 的位置（`shared.js:288` triggerSync / `:315` checkApproval / `prompt.js:217/306/556/597` 平台分支渲染 / `complete-handlers.js` 多处 / `scan-postcheck.js`），都视为"处于平台模式"，会跳过本地 sync/approval、切平台渲染分支。**绝不能为纠正 drift 而设这俩**——否则 drift 场景误进平台分支。
- `specDriftAnchor`：**drift 纠正锚点**——只在 runtimeRoot 解析公式里被消费，把 `.runtime` 落点重定向到主仓；不参与任何 sentinel 判定。

### 4.2 runtimeRoot 解析新公式（统一）
```js
function resolveRuntimeRoot(platformOpts, localSpecBase) {
  if (platformOpts?.runtimeRoot) return platformOpts.runtimeRoot           // 平台模式优先
  if (platformOpts?.specDriftAnchor)                                        // drift 命中
    return join(platformOpts.specDriftAnchor, '.runtime')
  return join(localSpecBase, '.runtime')                                    // 常规本地
}
```
> 实现可内联（每站点 3 行）或抽工具函数（推荐，见 §7.DRY）。本设计建议抽 `src/run/shared.js` 新增 `resolveRuntimeRoot(platformOpts, localSpecBase)` 工具函数，13 站点统一调用，避免公式漂移（R-01）。

## §5 runtimeRoot 站点清单（逐字 file:line）

> 经 `grep -rn runtimeRoot src/` 全量核实。用户调研给出的"13 处"为约数（Explore 阶段口径）；实际清单按改动类型分 3 类。**§5.A 是核心改动（11 处公式站点 + 3 处 contract-matrix 参数站点）**，§5.B 是调用方修正，§5.C 是不改的消费 / 透传站点（列出供核对）。

### §5.A 解析公式站点（需改公式，加 specDriftAnchor 分支）

| # | 文件:行 | 现状公式 | 改动 |
|---|---|---|---|
| A-01 | `src/run/gates.js:111` | `platformOpts?.runtimeRoot \|\| join(specBase, '.runtime')` | 改公式（enforceReviewJsonGate） |
| A-02 | `src/run/gates.js:271` | `platformOpts?.runtimeRoot \|\| join(effectiveSpecBase, '.runtime')` | 改公式（Stage Review Gate 读 marker） |
| A-03 | `src/run/gates.js:314` | `platformOpts?.runtimeRoot \|\| join(effectiveSpecBase, '.runtime')` | 改公式（execute Task Review Gate 写 marker） |
| A-04 | `src/run/stage.js:92` | `platformOpts?.runtimeRoot \|\| join(execSpecBase, '.runtime')` | 改公式（execute step 进入写 marker） |
| A-05 | `src/run/complete.js:500` | `platformOpts?.runtimeRoot \|\| join(specBaseLc, '.runtime')` | 改公式（execute complete 读 marker / 产物路径） |
| A-06 | `src/run/prompt.js:453` | `platformOpts?.runtimeRoot \|\| join(execSpecBase, '.runtime')` | 改公式（execute prompt 注入 marker） |
| A-07 | `src/run/prompt.js:491` | `platformOpts?.runtimeRoot \|\| join(tierSpecBase, '.runtime')` | 改公式（tier review 注入） |
| A-08 | `src/run/prompt.js:529` | `platformOpts?.runtimeRoot \|\| join(tcrSpecBase, '.runtime')` | 改公式（task completion 报告注入） |
| A-09 | `src/run/command.js:427` | `platformOpts.runtimeRoot \|\| join(specRoot, '.runtime')` | 改公式（quick run-id marker；与 execute 同形，一并改保持一致） |
| A-10 | `src/run/command.js:735` | `platformOpts.runtimeRoot \|\| join(specRoot, '.runtime')` | 改公式（quick run-id 写入；同上） |
| A-11 | `src/task-review.js:631` | `platformOpts.runtimeRoot \|\| join(specBase, '.runtime')` | 改公式（writeExecuteRunMarker / task review 写入） |

### §5.B contract-matrix 参数站点（函数签名收 runtimeRoot 参数，改动在调用方）

| # | 文件:行 | 现状 | 改动 |
|---|---|---|---|
| B-01 | `src/contract-matrix.js:146` | `runtimeRoot \|\| join(specBase, '.runtime')`（`extractProviderArtifact` 参数） | 函数内公式同步改（也支持 specDriftAnchor 入参）；或在调用方解析后传入 |
| B-02 | `src/contract-matrix.js:217` | `runtimeRoot \|\| join(specBase, '.runtime')`（`buildConsumerInjection` 参数） | 同上 |
| B-03 | `src/contract-matrix.js:334` | `runtimeRoot \|\| join(specBase, '.runtime')`（`verifyApiParity` 参数） | 同上；调用方 `runVerifyParityCheck`（`verify-postcheck.js:723`）已在 `gates.js:219` 用 `platformOpts?.runtimeRoot` 透传——需在 gates.js:219 / verify-postcheck.js:723 处先经 `resolveRuntimeRoot` 解析再传 |

> contract-matrix 的 3 处是函数**内部**对参数 `runtimeRoot` 的兜底公式。两种实现选其一（plan 阶段定）：(a) 给 contract-matrix 函数签名也加 `platformOpts`/`specDriftAnchor` 参数；(b) 调用方先解析好 `runtimeRoot` 绝对路径再传入，函数内不再兜底（更干净，推荐）。本设计倾向 (b)。

### §5.C 消费 / 透传 / 平台专用站点（不改，列出供核对）

| 文件:行 | 性质 | 不改理由 |
|---|---|---|
| `src/run/gates.js:219` | 透传 `runtimeRoot: platformOpts?.runtimeRoot` 给 `runVerifyParityCheck` | 改：经 `resolveRuntimeRoot(platformOpts, specBase)` 解析后传（B-03 调用方修正点） |
| `src/run/complete.js:246` | scan-runs artifact：`platformOpts?.runtimeRoot ? join(...'scan-runs'...) : <else>` | scan-runs 平台专用路径，drift 场景（execute/verify/archive）不触发；保持现状 |
| `src/stage-review.js:345` | `join(runtimeRoot, 'stage-reviews', ...)` 消费已解析的 runtimeRoot | 消费方，由上游 A-02 解析后传入，自身不改 |
| `src/scan-postcheck.js:337` | `if (opts.runtimeRoot && opts.scanRunId)` scan postcheck | scan 平台专用，drift 场景不触发；保持现状 |

### §5.D cleanup 9 调用点（本变更不改，方案 A 使其再也碰不到 execute-runs）

`src/index.js:847` / `src/run/complete-handlers.js:160` / `src/run/complete-handlers.js:724` / `src/run/complete.js:822` / `src/run/command.js:887` / `src/worktree.js:1017`（doctor stale）/ `src/worktree-apply.js:206` / `src/worktree-apply.js:407` / `src/worktree-apply.js:517`。方案 A 落地后，这些 cleanup 调用点无需任何改动——execute-runs / stage-reviews 已在主仓 `.runtime`，cleanup 删 worktree 目录时物理上碰不到。

## §6 字段数据流（specDriftAnchor）

```
producer:
  src/run/command.js:540  drift 守卫命中
    platformOpts.specDriftAnchor = wt.mainSpecBase   // 新增 1 行
    （specBase/specRoot/specDir/pm 仍照旧重写）

流转（透传，零归一化——纯字段读取）:
  command.js:783  completeStep({ ..., platformOpts, ... })
  command.js:787  runStage({ ..., platformOpts, ... })
    ↓ platformOpts 对象原样下传
  run/prompt.js / run/stage.js / run/gates.js / run/complete.js
    各函数收 platformOpts 参数 → 调 resolveRuntimeRoot(platformOpts, localSpecBase)

consumer（13 站点）:
  A-01..A-11: resolveRuntimeRoot 返回 join(specDriftAnchor, '.runtime') = <主仓>/.sillyspec/.runtime
  B-01..B-03: 调用方先 resolveRuntimeRoot 再传 absolute runtimeRoot 给 contract-matrix 函数
```

**多 change 隔离**：`specDriftAnchor` 只重定向 `.runtime` 根目录到主仓；其下按 change / runId 隔离的 marker 与产物路径不变：
- execute marker：`<runtimeRoot>/current-execute-run-id-<changeName>`（含 changeName，已隔离）；
- stage review marker：`stageReviewMarkerPath(runtimeRoot, stage, changeName)` = `current-stage-review-run-id-<changeName>` + 目录 `stage-reviews/<stage>-<runId>`（runId 含时间戳，全局唯一）；
- task review：`<runtimeRoot>/execute-runs/<runId>/tasks/task-<NN>/review.json`（runId 唯一）。
多个 change 并行各自落 `<主仓>/.sillyspec/.runtime/execute-runs/<各自 runId>/...`，无路径冲突。

## §7 代码片段

### §7.1 drift 守卫（command.js:536-546）
```js
// 改动：命中分支追加 1 行设 specDriftAnchor
if (!platformOpts.specRoot && !specDir
    && ['plan', 'execute', 'verify', 'archive'].includes(stageName)) {
  const wt = detectWorktreeSpecDrift(specBase)
  if (wt) {
    specBase = wt.mainSpecBase
    specRoot = wt.mainSpecBase
    specDir = wt.mainSpecBase
    pm = new ProgressManager({ specDir: specRoot })
    platformOpts.specDriftAnchor = wt.mainSpecBase   // 【新增】下游 runtimeRoot 解析读此字段
    console.warn(`⚠️ 已自动锚定主仓 spec：${wt.mainSpecBase}（原 cwd 命中 worktree 副本 ${wt.changeName}，已纠正，流程继续）`)
  }
}
```
> 注：`platformOpts` 在 command.js 是 `let`/`const` 对象字面量（command.js:220 前后），可直接 mutate 加字段；若声明为 frozen 需改 `let platformOpts = {...}` 后整体替换——plan 阶段确认。

### §7.2 工具函数（新增 src/run/shared.js）
```js
import { join } from 'node:path'

/**
 * 统一解析 .runtime 根目录（坑 execute-runs-isolation）。
 *
 * 优先级：平台模式 runtimeRoot > drift 锚点 specDriftAnchor > 本地 specBase/.runtime。
 * specDriftAnchor 仅在此处消费，不参与平台 sentinel（specRoot||runtimeRoot）判定，
 * 避免误跳 triggerSync / checkApproval / 平台渲染分支。
 */
export function resolveRuntimeRoot(platformOpts, localSpecBase) {
  if (platformOpts?.runtimeRoot) return platformOpts.runtimeRoot
  if (platformOpts?.specDriftAnchor) return join(platformOpts.specDriftAnchor, '.runtime')
  return join(localSpecBase, '.runtime')
}
```

### §7.3 13 站点统一替换（A 类示例）
```js
// 改前（gates.js:111）
const runtimeRoot = platformOpts?.runtimeRoot || join(specBase, '.runtime')
// 改后
const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
```
其余 10 处 A 类同理（`localSpecBase` 分别代入 `effectiveSpecBase` / `execSpecBase` / `specBaseLc` / `tierSpecBase` / `tcrSpecBase` / `specRoot`）。

### §7.4 contract-matrix 调用方修正（B 类，推荐方案 b）
```js
// verify-postcheck.js:723 / gates.js:219
const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
const parityCheck = runVerifyParityCheck({ cwd, specBase, changeName, runtimeRoot })
// contract-matrix.js 函数内兜底公式保留（防御），但调用方已传 absolute 路径，兜底不再命中
```

## §8 测试策略

risk_level = **unit-sufficient**：本变更是确定性路径解析逻辑（无并发 / 无 IO 竞态 / 无外部依赖），单元测试充分覆盖；frontmatter 显式声明避坑 verify risk_level 关键词误判（否定语境"风险"/"阻断"误触发 detectChangeRisk）。

| 用例 | 断言 |
|---|---|
| T-01 drift 命中 → execute-runs 落主仓 | 在 worktree cwd 跑 execute step 进入；断言 `current-execute-run-id-<change>` marker 与 `execute-runs/<runId>/tasks/task-01/review.json` 出现在**主仓** `.sillyspec/.runtime/`，不出现在 worktree `.runtime/` |
| T-02 cleanup 后 execute-runs 仍存 | T-01 后调 `wm.cleanup(changeName)`；断言主仓 `.runtime/execute-runs/<runId>/...` 完整存在（cleanup 只删 worktree 目录） |
| T-03 stage-reviews 落主仓 | drift 场景跑 stage review；断言 `stage-reviews/<stage>-<runId>/review.json` 落主仓 |
| T-04 marker 按 change 隔离 | 两个 change 并行 drift；断言各 marker 路径含各自 changeName，runId 唯一，无覆盖 |
| T-05 specDriftAnchor 不触发 sentinel | drift 命中后断言 `triggerSync`（shared.js:288）/ `checkApproval`（shared.js:315）仍按本地链路执行（未被 `specRoot\|\|runtimeRoot` 短路跳过）；prompt 渲染走本地分支（prompt.js:217 isPlatform=false） |
| T-06 非 drift 场景零回归 | 常规主仓 cwd 跑 execute；断言 `specDriftAnchor` 未设、runtimeRoot 仍 `join(specBase,'.runtime')`，行为不变 |
| T-07 平台模式零回归 | `platformOpts.runtimeRoot` 已设时；断言 `resolveRuntimeRoot` 返回平台 runtimeRoot，specDriftAnchor 分支不触发 |
| T-08 quick marker 一致性 | drift 场景跑 quick；command.js:427/735 marker 也落主仓 |

测试隔离：用 `--spec-dir` 钉死临时目录（避 between-run 清 `.sillyspec` 撞文件锁，参考既有 `sillyspec-test-specdir-isolation` 经验）；worktree fixture 必须 chdir（既有 `worktree-test-fixture-must-chdir` 经验）。

## §9 验收标准

| AC | 标准 |
|---|---|
| AC-1 | drift 场景（agent cd worktree 跑 execute）下，所有 task review.json 与 stage review.json 落主仓 `.sillyspec/.runtime/`，worktree 内 `.runtime/` 无这些文件 |
| AC-2 | worktree cleanup（9 调用点任一）后，主仓 execute-runs / stage-reviews 文件态完整存活 |
| AC-3 | archive step1 完成度 gate 不再因 cleanup 丢失 review.json 而阻断（真相源 = 磁盘主仓文件） |
| AC-4 | 平台模式（specRoot/runtimeRoot 已设）行为零回归（sentinel 判定 / sync / approval / 渲染分支） |
| AC-5 | 常规本地模式（无 drift）行为零回归 |
| AC-6 | 多 change 并行 drift 无 marker / 产物路径冲突 |
| AC-7 | `npm test` 全绿；新增 T-01..T-08 用例通过 |
| AC-8 | `npm run lint` 通过 |

## §10 风险登记

| 编号 | 风险 | 等级 | 缓解 |
|---|---|---|---|
| R-01 | 13 处站点漏改 / 公式漂移 | 高 | 抽 `resolveRuntimeRoot` 工具函数统一调用（§7.2）；grep `runtimeRoot` 全量核对；测试 T-01 覆盖 |
| R-02 | `specDriftAnchor` 字段误触发平台 sentinel 副作用 | 中 | 字段语义独立（§4.1）；sentinel 形式固定为 `specRoot\|\|runtimeRoot`，不含 specDriftAnchor；测试 T-05 验证 |
| R-03 | worktree 目录损坏 / 部分残留时 `detectWorktreeSpecDrift` 不触发（specBase 路径形态不符） | 中 | 本变更不引入此风险（既有 detect 逻辑）；但 salvaged 场景仍可能漏——记录到 ROADMAP（doctor 增强）；本变更范围内接受 |
| R-04 | 平台模式与 drift 叠加（平台模式下 cwd 又在 worktree） | 低 | drift 守卫条件 `!platformOpts.specRoot && !specDir` 已排除平台模式（command.js:536）；平台模式走自己的 runtimeRoot，不进 drift 分支 |
| R-05 | native-worktree 模式 worktree 在外部目录（非 `.sillyspec/.runtime/worktrees/`） | 低 | `detectWorktreeSpecDrift` 仅匹配 `.sillyspec/.runtime/worktrees/<seg>/.sillyspec` 形态；native-worktree 外部目录不触发 drift 守卫，需单独评估（记录到 ROADMAP，本变更不含） |
| R-06 | 测试覆盖不足导致回归 | 中 | T-01..T-08 覆盖 drift / 非 drift / 平台 / quick / 多 change / sentinel 全场景；CI 既有全量套件兜底 |
| R-07 | `platformOpts` 对象不可变（frozen）导致设字段抛错 | 低 | plan 阶段确认声明方式；若 frozen 改 `let platformOpts` 整体替换 |

## §11 非目标

- **NG-1** 不改 worktree 创建 / cleanup 逻辑（cleanup 9 调用点 + `worktree.js` rmSync 全部不动）——方案 A 使其再也碰不到 execute-runs。
- **NG-2** 不改平台模式（specRoot/runtimeRoot sentinel 链路保持原样）。
- **NG-3** 不做 cleanup salvage（方案 B 否决，理由 §3）。
- **NG-4** 不处理 native-worktree 外部目录 drift（R-05，另案）。
- **NG-5** 不处理 worktree 损坏导致 detect 不触发（R-03，doctor 另案）。
- **NG-6** 不重命名既有 `runtimeRoot` / `specRoot` 字段（保持向后兼容）。

## §12 决策记录

| 编号 | 决策 | 理由 |
|---|---|---|
| D-01 | 采用方案 A（specDriftAnchor 补全 drift 守卫） | 治本（堵源头）、最小侵入、无 sentinel 副作用、多 change 无冲突（§3） |
| D-02 | 用新字段 `specDriftAnchor` 而非直接设 `specRoot`/`runtimeRoot` | 直接设 specRoot/runtimeRoot 会触发平台 sentinel（shared.js:288 triggerSync 跳过 / :315 checkApproval 跳过 / prompt.js:217,306,556,597 误进平台渲染分支 / scan-postcheck 误判），引入新 bug；新字段语义独立，只参与 runtimeRoot 解析 |
| D-03 | 否决方案 B（cleanup salvage） | 不治本（9 cleanup 调用 + git worktree remove + 手动 rm + worktree 损坏 + doctor --fix stale 都绕过）；原子性 / 失败处理复杂；root cause 仍在（§3） |
| D-04 | 遵循既有 `detectWorktreeSpecDrift` + drift 守卫范式（6417a27 落地的 task-05/D-03 半截修复） | 复用已验证的 drift 检测 + 锚定主仓 specBase 机制，仅补全漏掉的 `platformOpts` 透传，不发明新机制 |
| D-05 | risk_level = unit-sufficient + 抽 `resolveRuntimeRoot` 工具函数 + 8 用例 | 确定性路径解析逻辑，单元测试充分；工具函数避免 13 处公式漂移（R-01） |
| D-06 | 文档同步：更新 `docs/sillyspec/file-lifecycle.md`（execute-runs/stage-reviews 落点改为"drift 场景落主仓"）+ `docs/prompt/` 若 prompt 注入文本变动（本变更不改 prompt 正文，仅改 marker 路径解析，预期 prompt 文档不动，plan 阶段复核） | CLAUDE.md「文件生命周期文档同步」铁律；改动触及 runtimeRoot 解析（影响文件落点） |

## 文件变更清单

> 解析兼容说明：本节标题不含 `§` 前缀（其余 §1..§12 保留），以符合 `parseFileChangeList`（src/change-list.js:76 `FILE_LIST_SECTION_RE`）的章节识别规则——该正则只容忍 `\d+[.)]` 编号前缀，不识别 `§`，否则整节漏解析致 review-tier / plan-postcheck / assess / verify 全线 fileCount=0（详见本 change 遗留与 SillySpec 缺陷记录）。

| 操作 | 文件路径 | 说明（含字段数据流） |
|---|---|---|
| 修改 | `src/run/command.js` | drift 守卫（:536-546）命中分支追加 `platformOpts.specDriftAnchor = wt.mainSpecBase`；quick marker 站点（:427/:735）改用 `resolveRuntimeRoot`。**字段数据流**：producer=`command.js:540` drift 守卫设 `specDriftAnchor` → 透传 `platformOpts` 对象经 `completeStep`（:783）/ `runStage`（:787）dispatch → consumer=下游 13 站点 |
| 修改 | `src/run/shared.js` | 新增 `resolveRuntimeRoot(platformOpts, localSpecBase)` 工具函数（§7.2） |
| 修改 | `src/run/gates.js` | 3 站点（:111/:271/:314）改用 `resolveRuntimeRoot`；:219 parity 透传先经 `resolveRuntimeRoot` 解析 |
| 修改 | `src/run/stage.js` | 1 站点（:92）改用 `resolveRuntimeRoot` |
| 修改 | `src/run/complete.js` | 1 站点（:500）改用 `resolveRuntimeRoot`（:246 scan-runs 不动） |
| 修改 | `src/run/prompt.js` | 3 站点（:453/:491/:529）改用 `resolveRuntimeRoot` |
| 修改 | `src/task-review.js` | 1 站点（:631）改用 `resolveRuntimeRoot` |
| 修改 | `src/contract-matrix.js` | 3 函数（:146/:217/:334）— 调用方先解析 runtimeRoot 再传（推荐），函数内兜底公式保留作防御 |
| 修改 | `src/verify-postcheck.js` | `runVerifyParityCheck`（:723）调用方先经 `resolveRuntimeRoot` 解析 runtimeRoot 再传 contract-matrix |
| 新增 | `test/execute-runs-isolation.test.mjs` | T-01..T-08 用例（drift 落主仓 / cleanup 后存活 / sentinel 不误触发 / 多 change 隔离 / 平台与本地零回归） |
| 修改 | `docs/sillyspec/file-lifecycle.md` | 同步 execute-runs / stage-reviews 落点说明（drift 场景落主仓 `.runtime`）+ 更新头部 `updated_at` |

> 本清单为 design 阶段草案；`src/machine-interface.js`（:184/:402 contract-matrix 调用方之一）是否需同步改，plan 阶段核实（若其 runtimeRoot 已由调用方解析则不动）。

## 自审（Self-Review）

| 检查项 | 结果 |
|---|---|
| 根因是否覆盖事故全链 | ✅ RC-1..RC-4 覆盖 drift 守卫半截 + dispatch 漏传 + 13 站点公式 + cleanup 整目录删 |
| 方案是否治本 | ✅ 方案 A 堵源头（runtimeRoot 解析），不依赖下游补丁；方案 B 否决理由充分 |
| 字段语义是否清晰 | ✅ specDriftAnchor 与 specRoot/runtimeRoot sentinel 语义隔离（D-02） |
| 13 站点是否逐字 | ✅ §5 分 A/B/C 三类，file:line 精确；用户"13 处"约数已澄清（11 A 类 + 3 B 类 = 14 改动点；C 类不改） |
| 多 change 是否冲突 | ✅ marker 已按 changeName + runId 隔离（§6） |
| 平台模式是否回归 | ✅ drift 守卫条件排除平台模式（R-04）；sentinel 不读 specDriftAnchor（R-02/T-05） |
| 测试是否充分 | ✅ T-01..T-08 覆盖全场景；risk_level=unit-sufficient 合理 |
| 生命周期契约 | ✅ 不适用（本变更只改路径解析，无生命周期事件），文首已声明豁免 |
| 文档同步 | ✅ D-06 列 file-lifecycle.md + prompt 文档复核 |
| 非目标 | ✅ NG-1..NG-6 明确 |

自审结论：design 自洽，可进入 plan。**遗留待 plan 拍板**：(1) `platformOpts` 是否 frozen（R-07）；(2) contract-matrix B 类实现选 (a) 加参数还是 (b) 调用方解析（推荐 b）；(3) `machine-interface.js` 是否需同步。
