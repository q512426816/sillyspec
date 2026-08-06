---
author: qinyi
created_at: 2026-08-06 13:52:01
---

# 任务清单（Tasks）

> 草案（design 阶段）。最终 Wave 分组 + 依赖关系由 `sillyspec run plan` 拆解为 plan.md。

## T1：新增 resolveRuntimeRoot 工具函数
- **文件**：`src/run/shared.js`
- **动作**：新增 `resolveRuntimeRoot(platformOpts, localSpecBase)`（design §7.2）
- **完成条件**：纯函数；三种输入组合（runtimeRoot / specDriftAnchor / 兜底）单元测试通过

## T2：drift 守卫设 specDriftAnchor
- **文件**：`src/run/command.js`（drift 守卫 :536-546）
- **动作**：命中分支追加 `platformOpts.specDriftAnchor = wt.mainSpecBase`（design §7.1）
- **依赖**：确认 `platformOpts` 声明方式（若 frozen 改 `let` 整体替换）
- **完成条件**：drift 命中后 `platformOpts.specDriftAnchor` 为主仓 specBase；非 drift 不设

## T3：11 处 A 类站点改用 resolveRuntimeRoot
- **文件**：`src/run/gates.js`（:111/:271/:314）、`src/run/stage.js`（:92）、`src/run/complete.js`（:500）、`src/run/prompt.js`（:453/:491/:529）、`src/run/command.js`（:427/:735）、`src/task-review.js`（:631）
- **动作**：公式 `platformOpts?.runtimeRoot || join(<localSpecBase>, '.runtime')` → `resolveRuntimeRoot(platformOpts, <localSpecBase>)`
- **依赖**：T1
- **完成条件**：11 站点 grep 无残留旧公式；drift 场景 marker / review.json 落主仓

## T4：3 处 contract-matrix 调用方解析 runtimeRoot（B 类）
- **文件**：`src/run/verify-postcheck.js`（:723 runVerifyParityCheck）、`src/run/gates.js`（:219 parity 透传）、`src/machine-interface.js`（:184/:402 待 plan 确认是否需改）
- **动作**：调用方先 `resolveRuntimeRoot` 解析再传 contract-matrix 函数（推荐方案 b）
- **依赖**：T1
- **完成条件**：parity check 在 drift 场景读主仓 contract-artifacts

## T5：新增测试 test/execute-runs-isolation.test.mjs
- **文件**：`test/execute-runs-isolation.test.mjs`
- **动作**：T-01..T-08 用例（design §8）
  - T-01 drift 命中 → execute-runs 落主仓
  - T-02 cleanup 后 execute-runs 仍存
  - T-03 stage-reviews 落主仓
  - T-04 marker 按 change 隔离
  - T-05 specDriftAnchor 不触发 sentinel
  - T-06 非 drift 零回归
  - T-07 平台模式零回归
  - T-08 quick marker 一致性
- **依赖**：T2 / T3 / T4
- **完成条件**：8 用例通过；测试隔离用 `--spec-dir` 钉临时目录；worktree fixture chdir
- **注意**：参考既有经验 `sillyspec-test-specdir-isolation`（between-run 清 `.sillyspec` 撞文件锁 → 钉死 spec-dir）、`worktree-test-fixture-must-chdir`（_resolveMainRepoRoot 相对 .git 依赖 process.cwd）

## T6：文档同步
- **文件**：`docs/sillyspec/file-lifecycle.md`
- **动作**：同步 execute-runs / stage-reviews 落点说明（drift 场景落主仓 `.runtime`）+ 更新头部 `updated_at`
- **依赖**：T1..T5 落地后
- **完成条件**：file-lifecycle.md 描述与代码一致；CLAUDE.md「文件生命周期文档同步」检查清单逐项过

## T7（可选）：prompt 文档复核
- **文件**：`docs/prompt/`（如需）
- **动作**：若 T3 改动触及 prompt 注入文本（预期不改，仅改 marker 路径解析），跑 `node docs/prompt/_extract.mjs` 复核
- **完成条件**：prompt 正文无变动则跳过

## 验收（对照 design §9 AC-1..AC-8）
- AC-1 ← T-01 / T3
- AC-2 ← T-02 / T5
- AC-3 ← T-01/T-02（archive step1 gate 真相源在主仓存活）
- AC-4 ← T-07 / T5
- AC-5 ← T-06 / T5
- AC-6 ← T-04 / T5
- AC-7 ← T5 + 既有套件全绿
- AC-8 ← lint 通过

## 实现路径
`node bin/sillyspec.js run plan --change 2026-08-06-execute-runs-isolation` → plan.md（Wave 分组）→ execute。
