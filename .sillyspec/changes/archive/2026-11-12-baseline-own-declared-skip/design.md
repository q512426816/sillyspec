---
author: qinyi
created_at: 2026-11-12T00:20:00.000Z
---
# 设计记录（Design Record）— 2026-11-12-baseline-own-declared-skip

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两处改动，同一根因（baseline overlay 把「本变更前置产物」与「并行会话脏文件」混进同一个 checkpoint）：
① `src/worktree.js`：`_overlayBaseline` 用既有 `loadOwnDeclaredSet` 计算 `ownDeclaredFiles`（本变更 task 卡声明集 ∩ overlay 文件），文件仍复制进 worktree（保持在场），但 `_createBaselineCheckpoint` 用 pathspec `:(exclude)` 把它们排除出 commit——以未提交态等本变更 Wave 提交收编，`diff baselineCommit..HEAD` 对账即可见。
② 归档交付面口径：**撤销**。原诊断假设「baseline 带入的并行会话未提交脏文件会被算成本变更交付面」，实测不成立——原 `git diff baselineCommit`（工作区）口径本已排除 checkpoint 内容；改成「只算提交面」反而漏检未提交交付（change-ownership-guards ⑦a/⑦a2 实测变红）。保留原口径，归档残留文件的根因另行诊断（apply 的 docs 通道），本轮不修。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `WorktreeManager._overlayBaseline` 返回值新增 `ownDeclaredFiles: string[]`（向后兼容，旧消费方不读该键无影响）。
- `WorktreeManager._createBaselineCheckpoint(worktreePath, changeName, baselineFiles, ownDeclaredFiles = [])` 新增第 4 参数（缺省空 = 旧行为）；baseline checkpoint 提交信息正文新增「本变更声明文件」段。
- 归档交付面：无签名变化（撤销原拟新增的 `deliverableFaceCommittedOnly` 选项）。
- 无端点/文件格式变化。meta.json 的 `baselineFiles` 语义收窄为「主仓并行在途清单」（本变更声明文件不再混入）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——overlay 与 checkpoint 在 create 内同步顺序执行，无乱序面；声明集在 overlay 时点读取，之后 task 卡改动不影响本次判定（下次 create 生效）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

create 的 overlay+checkpoint 在单一 worktree 内串行（无并发写）；声明集加载失败走 catch 退回旧行为（全进 checkpoint），不阻断 create。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全——排除只影响 checkpoint 的 add 面，文件本体已在 worktree 工作区；若本变更最终未提交这些文件，apply 仍会按 deliverableBase diff 带上（apply 主流程未传新选项），交付不丢。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会——声明集按 changeName 隔离（loadOwnDeclaredSet 本就按当前变更取）；applyWorktree 新选项默认 false，跨仓段与主流程零变化；每个 worktree 独立判定。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：本变更声明文件长期未提交时，归档前置检查（提交面口径）不再提醒它们未落地——但 apply 主流程仍会带上它们（deliverableBase diff），且 execute 流程要求逐任务提交，未提交属流程违规。放弃的方案：①把声明文件完全不 overlay 进 worktree（前置产物不在场，Wave 执行读不到原型/骨架）；②归档检查直接忽略 `.sillyspec/docs/**`（会漏真文档交付，且不解决声明文件的同类问题）。
