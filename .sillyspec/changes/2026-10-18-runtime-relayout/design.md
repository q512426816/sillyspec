---
author: flow-machine-draft
created_at: 2026-10-18T03:09:27.361Z
---
# 设计记录（Design Record）— 2026-10-18-runtime-relayout

## 做法概述

`.runtime` 根目录 1649 个条目的堆积根源有三：①19 类按 change 命名的散文件不在归档回收名单内（742 个已归档变更的孤儿只增不减，约 1530 个）；②历次变更遗留的一次性脚本无归属堆积；③日志与 db 备份与核心状态混放。方案分三层：

1. **新布局**：新增 `src/runtime-paths.js` 集中路径助手——`runtimeStatePath(runtimeRoot, filename)`（→ `.runtime/state/`）与 `runtimeTempPath(runtimeRoot, filename)`（→ `.runtime/temp/`），19 类 per-change 散文件全部换用前者（文件名原样，仅目录前缀变化，每个改动点是一行 join 改写）；日志（watcher.log / spec-sync-bg.log / audit.log）、db 备份（.bak / .corrupt-* / .pre-import-*）、锁残留 tmp（watcher.lock.*.tmp）换用后者。核心单例（sillyspec.db、agent-session-log.json、user-inputs.md、friction-ledger.json、spec-sync-*.json 等）与既有子目录（execute-runs/、worktrees/、logs/ 等）不动——它们本就满足"下一级目录"或"根目录单例"形态，搬迁收益小于风险。
2. **生命周期**：`pruneArchivedChangeRuntime`（src/run/complete-handlers.js）扩名单——state/ 下 19 类精确文件名回收（沿用既有"精确文件名、禁 glob、单条失败跳过"契约），同时保留根目录旧位置同名回收作为未迁移旧仓兜底。
3. **迁移**：同模块 `migrateRuntimeLayout(runtimeRoot)`——按已知家族前缀/精确名把根目录旧文件 rename 到 state/ 或 temp/（同卷原子、目标存在则跳过不覆盖、逐条 try/catch fail-open、不识别未知文件），在 CLI 入口（src/index.js 主分发前，specBase 解析后）调用；doctor 顺带调用。本仓清理 = 运行该迁移 + 人工把一次性遗留物（repro-*.mjs、full-test-*.log 等非产品文件）归置 temp/。
4. **第二轮收敛（用户 2026-10-18 复核反馈：50 条目仍多）**：无 change 归属的全局面账本/标记单例 16 件（friction-ledger / deleted-changes / active-gate-snapshots / scan-guard / verify-lint-tally / decision-hits / knowledge-hits / knowledge-hit-report / vector-capability / spec-sync-base|last-success|fail-streak|follow-reported / sync-noise-self-heal / last-delta）并入 state/；可再生单例产物 6 件（doctor-diagnosis / flow-telemetry / write-audit / anon-session-warn / selfref-pointer-warn / auto-pull-throttle）并入 temp/。根目录只留 sillyspec.db(+schema-version)、watcher.lock、agent-session-log.json、global.json、spec-version.json、user-inputs.md（平台 API 契约）六个核心单例 + 既有子目录。pending_push 实测零引用（旧版孤儿），随本仓清理归 temp/ 不入产品表。

依据：src/runtime-hygiene.js 头注释确立的"变更归属类 vs 无归属审计类"分野与滚动/回收契约；src/run/complete-handlers.js pruneArchivedChangeRuntime 既有回收模式（精确文件名+单条跳过）。

## 接口契约

- 新增导出 `src/runtime-paths.js`：`runtimeStatePath(runtimeRoot, filename): string`、`runtimeTempPath(runtimeRoot, filename): string`、`migrateRuntimeLayout(runtimeRoot): { stateMoved, tempMoved, skipped }`（目录缺失/异常返回零计数，绝不抛）。
- 19 类散文件与 7 类临时产物的磁盘位置变化（`.runtime/<file>` → `.runtime/state|temp/<file>`），CLI 命令面/参数/输出零变化。
- `pruneArchivedChangeRuntime` 返回结构不变（{ ok, removed, ledgerAppend }），回收面扩大。
- 对外可见行为变化：`.runtime` 根目录不再新增按 change 命名文件；`.runtime/temp/` 可整体删除。平台侧（SillyHub daemon 按 `.runtime` 目录整体同步、dashboard 经 API 读 artifacts/user-inputs.md）无硬编码散文件名（已核 packages/dashboard/ 零引用，user-inputs.md 不迁移）。
- package.json 版本 3.33.0 → 3.33.1（用户裁决 patch：布局迁移对命令面零变化，视为缺陷修复级）；quick-retired 测试 R5 版本锚同步。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. **乱序/迟到到达**：混版本窗口（旧版本进程仍写根目录旧路径）——迁移对"目标已存在"跳过不覆盖（防旧覆盖新）；prune 双路径（root + state/）回收兜底；新写入点全量切换后窗口闭合。迟到文件（旧进程在迁移后写入根目录）下次迁移再收（幂等重入收敛）。
2. **并发写**：两进程同时迁移——rename 同卷原子，其一失败即跳过（fail-open），幂等重入收敛到一致布局；写入点本身沿用各模块既有原子写（fs-atomic/锁），目录前缀变化不引入新竞争面。state/、temp/ 目录不存在时写入点 mkdir -p（recursive: true，多进程并发 mkdir 不抛）。
3. **切换/生命周期**：迁移中断→部分搬迁，重跑续搬（按"源存在且目标不存在"判据幂等）；删除 temp/ 后写入点自动重建目录；watcher 活跃锁 watcher.lock 不迁移（租约判定连续性优先，残留 tmp 才进 temp/）。
4. **作用域**：runtimeRoot 解析沿用既有平台指针机制（resolveRuntimeRoot/pointer），本变更不动解析只动其下布局；路径前缀对所有 workspace 同构，无串台新增面；r7-test-env 等测试环境仓不在交付面（gitignore）。

## 风险与死路

- **最大风险：读写点遗漏**（19 类家族散布 ~25 个源文件，读点比写点多——watcher-events 有 flow.js/index.js/task-tick.js/complete-handlers.js 四处读点）。对策：逐家族 grep 全仓读写点清单化（设计已列写入点文件清单），测试面 26 个既有测试文件做回归网，漏改即路径断裂当场暴露。
- **次风险：混版本并发窗口**旧进程写根目录——迁移幂等 + prune 双路径兜底，窗口内最坏情况是文件短暂在旧位置（读点已切新会读不到）→ 迁移重入收敛；db 备份/日志无状态语义，风险趋零。
- 试过放弃的方案：①`state/<change>/` 按 change 建子目录（prune 可 rm -rf 单目录更优雅）——文件名构造面翻倍、迁移映射复杂化，弃；②只做归档回收不动布局——根目录仍混放单例/日志/脚本，用户"统一下一级+temp"诉求不满足，弃；③迁移 sillyspec.db 进子目录——doctor 候选路径/平台指针/WAL 侧车多点引用，单文件非乱源，收益小于风险，弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | src/runtime-paths.js | state/temp 路径助手 + migrateRuntimeLayout 幂等迁移 |
| 修改 | src/sync.js | sync-docs-lastpush- → state/ |
| 修改 | src/flow-draft.js | draft-ledger- → state/ |
| 修改 | src/route-hindsight.js | route-hindsight-baseline- → state/ |
| 修改 | src/watcher.js | watcher-events-/stage-timing/last-snapshot → state/；watcher.log 与 lock tmp → temp/ |
| 修改 | src/flow.js | watcher-events 读点 + verify-quality-scan- → state/ |
| 修改 | src/index.js | watcher-events 读点；CLI 入口接 migrateRuntimeLayout |
| 修改 | src/task-tick.js | watcher-events 读点 |
| 修改 | src/verify-postcheck.js | test-rerun- / verify-result-hwm- → state/ |
| 修改 | src/verify-probes.js | verify-quality-scan- 读点 → state/ |
| 修改 | src/run/test-ledger.js | test-ledger- → state/ |
| 修改 | src/ceremony-tier.js | ceremony-tier- → state/ |
| 修改 | src/review-dispatch.js | ceremony-tier 读点 / review-dispatch-shadow- / current-stage-review-run-id- → state/ |
| 修改 | src/review-tier.js | ceremony-tier 读点 |
| 修改 | src/run/gates.js | ceremony-tier / execute-cleanup- 读点 → state/ |
| 修改 | src/handoff.js | stage-session-ledger- → state/ |
| 修改 | src/run/stage.js | stage-session-ledger- 读点 |
| 修改 | src/run/complete.js | stage-session-ledger- 读点 |
| 修改 | src/verify-draft.js | verify-draft- → state/ |
| 修改 | src/stage-review.js | current-stage-review-run-id- 读点 |
| 修改 | src/scope-audit.js | execute-cleanup- → state/ |
| 修改 | src/run/complete-handlers.js | pruneArchivedChangeRuntime 扩 state/ 全家族回收 + 双路径兜底；watcher-events 读点 |
| 修改 | src/contract-matrix.js | apply-pathspec- → state/ |
| 修改 | src/friction-tally.js | friction-tally- → state/ |
| 修改 | src/run/bg-sync.js | spec-sync-bg.log → temp/ |
| 修改 | src/git-helper.js | spec-sync-bg.log exclude pathspec 同步 temp/ |
| 修改 | src/progress/consistency-doctor.js | audit.log → temp/ |
| 修改 | src/db.js | sillyspec.db.corrupt-* → temp/ |
| 修改 | src/progress.js | sillyspec.db.pre-import-* → temp/ |
| 修改 | src/doctor-diagnostics.js | friction-tally 孤儿扫描随 state/ + 根目录兜底（doctor 命令经 CLI 入口迁移自动覆盖，无需函数内重复调用） |
| 修改 | test/runtime-relayout.test.mjs（新增） | FR-01~04 用例 |
| 修改 | test/（既有 26 个引用家族的文件） | 路径字面量回归修正 |
| 修改 | package.json | version 3.33.0 → 3.33.1（用户裁决） |
| 操作 | .sillyspec/.runtime/（本仓） | 运行迁移 + 一次性遗留物归置 temp/（不入 git，.runtime 整体 gitignore） |
