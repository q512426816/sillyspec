---
id: task-05
title: 新增 alignExecuteToPlan + 门控诊断/fail-loud 测试（内联断言）
author: qinyi
created_at: 2026-07-07T07:43:24
priority: P0
depends_on: [task-01, task-04]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07]
decision_ids: [D-002@v1, D-003@v2, D-004@v1, D-005@v1]
allowed_paths:
  - test/doctor-align-execute-progress.test.mjs
  - test/enforce-deps-gate-diagnostic.test.mjs
goal: >
  用内联断言覆盖 alignExecuteToPlan 正向/拒绝/dry-run 与 enforceDepsGate 诊断分支/fail-loud，门核心放行标准回归。
implementation:
  - test/doctor-align-execute-progress.test.mjs：mkTmp 建临时 spec 目录 + 写 progress.json（execute steps 部分非 completed）+ 写 plan.md（全勾 / 部分勾），实例化 ProgressManager 指向临时 specDir
  - 正向用例：plan.md 全勾 → alignExecuteToPlan(cwd, change, specBase, {confirm:true}) 返回 ok:true + aligned=N，落盘后 execute 阶段所有 step status='completed' + stageData.status='completed'（覆盖 D-003@v2 显式置 stage）
  - 拒绝用例：plan.md 有未勾 task → 返回 {ok:false, reason 含 'X/Y'}，progress 文件 mtime/内容不变（不写）
  - dry-run vs --confirm：无 --confirm 返回 dryRun:true，progress 不落盘；加 --confirm 才写
  - 边界：execute 阶段不存在/无 step → {ok:false, reason:'execute 阶段无进度数据'}
  - test/enforce-deps-gate-diagnostic.test.mjs：构造 worktree 物理目录存在/不存在两种场景（mkTmp + stub WorktreeManager.getWorktreePath 返回临时路径，控制 existsSync 结果），调 enforceDepsGate 观察拒绝行为
  - worktreeGone 路径（目录不存在）：捕获 stderr/exit，断言提示含 'doctor --align-execute-progress' 或 'worktree create'，且含 '本次 --done 未完成'
  - 依赖没装路径（目录存在但 depsStatus=unknown）：断言提示含 'doctor --fix'/'依赖未就绪'
  - 回归断言：depsStatus ∈ ['linked','installed','n/a'] 放行（返回 true / 不 exit 1）
acceptance:
  - AC-01：plan 全勾 + --confirm 后 execute stageData.status='completed' + step 全 completed（测试断言落盘文件）
  - AC-02：plan 有未勾 → {ok:false, reason}，不写 progress（测试断言 mtime 或内容不变）
  - AC-05：enforceDepsGate 在 worktree 物理目录不存在时输出"worktree 不可用"分支 + "本次 --done 未完成"阻断块
  - AC-06：门核心 ['linked','installed','n/a'] 仍放行（回归断言）
  - AC-07：npm test 全量通过（含 2 个新测试文件）
verify:
  - npm test（全量，test/run-tests.mjs 自动扫到 2 个新文件）
constraints:
  - 沿用内联 assertEqual/assertThrows/assert 风格（见 worktree-deps-provision.test.mjs 范式），不引第三方测试框架
  - 用 mkdtempSync 临时目录隔离（参考 worktree-deps-provision.test.mjs 的 mkTmp + cleanup），测试结束 rmSync 清理
  - 不依赖真实 sillyspec.db / 真实项目 worktree —— 自建临时 spec 目录 + 手写 progress.json/plan.md，ProgressManager 指向临时 specDir
  - 文件头 banner（console.log '=== xxx 测试 ==='）+ 末尾 passed/failed 汇总 + process.exit(failed===0?0:1) 与现有测试一致
  - 不改任何 src/ 文件、不改其他测试
---
