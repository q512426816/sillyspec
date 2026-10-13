---
author: flow-machine-draft
created_at: 2026-10-13T15:35:34.271Z
---
# 需求规格（Requirements）— 2026-10-13-sync-ledger-tombstone

## 功能需求

### FR-01: change-delete（status=deleted）与归档 unregisterChange（status=archived）在 .sillyspec/.runtime/deleted-changes.jsonl 追加台账（name/status/at），写入 fail-open 不阻断主流程

- 删除终态转换（deleteChange，status='deleted'）与归档终态转换（unregisterChange，status='archived'）**必须**在事务提交成功后向 `<specDir>/.runtime/deleted-changes.jsonl` 追加一行 JSON `{name, status, at}`；台账写入失败**必须**仅告警（fail-open），禁止阻断删除/归档主流程的返回值与状态变更。台账按追加-only 维护，禁止在读取路径做旋转/清空。

#### 场景：deleteChange 落账

- Given：临时项目内 initChange 建有变更 X
- When：调用 pm.deleteChange(cwd, X) 成功
- Then：`.runtime/deleted-changes.jsonl` 存在一行 `{name: X, status: "deleted"}`，且 changes 行仍为 status='deleted'（原语义不变）

#### 场景：unregisterChange 落账

- Given：临时项目内 initChange 建有变更 Y
- When：调用 pm.unregisterChange(cwd, Y)
- Then：台账存在一行 `{name: Y, status: "archived"}`

#### 场景：台账写入失败不阻断

- Given：`.runtime` 目录被置为只读（或台账路径不可写）
- When：调用 deleteChange
- Then：DB 状态变更照常完成（status='deleted'），进程不抛错

### FR-02: platform sync --change X 在 DB 无行且台账有终态时，合成最小载荷补推墓碑（deleted→平台 location=deleted、archived→location=archive），返回零 errors

- `SyncManager.sync(X)` 在 serializeForSync 返回 null（DB 无行）时，**必须**查询删除台账：命中终态（status='deleted' 或 'archived'）则合成最小六表载荷（changes[0] 携带台账 status 与 current_stage='archive'）POST 到既有 progress 端点补推墓碑，并返回 `{synced: 0, errors: []}`；墓碑 POST 失败**必须**按 best-effort 处理（debug 日志 + 仍返回零 errors，与既有 X1 墓碑链语义一致）。quick-* 会话名**禁止**进入台账墓碑分支。

#### 场景：行被外部清除后补推 deleted 墓碑

- Given：变更 Z 曾 deleteChange（台账有 deleted 行），随后其 DB 行被外部 SQL 物理删除，平台 mock 端点在线
- When：调用 syncManager.sync(Z)
- Then：mock 端点收到 POST，body 的 changes[0].status='deleted' 且 current_stage='archive'；返回值 errors 为空

#### 场景：台账 archived 终态

- Given：变更 W 曾归档（台账 archived 行）后 DB 行被物理清除
- When：调用 syncManager.sync(W)
- Then：上行载荷 changes[0].status='archived'

### FR-03: platform sync --change X 失败路径（未连接平台/变更不存在且无台账）退出码非 0，错误信息可见

- CLI 入口 `platform sync --change X`（src/index.js case 'sync'）**必须**检查 sync() 返回的 errors 数组：非空时向 stderr 输出错误并 process.exit(1)；成功路径（含 change_deleted 预期回执、台账墓碑补推）**必须**保持退出码 0。禁止对不带 --change 的全树同步路径改变退出语义。

#### 场景：变更不存在且无台账

- Given：临时项目（未连接平台或连接 mock），变更名 never-existed 无 DB 行、无台账
- When：执行 CLI `platform sync --change never-existed`
- Then：进程退出码 1，stderr 含「变更无进度数据」或未连接平台的明确错误

### FR-04: 台账缺失/损坏行容错读取，quick-* 会话名豁免台账墓碑分支

- 台账查询函数**必须**容错：文件不存在返回 null；单行 JSON 解析失败跳过该行不抛错；同名多条时取最后一条（latest-wins）。quick-* 会话名（QUICK_SID_RE 命中）在 sync 的台账墓碑分支**必须**跳过（与既有 X1 墓碑判定的 quick 豁免同口径）。

#### 场景：损坏行容错

- Given：台账文件含一行合法 JSON 与一行非法 JSON
- When：查询合法行对应变更名
- Then：正常返回该条目，进程不抛错

#### 场景：quick 会话豁免

- Given：台账被手工写入 quick-12345678 的终态行（正常流程不产生）
- When：syncManager.sync('quick-12345678') 且该名无 DB 行
- Then：不发起墓碑 POST，返回 errors 含「变更无进度数据」

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/deleted-ledger.test.mjs「deleteChange/unregisterChange 落台账 + fail-open」
FR-02: test/deleted-ledger.test.mjs「行清除后 sync 补推墓碑（deleted/archived）」
FR-03: test/deleted-ledger.test.mjs「platform sync --change CLI 退出码」
FR-04: test/deleted-ledger.test.mjs「损坏行容错 + quick 豁免」
