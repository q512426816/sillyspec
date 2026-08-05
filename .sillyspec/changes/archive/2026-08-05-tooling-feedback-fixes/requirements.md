---
author: qinyi
created_at: 2026-08-05T22:01:04
---

# 需求（Requirements）— 工具驾驭反馈修复

## FR-01 doctor 探测 worktree 与主仓的依赖漂移

`WorktreeManager.doctor` 必须对比 worktree 当前 lockfile hash 与**主仓** lockfile hash，两者不一致时报 `deps-main-drift` issue；`--fix` 时强制重装（先解 junction 再 provision，或 provision force）。

验收：主仓 lockfile 更新、worktree 自身 lockfile 未变时，doctor 报 `deps-main-drift`；`--fix` 后 worktree 依赖与主仓一致。

## FR-02 doctor 支持 `--change` 过滤

`sillyspec worktree doctor --fix --change <name>` 仅扫该 change 对应的 worktree，不全量扫。对齐 `enforceDepsGate`（`gates.js:93`）已有提示。

验收：多 worktree 共存时，`--change A` 只报告 A 的 issue。

## FR-03 worktree 副本漂移自动锚定主仓

cd 进 `.sillyspec/.runtime/worktrees/<change>/` 跑 plan/execute/verify/archive 时，CLI 自动用主仓 specBase 继续 + warn 提示，不 `exit(2)`。其他 cwd 漂移（changeMissing、quick session drift）仍阻断。

验收：在 worktree 副本 cwd 跑 `execute`，进度写入主仓 spec，输出含「已自动锚定主仓」warn；非副本漂移仍 exit(2)。

## FR-04 plan 阶段校验命令存在性（monorepo 感知）

plan-postcheck 必须解析每个 TaskCard 的 `verify:` / `implementation:` 字段中的 `npm/pnpm/yarn run <script>` 命令，对照对应 `package.json`（识别 `cd <subdir> &&` 前缀 + 读 `local.yaml` modules 块定位子包）校验 script 存在；缺失则 plan `--done` 硬阻断。

验收：TaskCard 写「根目录 pnpm gen:types」但根 `package.json` 无该 script、且 monorepo 子包才有 → plan-postcheck 报 error 阻断；命令存在于对应子包 → 通过。

## FR-05 plan 审查对 acceptance/schema 对齐做软约束

`stepReviewPlan` 审查清单要求：acceptance 字段提到的产物字段必须对照实际 schema/类型源文件核验存在性与形态，不能凭 design.md 文字臆断。`validatePlanFeasibility` 加 best-effort 字段 grep 兜底 warning。

验收：plan.js 审查清单含 acceptance 核验条；postcheck 对 acceptance 提到、但 allowed_paths 源文件找不到的标识符给 warning（不阻断）。

## FR-06 execute --done 底部推进锚定行

`complete.js` 单步推进分支在 `outputStep` 之后，于输出末尾打印 `🚀 advanced to step N/M: <stepName>`。

验收：`execute --done` 推进后，输出最末行（或其附近）含 `advanced to step`，tail 截断也能看到。

## FR-07 共享 helper 去重双写

- `checkDepsFreshness`（worktree-deps.js）：doctor 与 `ensureDepsFreshness` 共用同一判定。
- `validateScriptCommands`（stages/cmd-existence.js）：scan-postcheck 与 plan-postcheck 共用同一命令校验。

验收：两处原双写逻辑改为调共享 helper，行为等价（现有测试不回归）；helper 有独立单测。

## FR-08（附）后台任务软缓解

execute/verify 铁律加一条「长测试前台同步跑，避免后台任务被生命周期回收」prompt 文案。非功能保证，仅降低误用概率。
