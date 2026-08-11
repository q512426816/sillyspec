---
change: 2026-08-11-node-sqlite-migration
stage: verify
author: qinyi
created_at: 2026-08-11T16:05:00+08:00
verdict: PASS_WITH_NOTES
---

# verify-result — node:sqlite 迁移

## 变更风险等级

**risk_level 由 design frontmatter 显式声明 = `unit-sufficient`（覆盖关键词判级）**。理由：本变更是进度库引擎的同类替换（better-sqlite3 → node:sqlite），不改 daemon/session/lifecycle 状态机、不改部署启动路径、不改跨进程协议——DB wrapper 对外职责与 progress 层调用面字面零改动（G3 实证）。design 里出现的「集成/迁移」关键词均为否定语境（「零迁移」「不改动」）或指 SQLite 库内行为，机械匹配会误判，故以显式声明为准。变更单测 + 行为等价 spot check 即可充分验证，无需集成证据。

## Runtime Evidence

本变更 risk_level=unit-sufficient（豁免级），非 integration/deployment-critical，**无需** Runtime Evidence 门控。实际已实跑的运行证据（供审计，非门控要求）：
- 主仓 CLI `node bin/sillyspec.js progress show --change 2026-08-11-node-sqlite-migration` 在 node:sqlite 下正常输出（读真实 sillyspec.db）——brownfield 现有库零迁移直读实证。
- 全量 `node test/run-tests.mjs`：163 通过 / 2 失败（0 本变更回归，详见下）。
- `node test/check-syntax.mjs`（lint）：246 文件通过。

## 规范锚定（step 2）

| 文件 | 状态 |
|---|---|
| proposal.md / design.md / tasks.md / requirements.md / plan.md | ✅ 全部存在 |
| decisions.md | ✅ D-001..004 全 decided，无 P0/P1 unresolved/blocking |
| verify-required-evidence.json | ✅ 存在，1 项（task-08 cannot_verify） |

决策台账核对：D-001（clean cut）/D-002（方案 B db-engine 抽象）/D-003（worktree-guard 子进程不纳入 db-engine）/D-004（floor 实证 >=22.11.0）全 decided，无 superseded 被下游引用。

## verify-required-evidence 逐项核对

### task-08（quality cannot_verify）→ 结论：**partial**
> evidence：platform-sync-schema.test.mjs 硬编码 schema 版本期望 4，db.js DB_SCHEMA_VERSION 已被并发会话 bump 到 5……需 verify 裁决：由 bump 方回填版本断言为 5，或确认该测试口径。

- **断言已回填为 5**（partial satisfied）：并发会话 change-title-quicklog-id 已把 test/platform-sync-schema.test.mjs 断言从 4 更新到 5（`CURRENT_VERSION===5` / `stamp==='5'` / `project.schema_version DEFAULT 5`），shared.js CURRENT_VERSION 也已 bump 5。task-08 当时观察的「断言 4 vs db.js 5」不一致已被并发会话消除。
- **但暴露新 src bug（仍 missing）**：测试 3 过 1 挂，唯一挂点 `project.schema_version DEFAULT 5（实际 4）`——`src/db.js:205` `schema_version INTEGER DEFAULT 4` 未随 bump 改 5（db.js L5 注释明确「与 project.schema_version DEFAULT 对齐」）。这是并发会话 schema v5 bump 的遗漏，**非本 node:sqlite 变更引入**（本变更只换引擎，未碰 schema 版本号/DEFAULT 值）。

## 全量验证实证（main，node 24.15.0）

| 项 | 结果 |
|---|---|
| `node test/run-tests.mjs`（全量） | **163 通过 / 2 失败**，本变更回归 **0** |
| `node test/check-syntax.mjs`（lint） | ✅ 246 文件通过（src 77 + test 169） |
| db-concurrency.test.mjs | 复跑全绿（8 子进程×100 事务×2 轮，无 SQLITE_BUSY）——已知 flaky 非回归 |
| platform-sync-schema.test.mjs | 1 挂（project DEFAULT 4 vs 5，并发会话 src bug，见上） |
| brownfield 零迁移 | ✅ 主仓现有 sillyspec.db 经 node:sqlite readOnly 直读成功（6 表完整），`progress show` 正常运行 |

### 5 项行为等价 spot check（G4，execute 独立 QA 已实证，verify 复核一致）
- ✅ WAL 生效（applyPragmas journal_mode=WAL）
- ✅ BUSY 退避（MAX_BUSY_RETRIES=3 / BUSY_BACKOFF_MS=[50,100,200] / errcode=5 适配 / 达上限 fail-loud）
- ✅ transaction 抛错回滚（含嵌套 SAVEPOINT 3 用例）
- ✅ .bak 回退 copyFileSync
- ✅ 只读诊断 fail-closed（existsSync 前置门 + readOnly，缺失/损坏→null）

### G3 progress 层零改动
✅ progress.js / progress/* / sync.js 的 .prepare().get/all/run 调用面字面不变（diff 仅并发 quicklog_id 功能，无引擎接触点变更）。

### clean cut（G2/D-001）
✅ package.json version=4.0.0 / engines.node>=22.11.0 / dependencies 无 better-sqlite3；package-lock.json 无 better-sqlite3/prebuild-install/node-gyp-build 子树。

## 结论

**PASS WITH NOTES**——本 node:sqlite 迁移变更全部 FR-01..07 + D-001..004 + G1..G4 达成，全量测试 0 回归，brownfield 零迁移直读，clean cut 4.0.0 完整。

**Notes（均非本变更回归，归并发会话 change-title-quicklog-id 收尾）**：
- `src/db.js:205` `schema_version INTEGER DEFAULT 4` 应随 DB_SCHEMA_VERSION bump 改 5（与测试断言 + L5 注释对齐）。**verify 阶段禁改源码**，且该文件含并发会话未提交工作，由并发会话收尾修正。本变更未引入、未触碰该 DEFAULT。
- `test/change-title-quicklog-id.test.mjs`（并发会话未提交活文件）仍 import better-sqlite3，待并发会话迁 node:sqlite。
- `db-concurrency.test.mjs` 偶发 flaky（Windows 8 子进程调度），复跑全绿、stderr 无 SQLITE_BUSY，非回归。
