---
author: qinyi
created_at: 2026-07-07T08:39:41
change: 2026-07-06-execute-deps-gate-deadlock
stage: verify
verdict: pass
---

# Verify Result — execute deps 门控 worktree cleanup 终态死锁修复

## 验证结论：✅ PASS

修复达成核心目标：打通 worktree cleanup 终态死锁（doctor 对齐 plan.md）+ 门控保持 fail-closed 不放行 + 诊断指引正确 + 输出 fail-loud。对照 design.md（truth source）一致，测试实证。

## 任务完成度

| task | 状态 | 交付 |
|---|---|---|
| task-01 | ✅ | src/progress.js：alignExecuteToPlan + readPlanCheckboxStatus（D-002 全勾判定 + D-003@v2 显式置 stage status + dry-run/--confirm） |
| task-02 | ✅ | src/doctor-diagnostics.js：execute-progress-plan-mismatch 只读诊断项 + safe_action（D-001@v2 诊断/写分离） |
| task-03 | ✅ | src/index.js：doctor --align-execute-progress flag 分支（契约 {confirm} 修复 + P2-1 平台兜底已修） |
| task-04 | ✅ | src/run.js：enforceDepsGate 诊断分支（worktreeGone 基于 !existsSync(getWorktreePath) G2）+ fail-loud |
| task-05 | ✅ | test/doctor-align-execute-progress.test.mjs（38 assert）+ test/enforce-deps-gate-diagnostic.test.mjs（30 assert） |
| task-06 | ✅ | docs（file-lifecycle + runtime + worktree + sillyspec-doctor skill）4 文件同步 |
| task-07 | ✅ | src/run.js：skipStep platformOpts 透传修复（附带候选） |

## FR 覆盖

| FR | 状态 | 证据 |
|---|---|---|
| FR-01 doctor --align-execute-progress 对齐 | ✅ | progress.js:1850 alignExecuteToPlan + 测试 38 assert（正向/拒绝/dry-run/幂等/部分戳） |
| FR-02 plan 未全勾拒绝 | ✅ | progress.js:1872 planChecked<planTotal → {ok:false}；测试 AC-02 progress 不变 |
| FR-03 默认 dry-run | ✅ | progress.js:1900 !confirm → 不落盘；index.js 默认 dryRun |
| FR-04 只读诊断项 | ✅ | doctor-diagnostics.js（execute-progress-plan-mismatch）；QA 核实只读硬约束（line 12-22）遵守 |
| FR-05 门控诊断分支不放行 | ✅ | run.js:2404 worktreeGone 基于 !existsSync(getWorktreePath)；终态仍 exit(1) |
| FR-06 fail-loud | ✅ | run.js:2409 阻断块含"本次 --done 未完成"；测试 30 assert e2e 验证 |
| FR-07 门核心标准不变 | ✅ | run.js:2398 ['linked','installed','n/a'] 字面未变；未引入 commit 存在性放行 |

## 决策覆盖（D-001@v2~D-005）

| 决策 | 覆盖 | 验证 |
|---|---|---|
| D-001@v2 入口 + 诊断/写分离 | ✅ | 写操作在 ProgressManager；诊断只读在 doctor-diagnostics；flag 在 index.js |
| D-002@v1 plan.md 全勾判定 | ✅ | readPlanCheckboxStatus 解析 task-NN checkbox |
| D-003@v2 显式置 stage status | ✅ | progress.js:1904-1906（Grill G1 修正落地） |
| D-004@v1 声明优先 verify 兜底 | ✅ | doctor 信任 plan.md 声明，输出提示确认 verify |
| D-005@v1 仅改拒绝侧 | ✅ | fail-loud 仅 stderr 拒绝侧，成功侧 stdout 不变 |

## 测试结果

- **npm test**：34 文件通过 / 3 文件失败（全部 pre-existing，基线 main 同样失败，非本次回归）
  - 失败：cli-top-level-aliases（别名 json 不一致 pre-existing）、decision-supersede（Windows ESM URL scheme）、run-scan-project-parse（基线同款 2 项）
  - 本次新增 2 测试（doctor-align 38 + enforce-deps-gate 30 = 68 assert）全过
- **npm run lint**：43 JavaScript 文件语法全过

## 验收 AC

| AC | 状态 | 证据 |
|---|---|---|
| AC-01 worktree cleanup + plan 全勾 → 对齐后 execute completed | ✅ | 测试覆盖（alignExecuteToPlan 显式置 stage status） |
| AC-02 plan 有未勾 → 拒绝对齐 | ✅ | 测试 AC-02 |
| AC-03 默认无 flag → doctor 行为不变 | ✅ | flag 分支独立，不影响 --cleanup-remnant/--fix/--json |
| AC-04 doctor --json 报告诊断项 + safe_action | ✅ | QA 核实诊断项 + formatter 集成 |
| AC-05 门控终态输出"不可用"分支 + fail-loud | ✅ | run.js:2409-2413 + 测试 30 assert |
| AC-06 门核心标准不变 | ✅ | run.js:2398 |
| AC-07 npm test 全量 | ✅ | 34 通过（3 pre-existing 非本次） |
| AC-08 文档同步 | ✅ | 4 文件 |

## Runtime Evidence（本地运行时证据）

本次变更为 sillyspec CLI 本地工具，**不涉及 daemon / session / lease / agent_run / heartbeat** 等分布式生命周期（design.md 7.5 已判定不触发生命周期契约表）。postcheck 触发的关键词均为本地语义：
- `state transition` = sillyspec 阶段流转（execute→verify，本地 progress 数据的 `checkTransition` 校验）
- `lifecycle` = git worktree 生命周期（create/cleanup/apply，本地 git 操作）
- `complete`/`completed` = step/stage 进度标记（本地 SQLite `stages` 表字段）

真实运行时证据（本地 CLI 实跑，非分布式集成）：
1. **e2e 门控测试**：`test/enforce-deps-gate-diagnostic.test.mjs` 用 `spawnSync` 子进程跑真实 `sillyspec run execute --done`，验证 enforceDepsGate 拒绝（exit=1 + stderr fail-loud 含"本次 --done 未完成" + step 未被标 completed）—— 真实 CLI 运行时行为实证。
2. **alignExecuteToPlan 落盘测试**：`test/doctor-align-execute-progress.test.mjs` 用临时 specDir + 真实 `ProgressManager._write`，验证 step/stage status 落盘（ISO 时间戳 + stages UPSERT + 拒绝时不写盘/mtime 不变）。
3. **主工作区全量 npm test**：apply 后 34 文件通过（含本次 2 新测试 68 assert），实证代码完整可运行。
4. **lint**：43 文件语法全过。

## 已知问题 / 后续

1. **task-02 诊断项无独立测试**（warning）：execute-progress-plan-mismatch 由 QA 审查核实（只读约束 + 逻辑），但无独立 test 文件覆盖。建议下一变更补 test/doctor-diagnostics-execute-mismatch.test.mjs。
2. **P2-2 readPlanCheckboxStatus 双实现**（progress.js + doctor-diagnostics.js，正则略异）：功能一致（对标准 plan.md 顶层 task checkbox 计数相同），建议下一变更抽公共函数收口。
3. **3 个 pre-existing 测试失败**（与本次无关）：cli-top-level-aliases / decision-supersede（Windows ESM）/ run-scan-project-parse，基线 main 同样失败。decision-supersede 的 Windows ESM URL scheme 是 sillyspec 测试的 Windows 兼容性问题，建议单独修。
4. **sillyspec 全局包 bug（pre-existing，非本次范围）**：
   - `sillyspec worktree assess` 在 worktree-apply.js:365 抛 `ReferenceError: require is not defined`（ESM 顶层 require）。本次 execute 收尾绕过（用 git apply 手动 patch）。
   - `sillyspec run <stage> --skip` 在 run.js skipStep 抛 `platformOpts is not defined`。本次附带修复（task-07）。

## 对照设计偏差（合理）

1. index.js 用静态 import（line 12 已 import ProgressManager），非 design 示例的动态 await import —— 子代理查证驱动，合理。
2. index.js 内联单活跃变更自动检测（resolveChangeNameAuto 是 run.js 本地函数未导出）—— 符合 design 示例意图。
3. P2-1 平台模式兜底目录（index.js:328）已修为 resolvePlatformSpecDir 同源（QA 审查发现，本次修复）。

## 风险复查

- 门控 fail-closed 保持（FR-07 实证，门标准不变 + 终态仍拒）。
- doctor-diagnostics 只读硬约束遵守（D-001@v2，QA 核实）。
- plan 误勾风险由 verify 兜底（D-004@v1，doctor 信任声明不复核代码）。
- 本次未引入新测试失败，未改 sillyspec.db schema，未动 worktree isolation 核心机制。
