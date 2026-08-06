---
id: task-01
title: resolveRuntimeRoot helper 抽取 + drift 守卫设 specDriftAnchor（producer）
title_zh: resolveRuntimeRoot helper 抽取 + drift 守卫设 specDriftAnchor（producer）
author: qinyi
created_at: 2026-08-06T14:07:25+08:00
priority: P0
depends_on: []
blocks: [task-02, task-03, task-04, task-05]
requirement_ids: [FR-01, FR-02]
decision_ids: [D-01, D-02, D-04, D-05]
allowed_paths:
  - src/run/shared.js
  - src/run/command.js
provides:
  - contract: resolveRuntimeRoot
    fields: [platformOpts, localSpecBase, returnType]
    desc: "src/run/shared.js export function resolveRuntimeRoot(platformOpts, localSpecBase) → string；三级优先级 runtimeRoot > specDriftAnchor > 本地兜底"
  - contract: specDriftAnchorField
    fields: [platformOpts.specDriftAnchor, valueWhenDrift, valueWhenNoDrift]
    desc: "drift 守卫命中时 platformOpts.specDriftAnchor = wt.mainSpecBase（主仓 specBase 绝对路径）；非 drift / 平台模式 / 显式 --spec-dir 时 undefined"
expects_from: []
goal: |
  抽取统一 runtimeRoot 解析工具函数（design §7.2），消除 14 站点公式漂移风险（R-01）；
  并在 drift 守卫命中分支补设 platformOpts.specDriftAnchor（design §7.1），
  让下游 consumer 经 platformOpts 透传读到主仓锚点（不设 specRoot/runtimeRoot 避 sentinel 副作用，D-02）。
implementation: |
  - src/run/shared.js 新增 export function resolveRuntimeRoot(platformOpts, localSpecBase)：
      if (platformOpts?.runtimeRoot) return platformOpts.runtimeRoot
      if (platformOpts?.specDriftAnchor) return join(platformOpts.specDriftAnchor, '.runtime')
      return join(localSpecBase, '.runtime')
    顶部已 import { join } from 'node:path'（核实，缺则补）。
  - src/run/command.js:536-546 drift 守卫命中分支（if (wt) { ... }）末尾追加 1 行：
      platformOpts.specDriftAnchor = wt.mainSpecBase
    放在 pm = new ProgressManager({...}) 之后、console.warn 之前或之后均可（同分支内即可）。
  - platformOpts 声明方式核实（R-07）：若 command.js 内 platformOpts 是 const 对象字面量（非 frozen），
    直接 mutate 加字段即可；若 Object.freeze 包裹，改 let platformOpts 后整体替换（{ ...platformOpts, specDriftAnchor: wt.mainSpecBase }）。
    实施前 grep platformOpts 声明点确认。
acceptance: |
  - resolveRuntimeRoot 三级优先级正确：
    ① platformOpts.runtimeRoot 已设 → 返回该值；
    ② 仅 specDriftAnchor 已设 → 返回 join(specDriftAnchor, '.runtime')；
    ③ 两者都未设 → 返回 join(localSpecBase, '.runtime')。
  - drift 守卫命中（detectWorktreeSpecDrift 返回非 null）后 platformOpts.specDriftAnchor === wt.mainSpecBase；
    非 drift / 平台模式（specRoot 已设）/ 显式 --spec-dir 时 specDriftAnchor === undefined。
  - sentinel 不误判：grep 确认 triggerSync（shared.js:288）/ checkApproval（shared.js:315）/ prompt 平台分支
    检查形式均为 specRoot||runtimeRoot，不含 specDriftAnchor（D-02 边界）。
  - 纯函数无副作用（resolveRuntimeRoot 不 mutate platformOpts）。
verify: |
  node --test --test-name-pattern="resolveRuntimeRoot" test/execute-runs-isolation.test.mjs
  （task-03 落地后；本 task 自身可临时 node -e 手测三级优先级）
constraints: |
  - 只加 1 个字段 + 1 个函数，不改控制流（D-01 最小侵入）。
  - 绝不设 platformOpts.specRoot / runtimeRoot 纠正 drift（D-02：会触发平台 sentinel 副作用）。
  - platformOpts mutate 前确认非 frozen（R-07）。
  - drift 守卫条件 !platformOpts.specRoot && !specDir && [plan,execute,verify,archive].includes(stageName)
    保持不变（quick 不自动锚定，design §7.1；quick drift 走 detectQuickSessionDrift fail-fast exit）。
related_tests: []
---

# task-01: resolveRuntimeRoot helper 抽取 + drift 守卫设 specDriftAnchor（producer）

本 task 是字段数据流（design §6）的 **producer**：抽 helper（消除 14 站点公式漂移 R-01）+ drift 守卫补设 specDriftAnchor（堵源头，让下游经 platformOpts 透传读到主仓锚点）。task-02 的 14 站点 consumer 依赖本 task export 的 resolveRuntimeRoot。

## 依据
- design.md §4.1（specDriftAnchor 字段定义）/ §4.2（resolveRuntimeRoot 公式）/ §7.1（drift 守卫代码片段）/ §7.2（helper 代码片段）/ §12 D-01/D-02/D-04/D-05
- requirements.md FR-01（drift 守卫设 specDriftAnchor）/ FR-02（resolveRuntimeRoot 工具函数）
- 根因 RC-1（drift 守卫半截，漏设 platformOpts 字段，design §2）
