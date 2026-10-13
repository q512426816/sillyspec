---
author: flow-machine-draft
created_at: 2026-10-13T15:35:34.271Z
---
# 设计记录（Design Record）— 2026-10-13-sync-ledger-tombstone

## 做法概述

幽灵变更事故根因：X1 墓碑链（sync.js 对 DB status='deleted'/'archived' 的行在常规推送后追加墓碑 POST）依赖 DB 行存活——`_pushTombstone` 里 `serializeForSync` 返 null 即放弃；一旦 DB 行被外部手段物理清除（multi-agent-platform 仓 2026-10-13-new-change-e5a27813 实证），后续 `platform sync --change` 全部落入「变更无进度数据」空转，且 CLI 入口（index.js case 'sync'）忽略 sync() 返回值恒 exit 0，daemon RPC（sillyspec.sync_change）收到假成功，平台行永挂 in_progress/active。

方案：引入**删除台账**——终态转换（deleteChange/unregisterChange）在事务提交后向 `.sillyspec/.runtime/deleted-changes.jsonl` 追加 `{name, status, at}`（追加-only、fail-open）。sync() 的 progressData===null 分支先查台账：命中终态即**合成最小六表载荷**（changes[0] 携带台账 status + current_stage='archive'）走既有 progress POST 端点补推墓碑——平台 `_apply_cli_tombstone` 按 changes[0].status 收敛 location（deleted→'deleted'、archived→'archive'），base_ts 缺失按平台契约「首次同步无条件接受」。台账只在 DB 行已不存在时才被消费，行存活的常规 X1 链不动。同时修 CLI 假成功：`platform sync --change` 检查 errors 非空 → stderr + exit 1。

## 接口契约

- 新模块 `src/deleted-ledger.js`：`appendDeletedLedger(specDir, changeName, status, at?)`（fail-open 追加）与 `lookupDeletedLedger(specDir, changeName)`（→ `{name,status,at} | null`，latest-wins，损坏行跳过）。specDir 为已解析的 `.sillyspec` 根。
- `ChangeRegistry.deleteChange / unregisterChange`（src/progress/change-registry.js）：事务成功后各自追加台账（'deleted' / 'archived'）；对外签名与返回值不变。
- `SyncManager.sync(changeName)`（src/sync.js）：返回值新增可选字段 `ledgerTombstone: 'pushed' | 'best-effort-failed'`（仅台账分支出现）；既有字段语义不变。
- CLI `platform sync --change <名>`（src/index.js）：失败（errors 非空）exit 1 + stderr 错误行；成功/预期回执路径 exit 0 不变。不带 --change 的全树同步路径退出语义不变。
- 新增运行时文件 `.sillyspec/.runtime/deleted-changes.jsonl`（每行一个 JSON 对象，追加-only）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：台账是追加流，同名多次终态转换以最后一条为准（latest-wins）；消费侧只在「DB 行不存在」这一稳定态读台账，行一旦重建（平台 pull import / 重建同名变更）serializeForSync 非 null，台账分支不再触发，旧台账行成为无害历史。
2. 并发写：appendFileSync 追加单行（≤数百字节，带结尾换行），POSIX 与 Windows 上原子性足够（同进程内 db 事务后串行追加；跨进程并发追加最坏交错为行间交错，JSONL 行级完整——node appendFileSync 单次 write 系统调用）；读取侧逐行容错解析，坏行跳过。SQLite 事务与台账文件为两个存储，台账在事务**提交后**追加——若追加前进程崩溃，丢一条台账（可接受：行仍在 DB，X1 链可推；风险窗口与现状一致）。
3. 切换/生命周期：deleteChange/unregisterChange 为终态转换点，中途崩溃要么「DB 已终态 + 台账缺行」（X1 链兜底）要么「DB 未终态」（转换未发生），不存在「台账有终态但 DB 仍 active」的误导态——台账只在行消失后被消费，不参与 active 判定。
4. 作用域：台账随 `<specDir>/.runtime/` 走，与 sillyspec.db 同目录同生命周期，多工作区/多仓各自独立文件不串台；quick-* 会话名在消费侧显式豁免（QUICK_SID_RE，与 X1 判定同口径）。

## 风险与死路

最大风险：合成载荷被平台 `_ensure_change_row` 在「从未同步过」的变更上先建占位行再立即被墓碑收敛——产生一行 location='deleted' 的墓碑行；这与平台既有 3 行历史墓碑（2026-08-26/09-10/09-11）形态一致，可接受。次风险：平台行有 last_pushed_at 而合成载荷不带 base_ts——平台契约「base_ts 缺失无条件接受」（platform_sync/service.py 分支 1），无 409 面；若平台后续收紧该契约，fallback 是 best-effort 失败日志（不阻断）。

放弃的方案：①daemon reconcile 对账「平台 active 行 vs 本地全无」主动软删——多机工作区下他机活跃变更会被误删，需要引入行级机器归属，改动面过大；②sync 对 progressData null 一律发墓碑——打错 --change 名（从未存在）会把平台同名真变更误软删，不可接受；台账正是为了区分「从未存在」与「存在过且已终态」。平台侧 7 天占位行保护窗 + 全量 reparse 兜底（已有）继续作为外部裸删（rm -rf + SQL 全清）的最后防线。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 新增 | src/deleted-ledger.js | 删除台账 append/lookup（fail-open / latest-wins / 坏行容错） |
| 修改 | src/progress/change-registry.js | deleteChange/unregisterChange 事务后追加台账 |
| 修改 | src/sync.js | sync() progressData null 分支查台账补推墓碑（含 _pushLedgerTombstone 合成载荷） |
| 修改 | src/index.js | platform sync --change 失败 exit 1 |
| 新增 | test/deleted-ledger.test.mjs | FR-01~04 覆盖（mock 平台 http server + CLI spawn 退出码） |
| 修改 | docs/sillyspec/file-lifecycle.md | .runtime 运行时清单补 deleted-changes.jsonl 条目 |
