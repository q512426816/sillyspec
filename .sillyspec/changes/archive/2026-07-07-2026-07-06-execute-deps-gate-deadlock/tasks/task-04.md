---
id: task-04
title: enforceDepsGate 诊断分支 + fail-loud（worktree 终态区分 + 阻断块）
author: qinyi
created_at: 2026-07-07T07:43:24
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-05, FR-06, FR-07]
decision_ids: [D-005@v1]
allowed_paths:
  - src/run.js
goal: >
  enforceDepsGate 拒绝时区分 worktree 终态（物理目录消失）与其他 unknown 成因，输出分支化诊断提示 + 显眼 stderr 阻断块，门核心放行标准不变。
implementation:
  - 在 src/run.js enforceDepsGate（line 2388-2405）拒绝路径前置 worktreeGone 判定：基于 !existsSync(new WorktreeManager({cwd}).getWorktreePath(changeName))，复用文件头已 import 的 existsSync（line 8）与已有的 WorktreeManager 动态 import
  - worktreeGone=true → 改写提示分支：worktree 不可用（已 cleanup 或目录不存在），修复指向 sillyspec doctor --align-execute-progress --change <name> 或 sillyspec worktree create <change>
  - worktreeGone=false（meta 损坏或 deps 未达标但目录在）→ 维持原提示（worktree doctor --fix / 手动安装）
  - fail-loud：拒绝时先在 stderr 输出显眼阻断块，含"本次 --done 未完成，进度未推进"，再输出原因/修复分支
  - 置 steps[currentIdx].status='blocked' + process.exit(1) 范式保持不变（与 requiresWait 一致）
acceptance:
  - AC-05：enforceDepsGate 在 worktree 物理目录不存在时输出"worktree 不可用"分支提示（指向 align/create）+ stderr 含"本次 --done 未完成"阻断块
  - AC-06：门核心放行标准 ['linked','installed','n/a'] 不变，三者仍放行、其他仍拒
verify:
  - npm test（含 test/enforce-deps-gate-diagnostic.test.mjs：门控诊断分支 + fail-loud）
constraints:
  - 门核心放行标准 ['linked','installed','n/a'] 不变、不放行（fail-closed），不引入 main commit 存在性等降级条件
  - worktreeGone 判定基于 !existsSync(getWorktreePath(changeName))（物理目录不存在），而非 !meta（getMeta 对"目录不存在"与"meta 损坏"都返回 null，后者会误判终态）—— G2/R3 修正
  - fail-loud 仅改拒绝侧 stderr，不动成功侧 stdout 输出（D-005@v1），减少对现有 agent 解析的误伤
  - isCurrentWaveAllNoDepsVerify 的 wave 级 opt-out 放行分支位置不变
  - 不改 enforceDepsGate 函数签名、不改放行返回 true 的两条路径
---
