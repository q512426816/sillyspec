---
author: flow-machine-draft
created_at: 2026-11-06T16:41:53.102Z
---
# 设计记录（Design Record）— 2026-11-07-sync-proposed-no-revive

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

「候选复活」缺陷：平台知识页 merge/reject 待审候选后，服务器侧软删（manifest 行 exists=false、不置墓碑）；本地 `knowledge/proposed/` 残留文件在下次 spec-sync 按「本地有服务器无 → add」规则（src/spec-sync.js:364-374）推回平台，走平台 service.py 复活分支落盘（2026-11-07 平台侧子代理核查实证）——审核成果被下次同步冲掉。修复走 CLI 侧窄化拦截：`computeSpecOps` 的 add 生成处，对 `knowledge/proposed/` 前缀且服务器 manifest 该行 `exists === false`（平台处置过的唯一可信证据——软删行在场）的本地文件跳过 add；`syncSpecTree` 调用后检测此类残留并自动删除本地文件+一行提示。选 CLI 侧而非平台侧置墓碑：平台侧改 merge/reject 置 `platform_deleted` 墓碑会改变跨端删除语义（墓碑目前仅「平台删除变更目录」专用），影响面大；CLI 侧按路径前缀+软删行证据窄化判定，不动全局「本地为真相源」规则。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `computeSpecOps(serverManifest, localFiles)`（src/spec-sync.js:266）：签名与返回形态不变（仍返回 FileOp 数组）；行为变化=「knowledge/proposed/ 前缀 + manifest 行 exists===false」的本地文件不再生成 add op（静默跳过——清理动作归调用方）。
- `syncSpecTree`（src/spec-sync.js:895 调用点附近）：新增本地残留清理段——计算「本地 proposed 文件 ∩ manifest exists=false 行」，逐个删除本地文件并 console.log 一行提示；残留为空零输出零副作用。
- CLI 命令面、manifest 格式、FileOp 格式：零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：成立。判定基于当次拉取的 manifest 快照（软删行在场=平台处置事实的持久记录，非瞬态事件）；本地文件在 sync 窗口内被并行 propose 覆盖同名 slug 时内容变了但路径不变——判定只看路径前缀+manifest 行，内容无关，不受乱序影响。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：与既有 sync 并发语义一致（manifest 缓存 + 失败重试）。本变更新增的本地删除动作只删「平台已处置」的 proposed 残留——若并发方正在 propose 同名新文件（同 slug 重写），该文件 manifest 行 exists=false 说明平台侧旧版已处置，本地新版按现状本就会 add 复活（缺陷本体）；修复后新版本会随清理被删——这是把「复活旧候选」换成「丢弃未推的新写」，边界损失记入风险 R-02（发生率极低：同 slug 复写+恰逢平台处置同路径）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：安全。清理发生在 ops 计算之后、POST 之前的同步段内；删除前文件已在 manifest 判定为平台已处置（服务器侧无此活文件），删除本地不产生两端不一致；中断重入下轮 sync 重算（残留仍在则再清理，幂等）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：不会。manifest 按工作区拉取（既有作用域），判定所用行属于本工作区清单；路径前缀 knowledge/proposed/ 是 spec 树内相对路径，无跨仓语义。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：误删本地有效新内容——「同 slug 重写+平台恰已处置同路径」的窄窗口会把未推送的新版本一起清掉（见盲维 2）。缓解：提示行明示被清路径，用户可从平台备份区（reject 的 30 天备份）或 git 找回；发生率极低。放弃的方案：① 平台侧 merge/reject 置 platform_deleted 墓碑——语义正确但墓碑当前仅「平台删除变更目录」专用（平台侧核查锚点 service.py:2630-2634），扩墓碑用途牵动跨端删除协议，影响面远大于本缺陷，放弃（留作平台侧长期方案）；② 本地不删只警告——残留永远躺在本地每次 sync 都提示（噪声税），且下次任何 add 路径重构都可能复活，不彻底，放弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/spec-sync.js | computeSpecOps add 生成处拦截（proposed 前缀+manifest exists=false 跳过）；syncSpecTree 新增残留清理段（删本地文件+提示行） |
| 新增 | NEW:test/spec-sync-proposed-no-revive.test.mjs | 用例：exists=false 残留不生成 add/清理段删除+提示/新提议（manifest 无行）照常 add/非 proposed exists=false 语义不变 |
