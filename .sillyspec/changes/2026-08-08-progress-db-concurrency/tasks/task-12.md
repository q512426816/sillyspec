---
id: task-12
title: consistency-doctor 新增 detectLostUpdateSignals（.runtime/worktrees/<change> 目录存在 vs DB current_stage≠execute）
title_zh: doctor 新增 lost-update 间接信号对账检测
author: qinyi
created_at: 2026-08-09 00:32:15
priority: P1
depends_on: [task-08]
blocks: []
requirement_ids: [FR-07, AC-03]
decision_ids: [D-02]
allowed_paths:
  - src/progress/consistency-doctor.js
  - test/consistency-doctor-lost-update.test.mjs
goal: >
  ConsistencyDoctor 新增 detectLostUpdateSignals 对账：.runtime/worktrees/<change> 目录存在但
  DB current_stage≠execute 即标记为 lost-update 间接信号（worktree 残留但进度被回退），并接入 checkConsistency 报告。
implementation:
  - 新增 detectLostUpdateSignals(cwd)，返回 issue 数组（每条含 change 名、实际 current_stage、worktree 目录路径）
  - worktreesRoot = path.join(this.pm._runtimePath(cwd), 'worktrees')；existsSync 为假或无子目录时返回空数组（零信号兼容既有 fixture）
  - 读取 worktreesRoot 目录项并过滤 isDirectory 子目录得 change 名单；对每个 change 调 this.pm.read(cwd, changeName)（task-08 已同步化，无 await）
  - data 非空且 data.currentStage ≠ 'execute' 时压入 issue；data 为 null（DB 无该 change 行）不算信号跳过
  - checkConsistency(cwd) 内调用 detectLostUpdateSignals(cwd) 并把信号并入 issues 报告输出（只读，不自动修复）
  - 新增 test/consistency-doctor-lost-update.test.mjs 覆盖两分支：worktree 存在+stage=execute 不报；worktree 残留+stage≠execute 报 1 条
acceptance:
  - 对带 .runtime/worktrees/<change> 且 DB current_stage=execute 的 fixture，detectLostUpdateSignals 返回空数组
  - 构造 worktree 目录残留但 DB current_stage≠execute 的 fixture，返回含 change 名与实际 stage 的 issue（AC-03）
  - checkConsistency 报告含 lost-update 信号条目，且调用全程零 DB/文件写操作（只读诊断）
  - 新测试通过且全量 npm test + npm run lint 绿，revision-v1 等既有 checkConsistency 测试不回归
verify:
  - npm test -- test/consistency-doctor-lost-update.test.mjs
  - npm test
  - npm run lint
constraints:
  - 只读诊断：不写 DB、不删 worktree 目录、不自动修复（修复仍走 doctor --align / repairConsistency 既有逻辑）
  - 信号定义严格遵循 design §7 / FR-07：仅 current_stage ≠ 'execute' 判信号，不扩展到 quick 等其他 stage
  - 复用 this.pm._runtimePath 与 this.pm.read，不新开 DB 连接、不引入 sql.js 依赖
  - 不得改动 STAGE_ORDER / MAIN_FLOW_ORDER 等既有对账语义；DB 无对应行（data=null）的 worktree 目录不算信号
related_tests:
  - path: test/revision-v1.test.mjs
    reason: 多处断言 pm.checkConsistency 的 ok/issues；若 fixture 出现 .runtime/worktrees 残留，新信号会额外产生 issue 使断言失败，task-14 重写时一并核对
---
