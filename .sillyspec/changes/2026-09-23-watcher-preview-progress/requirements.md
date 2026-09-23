# 需求：watcher 预览进度账本

> change: 2026-09-23-watcher-preview-progress
> FR 覆盖矩阵见 design.md；验收标准逐条可测

## FR-01 authority 列与存量迁移
steps 与 stages 表增加 `authority TEXT NOT NULL DEFAULT 'cli'`；schema 版本戳递增，迁移把全部存量行统一盖 `'cli'` 章；迁移幂等（重复跑零变化）、失败 fail-closed（迁移不成功不进入读写）。**CLI 权威写入归章（影子审查 fail① 修正）**：progress.js 既有 stage upsert 的 INSERT 列清单与 DO UPDATE SET 均显式写 `authority='cli'`——保证 CLI --done 命中预览行时权威数据盖 cli 章（DEFAULT 只作用 INSERT 分支，不修则权威行被保险丝永久过滤）。**短连接自带 busy_timeout（gap① 修正）**：watcher 写入短连接显式 `PRAGMA busy_timeout=5000`。

## FR-02 watcher 预览投影写入
watcher 轮询循环内，快照差分完成后把**阶段级**推断态 upsert 为 stages 预览行（`authority='watcher'`）：仅当该 `(change, stage)` 键**无 cli 行**时写入/更新（有 cli 行即跳过——顶替发生在 CLI 侧写入时）。预览行携带 `evidence` 记录（本轮依据的事件序号/工件签名引用）。写放大护栏：每轮至多 N=8 行。

## FR-03 读侧保险丝（既有消费者零改动）
DB 查询层（progress.js 读方法）缺省追加 `AND (authority = 'cli' OR authority IS NULL)`；以测试钉「注入预览行后，gate verify 结论 / progress show 默认输出 / serializeForSync 载荷与无预览时逐字节一致」。

## FR-04 显式预览出口
`progress show --preview`：合并显示预览行，预览态带「预览」徽标（人读）与来源证据引用；`--json` 同构。缺省（无 --preview）行为与现状逐字节一致。

## FR-05 handoff 接力消费
`sillyspec handoff` 输出新增「机器预览态」段：读预览行，给出「watcher 看到的当前阶段/工件/最后活动 ts + 证据引用」，供新会话快速恢复现场。

## FR-06 归档 GC
归档收尾（unregisterChange 清理链）删除该 change 全部 `authority='watcher'` 行；GC 失败 fail-open（不阻断归档，warn 一行）。

## FR-07 watcher 写纪律与 fail-open
预览写入用短连接（open→写→close，每轮一次）；WAL+busy_timeout 沿用 db-engine 现配；任何写失败（锁竞争/库损坏/迁移未达）只 warn 并跳过本轮——观测事件流（jsonl）不受影响，watcher 主循环不因此退出。

## FR-08 门禁证据隔离（红线钉）
gate（全 stage）、fake-check/哨兵规则、审批判定的输入面**不得包含预览行**；测试钉：构造「预览行声称步骤完成」的库后，gate 结论仍为未完成（与无预览一致）。

## 非功能
- 迁移前后的库文件可被旧版 CLI 只读打开（加列不破坏旧读）。
- watcher 每轮新增写耗时 < 50ms（本地 SSD 口径）。
- Node 版本面：node:sqlite 需 v22.13+（既有约束，无新增）。

## 验收
1. 全量测试绿（新增测试组见 design §测试分层）。
2. 手工冒烟：跑任一 quick 期间另终端 `progress show --preview` 可见预览行出现与被 CLI 收口顶替；归档后预览行清零。
3. FR-03/FR-08 的逐字节一致钉在套件内常驻。
