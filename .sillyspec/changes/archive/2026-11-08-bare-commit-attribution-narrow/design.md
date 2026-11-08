---
author: flow-machine-draft
created_at: 2026-11-08T04:59:59.870Z
---
# 设计记录（Design Record）— 2026-11-08-bare-commit-attribution-narrow

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

单点细分 `src/foreign-declared.js` 的提交归属判定：`buildCommitAttribution` 给每个文件 entry 增加 `tokened` 标记（任一 touch 该文件的提交 subject 含 `task-\d+` token 或变更名）；`isForeignByCommit` 语义从「unknown 恒 own」细分为「unknown 且无 token 证据且 owners 不含本变更名 → foreign，否则 own」。三消费面（splitOwnVsForeignDiffFiles 的 own/foreign 切分、flow-parity.filterCommittedFace 的冻结面过滤、flow.js attributedChangedFiles 的 FR 域/实测面）全部经由这两个函数单源，单点改全链生效，消费端零改动。

选 token 细分而非 `--fr-scope=declared` flag 或 unknown 全剔的理由：原 fail-closed（2026-10-05 引入「无后缀裸提交触碰恒 own」）的前提是「自己的交付提交可能不带变更名」——thin-tasks-v3（2026-10-07）起交付提交必带 task-NN token（勾选证据协议，收口哨兵逐格核 token），前提已过时；纯裸提交（release 生成器/Merge/归档 chore）恰是坑②实证的污染源形态。unknown 全剔会误剔本变更无 token 提交（协议只要求 token 不强制变更名），token 细分是唯一同时满足「剔污染源/保自己交付/他侧 token 提交不劣化（保守 own）」三约束的最小面。flag 方案默认噪音仍在、需每次显式携带，治标。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `buildCommitAttribution(logText)`：返回的 entry 增加 `tokened: boolean` 字段（含 task token 或变更名的 touch 存在即 true）；`owners`/`unknown` 字段语义不变。纯函数，新增字段向后兼容（旧消费端不读它）。
- `isForeignByCommit(entry, currentChangeName)`：判定语义细分——旧「!unknown && owners 全他侧」→ foreign 保留；新增「unknown && !tokened && !owners.has(current)」→ foreign；其余（tokened / owners 含本变更名 / 无记录）→ own。
- CLI 命令签名、flag、文件格式：无变化（route-hindsight 标记、change-patch.json 结构均不动）。
- 行为可见变化：收口「归属收窄」剔除数、冻结面 files、FR 域路由触达面在含纯裸提交的窗口下变窄（坑② 10-28 实证形态不再穿透）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——按已发生提交事实（subject 静态文本）判定，无时序假设；窗口内提交顺序不影响聚合结果（entry 按 touch 聚合，布尔标记与顺序无关）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用——纯读 git log + 内存聚合，无落盘新面；两个会话并发收口各算各的归属，互不写共享状态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用——无新持久化状态；中途中断重入收口时重新聚合，结果幂等。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

适用且已防——判定以「本变更名 + 提交 subject」为锚，跨仓时 baseline..HEAD 各自窗口内聚合，无全局共享面；task token 无变更名限定属已知保守面（他侧 token 提交判 own，与现状一致，不新增串台）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险：用户/脚本的手动裸提交（无 token 无变更名）被误剔出冻结面 → 审计缺口。兜底三面：① 收口「提交面夹带嫌疑 advisory」点名未声明文件（既有，不改）；② dirty 缺口三选一门（--freeze-dirty/--accept-dirty-gap）仍在；③ 文档同步提交规范（AGENTS.md 规则 11 已要求显式 pathspec+消息规范）。次要风险：他侧 agent 的 token 提交仍穿透（无法区分谁的 task token）——保守 own 不劣于现状，留坑文件余项。

放弃方案：① unknown 全部判 foreign——误剔本变更交付（协议只要求 task token 不强制变更名后缀），FR-02 违反；② `--fr-scope=declared` 收窄 flag——默认行为不变噪音仍在，需每次显式携带，且冻结面/FR 域两处都要接 flag 复杂化；③ 归因判定加 subject 词表分类（Merge/release 识别）——语义判定脆弱（D-003 同族风险），token 是协议级硬证据优于词表。

## 文件变更清单

| 操作 | 路径 | 说明 |
|------|------|------|
| 修改 | src/foreign-declared.js | buildCommitAttribution 增 tokened 标记；isForeignByCommit 语义细分（纯裸→foreign） |
| 修改 | test/commit-attribution-split.test.mjs | 锁定语义 2 改口径：纯裸提交 touch 判 foreign；新增 token 裸提交恒 own 断言；夹具补 token/纯裸两类提交 |
| 修改 | test/filter-committed-face.test.mjs | 冻结面过滤按新语义补/改断言（若既有用例钉旧语义） |
| 修改 | test/hunk-gate-commit-attribution.test.mjs | 同上（若消费 isForeignByCommit 旧语义） |
| 修改 | test/foreign-own-priority.test.mjs | 同上（若钉 unknown 恒 own） |
