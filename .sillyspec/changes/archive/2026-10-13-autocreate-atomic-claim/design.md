---
author: flow-machine-draft
created_at: 2026-10-13T16:01:02.371Z
---
# 设计记录（Design Record）— 2026-10-13-autocreate-atomic-claim

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

竞态根因：run/command.js 两处自动建名（brainstorm 无 --change / run auto）先 `pm.listChanges` 查零活跃、后 `pm.initChange` 插行——两步之间无锁，并行进程都能通过检查各建一行（2026-10-13 16:25:33 实证：daemon-log-config-view 与 new-change-e5a27813 同秒落地）。方案：新增 `ProgressManager.initChangeIfNoActive`，把「零活跃检查 + 建行」收敛为单条 `INSERT..SELECT ... WHERE NOT EXISTS(SELECT 1 FROM changes WHERE status='active') AND NOT EXISTS(SELECT 1 FROM changes WHERE name=?)`——SQLite 单语句原子，配合 db.js transaction 封装的 BUSY 重试（fn 整体重跑、快照刷新），并发下恰一进程抢到；败者按 active_exists/name_exists 返回，不建目录（目录创建移到抢占成功后，堵败者空目录残留）。command.js 两处调用点换用该方法，失败分支复用既有 exit 2 引导文案。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `ProgressManager.initChangeIfNoActive(cwd, changeName, meta = {})`（src/progress.js，新增）：返回 `{created: true, progress}` 或 `{created: false, reason: 'active_exists'|'name_exists', activeChanges?: string[]}`；成功路径产物与 initChange 等价（changes 行 + stages 行 + 目录 + 本地脏度戳），差异仅目录创建时点（抢占后）。
- `run/command.js` brainstorm 自动建名与 run auto 两处：listChanges 检查+initChange 两步形态移除，改单次原子抢占；对用户可见行为不变（零活跃仍打印「🔄 自动创建变更：<名>」与改名提示，多活跃仍 exit 2 列清单）。
- `initChange` 本体不动（显式 --change / 平台工具 / 测试 fixture 继续用）。
- **声明边界（代码收紧，行为无差异）**：run auto 旧代码 `activeCount.length > 1` 检查在「恰好 1 个活跃变更」时理论上也会再自动建第二个变更，与其自身注释「零活跃才建」矛盾；本变更统一为零活跃抢占。实证核对该分支仅在 `pm.read` 返回 null（读不到可定位进度）时可达，而单活跃场景上游 read 自动定位不进本分支——收紧对用户可见行为零差异，属消除死宽限（同时去掉计数宽限这一并发温床）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：抢占判定只依赖 DB 当前态（单语句快照），无跨语句状态依赖；迟到者（另一进程先抢到）在本语句执行时即见 active 行而拒绝，不存在乱序窗口。同名重试（自动名随机碰撞概率 2^-32 再叠加日期前缀）由 name_exists 守卫兜住，调用方按失败处理（实际不可达，不额外重生成）。
2. 并发写：单条 INSERT..SELECT 在 SQLite 写锁下串行化；跨进程 WAL 场景若快照过期（BUSY_SNAPSHOT），db.js transaction 封装按既有 BUSY 退避重试整体重跑 fn，重跑后守卫见到先行者提交的行即拒绝——收敛到「恰一创建」。stages 种行与脏度戳在抢占后同事务追加，败者事务内零写入（INSERT 未命中即无行，后续语句不执行）。
3. 切换/生命周期：抢占成功后、建目录前崩溃——留「有行无目录」形态，与既有 initChange 崩溃窗口等价（doctor 幽灵清理/自愈已有兜底口径）；抢占失败路径零写入零目录，无半态。
4. 作用域：方法按 cwd 解析 specDir 与 sillyspec.db（与 initChange 同源 _ensureDB/_getSpecDir），多工作区/多仓各自独立库不串台；quick/default 名不走本方法（调用点仅自动建名，自动名恒为日期前缀名）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：db.js transaction 的 BUSY 重试若不整体重跑 fn（只重试语句），跨进程快照过期时守卫可能读到旧快照——已核对 db.js 注释「BUSY 重试收敛在 DB 层 transaction 封装」（重跑 fn），且单语句本身在写锁下排队，双重保险；真并发竞争测试（双进程同秒 spawn）确定性不足（胜负调度随机），不作为测试断言面，以单语句原子性+守卫行为单测为契约锚。

放弃的方案：①「先 initChange 再检查删行回滚」——回滚本身又与对方提交竞态，且留下已写 stages/目录的清理面；②「文件锁串行化自动建名」——引入新锁文件与清理生命周期，复杂度不成比例；③只修 command.js 顺序（先算名再 listChanges 再 initChange）——仍是两步，竞态窗口依旧。

## 文件变更清单

| 操作 | 路径 | 说明 |
| --- | --- | --- |
| 修改 | src/progress.js | 新增 initChangeIfNoActive（INSERT..SELECT 双守卫原子抢占；目录后建） |
| 修改 | src/run/command.js | brainstorm 无 --change / run auto 两处换原子抢占，失败走既有 exit 2 引导 |
| 新增 | test/init-change-if-no-active.test.mjs | FR-01~04 覆盖（抢占/拒绝/零残留/显式路径回归） |
