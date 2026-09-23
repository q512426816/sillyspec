# 提案：watcher 预览进度账本（authority 双轨写入 + 读侧保险丝）

> author: zcode-r11-preview
> created_at: 2026-09-23
> scale: medium
> 来源：用户立项（2026-09-23 会话收敛裁定，「让守卫写进度，但要带来源，CLI 触发覆盖 watcher」）

## 动机

六表进度只在 CLI `--done` 时刻更新——两次收口之间，平台面板与换瘦会话 handoff 对「现在进行到哪」是盲的。而 watcher 每几秒就看到一次真实世界（阶段工件出现、tasks 勾选、提交落地），这些推断信号目前只进事件流（恒 provisional、只展示）就终结了。

R8/R9 对撞给出量化背景：sillyspec 的 token 税大头是单上下文累积，减负方向是「CLI 从节拍器退位成印章 + 分段接力」——预览账本正是接力包的机器版：新会话/面板不问 CLI 也能拿到带来源标记的进行态参考。

## 目标

1. steps/stages 表加 `authority` 列：`'cli'`（权威，存量迁移统一盖章）/ `'watcher'`（预览）。
2. watcher 轮询循环把推断阶段态写为预览行（带事件引用、provisional 语义），**永不触碰 cli 行**；CLI `--done` 的权威写入天然顶替预览（主键 upsert + authority 比较）。
3. **读侧保险丝**：DB 读方法缺省只回 cli 行——gate/同步/面板/flow 等既有消费者零改动；预览只经显式出口（`progress show --preview`、handoff 接力段）可见。
4. 归档时预览行 GC。

## 非目标（显式清单）

- 平台同步预览行（serializeForSync 被默认过滤天然排除；平台侧预览等 events 面板部署后另件）
- steps 级预览（watcher 对具名步骤↔工件的映射不可靠，v2 再议）
- watcher 预热 green-cache（后件 rider）
- 修改 gate/审批的任何判定语义

## 依据

- 引擎事实：进度库 = node:sqlite 原生（WAL + busy_timeout 经 db-engine.js 配置）——多进程读并发+单写者是现成能力（conventions 常驻条目 2026-09-23 勘误后）。
- 语义先例：事件流 provisional 徽标（「旁路观测信号，非流程真相」）——预览行是同一语义从事件扩展到进度。
- 用户裁定链：单表+authority（vs 双账本）→ 读侧保险丝收敛爆炸半径 → 门禁证据隔离（「预览管发生了什么，实测管过不过」）。
