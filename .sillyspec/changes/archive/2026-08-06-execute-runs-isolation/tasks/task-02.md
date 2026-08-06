---
id: task-02
title: 14 runtimeRoot 站点统一改调 resolveRuntimeRoot（consumer）
title_zh: 14 runtimeRoot 站点统一改调 resolveRuntimeRoot（consumer）
author: qinyi
created_at: 2026-08-06T14:07:30+08:00
priority: P0
depends_on: [task-01]
blocks: [task-03, task-04, task-05]
requirement_ids: [FR-03, FR-04]
decision_ids: [D-01, D-05]
allowed_paths:
  - src/run/gates.js
  - src/run/stage.js
  - src/run/complete.js
  - src/run/prompt.js
  - src/run/command.js
  - src/run/complete-handlers.js
  - src/task-review.js
  - src/contract-matrix.js
  - src/verify-postcheck.js
provides:
  - contract: allRuntimeRootSitesResolved
    fields: [sitesCount, formulaReplaced, bClassStrategy]
    desc: "14 runtimeRoot 解析站点（11 A 类公式 + 3 B 类 contract-matrix 调用方 + complete-handlers.js:558 瑕疵1）统一改调 resolveRuntimeRoot；A 类公式替换，B 类调用方先解析再传（design §5.B 方案 b）"
expects_from:
  task-01:
    - contract: resolveRuntimeRoot
      needs: [platformOpts, localSpecBase, returnType]
    - contract: specDriftAnchorField
      needs: [platformOpts.specDriftAnchor]
goal: |
  design §5 清单的 14 runtimeRoot 解析站点（11 A 类 + 3 B 类 + complete-handlers.js:558）统一改调
  resolveRuntimeRoot（task-01 export），消除「下游各自从 cwd 重算 specBase → .runtime 落 worktree」事故链（RC-3）。
  contract-matrix B 类调用方先解析再传（方案 b，函数内兜底保留作防御）。
implementation: |
  - A 类 11 站点（公式替换 platformOpts?.runtimeRoot || join(<localSpecBase>, '.runtime') → resolveRuntimeRoot(platformOpts, <localSpecBase>)）：
      gates.js:111（enforceReviewJsonGate，localSpecBase=specBase）
      gates.js:271（Stage Review Gate 读 marker，localSpecBase=effectiveSpecBase）
      gates.js:314（execute Task Review Gate 写 marker，localSpecBase=effectiveSpecBase）
      stage.js:92（execute step 进入写 marker，localSpecBase=execSpecBase）
      complete.js:500（execute complete 读 marker / 产物，localSpecBase=specBaseLc）
      prompt.js:453（execute prompt 注入 marker，localSpecBase=execSpecBase）
      prompt.js:491（tier review 注入，localSpecBase=tierSpecBase）
      prompt.js:529（task completion 报告注入，localSpecBase=tcrSpecBase）
      command.js:427（quick run-id marker，localSpecBase=specRoot）
      command.js:735（quick run-id 写入，localSpecBase=specRoot）
      task-review.js:631（writeExecuteRunMarker / task review 写入，localSpecBase=specBase）
    每文件顶部 import { resolveRuntimeRoot } from './shared.js'（核实相对路径，task-review.js 在 src/ 根 → './run/shared.js'）。
  - 瑕疵 1 纳入：complete-handlers.js:558（const runtimeBase = platformOpts.runtimeRoot || join(specBase, '.runtime')，
    quick-sessions guard.json 路径）同形公式一并改调 resolveRuntimeRoot（虽 quick-scope，保持一致性，design §5 漏列由独立审查补）。
  - B 类 3 调用方（调用方先解析再传，contract-matrix 函数内兜底保留作防御）：
      verify-postcheck.js:723 runVerifyParityCheck 调用前先 const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase) 再传；
      gates.js:219 parity 透传（runVerifyParityCheck 入参）同样先 resolveRuntimeRoot；
      contract-matrix.js:146/217/334 三函数内 runtimeRoot || join(specBase, '.runtime') 兜底公式保留（防御，调用方已传 absolute 则不命中）。
  - machine-interface.js:184/402（contract-matrix 调用方之一）核实：若其 runtimeRoot 已由上游调用方解析传入则不动；
    若仍 join(specBase,'.runtime') 兜底且会在 drift 场景被触发则同 B 类处理。**本 change defer**（design 文件变更清单未列，
    非事故链必经路径；execute 阶段核实，若需改属增量补丁）。
acceptance: |
  - 11 A 类站点公式全替换为 resolveRuntimeRoot(platformOpts, localSpecBase)（grep 旧公式 platformOpts?.runtimeRoot || join 无残留，A 类）。
  - complete-handlers.js:558 同步改调 resolveRuntimeRoot（瑕疵 1 闭合）。
  - B 类 3 调用方（verify-postcheck.js:723 / gates.js:219）先 resolveRuntimeRoot 再传；
    contract-matrix.js 三函数内兜底公式保留（防御，不被 drift 场景命中）。
  - drift 场景下每站点产出的 marker / review.json 路径在主仓 .runtime（execute-runs / stage-reviews / quick-sessions guard.json）。
  - machine-interface.js:184/402 在 task body 显式 defer 注明（非本 change，execute 核实）。
verify: |
  grep -rn "platformOpts?.runtimeRoot || join\|platformOpts.runtimeRoot || join" src/run/ src/task-review.js src/contract-matrix.js
  （A 类 + complete-handlers.js 应 0 残留；contract-matrix.js:146/217/334 函数内兜底保留属预期，不计残留——区分方式：兜底在函数形参默认值位置，localSpecBase 变量名而非 platformOpts 上下文）
  node --test --test-name-pattern="drift" test/execute-runs-isolation.test.mjs
  （task-03 落地后）
constraints: |
  - 不改 contract-matrix 函数签名（方案 b：调用方解析传入，非方案 a 加 platformOpts 参数）。
  - contract-matrix 函数内兜底公式保留（防御性，不删）。
  - localSpecBase 变量名按各站点现状（specBase / effectiveSpecBase / execSpecBase / specBaseLc / tierSpecBase / tcrSpecBase / specRoot）代入，不重命名。
  - machine-interface.js defer（非本 change 范围，design 文件变更清单未列）。
related_tests: []
---

# task-02: 14 runtimeRoot 站点统一改调 resolveRuntimeRoot（consumer）

本 task 是字段数据流（design §6）的 **consumer 侧**：14 站点（11 A 类公式 + 3 B 类 contract-matrix 调用方 + complete-handlers.js:558 瑕疵 1）统一调 task-01 的 resolveRuntimeRoot，堵下游「各自从 cwd 重算 specBase → .runtime 落 worktree」事故链（RC-3）。

## 依据
- design.md §5.A（11 A 类公式站点 file:line）/ §5.B（3 B 类 contract-matrix 调用方）/ §5.C（不改的消费/透传站点）/ §7.3（A 类替换示例）/ §7.4（B 类调用方修正方案 b）/ 文件变更清单
- requirements.md FR-03（11 A 类站点）/ FR-04（3 B 类调用方）/ NFR-03（可维护性，单点维护）
- 瑕疵 1：brainstorm 独立审查指出 design §5 漏 complete-handlers.js:558（同形公式，quick-sessions guard.json 路径），task-02 纳入保持一致性
- machine-interface.js:184/402：design 文件变更清单尾注「待 plan 核实」，本 change defer（非事故链必经）
