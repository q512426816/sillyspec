---
author: flow-machine-draft
created_at: 2026-10-23T15:39:59.137Z
---
# 设计记录（Design Record）— 2026-10-23-push-plan-anchor-batch-perf

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

实测 dry-run 3.6s vs 纯 git+网络 0.67s：`computeEffectiveBase` 对每锚 `rev-parse --verify` + `merge-base --is-ancestor` 两次 spawn，43 锚 ≈ 86 次进程启动（Windows 每次 30-40ms）。修法：锚点可解析性改单次 `git cat-file --batch-check`（stdin 喂 `<sha>^{commit}` 列表、按输入序回读，短哈希解析成功回显完整 sha，本地 Map 保留 input→full 映射）；祖先判定只对批量后幸存的 live 锚点逐个 spawn（live 数通常 0-3）。坏锚点警告收敛单行。runPush fetch 后解析远端跟踪引用传 `remoteSha` 入参（既有通道），砍掉非 dry-run 的第二次 ls-remote。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/push.js`：新增模块内 `batchCommitResolve(repoRoot, shas)`（批量解析，输入序对齐）；`computeEffectiveBase` 内部改批量解析+单行摘要（函数签名不变，warnings 内容形态变化：坏锚点 N 行 → 1 行摘要）；`runPush` exec 内 fetch 后传 `remoteSha`。CLI 参数/JSON schema/退出码零变化；plan 的 base/groups/守卫判定语义零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 批量解析按输入序回读（cat-file --batch-check 保证响应序=输入序）；fetch 与计划间远端推进仍由既有「推送前 tip 再探」守卫兜底，时序语义不变。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 全部只读；不改写路径，锁/CAS 面不触碰。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 批量调用失败按「全部不可解析」同向 fail（与逐锚失败同语义），坏锚点走既有跳过+警告路径；无新状态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 批量解析锚定当前 repoRoot；锚点仍来自当前仓 specBase，作用域不变。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：短哈希解析映射错位（批量回显的是完整 sha，输入是短哈希）——按输入序对齐而非按回显内容对齐，测试锚钉短哈希解析成功形态。
- 死路 1：用 `rev-list HEAD` 全集 + 本地 Set 判祖先——sound 性不足（topo 序不判传递闭包）或全集过大，且 is-ancestor 语义（相等=真）需特判，放弃；只批量化「可解析性」，祖先判定维持逐 live 锚 spawn（live 少，成本可忽略）。
- 死路 2：改 git-helper 的 batchCatFileExists 契约——它被归档锚点校验消费（按回显 sha 作键），改键序影响既有消费方；push.js 内做输入序对齐的本地批量，不动公共契约。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | `src/push.js` | batchCommitResolve 批量解析 + computeEffectiveBase 单行摘要 + runPush 传 remoteSha |
| 修改 | `test/push-cli.test.mjs` | 新增「⑤b 预存坏锚点：警告收敛单行」用例 |
