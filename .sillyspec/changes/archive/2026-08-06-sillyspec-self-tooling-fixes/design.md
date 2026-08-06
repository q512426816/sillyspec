---
author: qinyi
created_at: 2026-08-06T09:08:11
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— sillyspec 自工具坑确定性修复

> 变更：`2026-08-06-sillyspec-self-tooling-fixes`
> 项目：sillyspec（工具自身，dogfood）
> 阶段：brainstorm → design
> Baseline：HEAD = `a7e2cf7`（其上 `db5d160` 工具驾驭反馈修复 + `a7e2cf7` 复盘3条已合 main）

## 1. 背景

继 `2026-08-05-tooling-feedback-fixes`（commit `db5d160` + `a7e2cf7`）修复工具驾驭复盘的 5 个工程坑之后，该流程本身又暴露 4 个 SillySpec 侧的确定性缺陷（坑1-4）+ 1 个架构级观察（坑5）。均在实际 dogfood 流程中拖累 agent，且都有明确代码根因（行号基于当前 HEAD 重核）：

1. **execute 批量完成时 Stage Review marker 不自动生成**：execute 阶段 Stage Review Gate 需 `stage-reviews/execute-review-<runId>/review.json`（reviewType=acceptance）。但 `detectExecuteBatchFinish`（`src/run/complete.js:540-568`）在 plan 全勾 + 代码有变更时，把剩余 pending/in-progress step 直接标 completed（:557-563），**跳过 prompt 渲染**。而 stage review marker（`current-stage-review-run-id-execute-<change>`，由 `src/run/prompt.js` 渲染 `{REVIEW_TIER}` 时写）只在 prompt 渲染路径写入。批量完成路径不渲染 → marker 不写 → gate（`src/run/gates.js:276` `getLatestStageReviewRunId`）读得 null → 期望路径变 `stage-reviews/execute-null/review.json`，agent 不知往哪补 review.json（本流程已踩，手动生成 runId + 写 marker 才通过）。

   注：`gates.js:315-320` 有一处 marker fallback，但那是 **task review** 的 `current-execute-run-id-<change>`（task 级，:318 注释），**不是** stage review 的 marker——两套机制同名易混，是本次踩坑的认知陷阱。

2. **verify detectChangeRisk 否定语境关键词误判（半修，剩余引导缺口）**：`detectChangeRisk`（`src/change-risk-profile.js:317-381`）是机械字面匹配，不认否定语境——design §7.5 写「不涉及生命周期契约」列举 session/lease/daemon 等词仍命中，误判 integration/deployment-critical。`6417a27`（2026-07-28）已加 `extractExplicitRiskLevel`（:308-315）读 design frontmatter `risk_level` 显式覆盖，注释明写"与其在正则层做脆弱的否定识别，不如给显式可审计覆盖通道"——**项目已决策用 frontmatter，否决 body 扫描**。剩余痛点（Grill B-002 核实）：现状 frontmatter 覆盖指引仅出现在 `stage-contract.js:481` 的"出路③"错误信息里，触发条件 `requiresEvidence && !evidenceCheck.ok`（仅 PASS / PASS WITH NOTES 缺证据时）；FAIL 结论或判级后早期不透出，agent 可能到 verify 末尾撞错才发现可覆盖。

3. **worktree apply 排除 .sillyspec/ 漏模块文档**：`filterDeliverableFiles`（`src/worktree-apply.js:48-50`）一刀切 `!f.startsWith('.sillyspec/')`，原意排除变更文档/运行时产物。但 `.sillyspec/docs/sillyspec/modules/*.md`（dogfood 模块规范文档）是**交付物**——worktree 内子代理对模块文档的改动 apply 时不回主仓，要手动 `git show <rev>:path`（Windows MSYS path mangling 还要 `MSYS_NO_PATHCONV=1`）。`src/verify-postcheck.js:797-799` 有同逻辑内联副本，`src/index.js:787` 注释亦提及此排除——须同步。

4. **archive step5 git add 漏 archive/ 子目录**：归档时 `archiveChangeDirectory`（`src/run/complete-handlers.js:95-150`）mkdir + `renameSyncRetry`（:125）+ `unregisterChange`（:137），但**不更新 git index**。step5 prompt（`src/stages/archive.js:155-167`，:160）虽列 `git add .sillyspec/changes/`，但 prompt 驱动依赖 agent 执行到位——实测新移入的 `archive/<destName>/` untracked 子目录被漏，手动补 `git add .sillyspec/changes/ .sillyspec/docs/` 才进 commit。

5. **多代理并行中间态 import 链污染（架构级，入 ROADMAP）**：execute 多子代理并行实现时，某子代理改 `src/` 中间态含 SyntaxError（如 `packages/*/` 注释撞 ES module import 解析），污染 import 链，另一子代理跑测试撞错，交叉发现后自修。根因是多代理并发改 src 无隔离，单点 SyntaxError 全局连坐。架构级（需 worktree-per-task 或 import 沙箱），本 change 不修，登记 ROADMAP。

## 2. 设计目标

- **FR-01**：execute 批量完成时 stage review marker 自动落盘；gate 失败时错误路径从 `execute-null` 变 `execute-review-<id>`（确定、可执行）。
- **FR-02**：detectChangeRisk 命中高危关键词且无 frontmatter risk_level 时，返回值附 hint 指引"可加 risk_level 覆盖"（错误可执行化，遵 6417a27 不做 body 扫描）。
- **FR-03**：worktree apply 精细化排除——保留 `.sillyspec/docs/`（交付物），仅排 `.sillyspec/changes/` + `.sillyspec/.runtime/` + `.sillyspec/quicklog/`（worktree 专属/运行时）。
- **FR-04**：archive 归档目录移动后 CLI 下沉 `safeGit add`，确定性暂存 `archive/` + `docs/`，不靠 prompt 驱动。
- **FR-05**：坑5 入 ROADMAP，不在本 change 修。

## 3. 非目标

- **不做** body 豁免短语扫描（坑2，`6417a27` 已否决"正则层脆弱否定识别"，本 change 遵此决策，只加错误引导 hint）。
- **不做** 多代理并行 import 链隔离（坑5，架构级，入 ROADMAP）。
- **不改** detectChangeRisk 判级逻辑 / frontmatter 优先级（`6417a27` 已就位）。
- **不改** stage review gate 的 fail-closed 语义 / task review marker 机制。
- **不改** archive.js step5 prompt 文案（CLI 下沉已确定性，prompt 保留作幂等兜底）。
- **不引入** 新 stage / 新文件类型 / 新持久 schema。

## 4. 拆分判断

单一主题变更，不拆分。4 坑同源（工具驾驭复盘的确定性缺陷），且坑3 双副本（worktree-apply + verify-postcheck）须同步改——拆多 change 会漏同步。规模 = large（跨 gates / change-risk-profile / worktree-apply / verify-postcheck / complete-handlers / index 六文件 + 双副本同步 + 4 处 test + 文档同步），走完整流程。

## 决策（Decisions）

- **D-01 坑1 = gate 时 marker 缺失自生（方案 A）**：`gates.js:276` stage review gate，`tier=independent` 且 marker 缺失时 `generateStageReviewRunId()` + 写 marker + mkdir。否决「`detectExecuteBatchFinish` 内预生成」（源头改，但该函数不感知 tier，要 import classifyReviewTier 增耦合）与「不批量完成 acceptance step」（破坏批量完成设计）。理由：gate 是 fail-closed 最后关口，在此兜底最简且语义清晰。
- **D-02 坑2 = 错误可执行化引导 hint（方案 A）**：`detectChangeRisk` 命中 integration/deployment 关键词且无 frontmatter risk_level 时，返回值加 `hint` 字段指路。否决「body 豁免短语扫描」（`6417a27` 已否决）与「prompt 提示」（软约束依赖 agent 自觉）。理由：遵 `6417a27` 走 frontmatter 通道，CLI 只在误判时主动指路。
- **D-03 坑3 = filterDeliverableFiles 精细化（方案 A）**：保留 `.sillyspec/docs/`，仅排 `.sillyspec/changes/` + `.sillyspec/.runtime/` + `.sillyspec/quicklog/`。否决「全保留 .sillyspec/」（把 worktree 专属变更包/运行时 apply 回主仓，污染）与「黑名单式只排 changes/」（.runtime/quicklog 性质不同，白名单更清）。理由：docs/ 是交付物，changes/+.runtime/+quicklog/ 是 worktree 专属/运行时。
- **D-04 坑4 = CLI 下沉 safeGit add（方案 A）**：`archiveChangeDirectory:137` unregisterChange 后 `safeGit(cwd, ['add','--','.sillyspec/changes/archive/'])` + `safeGit(cwd, ['add','--','.sillyspec/docs/'])`。否决「prompt 文案显式列 archive/」（仍依赖 agent 自觉）。理由：archiveChangeDirectory 已是 CLI 确定性操作，git add 下沉同函数最可靠；archive.js prompt 保留作幂等兜底。
- **D-05 坑5 入 ROADMAP**：多代理并行中间态 import 链污染是架构级（需 worktree-per-task 或 import 沙箱），本 change 不修，登记 ROADMAP。
- **D-06 显式遵 6417a27 不做 body 扫描**：本 change 显式记录"body 扫描被 `6417a27` 否决"，防后续 agent 复读"加否定语境识别"建议（memory 坑 [[sillyspec-improvement-check-debt-doc]]）。

## 5. 总体方案

### Fix-1 — execute Stage Review marker 自生（坑1，FR-01）

**根因**：`detectExecuteBatchFinish`（complete.js:540）批量推进跳过 prompt 渲染 → marker 不写 → gate 读 null → `execute-null` 路径。

**修法**（`src/run/gates.js:276` 附近，stage review gate 分支 `tier !== 'self'`）：marker 缺失时 `generateStageReviewRunId()` + 写 marker（`stageReviewMarkerPath` + `mkdirSync` + `writeFileSync`），让 gate 读到确定 ID。review.json 仍需 agent 写（gate 仍 fail），但错误从「execute-null/缺 review.json」变「execute-review-<id>/缺 review.json」，路径确定可执行。

复用 `src/stage-review.js` 已 export 的 `generateStageReviewRunId`（:233）、`stageReviewMarkerPath`（:250），与现有 `getLatestStageReviewRunId`（:268，已 import gates.js:258）同源。仅 gate 缺 marker 时 fallback 写——marker 已存在不动（幂等）。

### Fix-2 — Change Risk Gate 早期 warning 引导（坑2，FR-02）

**根因**（Grill B-002 修正）：`detectChangeRisk`（change-risk-profile.js:317）机械匹配，命中高危关键词且无 frontmatter risk_level 时判级 integration/deployment-critical。现有 frontmatter 覆盖指引仅在 `stage-contract.js:481` "出路③"错误信息里，触发条件 `requiresEvidence && !evidenceCheck.ok`（仅 PASS / PASS WITH NOTES 缺证据）——FAIL 或判级后早期不透出。原方案"加 hint 字段"被否决（Grill B-002：detectChangeRisk 唯一生产调用点 stage-contract.js:443 的返回值已被 evidence gate 消费，新增 hint 字段无新渲染点=死字段）。

**修法**（`src/stage-contract.js:448` 附近，detectChangeRisk 调用后、evidence gate 前）：当 `level ∈ {integration-critical, deployment-critical}` 且 `!explicit` 时，`warnings.push` 一条**无条件** frontmatter 覆盖指引（不依赖 conclusion / evidence）：

```
[<level>] 本次变更被关键词判级（命中：<triggers>）。若属关键词误伤（实际未触碰 daemon/session/启动入口/跨进程），可在 design.md frontmatter 加 risk_level: <真实等级>（如 unit-sufficient）显式覆盖后重跑。
```

warning 走 `validateVerifyResult` 返回的 warnings 数组（既有透出通道），无需新渲染点。现有 :481 "出路③"保留（PASS 缺证据兜底）。**不改 detectChangeRisk 返回值、不改判级逻辑、不改 frontmatter 优先级**——只在消费侧加早期引导。

### Fix-3 — filterDeliverableFiles 精细化（坑3，FR-03）

**根因**：`filterDeliverableFiles`（worktree-apply.js:48-50）`!f.startsWith('.sillyspec/')` 一刀切。

**修法**（`src/worktree-apply.js:48-50`）：保留 `.sillyspec/docs/`，排 `.sillyspec/changes/` + `.sillyspec/.runtime/` + `.sillyspec/quicklog/` + `meta.json`。同步 `src/verify-postcheck.js:798-799` 内联副本（优先 import 共享去双写，见 R-04）+ `src/index.js:787` 注释。

### Fix-4 — archiveChangeDirectory CLI 下沉 git add（坑4，FR-04）

**根因**：`archiveChangeDirectory`（complete-handlers.js:95-150）移动目录 + 注销 change，但不更新 git index；step5 prompt 驱动 git add 不可靠。

**修法**（`src/run/complete-handlers.js:137` unregisterChange 后）：`safeGit(cwd, ['add','--','.sillyspec/changes/archive/'])` + `safeGit(cwd, ['add','--','.sillyspec/docs/'])`。`safeGit` 已 import（complete-handlers.js:26 from './shared.js'）。路径用 POSIX 正斜杠（git 接受，跨平台）。精确 add `changes/archive/`（不扫其他活跃 change）+ `docs/`。

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/gates.js | 坑1：stage review gate marker 缺失时 generateStageReviewRunId+写 marker（~8 行，:276 附近）。新增 import generateStageReviewRunId/stageReviewMarkerPath |
| 修改 | src/stage-contract.js | 坑2：detectChangeRisk 高危 && !explicit 时 warnings.push 早期 frontmatter 覆盖指引（~5 行，:448 附近，evidence gate 前） |
| 修改 | src/worktree-apply.js | 坑3：filterDeliverableFiles 精细化排除（保留 docs/，排 changes/+.runtime/+quicklog/），:48-50 |
| 修改 | src/verify-postcheck.js | 坑3：:798-799 内联副本同步（优先 import filterDeliverableFiles 去双写，见 R-04） |
| 修改 | src/run/complete-handlers.js | 坑4：archiveChangeDirectory:137 后 safeGit add changes/archive/ + docs/（~6 行） |
| 修改 | src/index.js | 坑3：:787 注释同步（filterDeliverableFiles 不再一刀切） |
| 新增 | test/stage-review-marker-auto.test.mjs | 坑1：marker 缺失时 gate 自生 + 写盘 |
| 修改 | test/stage-contract.test.mjs | 坑2：detectChangeRisk hint 字段（命中高危无 frontmatter 时）；可能另立 test/change-risk-hint.test.mjs |
| 修改 | test/worktree-apply-meta-exclude.test.mjs | 坑3：filterDeliverableFiles 精细化（docs/ 保留 + changes/+.runtime/+quicklog/ 排除四态） |
| 新增 | test/archive-cli-git-add.test.mjs | 坑4：archiveChangeDirectory 后 git index 含 archive/+docs/ |
| 修改 | docs/sillyspec/file-lifecycle.md | 文档同步：updated_at + filterDeliverableFiles 行为变更说明（docs/ 纳入交付物） |
| 修改 | docs/prompt/* | 仅当 hint 透出触及 verify prompt 才同步（_extract.mjs 重跑）；否则不动 |
| 修改 | .claude/skills/ | 若触及 apply/archive/verify skill 行为则同步 |

**字段数据流**（段落描述，非文件清单；以下为字段在函数间的流转，非文件路径声明）：

坑1 reviewRunId：producer=stage review gate 自生写 marker → getLatestStageReviewRunId 读 → consumer=validateStageReview 拼路径 + 错误信息。

坑2 warning：producer=validateVerifyResult（detectChangeRisk 调用后，:448 附近 warnings.push）→ warnings 数组 → consumer=agent（verify 早期看到指引加 frontmatter）。透出点确定（warnings 既有通道，Grill B-002 已核 detectChangeRisk 唯一调用点 :443）。

坑3 无新字段（filter 逻辑变更）。

坑4 git add：producer=safeGit（归档处理 unregisterChange 后）→ git index → consumer=git commit（agent/hook）。

## 7. 接口定义

### Fix-1 gates.js marker 自生
```js
// gates.js:276 stage review gate 分支（tier !== 'self'）
let reviewRunId = getLatestStageReviewRunId(runtimeRoot, stageName, changeName)
if (!reviewRunId) {
  // marker 缺失（execute 批量完成跳过 prompt 渲染等场景）→ 自生 + 写盘
  // 让 gate 读到确定 ID，错误从 execute-null 变 execute-review-<id>
  reviewRunId = generateStageReviewRunId()
  try {
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(stageReviewMarkerPath(runtimeRoot, stageName, changeName), reviewRunId + '\n')
  } catch {}
}
```

### Fix-2 Change Risk Gate 早期 warning
```js
// stage-contract.js:448 附近，detectChangeRisk 调用后、evidence gate 前
if (['integration-critical', 'deployment-critical'].includes(changeRiskProfile.level)) {
  if (!changeRiskProfile.explicit) {
    warnings.push(
      `[${changeRiskProfile.level}] 本次变更被关键词判级（命中：${changeRiskProfile.triggers.join(', ')}）。` +
      `若属关键词误伤（实际未触碰 daemon/session/启动入口/跨进程），可在 design.md frontmatter 加 risk_level: <真实等级>（如 unit-sufficient）显式覆盖后重跑。`
    )
  }
  // ...现有 evidence gate（:452-487）保留不变
}
```

### Fix-3 filterDeliverableFiles
```js
export function filterDeliverableFiles(files) {
  return files.filter(f =>
    !f.startsWith('.sillyspec/changes/') &&
    !f.startsWith('.sillyspec/.runtime/') &&
    !f.startsWith('.sillyspec/quicklog/') &&
    f !== 'meta.json'
  )
}
```

### Fix-4 archiveChangeDirectory git add
```js
// complete-handlers.js:137 unregisterChange 后
try {
  safeGit(cwd, ['add', '--', '.sillyspec/changes/archive/'])
  safeGit(cwd, ['add', '--', '.sillyspec/docs/'])
} catch {}
```

## 7.5 生命周期契约表

**本次变更不涉及生命周期契约。** design 正文提及 session / lease / agent_run / daemon / lifecycle / state_transition / claim / heartbeat 等词，仅出现在：
- §1 坑2 描述 `detectChangeRisk` 的**关键词判级集合**（讨论机械匹配误判，非本次实现这些概念）；
- 引用 `6417a27` 决策（frontmatter risk_level 覆盖这些关键词的判级）。

本次改动确为 CLI 守卫（gate marker 自生）/ 错误引导（hint）/ 文件过滤（filterDeliverableFiles）/ git 暂存（safeGit add），**无 daemon、无跨进程、无状态机、无部署启动、无 session/lease 持久化**。声明 `risk_level: unit-sufficient`（frontmatter）覆盖关键词判级——与 `6417a27` 显式覆盖通道一致，非 body 扫描。

## 8. 数据模型

无 schema/表/字段变更。`detectChangeRisk` 返回值新增可选 `hint: string` 字段（向后兼容，旧调用方不读 hint 不受影响）。

## 9. 兼容策略

- **坑1**：marker 存在时 gate 走原路径（getLatestStageReviewRunId 读 marker）；仅 marker 缺失时自生。自生 marker 格式（`review-` 前缀）与 `getLatestStageReviewRunId:278` 校验一致。
- **坑2**：frontmatter risk_level 存在时（explicit）走 `6417a27` 原路径（:326-334），**不发 warning**（已显式声明无需引导）；仅 `!explicit` 且高危时发 warning。warning 走既有 warnings 数组，detectChangeRisk 返回值不变，旧调用方零影响。
- **坑3**：filterDeliverableFiles 对非 .sillyspec/ 文件行为不变；`.sillyspec/docs/` 从"排除"变"保留"（行为变更，符合交付物预期）；changes/+.runtime/+quicklog/ 仍排除。
- **坑4**：archiveChangeDirectory 移动+注销行为不变；末尾追加 safeGit add（POSIX 路径跨平台）。step5 prompt git add 保留（幂等兜底）。
- **brownfield**：已归档 change 不回溯（filter 行为变更只影响新 apply；archive git add 只影响新归档）。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 坑1 marker 自生后 agent 仍忘写 review.json（marker 有但 review.json 缺，gate fail 信息变但根因没消） | P2 | gate 仍 fail-closed（review.json 缺失仍拦）；错误从 execute-null 变 execute-review-<id> 反而**更可执行**（agent 知道路径），是错误可执行化非掩盖 |
| R-02 | 坑2 warning 透出被 warnings 数组淹没（agent 没注意早期引导） | P2 | warning 文案带 [<level>] 前缀 + "关键词误伤"触发词，显著；测试断言 warning 出现；现有 :481 出路③ 作 fail 兜底双保险 |
| R-03 | 坑3 filter 精细化误放行 worktree 专属文件（如 `.sillyspec/changes/<wt-change>/` 被当 docs/ 保留） | P1 | 排除规则精确到 `.sillyspec/changes/`（所有 change 目录含 worktree 专属）；仅保留 `.sillyspec/docs/`；测试覆盖 changes/排除 + docs/保留 + .runtime/排除 + quicklog/排除四态 |
| R-04 | 坑3 verify-postcheck 内联副本与 worktree-apply 改不同步（双写漂移） | P1 | 直接 import filterDeliverableFiles 去双写（Grill X-010 核实无环依赖：verify-postcheck imports 不含 worktree-apply，反向亦然）；测试双断言 |
| R-05 | 坑4 CLI 下沉 git add 与 step5 prompt git add 重复/冲突 | P2 | git add 幂等无害；CLI 精确 add `changes/archive/`+`docs/`，prompt 全体 `changes/` 兜底；双保险不冲突 |
| R-06 | 坑4 safeGit add 失败（cwd 非 git 仓/权限）静默漏暂存 | P2 | safeGit 包 try-catch 不阻断归档（目录已移动+注销）；step5 prompt git add 兜底 + agent git status 核对 |

## 11. 决策追踪

- **D-01@v1**（坑1 gate 时 marker 自生）→ §5 Fix-1 / FR-01 / §7 Fix-1。覆盖完全。
- **D-02@v1**（坑2 错误可执行化 hint）→ §5 Fix-2 / FR-02 / §7 Fix-2。遵 `6417a27`。
- **D-03@v1**（坑3 filter 精细化）→ §5 Fix-3 / FR-03 / §7 Fix-3。覆盖完全。
- **D-04@v1**（坑4 CLI 下沉 git add）→ §5 Fix-4 / FR-04 / §7 Fix-4。覆盖完全。
- **D-05@v1**（坑5 入 ROADMAP）→ §3 非目标。登记 ROADMAP。
- **D-06@v1**（遵 `6417a27` 不做 body 扫描）→ §3 非目标 / 决策说明。防复读。
- 无未解决决策。剩余风险 R-01~R-06 见 §10。

## 12. 自审

- [x] 章节齐全（1-12 + 决策 + 7.5）。
- [x] 文件变更清单 file:line 引用基于最新源码（HEAD=`a7e2cf7`，重核 complete.js:540 / change-risk-profile.js:317 / worktree-apply.js:48 / verify-postcheck.js:797 / complete-handlers.js:137 / archive.js:160 / gates.js:276 / stage-review.js:233,250,268）。
- [x] 坑2 显式遵 `6417a27` 决策不做 body 扫描（D-06 防复读）。
- [x] 7.5 生命周期契约：声明不涉及 + frontmatter `risk_level: unit-sufficient` 覆盖。
- [x] 字段数据流：坑1 reviewRunId / 坑2 hint 标注 producer→consumer。
- [x] 兼容策略：每坑"不传则不变"+ brownfield 不回溯。
- [x] 风险登记 R-01~R-06 真实可缓解。
- [x] R-04 verify-postcheck 改 import 共享（Grill X-010 核实无环依赖，确定去双写）。
- [x] R-02 坑2 warning 透出点确定（stage-contract.js warnings 数组，既有通道；Grill B-002 已核 detectChangeRisk 唯一调用点 :443）。
- [x] B-001 index.js 行号修正（:739→:787，Grill 核实）。
- [x] B-002 坑2 修法从 hint 字段改为 stage-contract.js 无条件 warning（Grill B-002：hint 无渲染点=死字段）。
