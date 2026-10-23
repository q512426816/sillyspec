---
author: flow-machine-draft
created_at: 2026-10-23T06:18:15.553Z
---
# 需求规格（Requirements）— 2026-10-23-rename-platform-tombstone

## 功能需求

### FR-01: renameChange 成功后旧名落删除台账 status='deleted'

- renameChange（src/progress/change-registry.js）在 DB 行与目录双双改名成功后，必须向删除台账（`.sillyspec/.runtime/state/deleted-changes.jsonl`）追加一条 `{name: 旧名, status: 'deleted', at}` 条目；此后 `lookupDeletedLedger(specDir, 旧名)` 必须能查到该条目（latest-wins）。

#### 场景：主路径

- Given 仓内存在活跃变更 A（DB 行 + 目录齐备）
- When `renameChange(A → B)` 成功返回
- Then 台账新增 `{name: 'A', status: 'deleted'}`；DB 行名为 B 且 status 仍 active；目录已搬至 B

#### 场景：目录缺失的变更被改名

- Given 变更 A 有 DB 行但目录已丢失
- When `renameChange(A → B)` 走 mkdirSync 兜底分支成功
- Then 台账同样追加 `{name: 'A', status: 'deleted'}`（目录有无不影响终态凭证落账）

### FR-02: 旧名的 sync 走台账墓碑分支合成 POST 收敛平台行

- rename 之后对旧名执行 `SyncManager.sync(旧名)`（serializeForSync 因行名已改返回 null）时，必须命中删除台账并合成墓碑 POST：载荷 `changes[0].status='deleted'`、`current_stage='archive'`，返回零 errors 且 `ledgerTombstone='pushed'`（对齐坑9 验证要点：平台 `_apply_cli_tombstone` 据此收敛 location='deleted'）。

#### 场景：主路径

- Given 变更已由 A 改名 B（FR-01 台账已落），mock 平台在线
- When `sync('A', { manual: true })`
- Then 恰一笔 POST 打到 `/api/changes/A/progress`，载荷 status='deleted'、current_stage='archive'，返回 `{errors: [], ledgerTombstone: 'pushed'}`

### FR-03: rename 未实际发生时不落台账

- rename 失败或回滚时（旧名不存在 / 新名已存在冲突 / FS 移动失败回滚 DB），禁止向台账追加任何条目。

#### 场景：旧名缺失

- Given 仓内无名为 A 的变更行
- When `renameChange(A → B)`
- Then 返回「不存在」报错，台账无 A 条目

#### 场景：新名冲突

- Given 变更 A 与 B 同时存在
- When `renameChange(A → B)`
- Then 返回「已存在」报错，台账无 A 条目，A 保持原名原目录

### FR-04: 存量幽灵行清理（multi-agent-platform 仓现场）

- multi-agent-platform 仓对其删除台账补记 `2026-10-23-new-change-43a74c51`（status='deleted'）后执行 `sillyspec platform sync --change 2026-10-23-new-change-43a74c51`，必须退出码 0 且无 errors（平台行经 `_apply_cli_tombstone` 收敛 location='deleted'，变更中心不再显示进行中）。

#### 场景：主路径

- Given multi-agent-platform 仓本地已无该名 DB 行/目录（同名行已改名弃用），平台存在同名 active 行
- When 补台账 + `platform sync --change 2026-10-23-new-change-43a74c51`
- Then 命令退出码 0，sync 走台账墓碑分支（回执留痕于交付提交消息）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/rename-ledger-tombstone.test.mjs「FR-01: renameChange 成功后旧名落 deleted 台账（含目录缺失分支）」
FR-02: test/rename-ledger-tombstone.test.mjs「FR-02: rename 后旧名 sync 合成 deleted 墓碑 POST」
FR-03: test/rename-ledger-tombstone.test.mjs「FR-03: rename 失败路径不落台账」
FR-04: 不适用：跨仓现场运维动作（multi-agent-platform 平台数据收敛），本仓无测试面；验收=命令回执 exit 0，回执预埋 task-04 交付提交消息
