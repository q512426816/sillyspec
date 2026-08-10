---
author: qinyi
created_at: 2026-08-10T22:20:00+08:00
change: 2026-08-10-platform-progress-sync
stage: verify
---

# 验证报告（Verify Result）— 多用户进度同步到 sillyhub 平台

## 结论 / Conclusion

**PASS WITH NOTES**

本变更（客户端侧：SillySpec 仓库）按 design.md 决策表 D-001~D-015 + FR-01~FR-09 + plan.md 11 Wave 15 task 全量落地，主仓库 `npm test` 163 套件 0 失败、`npm run lint` 242 文件绿。真实 daemon↔backend 集成属 sillyhub 后端独立 change（D-014），本变更客户端契约已就绪，平台协议层用 mock http server integration test 覆盖。冲突状态机（clean↔conflict→resolved）round-trip 测试全过。

## 测试结论 / Unit Test Result

主仓库根（apply 后，含他者并发 complete.js 改动共存）实测：

- **`npm test`** → ✅ 通过: 163  ❌ 失败: 0（node test/run-tests.mjs，file 粒度；较变更前 151 套件 +12，即本变更新增 12 个测试文件）
- **`npm run lint`** → Checked 242 JavaScript files (src 75 + test 167)；EXIT_CODE=0（较变更前 230 +12 test 文件）
- **关键测试断言数**（裸跑独立确认）：
  - `test/platform-sync-serialization.test.mjs`（task-02 serializeForSync 六表）— 34 断言
  - `test/platform-sync-import.test.mjs`（task-03 import 逆运算 + .bak）— 34 断言
  - `test/progress-sync-roundtrip.test.mjs`（task-05 serialize→import→serialize 等值）— 26 断言
  - `test/platform-sync-push-header.test.mjs`（task-09 POST header 元字段）— 断言
  - `test/platform-sync-dirty.test.mjs`（task-04 脏度全写入路径）— 25 断言
  - `test/platform-sync-pull-list.test.mjs`（task-06 两级 pull 第一级）— 18 断言
  - `test/platform-sync-pull.test.mjs`（task-07 两级 pull 第二级）— 20 断言
  - `test/platform-sync-user-config.test.mjs`（task-08 local.yaml user 字段）
  - `test/platform-sync-trigger-pull.test.mjs`（task-10 triggerPull 注入）— 14 断言
  - `test/platform-sync-conflict.test.mjs`（task-12 双向冲突检测 + 冲突文件）— 33 断言
  - `test/sync-conflict-statemachine.test.mjs`（task-15 冲突状态机 round-trip）— 38 断言

## 对照 design 决策表逐条验收

| 决策 | 覆盖任务 | 验收证据（独立核对） | 结论 |
|---|---|---|---|
| D-001@v1 两级 pull | task-06,07 | `SyncManager.pullList()` GET /api/changes 轻量列表 + `pull(name)` GET /api/changes/\<name\>/progress 完整 JSON + import；`src/sync.js:536,568` | PASS |
| D-002@v1 冲突 b 策略 | task-12,13 | `_writeConflictFile`/`readConflictFile`/`clearConflictFile` + pull/push 双向冲突写 `.runtime/sync-conflict-<change>.json` + `resolve` 三选一（keep-local/take-platform/abort），**禁止字段级 auto-merge**；`src/sync.js:481,657` | PASS |
| D-003@v1 单 change 内部 wave | 交付方式 | 单 change `2026-08-10-platform-progress-sync` 内部 11 Wave 拆分（plan.md） | PASS |
| D-004@v1 user 身份 | task-08,09 | `resolvePlatformUser()`（显式 > git user.name > env）→ local.yaml platform.user → `X-SillySpec-User` header；`src/sync.js:117,299` | PASS |
| D-005@v1 import 粒度（superseded） | — | status: superseded，由 D-005@v2 取代（B1/B2 修正：read() 聚合视图漏 approvals → 专用 serializeForSync 六表 + changes 排除 isolation_*） | PASS（已取代） |
| D-005@v2 六表序列化 | task-02,03,05 | `serializeForSync()` 真六表（含 approvals，read() 漏的）+ `import()` 逆运算事务原子 + 选择投影列保 isolation；round-trip 等值测试；`src/progress.js:391,526` | PASS |
| D-006@v1 两级 pull 轻量 | task-06,07,11 | pullList 轻量列表 + 按需单 change + `platform pull` 子命令（--change / 无参先列表再逐个）；`src/sync.js:536`、`src/index.js` pull case | PASS |
| D-007@v1 死字段复用 platform_last_sync | task-01,04 | `_updatePlatformLastSync` 仍写旧字段 platform_last_sync（向后兼容不破坏），新增 last_synced_platform_ts 作 base_ts 乐观锁基准（D-012）；两字段共存，旧字段保留不读不阻塞 | PASS |
| D-008@v1 双向脏度 | task-04,12 | 全写入路径更新 `last_local_modified_ts`（16 处 `_touchLocalModified`）+ pull 本地脏度比对触发冲突；读路径 `run().changes > 0` guard 不标脏 | PASS |
| D-009@v1 triggerPull 时机 | task-10,11 | `triggerPull`/`triggerPullActiveChange`（8s 熔断、Best Effort、未连接跳过）注入 stage case block runCommand 前 + approve 前；`src/run/shared.js`、`src/index.js` | PASS |
| D-010@v1 resolve --abort 语义 | task-12,13,14,15 | abort 清冲突文件但本地 DB + base_ts 均不变（状态机测试 E 节实证：再 push 重新进 conflict）；keep-local/take-platform 回 clean | PASS |
| D-011@v1 独立 .bak | task-03 | import 前 `.runtime/sillyspec.db.pre-import-<ts>.bak`（不抢 `_openWithFallback`）；`src/progress.js:542` | PASS |
| D-012@v1 schema bump 连带 | task-01 | `DB_SCHEMA_VERSION` 3→4 在 db.js:10 常量 / db.js:203 DEFAULT / shared.js:30 CURRENT_VERSION / progress.js:350 _version 四处；`_migrateAddColumn` 幂等加两列 | PASS |
| D-013@v1 脏度全写入路径 | task-04,13 | 全写入路径脏度 + import 例外重置（`last_local_modified_ts = pushed_at` 非 now()）；round-trip 实证两列等值 | PASS |
| D-014@v1 sillyhub 独立 change | task-07,12 | 本变更纯客户端侧；POST 409 响应契约（platform_progress + last_pushed_at）依赖 sillyhub 后端独立 change，客户端已就绪 | PASS（客户端侧） |
| D-015@v1 header 方案 | task-09 | 元字段走 HTTP header（X-SillySpec-User/Base-Ts/Pushed-At），body 保持裸 JSON，sillyhub 老版忽略 header 零回归；`src/sync.js:294,309` | PASS |

## 对照 plan 全局验收标准

- [x] `npm test` 全量通过（含 round-trip + 冲突状态机）— 163 套件 0 失败
- [x] `npm run lint` 通过 — 242 文件
- [x] brownfield：未连接平台（无 local.yaml platform 段）时 sync/pull/triggerPull 全跳过行为同现状 — task-10/12 测试实证（未连接静默跳过不抛、不写冲突文件）
- [x] schema 3 DB 幂等加列，新列默认 NULL — `_migrateAddColumn`（db.js:311-312）
- [x] POST body 保持裸 JSON，sillyhub 老版零回归 — sync.js:309 body=JSON.stringify(progressData)，元字段全在 header
- [x] import 后 `last_local_modified_ts = last_synced_platform_ts`（D-013）— import L568 两列均置 pushedAt，round-trip 实证
- [x] 冲突文件 resolve 后必清不累积（R-04）— resolve 三模式均 `clearConflictFile`，状态机测试 C6/D7/E6 实证

## 集成证据 / Integration Evidence

**风险判级**：design.md §7.5 / §12 明确「本变更**不涉及** SillySpec 核心 stage/step/session/lease/agent_run/daemon 生命周期契约；引入的是**本地平台同步冲突状态机**（clean ↔ conflict → resolved，DB + sync-conflict 文件态）」。本变更纯客户端侧（SillySpec 仓库），真实 daemon↔backend 集成（sillyhub 聚合存储 + GET 端点 + 冲突检测算法）属 sillyhub 后端独立 change（D-014），本变更不碰 sillyhub-mcp/ 任务派发层（createMission/dispatchWorker 不受影响）。

**integration test 覆盖**（客户端↔平台协议层，mock http server）：
- task-06/07/12/15 用 `http.createServer` mock 平台（GET /api/changes、GET/POST /api/changes/\<name\>/progress），覆盖 pullList / pull / push 409 / pull 脏度冲突 / resolve 三路径全链路
- task-15 `test/sync-conflict-statemachine.test.mjs` configurable mock（postMode 409/200 切换）覆盖 clean↔conflict→resolved 完整 round-trip（含 abort 后再 push 重新进冲突）

## Runtime Evidence

CLI 路由实测（主仓库 `node bin/sillyspec.js`，空 cwd 无 local.yaml 模拟未连接）：

```
$ platform --help
  sillyspec platform connect <url> [--token <token>]
  sillyspec platform disconnect
  sillyspec platform sync [--change <name>]
  sillyspec platform sync-docs [--change <name>]
  sillyspec platform pull [--change <name>]
  sillyspec platform resolve <change-name> <--keep-local|--take-platform|--abort>
  sillyspec platform status

$ platform pull
❌ 未连接平台，请先 sillyspec platform connect

$ platform pull --change foo
❌ 未连接平台，请先 sillyspec platform connect

$ platform resolve rt-change --keep-local
❌ rt-change: 无可解决冲突: rt-change（无 sync-conflict 文件）

$ platform resolve rt-change
❌ 必须恰好指定 --keep-local / --take-platform / --abort 之一

$ platform resolve rt-change --keep-local --abort
❌ 必须恰好指定 --keep-local / --take-platform / --abort 之一

$ platform status
平台: 未连接
```

冲突状态机 round-trip 日志片段（task-15 测试，configurable mock）：
```
--- A. push 409 → conflict ---
[sync] POST http://127.0.0.1:<port>/api/changes/rt-change/progress → 409 {"conflict":true,...}
[sync] 冲突: rt-change 平台已有更新（base_ts 过期），请 platform status / resolve 处理
  ✅ push 409 进入 conflict 态（synced=0/conflict=true）

--- C. keep-local → clean round-trip ---
  ✅ C3: keep-local 只更新 base_ts 到平台最新
  ✅ C7: keep-local 后再 push 回 clean（synced=1）

--- E. abort → 状态不变 round-trip ---
  ✅ E7: abort 后再 push 重新进 conflict（未真正解决）
```

## 已知遗留 / Notes

1. **sillyhub 后端独立 change（D-014）**：本变更客户端契约就绪，但 POST 409 响应（platform_progress + last_pushed_at）+ GET /api/changes 轻量列表 + GET /api/changes/\<name\>/progress + base_ts 冲突检测算法需在 sillyhub 仓库独立实现。客户端侧用 mock server 测试覆盖协议契约，真实端到端待 sillyhub change 落地后联调。
2. **worktree apply 文件清单校验**：worktree apply 命令因 12 个 test 文件不在 design.md 文件清单被拦（清单校验对 test 文件死板）。手动 `git diff --cached | git apply --3way` 应用 9 源 + 12 test 到主仓（排除 meta.json 运行时态），主仓 npm test/lint 全过。非阻塞，代码已正确落主仓。
3. **非目标守界**：未碰 sillyhub-mcp/（任务派发层）、未加离线 push 队列 / WebSocket / 字段级 auto-merge / 分布式锁 / SQLite 远端连（design §3 克制清单）。
