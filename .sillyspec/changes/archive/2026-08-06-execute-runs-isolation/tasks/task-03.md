---
id: task-03
title: 测试 test/execute-runs-isolation.test.mjs（T-01..T-08）
title_zh: 测试 test/execute-runs-isolation.test.mjs（T-01..T-08）
author: qinyi
created_at: 2026-08-06T14:07:35+08:00
priority: P0
depends_on: [task-01, task-02]
blocks: [task-05]
requirement_ids: [FR-05, FR-06, FR-07, FR-08]
decision_ids: [D-05]
allowed_paths:
  - test/execute-runs-isolation.test.mjs
provides:
  - contract: isolationTestSuite
    fields: [caseCount, coverageScenarios]
    desc: "8 用例覆盖 drift 落主仓 / cleanup 后存活 / sentinel 不误触发 / 多 change 隔离 / 平台本地零回归 / 非 drift quick+手动 anchor 一致性"
expects_from:
  task-01:
    - contract: resolveRuntimeRoot
      needs: [platformOpts, localSpecBase, returnType]
    - contract: specDriftAnchorField
      needs: [platformOpts.specDriftAnchor]
  task-02:
    - contract: allRuntimeRootSitesResolved
      needs: [sitesCount]
goal: |
  design §8 T-01..T-08 测试用例落地，覆盖 drift / 非 drift / 平台 / quick / 多 change / sentinel 全场景，
  锁死「drift 命中 → execute-runs/stage-reviews 落主仓 .runtime，cleanup 后存活」核心契约（AC-1..AC-6）。
implementation: |
  - 新增 test/execute-runs-isolation.test.mjs，8 用例（design §8）：
    T-01 drift 命中 → execute-runs 落主仓：在 worktree cwd 跑 execute step 进入；断言 current-execute-run-id-<change>
        marker 与 execute-runs/<runId>/tasks/task-01/review.json 出现在主仓 .sillyspec/.runtime/，不在 worktree .runtime/。
    T-02 cleanup 后 execute-runs 仍存：T-01 后调 wm.cleanup(changeName)；断言主仓 .runtime/execute-runs/<runId>/... 完整存在。
    T-03 stage-reviews 落主仓：drift 场景跑 stage review；断言 stage-reviews/<stage>-<runId>/review.json 落主仓。
    T-04 marker 按 change 隔离：两个 change 并行 drift；断言各 marker 路径含各自 changeName，runId 唯一，无覆盖。
    T-05 specDriftAnchor 不触发 sentinel：drift 命中后断言 triggerSync（shared.js:288）/ checkApproval（shared.js:315）
        仍按本地链路执行（未被 specRoot||runtimeRoot 短路）；prompt 渲染走本地分支（prompt.js:217 isPlatform=false）。
    T-06 非 drift 零回归：常规主仓 cwd 跑 execute；断言 specDriftAnchor 未设、runtimeRoot 仍 join(specBase,'.runtime')。
    T-07 平台模式零回归：platformOpts.runtimeRoot 已设；断言 resolveRuntimeRoot 返回平台 runtimeRoot，specDriftAnchor 分支不触发。
    T-08 非 drift quick + 手动 specDriftAnchor 验一致性（瑕疵 2 澄清）：非 drift quick 场景手动传 platformOpts.specDriftAnchor，
        断言 resolveRuntimeRoot 一致性（返回 join(specDriftAnchor,'.runtime')）；**非扩 drift 守卫到 quick**（守卫限 plan/execute/verify/archive，design §7.1）。
  - 测试隔离（既有经验）：
    --spec-dir 钉死临时目录（避 between-run 清 .sillyspec 撞文件锁，参考 sillyspec-test-specdir-isolation）；
    worktree fixture 必须 chdir（_resolveMainRepoRoot 相对 .git 依赖 process.cwd，参考 worktree-test-fixture-must-chdir）。
acceptance: |
  - 8 用例全过（node --test test/execute-runs-isolation.test.mjs）。
  - T-01/T-02 锁死 AC-1/AC-2/AC-3（drift 落主仓 + cleanup 存活）。
  - T-05 锁死 AC-4（sentinel 不误触发，D-02 边界）。
  - T-04 锁死 AC-6（多 change 隔离）。
  - T-06/T-07 锁死 AC-4/AC-5（零回归）。
  - T-08 表述按瑕疵 2 澄清：非 drift quick + 手动 specDriftAnchor 验 resolveRuntimeRoot 一致性，不扩 drift 守卫到 quick。
verify: |
  node --test test/execute-runs-isolation.test.mjs
constraints: |
  - 用 --spec-dir 钉临时目录（避文件锁 flaky）。
  - worktree fixture 必须 chdir（_resolveMainRepoRoot 依赖 cwd）。
  - T-08 不扩 drift 守卫到 quick（守卫条件 stageName ∈ [plan,execute,verify,archive] 不变；瑕疵 2）。
  - 纯单元测试为主；若需 worktree fixture，复用既有 worktree 测试 helper（不重造）。
related_tests: []
---

# task-03: 测试 test/execute-runs-isolation.test.mjs（T-01..T-08）

design §8 八用例落地，锁死 drift → 主仓 .runtime 核心契约。T-08 表述按瑕疵 2 澄清（非 drift quick + 手动 anchor，不扩 drift 守卫到 quick）。

## 依据
- design.md §8（T-01..T-08 用例 + 测试隔离经验）/ §9 AC-1..AC-6
- requirements.md FR-05（drift execute-runs 落主仓）/ FR-06（stage-reviews 落主仓）/ FR-07（不触发 sentinel）/ FR-08（多 change 隔离）/ NFR-01（零回归）/ NFR-02（跨平台）
- 瑕疵 2：brainstorm 独立审查指出 T-08 drift quick 表述张力——quick drift 走 detectQuickSessionDrift fail-fast exit（command.js:565-569，不自动锚定）；T-08 应为「非 drift quick + 手动 specDriftAnchor 验 resolveRuntimeRoot 一致性」，非扩 drift 守卫到 quick（design §7.1 守卫限 plan/execute/verify/archive）
- 既有经验：sillyspec-test-specdir-isolation（--spec-dir 钉死避文件锁）/ worktree-test-fixture-must-chdir（fixture chdir）
