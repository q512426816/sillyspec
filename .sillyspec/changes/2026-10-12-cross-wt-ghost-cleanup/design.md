---
author: flow-machine-draft
created_at: 2026-10-12T06:27:23.284Z
---
# 设计记录（Design Record）— 2026-10-12-cross-wt-ghost-cleanup

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

修复 multi-agent-platform 仓 cross-worktree-ghost-metadata-archive-blindspot.md 实证的三个结构性缺口（跨仓 worktree 目录被清但 `.git/worktrees/` 注册残留 → 分支被幽灵占用无法 checkout）。三处对症：

1. **清理链双清契约**（src/worktree-cross.js `cleanupCrossWorktrees`）：收尾对跨仓仓跑 `git worktree list --porcelain` 断言注册已消失（复用 gate-snapshot `worktreeListContains` 的路径归一语义），断言不过/prune 抛错 → partial + residual，且注册表键只在验证通过后回收（原 :410/:439 验证前回收的洞一并堵上）。locked 条目（prune 静默跳过）在 details 给 `git worktree unlock` 指引，不自动 unlock。
2. **归档链兜底**（src/run/complete-handlers.js `archiveWorktreeCleanup`）：主仓清理各分支统一收拢后追加 `cleanupCrossWorktrees`（force=false，幂等），归档成为跨仓幽灵的最后一道网；partial 警告 + 指引 doctor/worktree cleanup，fail-open 不阻断归档。
3. **doctor 跨仓网**（src/worktree-cross.js 新增 `scanCrossWorktreeGhosts`/`pruneCrossWorktreeGhosts` + src/doctor-diagnostics.js 新维度 + src/index.js doctor case 新 flag）：对 local.yaml repos 各仓 `git worktree list --porcelain` 对照实体目录，失效注册列 finding；`doctor --prune-cross-worktrees` 默认 dry-run、`--confirm` 执行 prune 并复扫断言（对齐 `--cleanup-ghosts` 范式）。选 doctor 为最高优先网的原因：`listCrossWorktreeMetas` 要求 worktree 内 meta.json 存在才入列——目录已删的事故形态对 cleanup/归档链天然隐身，只有从跨仓仓注册面（`.git/worktrees/`）反扫的 doctor 能兜住。

顺带修正既有 bug：`cleanupCrossWorktrees` 未交付检测把 CLI 自写的 meta.json（恒 untracked）计成「未 apply 交付」，force=false 清理对刚建的空 worktree 恒误报 blocked——归档兜底（force=false）恰好踩中，自家 meta.json 剔出未交付面。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `cleanupCrossWorktrees({ cwd, changeName, specBase, force })`：签名不变；返回值 results 内条目新增行为——目录不存在分支从恒 `skipped` 改为「prune 后复核过→skipped 且回收注册表键 / 复核不过→partial + residual」；主清理路径 remove 成功后新增 list 复核，复核不过→partial；未交付检测剔除自家 meta.json（此前 force=false 恒误报 blocked）。details 可能新增 unlock 指引行（消费者：worktree-apply.js 两处、run/command.js、index.js worktree cleanup，均只读 details 渲染，兼容）。
- `archiveWorktreeCleanup(cwd, archiveChangeName, specBase, platformOpts)`：签名不变；新增行为——末尾追加跨仓兜底清理（此前只清主仓）。三个调用点（正常归档/自愈归档/change-delete）自动受益。
- 新增 `probeCrossWorktreeEntry(repoRoot, wtPath)`：注册状态探测（{registered, locked, unknown?}，查询失败按 registered:true fail-safe）。
- 新增 `scanCrossWorktreeGhosts(cwd)`：读 cwd/.sillyspec/local.yaml repos 段，各仓 `git worktree list --porcelain` 解析，返回 `{ repos, ghosts, errors }`。
- 新增 `pruneCrossWorktreeGhosts({ cwd, confirm })`：dry-run 返回待清理清单；confirm 后对非 locked 幽灵执行 prune、复扫返回 `{pruned, skipped_locked, remaining, errors}`。
- 新增 doctor 维度 `cross_worktree_health`（detectCrossWorktreeHealth，fail-soft：无 local.yaml/git 不可达→skipped 注记不判红）。
- 新增 CLI flag：`sillyspec doctor --prune-cross-worktrees [--confirm]`（默认 dry-run；--json 输出结构化结果；usage 文案同步）。
- 文件格式变化：无（落位注册表格式不动，只是回收时机后移到验证通过后）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。清理/归档/doctor 三链都是幂等收尾动作，输入是 git 注册面（`.git/worktrees/`）与实体目录的瞬时对照；目录在复核前被外部恢复/再删，复核读的是当下态，最坏多判一次 partial（下次重试收敛），不会误销账——注册表键回收只发生在「复核确认注册消失」之后。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   同时 cleanup 同一变更时，`git worktree list/prune/remove` 由 git 自身串行化（注册文件写有锁）；竞态最坏形态是一方 remove 成功、另一方复核时注册已消失→双方都判 cleaned，或一方 prune 时另一方正 add（本变更不含 add 路径改动）。落位注册表读改写无锁是既有形态（与 updatePlacementRegistry 一致，容忍丢失）。归档链兜底在归档锁内执行（调用点在 withMainRepoLock 锁内），与 apply 侧清理并发时后者有自己的锁语义；跨仓 prune 幂等，重复执行零副作用。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   归档中途中断——主仓归档已落库的部分不受跨仓兜底影响（兜底在归档链后、fail-open 包裹，兜底失败只警告不抛）；下次 doctor --prune-cross-worktrees 或再归档同变更（自愈路径）幂等收敛。doctor --confirm 执行中中断：prune 按 repo 粒度原子（git 注册文件整体写），已 prune 的不回滚，复扫结果如实上报 remaining。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   扫描锚定 local.yaml repos 段的各仓仓根，仓外注册不碰；doctor 只报告与清理「注册指向不存在路径」的条目（git prune 语义本身只清悬空注册，不碰活 worktree、不碰分支）；locked 条目跨任何路径都不自动 unlock，不会把用户跨仓保护意图误解除。平台模式（--spec-dir）下 doctor 用 doctorEffectiveDir 解析 local.yaml（与 --cleanup-ghosts 同口径）；归档链兜底传的 specBase 与 apply 侧跨仓清理同源，寻址口径一致。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：归档链新增跨仓兜底扩大了归档时的作用面——若 local.yaml 注册了路径失效的仓，归档会多出警告噪音（不阻断）。缓解：兜底对仓不可达/git 失败一律 fail-open 警告；清理对象仅限本变更名下可寻址的跨仓 worktree。

试过但放弃的方案：
- 「归档链直接对 repos 各仓无条件 prune」——放弃：会把与 sillyspec 无关的用户自建 worktree 注册也纳入归档动作面，作用域过宽；收敛为只清本变更名下可寻址项 + doctor 提供全仓扫描（doctor 是显式诊断入口，作用面宽可接受，归档是热路径必须窄）。
- 「cleanupCrossWorktrees 里对 locked 条目自动 unlock 后强清」——放弃：locked 是用户显式保护（跨盘挂载场景防误删），自动解除违背保护意图；只提示，用户裁决。
- 「给 listCrossWorktreeMetas 增加无 meta 兜底枚举（目录已删也入列）」——放弃：迭代源三源都靠 meta/注册表键寻址，目录已删且键已回收时无锚可举；该形态只能从跨仓仓注册面反扫（doctor），与其在 cleanup 链加不可能完备的枚举，不如把 doctor 网做实。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/worktree-cross.js | cleanupCrossWorktrees 双清契约+locked 提示+未交付检测剔除自家 meta.json；新增 probeCrossWorktreeEntry/scanCrossWorktreeGhosts/pruneCrossWorktreeGhosts |
| 修改 | src/run/complete-handlers.js | archiveWorktreeCleanup 收拢主仓分支返回点、末尾追加跨仓兜底（fail-open） |
| 修改 | src/doctor-diagnostics.js | 新增 detectCrossWorktreeHealth 维度并接入 runDoctorDiagnostics 装配 |
| 修改 | src/index.js | doctor case 新增 --prune-cross-worktrees flag（dry-run/--confirm，对齐 --cleanup-ghosts）+ usage 文案 |
| 修改 | docs/worktree-isolation.md | 常见问题补「跨仓仓切分支报 already used by worktree（幽灵注册）」三层防线段 |
| 新增 | test/cross-worktree-ghost-registration.test.mjs | 真实 git 夹具 7 用例：probe 三态/locked 幽灵/归档兜底/doctor 扫描清理 dry-run 与 confirm |
