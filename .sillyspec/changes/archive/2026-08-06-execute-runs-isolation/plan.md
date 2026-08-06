---
author: qinyi
created_at: 2026-08-06 14:07:20
plan_level: light
---

# 轻量计划（Light Plan）：execute-runs/stage-reviews 与 worktree 生命周期解耦

## 来源

直接引用 brainstorm 结论：design.md（方案 A specDriftAnchor，sha256 `cf51b4c583b3d07d4407d1b301df8e8d2485a3b9162317e258ba768a1e891f11`，独立审查 pass）/ proposal.md / requirements.md（FR-01..FR-08 + NFR-01..NFR-04）/ tasks.md 草案。本计划仅拆 Wave + 依赖，不重新扩写设计。

事故链（design §1.1）：worktree cleanup 整目录删 → worktree 内 `.runtime/execute-runs/<runId>/tasks/<task>/review.json` 与 `stage-reviews/<stage>-<runId>/` 物理消失 → archive step1 完成度 gate（真相源 = 磁盘 review.json）阻断。根因（design §2 RC-1..RC-4）：drift 守卫（command.js:536-546）半截——重写本地 specBase/specRoot/specDir/pm 但漏设 platformOpts 字段，下游 14 处 runtimeRoot 解析从 cwd（仍 worktree）重算 → `.runtime` 仍落 worktree。

## 范围

涉及的文件 / 模块清单（design §5 + 文件变更清单，14 改动点 = 11 A 类公式站点 + 3 B 类 contract-matrix 调用方，外加瑕疵 1 纳入的 complete-handlers.js:558）：

- `src/run/shared.js`（新增 `resolveRuntimeRoot` 工具函数，design §7.2）
- `src/run/command.js`（drift 守卫 :536-546 命中分支追加 `platformOpts.specDriftAnchor` + quick marker 站点 :427/:735）
- `src/run/gates.js`（:111 / :271 / :314 三处 A 类 + :219 parity 透传 B 类调用方）
- `src/run/stage.js`（:92 A 类）
- `src/run/complete.js`（:500 A 类）
- `src/run/prompt.js`（:453 / :491 / :529 三处 A 类）
- `src/run/complete-handlers.js`（:558 同形公式，瑕疵 1 纳入保持一致）
- `src/task-review.js`（:631 A 类）
- `src/contract-matrix.js`（:146 / :217 / :334 三处 B 类，调用方先解析传入，函数内兜底保留作防御）
- `src/verify-postcheck.js`（:723 runVerifyParityCheck B 类调用方）
- `test/execute-runs-isolation.test.mjs`（新增 T-01..T-08）
- `docs/sillyspec/file-lifecycle.md`（同步 execute-runs / stage-reviews 落点说明 + updated_at）

不在范围（design §11 NG-1..NG-6）：不改 worktree 创建 / cleanup 逻辑（9 调用点 + worktree.js rmSync 全不动）；不改平台模式 sentinel 链路；不做 cleanup salvage（方案 B 否决）；不处理 native-worktree 外部目录 drift；不处理 worktree 损坏致 detect 不触发；不重命名既有 runtimeRoot/specRoot 字段。

## Tasks

### Wave 1（producer，无依赖）

- [x] task-01: 新增 `resolveRuntimeRoot(platformOpts, localSpecBase)` 工具函数（src/run/shared.js，三级优先级：runtimeRoot > specDriftAnchor > 本地兜底）+ drift 守卫（command.js:536-546）命中分支追加 `platformOpts.specDriftAnchor = wt.mainSpecBase`（覆盖：FR-01, FR-02, D-01, D-02, D-04）

### Wave 2（consumer，依赖 Wave 1；与 task-01 共改 command.js，跨 Wave 串行安全）

- [x] task-02: 14 处 runtimeRoot 解析站点统一改调 `resolveRuntimeRoot`（11 A 类公式站点 + 3 B 类 contract-matrix 调用方 + complete-handlers.js:558 瑕疵 1 纳入；contract-matrix 函数内兜底保留作防御，调用方先解析再传）（覆盖：FR-03, FR-04, NFR-03）

### Wave 3（依赖 Wave 1+2，task-03 与 task-04 可并行）

- [x] task-03: 新增 `test/execute-runs-isolation.test.mjs`（T-01..T-08：drift 落主仓 / cleanup 后存活 / sentinel 不误触发 / 多 change 隔离 / 平台与本地零回归 / 非 drift quick + 手动 specDriftAnchor 验一致性）（覆盖：FR-05, FR-06, FR-07, FR-08, NFR-01, NFR-02）
- [x] task-04: 文档同步（docs/sillyspec/file-lifecycle.md：execute-runs / stage-reviews 落点改为「drift 场景落主仓 `.runtime`，不随 worktree cleanup 消失」+ updated_at；模块卡 runtime.md / worktree.md / cli-entry.md 关键逻辑补充；docs/prompt/ 与 .claude/skills/ 经 execute 核实，预期不改 prompt 正文只改 runtimeRoot 解析则跳过）（覆盖：NFR-04, D-06）

### Wave 4（回归收尾，依赖 Wave 1+2+3）

- [x] task-05: `npm test` + `npm run lint` 全绿回归（含新增 T-01..T-08 + 既有套件零回归）（覆盖：AC-7, AC-8）

## 验收

- AC-1：drift 场景（agent cd worktree 跑 execute）下，所有 task review.json 与 stage review.json 落主仓 `.sillyspec/.runtime/`，worktree 内 `.runtime/` 无这些文件（T-01 验）。
- AC-2：worktree cleanup（9 调用点任一）后，主仓 execute-runs / stage-reviews 文件态完整存活（T-02 验）。
- AC-3：archive step1 完成度 gate 不再因 cleanup 丢失 review.json 阻断（真相源 = 磁盘主仓文件，T-01/T-02 兜底）。
- AC-4：平台模式（specRoot/runtimeRoot 已设）行为零回归——sentinel 判定 / sync / approval / 渲染分支全不变（T-07 验，grep 确认 sentinel 检查形式均为 `specRoot||runtimeRoot` 不含 specDriftAnchor）。
- AC-5：常规本地模式（无 drift）行为零回归（T-06 验）。
- AC-6：多 change 并行 drift 无 marker / 产物路径冲突（T-04 验，各 marker 含 changeName + runId 唯一）。
- AC-7：`npm test` 全绿（含 T-01..T-08）。
- AC-8：`npm run lint` 通过。
- AC-9（瑕疵核对）：14 站点 grep 无残留旧公式 `platformOpts?.runtimeRoot || join`（A 类）；contract-matrix B 类调用方先解析再传（design §5.B 方案 b）。

## 关键路径

```
task-01（helper + drift 守卫 producer）
   └─→ task-02（14 站点 consumer，依赖 task-01 的 resolveRuntimeRoot export）
          ├─→ task-03（测试，依赖 task-01/02 落地）
          └─→ task-04（文档同步，依赖 task-01/02 落地）
                 └─→ task-05（全量回归，依赖 task-01..04）
```

task-01 → task-02 串行（task-02 调 task-01 export 的 helper）；task-03 与 task-04 可并行；task-05 收尾。无 Spike（确定性路径解析，无技术不确定性）。

## 设计决策覆盖（design §12 D-01..D-06，无独立 decisions.md）

| 决策 | 覆盖任务 | 验收证据 |
|---|---|---|
| D-01 采用方案 A（specDriftAnchor） | task-01 / task-02 | AC-1 / AC-2 / AC-3 |
| D-02 用新字段 specDriftAnchor 而非直接设 specRoot/runtimeRoot | task-01 / task-03 | AC-4（T-05/T-07 sentinel 不误触发） |
| D-03 否决方案 B（cleanup salvage） | NG-3（不在范围） | — |
| D-04 复用既有 detectWorktreeSpecDrift + drift 守卫范式 | task-01 | drift 守卫只补 1 行字段 |
| D-05 risk_level=unit-sufficient + 抽 resolveRuntimeRoot + 8 用例 | task-01 / task-02 / task-03 | AC-7（T-01..T-08） |
| D-06 文档同步 file-lifecycle + prompt 复核 | task-04 | AC-文档一致 |
