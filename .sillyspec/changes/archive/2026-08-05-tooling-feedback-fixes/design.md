---
author: qinyi
created_at: 2026-08-05T22:01:04
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— 工具驾驭反馈修复

> 变更：`2026-08-05-tooling-feedback-fixes`
> 项目：sillyspec（工具自身，dogfood）
> 阶段：brainstorm → design

## 1. 背景

一次用 SillySpec 管理 `multi-agent-platform/sillyhub` 项目的工具驾驭复盘中，暴露 5 个 SillySpec 侧的痛点/缺陷。它们都在真实使用中拖累了 agent 体验，且大多有明确代码根因：

1. **worktree doctor deps drift（真实 bug）**：`WorktreeManager.doctor`（`src/worktree.js:847-992`）已有 deps 探测（deps-missing/stale/failed），但 `deps-stale` 只比「worktree 自身 lockfile hash vs meta 快照」（`worktree.js:912,916`），**不比 worktree vs 主仓 lockfile**。主仓 lockfile/node_modules 更新后，worktree junction 仍可解析、自身 lockfile 未变 → doctor 报「健康」却实际脱节，逼用户手动 `pnpm install --force`。附带 bug：`enforceDepsGate`（`src/run/gates.js:93`）提示用户跑 `worktree doctor --fix --change <name>`，但 doctor 根本没实现 `--change` flag（`src/index.js:867`），照提示跑被静默忽略。

2. **cd 进 worktree 被拒**：`src/run/command.js:530-538` 的 worktree 副本漂移守卫命中时 `process.exit(2)`。保护本身对（防进度分裂），但触发太容易——bash 的 `cd` 跨命令持久化，一旦 cd 进 `.sillyspec/.runtime/worktrees/<change>/` 再跑 sillyspec 就被拒。关键浪费：`mainSpecBase` 已在 `detectWorktreeSpecDrift` 返回值（`src/run/shared.js:244`）算好，却只用来报错、不用来纠正。

3. **plan 蓝图写不存在的命令**：plan-postcheck 对命令是**零校验**。全仓库唯一的命令存在性检查在 scan 阶段（`src/scan-postcheck.js:118-158`），且只看 `local.yaml` 的 `npm run <script>` + 只查根 `package.json`。monorepo 场景下「根目录 `pnpm gen:types`」（脚本实际在 `frontend/package.json`）完全无效，子代理被误导。

4. **acceptance 与 schema 不对齐**：plan-postcheck 只用 `/^acceptance:/m` 判字段存在（`plan-postcheck.js:91,565`），不判语义。「api-types.ts 含 budget_tokens」这类对 schema 形态的误解能直接通过 plan，到 execute 才暴露。

5. **execute --done 输出冗长看不到推进**：推进信号（`✅ Step N/M` + 下一步块顶 `step:`）都在**输出顶部**，被几百行 prompt 挤出 tail 视窗，需二次 `grep step:` 确认是否真推进。

附：问题 6（后台 bash 任务被 kill）是 Claude Code harness 的后台任务生命周期行为，SillySpec 不 spawn 后台任务，**不在本仓范围**，仅在 execute/verify 铁律加一条「长测试前台同步跑」软缓解。

## 2. 设计目标

1. doctor 真探测 + 真修复 worktree 与主仓的依赖漂移（含 `--change` 精准修复）。
2. cd 进 worktree 副本不再硬阻断，自动锚回主仓 spec 继续。
3. plan 阶段拦截「不存在的命令」（monorepo 子目录感知），硬阻断。
4. plan 审查阶段对 acceptance 与 schema 对齐做软约束（prompt + best-effort 兜底）。
5. execute --done 输出末尾有明确推进锚定行。
6. 顺手抽两个共享 helper，消除 doctor/ensureDepsFreshness 与 scan/plan-postcheck 的双写漂移。

## 3. 非目标

- **不做** Claude Code harness 后台任务生命周期修复（问题 6，仅 prompt 软缓解）。
- **不做** 通用「健康检查框架」重构（方案 B 已否决，YAGNI）。
- **不改** sillyhub 项目本身的 task-07（只改 SillySpec 工具侧）。
- **不引入** 新 stage / 新规模档 / 新持久 schema。
- **不改** 现有 git worktree 隔离、baseline overlay、apply 回写流程。

## 4. 拆分判断

单一主题变更，不拆分、不走批量。5 问题同源（工具驾驭反馈），且问题 1（deps 检查）与问题 3（命令检查）各自存在双写拷贝，抽共享 helper 的收益跨问题复用——拆成多 change 会丢失去重收益。规模 = large（跨 worktree/runtime/stages/cli-entry 四模块 + 含 helper 抽取 + 新 postcheck 校验器 + 行为变更），走完整流程。

## 决策（Decisions）

本变更的关键技术决策（方案选择均已由用户/调研拍板）：

- **D-01 整体策略 = 逐问题修复 + 抽共享 helper（方案 A）**。否决方案 B（通用「健康检查框架」重构，YAGNI、超出修痛点范围）与方案 C（最小改动不抽 helper，doctor/ensureDepsFreshness 与 scan/plan-postcheck 两处双写漂移继续留隐患）。理由：修痛点同时消除两处同源双写。
- **D-02 问题 1 `--fix` 强制重装用双保险**：`provisionDeps` 加 `force` 选项（绕过 `tryLink` 幂等短路）+ `_doctorReprovision` 先解 junction 再重供。否决「仅 force 选项」（junction 仍指向旧 main node_modules 时 force 也可能短路）。理由：主仓 node_modules 被重新生成场景需先断链。
- **D-03 问题 2 自动锁定仅限 worktree 副本漂移**：`detectWorktreeSpecDrift` 命中时重写 specBase + warn 继续；其他 cwd 漂移（changeMissing、quick session drift）仍 exit(2)。否决「所有漂移都自动纠正」（弱化主仓根原则、掩盖真错）。理由：副本漂移是 100% 误操作且 mainSpecBase 已算好。
- **D-04 问题 3 命令校验同 helper 双严重度**：`validateScriptCommands` 在 scan-postcheck 维持 warning、在 plan-postcheck 升 error。否决「统一 error」（scan 阶段 local.yaml 命令误报会阻断 init）。理由：plan 阶段命令更结构化可硬阻断，scan 阶段保守。
- **D-05 问题 4 acceptance 仅软约束**：prompt 审查清单 + best-effort 字段 grep（warning），不做确定性硬校验。否决「硬校验」（schema 形态各异 prisma/graphql/openapi/TS，无通用判据）。理由：语义判断交 LLM，确定性仅兜底。
- **D-06 问题 6 后台 bash 被 kill 不在范围**：仅 execute/verify 铁律加「长测试前台同步跑」prompt 文案。否决「SillySpec 内部改造」（harness 行为非本仓可控）。理由：SillySpec 不 spawn 后台任务。

## 5. 总体方案

### Phase 1 — 共享 helper 抽取（先去重，再修复，避免改两遍）

- **H1 `checkDepsFreshness(meta, wtPath, mainCwd)`** → `src/worktree-deps.js`
  统一 doctor（`worktree.js:908-928`）与 `ensureDepsFreshness`（`run/stage.js:396-423`）的 deps 检查。复用 `lockfileHash` + `linkOneDir`（`worktree-deps.js:172-183`）的 wtHash-vs-mainHash mismatch 判据，新增 `deps-main-drift` 状态。返回 `{status, detail, wtHash?, mainHash?}`。

- **H2 `validateScriptCommands(text, {projectRoot, modules})`** → `src/stages/cmd-existence.js`（新文件）
  统一 scan-postcheck（`scan-postcheck.js:118-158`）与 plan-postcheck 的命令存在性检查。照搬 scan 模板，扩展：正则 `/(npm|pnpm|yarn) run (\S+)/g`；monorepo 感知——识别 `cd <subdir> &&` 前缀查 `<subdir>/package.json`，无前缀时读 `local.yaml` 的 `modules` 块定位子包。返回 `{invalid: [{cmd, reason}], checked}`。

### Phase 2 — 5 问题修复

- **问题 1（doctor deps drift + --change）**：
  - doctor 与 ensureDepsFreshness 改调 H1，新增 `deps-main-drift` issue（fixable）。
  - `--fix` 强制重装双保险：`provisionDeps` 加 `force` 选项（绕过 `tryLink` 的 preexisting 短路 `worktree-deps.js:101-110`）；`_doctorReprovision` 先解 junction（复用 `cleanup` 的解链接代码 `worktree.js:722-743`）再 `provisionDeps(force=true)`。
  - 补 doctor `--change` flag：`index.js:867` 解析，`wm.doctor({changeName})` 过滤 `metaEntries`，对齐 `gates.js:93` 提示。
  - 放宽 `worktree.js:909` 的 `in-place-fallback` 守卫，至少给 in-place 跑 lockfile-hash 自检。

- **问题 2（cwd 自动锁定）**：`command.js:530-538` 仅 `detectWorktreeSpecDrift` 命中（副本漂移，100% 误操作）时不 exit，把 `specBase`（及关联 `specRoot`）重写为 `wt.mainSpecBase` + `console.warn` 提示已自动锚定主仓，流程继续。其他 cwd 漂移（changeMissing、quick drift）仍 `exit(2)`。

- **问题 3（plan 命令存在性 postcheck）**：`plan-postcheck.js` `executePlanPostcheck`（`plan-postcheck.js:648`）新增 `validateTaskCommands` 校验器，解析每个 TaskCard 的 `verify:`/`implementation:` 字段，调 H2，**硬阻断**（error）。`scan-postcheck.js` 改调 H2 去重（保持 warning 行为不变）。

- **问题 4（acceptance 审查）**：`plan.js` `stepReviewPlan` 审查清单（`plan.js:318-326`）加一条「acceptance 字段必须对照实际 schema/类型源文件核验存在性与形态，不能凭 design.md 文字臆断」；`validatePlanFeasibility` 加 best-effort 启发式——把 acceptance 文本标识符 grep 到 `allowed_paths` 源文件，找不到 warning（不阻断，给 LLM 审查提线索）。

- **问题 5（advanced 行）**：`complete.js:470` `outputStep` 调用之后追加底部锚定 `\n🚀 advanced to step ${nextPendingIdx+1}/${steps.length}: ${defSteps[nextPendingIdx].name}`。

### Phase 3 — 测试 + 文档同步

- 配套测试（见文件变更清单）。
- file-lifecycle / docs/prompt（重跑 `_extract.mjs`）/ .claude/skills/ / 模块文档同步。

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | `src/stages/cmd-existence.js` | H2 共享 `validateScriptCommands` helper |
| 修改 | `src/worktree-deps.js` | 新增 `checkDepsFreshness`（H1）+ `provisionDeps` 加 `force` 选项 |
| 修改 | `src/worktree.js` | doctor 调 H1 + 新增 `deps-main-drift` + `_doctorReprovision` force + `--change` 过滤 + 放宽 in-place 守卫 |
| 修改 | `src/run/stage.js` | `ensureDepsFreshness` 改调 H1 |
| 修改 | `src/run/command.js` | worktree 副本漂移自动锁定主仓 spec |
| 修改 | `src/run/gates.js` | `enforceDepsGate` 提示文案与实现对齐（--change 已可用） |
| 修改 | `src/stages/plan-postcheck.js` | 新增 `validateTaskCommands`（调 H2 硬阻断）+ `validatePlanFeasibility` best-effort 字段 grep |
| 修改 | `src/scan-postcheck.js` | 改调 H2 共享 helper 去重 |
| 修改 | `src/stages/plan.js` | `stepReviewPlan` 审查清单加 acceptance/schema 核验条 |
| 修改 | `src/run/complete.js` | `outputStep` 后加底部 `🚀 advanced to step` 行 |
| 修改 | `src/index.js` | doctor 解析 `--change` flag |
| 新增 | `test/cmd-existence.test.mjs` | H2 helper 单测（npm/pnpm/yarn + monorepo 子目录） |
| 修改 | `test/worktree-doctor.test.mjs`（或同名） | `deps-main-drift` + `--change` 过滤 + force 重装 |
| 修改 | `test/worktree-execute-spec-drift*.test.mjs` | 断言由 exit(2) 改为「自动锚定 + 流程继续」 |
| 修改 | `test/plan-postcheck*.test.mjs` | `validateTaskCommands` 命令存在性硬阻断 |
| 修改 | `test/scan-postcheck*.test.mjs` | 改调共享 helper 后行为不变 |
| 修改 | `test/run-complete*.test.mjs`（含 advanced 行断言） | 底部 advanced 行 |

> 说明：`src/run/shared.js` 的 `detectWorktreeSpecDrift` 返回值已暴露 `mainSpecBase`（`shared.js:244`），无需改动，仅由 `command.js` 消费——自审后从清单剔除。

## 7. 接口定义

```js
// src/worktree-deps.js — H1
// 返回 deps 新鲜度判定，统一 doctor 与 execute 入口自检
function checkDepsFreshness(meta, wtPath, mainCwd) {
  // status ∈ 'fresh' | 'missing' | 'stale' | 'main-drift' | 'failed'
  // 复用 lockfileHash(wtPath)/lockfileHash(mainCwd) 与 linkOneDir mismatch 判据
  // 返回 { status, detail, wtHash?, mainHash?, metaLockHash? }
}

// src/worktree-deps.js — provisionDeps 增选项
function provisionDeps(worktreePath, mainCwd, opts = {}) {
  // opts.force: true 时绕过 tryLink preexisting 短路，强制重新 link/install
}

// src/stages/cmd-existence.js — H2（新文件）
// 从文本提取 npm/pnpm/yarn run <script> 命令并校验存在性（monorepo 感知）
function validateScriptCommands(text, { projectRoot, modules }) {
  // modules: local.yaml 的 modules 块（可选），用于无 cd 前缀时定位子包
  // 返回 { invalid: [{cmd, reason}], checked: number }
}
```

## 7.5. 生命周期契约表

不涉及生命周期契约。本次改动是 CLI 守卫 / postcheck 校验 / 输出锚定层，不涉及 session / lease / agent_run / daemon / lifecycle / state_transition / claim / heartbeat 等生命周期事件。

## 8. 数据模型

无持久 schema 变更。`meta.json` 复用现有 `depsStatus` / `depsLockHash` 字段（可能补写 `mainLockHash` 快照供下次 drift 比较，仍是可选字段，非 schema 破坏）。doctor issue `type` 新增常量 `'deps-main-drift'`（代码层枚举，非持久 schema）。

## 9. 兼容策略

- doctor 不传 `--change` 时行为不变（全量扫），传 `--change` 仅过滤。
- `provisionDeps` 不传 `force` 时行为不变（`tryLink` 幂等短路保留）。
- worktree 副本漂移自动锁定**仅改这一种场景**，其他 cwd 漂移仍 `exit(2)`；既有 `--spec-dir` / 平台 `specRoot` 显式指定路径继续跳过自动锁定。
- `validateScriptCommands` 在 scan-postcheck 保持原有 **warning** 行为（不升 error），plan-postcheck 调用时升 **error**——同一 helper、两种严重度，由调用方决定。
- plan-postcheck 新增 `validateTaskCommands` 仅对**新跑的 plan** 生效（postcheck 在 `plan --done` 跑），已归档 change 不受回溯影响。

## 10. 风险登记

- **R1**：cwd 自动锁定是行为大改，可能弱化「CLI 必须主仓根跑」原则。缓解：仅副本漂移场景 + warn 醒目提示，其他漂移仍拒；既有显式 `--spec-dir` 不受影响。
- **R2**：plan 命令校验误报（命令合法但解析漏，如 npx/自定义脚本）。缓解：仅硬阻断 `npm/pnpm/yarn run <script>` 这一类可静态校验的；其他命令不校验，scan-postcheck 维持 warning。
- **R3**：`checkDepsFreshness` 抽取回归（doctor 与 ensureDepsFreshness 行为必须等价）。缓解：照搬原逻辑、配套测试逐字段断言。
- **R4**：monorepo 子目录识别不全（非 `cd <subdir> &&` 形态、非 local.yaml modules 块）。缓解：双路径覆盖 + 找不到时 warning 而非静默。
- **R5**：acceptance best-effort grep 误报（标识符恰好与源文件无关）。缓解：仅 warning 不阻断，定位为「给 LLM 审查提线索」。

## 11. 自审 / Self-Review

- [x] 覆盖 5 问题 + 2 共享 helper，与调研结论一致。
- [x] 文件变更清单完整（含测试）。
- [x] 接口定义含方法签名与返回结构。
- [x] 兼容策略覆盖 brownfield（每条改动均有「不传则不变」路径）。
- [x] 风险登记 5 条，均有缓解。
- [x] 非目标明确（harness / 通用框架 / sillyhub / 新 stage）。
- [x] 自审发现并修正：原计划改 `src/run/shared.js`，复查发现 `mainSpecBase` 已在返回值暴露，无需改——清单已剔除该文件。
- 待 plan 阶段细化：Wave 排序（H1/H2 先行，问题修复依赖 helper）、每 Task 的 allowed_paths 与 acceptance。
