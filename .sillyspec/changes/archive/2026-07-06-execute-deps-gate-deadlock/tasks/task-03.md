---
id: task-03
title: doctor 命令 --align-execute-progress flag 入口分支
author: qinyi
created_at: 2026-07-07T07:43:24
priority: P0
depends_on: [task-01]
blocks: [task-05]
requirement_ids: [FR-01, FR-03]
decision_ids: [D-001@v2]
allowed_paths:
  - src/index.js
expects_from:
  - task_id: task-01
    artifact: ProgressManager.alignExecuteToPlan(cwd, changeName, specBase)
    needs:
      - ok
      - aligned
      - planTotal
      - planChecked
      - reason
goal: >
  在 doctor 命令新增 --align-execute-progress flag 分支，调 ProgressManager.alignExecuteToPlan 对齐 execute 派生戳，默认 dry-run，--confirm 才写。
implementation:
  - 在 case 'doctor' 内（line 311-364）仿 --cleanup-remnant/--dump-db 分支范式，新增 alignFlag 检测分支，置于 cleanupRemnant/dumpDb/json/默认 prompt 流程之前，命中即 break。
  - --change 解析：从 filteredArgs 取 --change 值；缺省时用 resolveChangeNameAuto 兜底；都拿不到则报错退出（exitCode=2）。
  - --confirm：从 filteredArgs 探测，决定 alignExecuteToPlan 的 dryRun 行为（task-01 接口，dryRun=true 时只报告将补哪些 step + 将置 stage status，不写）。
  - 实例化 ProgressManager 用顶层已有 import（ProgressManager + resolvePlatformSpecDir），specDir = resolvePlatformSpecDir(doctorEffectiveDir, specDir)；specBase 传 resolvePlatformSpecDir 返回的 specRoot 或 join(doctorEffectiveDir,'.sillyspec')。
  - 输出：json=true 走 JSON.stringify(r)；否则 human-readable —— ok 时打印"已基于 plan.md 声明对齐 N 个 step，请确认 verify 通过"+ planChecked/planTotal；ok=false 时打印 reason；dry-run 且有可补 step 时提示加 --confirm 执行。
  - exitCode：r.ok 为 false 或 reason 非空 → 1；否则 0（与 --cleanup-remnant 的 r.errors 逻辑同构）。
acceptance:
  - 不带 --align-execute-progress 时 doctor 全部现有分支（--cleanup-remnant / --dump-db / --json / 默认 prompt）行为完全不变。
  - --align-execute-progress --confirm --change X 命中 task-01 写路径，返回 aligned>0 且 exitCode=0。
  - --align-execute-progress（无 --confirm）只报告不写，输出明确提示需 --confirm 才落盘。
  - --change 缺失且 resolveChangeNameAuto 兜底失败时 exitCode=2 + 明确错误。
  - --json 时输出为合法 JSON，含 task-01 返回的 ok/aligned/planTotal/planChecked/reason 字段。
verify:
  - npm test（覆盖 task-05 的 doctor-align-execute-progress.test.mjs 中入口侧用例）
  - 手动：sillyspec doctor --align-execute-progress --change <test-change> 看 dry-run 报告；加 --confirm 看落盘。
constraints:
  - 默认 dry-run：无 --confirm 时绝不调写路径，只报告将补的 step + 将置的 stage status。
  - 不改动 --cleanup-remnant / --dump-db / --json / 默认 prompt 分支任何逻辑（AC-03）。
  - --change 解析用 resolveChangeNameAuto 兜底，与 worktree 子命令 --change 处理风格一致。
  - ProgressManager 复用顶层 import（line 12），不重复动态 import；specDir 用 resolvePlatformSpecDir。
  - 分支命中即 break，绝不 fall-through 到默认 runCommand prompt 流程。
  - 覆盖 FR-01（打通死锁对齐出口）+ FR-03（默认 dry-run，--confirm 才写）+ D-001@v2（显式 flag 入口，诊断/写分离）。
---
