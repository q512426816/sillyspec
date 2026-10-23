---
author: flow-machine-draft
created_at: 2026-10-23T06:18:15.553Z
---
# 设计记录（Design Record）— 2026-10-23-rename-platform-tombstone

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

根因：平台变更行按 `change_key`（变更名）定位（backend `_find_row`/`_ensure_change_row`），而 `renameChange` 只 UPDATE 本地库行名 + 搬目录，对平台旧名不做任何交代——旧平台行永挂 active。2026-10-23 multi-agent-platform 仓实证（`2026-10-23-new-change-43a74c51`：裸跑 `run brainstorm` 自动建名 16 秒后被 `change-rename` 改名，平台旧行成幽灵）。坑9 修「物理删除后墓碑失源」、坑10 修「并发自动建名双建」，均不覆盖 rename——本变更是坑9 家族第三变种。方案：复用坑9 建成的「删除台账 → sync 台账墓碑分支（sync.js:796）→ 平台 `_apply_cli_tombstone`」既有链路，零平台侧改动、零 sync.js 改动——仅在 `renameChange` 成功路径（DB 事务 ok 且目录 rename 成功，或目录本缺失走 mkdir 兜底）追加 `appendDeletedLedger(specDir, 旧名, 'deleted')`。旧名对平台即「终态弃名」，语义用既有 `'deleted'` 承载（不扩 `'renamed'` 新状态：平台 `_apply_cli_tombstone` 只认 deleted/archived，扩表面=跨仓改动，违背最小修复）。收敛触发面：daemon reconcile 串行 `platform sync --change`（sillyhub-daemon sillyspec-manager.ts:1510，对平台侧 active 行轮询）命中台账分支自愈；显式 `platform sync --change 旧名` 同样收敛。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `renameChange`（库函数，change-registry.js）：行为增强——成功后多写一条台账行 + 成功文案后追加一行 ℹ️ 台账提示（用户可见）；签名不变、返回值不变、失败路径行为不变。
- `appendDeletedLedger` / `lookupDeletedLedger` / `deleted-changes.jsonl` 格式 / sync.js 台账分支 / 平台接口：零改动（台账 status 枚举仍是 deleted|archived，消费既有契约）。
- CLI `change-rename` 输出：成功文案多一行台账提示，无结构性变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

台账 latest-wins，同名多条取最后一条。A→B 改名后再对 B deleteChange → 台账 A(deleted)、B(deleted) 两行并存按名独立，互不覆盖。A→B→A 改回：本地行名回到 A，sync(A) 走行存在分支推活载荷；若平台 A 行已在改名间隙被墓碑收敛为 deleted，则上行得 409 change_deleted——平台 FR-04 反复活通道既定设计（与删后重建同语义，sync.js 已有 ℹ️ 分流文案），本设计不为其扩机制，风险节备案。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

台账追加-only + 单行 JSON（坑9 先例：appendFileSync + 坏行容错 + latest-wins，无锁不加锁）；两进程同时 rename 同一变更已有 rename-concurrent-split 防护（同事务 check-then-act + 影响行数校验），败者走 'stolen' 分支不落账。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

落账时机在 DB 事务提交 + 目录搬运成功之后（与 deleteChange/unregisterChange 同款「提交后追加、fail-open」）；FS 回滚分支不落账，杜绝「行还叫旧名却已有其终态台账」的自相矛盾。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

台账按仓 `.sillyspec` 根隔离（runtimeStatePath），跨仓不串台；平台行按 workspace_id + change_key 定位，sync 请求自带 local.yaml workspace 配置。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：'deleted' 墓碑让平台旧名进入已删判据（`_change_key_deleted` 拒收复活）——日后若想复用旧名会 409。评估：自动建名含 4 字节随机 hex 撞名概率可忽略；「弃名不复活」正是本变更目的（对齐坑9 后平台已删 key 拒收先例）。
- 死路①：平台加 'renamed' 语义/端点——需跨仓（multi-agent-platform backend）改 `_apply_cli_tombstone` 与已删判据，收益仅是变更中心显示「已改名」而非「已删除」，放弃（最小修复、单仓闭环）。
- 死路②：renameChange 内直推平台 rename 载荷——库函数引入网络 IO 破坏分层（现有删除/归档也不直推，走 triggerSync 异步链），放弃。
