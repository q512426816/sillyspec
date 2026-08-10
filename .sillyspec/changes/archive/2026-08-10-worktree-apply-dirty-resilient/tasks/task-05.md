---
id: task-05
title: rescue test suite + full regression (P0 timing regression)
title_zh: rescue 测试套件加全量 npm test/lint 回归
author: qinyi
created_at: 2026-08-10 11:50:00
priority: P0
depends_on: [task-01, task-02, task-03, task-04]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06]
decision_ids: [D-001@v1, D-002@v1, D-003@v1, D-004@v1]
allowed_paths:
  - test/worktree-apply-rescue.test.mjs
provides: []
goal: 交付 test/worktree-apply-rescue.test.mjs 锁死 rescue 机制全部行为（四分类加 P0 时序回归加前移等价加 dirtyFiles 口径加跨模式加零回归），并跑全量 npm test 加 npm run lint 确认零回归（含既有 3 个 worktree-apply 测试不断）
implementation: |
  - 新建 test/worktree-apply-rescue.test.mjs，沿用现有 worktree-apply-baseline-clean.test.mjs 的 setupRepo（mkdtemp 加 git init 加 .sillyspec/.runtime/worktrees/tc 加 gitignore）加 sh 加 assertTrue 模式
  - 纯函数单测（generateRescueCommands）构造 changedFiles 加 dirtyFiles 加 hashMismatchFiles 加 deletedFiles 加 worktreePath 加 projectRoot 断言四分类——SAFE-CP（干净文件给 cp）加 EXCLUDE-DIRTY（dirty 文件进 warnings）加 EXCLUDE-MISMATCH（hashMismatch 进 warnings）加 DELETE（deleted 给 rm），断言路径正斜杠无反斜杠，断言 cpFileCount 加 excludedCount 计数，dirtyFiles 传 Set 与数组一致
  - P0 时序回归（核心）setupRepo 加 worktree（src-deliverable.txt 改）加 main 对另一文件 fileA 先 commit 推进（HEAD fileA 不等于 baseHash fileA）加 fileB 制造未提交 dirty 到 applyWorktree checkOnly 触发 step4.5 拦截，断言 result.rescueCommands 不含 cp fileA（fileA 属于 hashMismatchFiles 被 EXCLUDE-MISMATCH）加含 fileB 的 warning
  - 前移等价 同 fixture checkOnly 与 real apply 两路径 result.hashMismatchFiles 一致（含 fileA）
  - dirtyFiles 口径 构造 untracked dirty 文件（git ls-files others）加 .sillyspec/docs/X 未提交 dirty，断言二者进 rescue dirtyFiles（EXCLUDE-DIRTY）不 cp
  - applyWorktree 拦截集成 dirty 场景 applyWorktree 到 result.rescueCommands 非空加 result.errors 含 cp 块，assessApplyRisk 到 assessment.rescueCommands 透出
  - 零回归 主仓干净（无 dirty）applyWorktree 到 result.rescueCommands 严格等于 null 加 errors 不含 rescue
  - 跨模式 deletedFiles native-worktree 模式（git worktree add）加 in-place-fallback 模式（meta mode 等于 in-place-fallback）各构造 worktree 删除文件，断言 deletedFiles 收集一致（若 in-place 模式 name-status 口径不同记录并补齐）
  - 跑 npm test 全量 EXIT 等于 0 加 npm run lint 全绿
acceptance:
  - generateRescueCommands 四分类加路径加计数单测全绿
  - AC-1 P0 时序回归 main 推进 fileA 加 fileB dirty 到 rescue 排除 fileA（锁死 task-02 前移）
  - AC-8 前移等价 checkOnly 与 real 两路径 hashMismatchFiles 一致
  - AC-6 dirtyFiles 口径含 untracked 加 .sillyspec/docs/（Grill gap 闭环）
  - AC-3 零回归 未拦截 rescueCommands 等于 null
  - AC-9 跨模式 deletedFiles native-worktree 与 in-place 一致
  - npm test 全量 EXIT 等于 0（含新套件加既有 worktree-apply-* 三套件零回归）
  - npm run lint 绿
verify:
  - npm test（等于 node test/run-tests.mjs）全量
  - npm run lint（等于 node test/check-syntax.mjs）
  - 单独 node test/worktree-apply-rescue.test.mjs 确认本套件全绿
constraints:
  - 既有 3 个 worktree-apply 测试（uncommitted 加 baseline-clean 加 relax-committed-advance）属回归范围，本 task 不改它们的断言——若 task-02 前移 或 task-03 加字段导致其中任一断言失效，修逻辑不改测试（铁律 11），并在本 task 记录失效原因
  - 测试用临时目录（mkdtempSync）加末尾 process.chdir os tmpdir 加 fs.rmSync d recursive force 清理，沿用现有模式
  - 不引入新测试依赖（沿用 fs 加 path 加 os 加 execSync 加 applyWorktree 加 assessApplyRisk import）
  - in-place-fallback 模式 deletedFiles 若 name-status 口径与 native-worktree 不同据实记录（design 自审存疑项），不强行造通过
related_tests:
  - test/worktree-apply-uncommitted.test.mjs
  - test/worktree-apply-baseline-clean.test.mjs
  - test/worktree-apply-relax-committed-advance.test.mjs
---

# task-05：rescue 测试套件加全量回归

## 背景
锁死 rescue 全部行为。P0 时序回归是核心（锁死 task-02 hashMismatch 前移不回退）。全量 npm test 加 lint 确认零回归。

## 改动点
1. 新建 test/worktree-apply-rescue.test.mjs（纯函数四分类加 P0 时序加前移等价加口径加集成加零回归加跨模式）
2. 跑全量 npm test 加 npm run lint
