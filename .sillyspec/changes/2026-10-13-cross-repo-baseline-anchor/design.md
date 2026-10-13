---
author: flow-machine-draft
created_at: 2026-10-13T15:09:24.834Z
---
# 设计记录（Design Record）— 2026-10-13-cross-repo-baseline-anchor

## 做法概述

三处改动：①src/flow.js cmdFlowStart 主 writeFlowState 后加跨仓基线锚 best-effort 块——读 local.yaml 注册表（parseRepoRegistry），逐仓解析路径（isAbsolute/resolve，与 collectRepoActual 同口径）rev-parse HEAD，写 cross_baselines 进 flow-state（首写者胜：已有即不刷新，对齐 baseline_sha256 模式防重入后并行提交漂移窗口；仓不可达/非 git/rev-parse 失败跳过该仓，绝不阻断 start）；②src/cross-repo-reconcile.js collectRepoActual 加 3c 档（B' 与 B 之间）：crossBaselines[repoKey] 为合法 sha 且该仓 rev-parse --verify 可达时——token 归因主面（git log --grep=changeName 基线..HEAD 命中提交的 diff-tree 文件并集）∪ untracked ∪ status；零 token 命中回退全窗口 diff 基线；sha 不可达回退 B 档；③透传链：reconcileCrossRepoPlan 加 crossBaselines 参数（缺省 null），flow.js thin 收口调用点传 st.cross_baselines。为什么 token 归因做主面：实验实证基线全窗口会包含并行工作区的外来提交（进冻结面污染审计），token 过滤（AGENTS 规则 11 消息约定）可精确剔除；零命中回退保「可见不静默」。流程说明：实现先于立项落码（会话顺序失误），收口门照常把关工件与实测。

## 接口契约

collectRepoActual/reconcileCrossRepoPlan 签名加 crossBaselines 参数（缺省 null 向后兼容，厚道/旧调用零感知）；flow-state 新增可选键 cross_baselines（map：注册 key→sha，随归档留档）；anchor.source 新增枚举值 flow-start-baseline（additive，平台读侧按 string）。行为变化：thin 跨仓对账窗口从 B 档单笔启发式变基线..工作树（多提交全覆盖+外来提交 token 剔除）；flow start 多一行基线锚提示（注册仓可达时）。命令/端点/文件格式：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。基线是 start 时点快照（首写者胜，重入/中断恢复不刷新——跨仓期间已有并行提交时不漂移窗口）；对账是 done 时点对基线的确定性 diff，与提交到达顺序无关（token 过滤按消息匹配不按顺序）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

记录侧纯读（rev-parse HEAD 一次）；对账侧纯读（log/diff/ls-files/status 快照）。共享跨仓的并行提交在窗口内可见：带变更名的进主面、不带的被 token 剔除或以 unplanned 行可见；未提交态是所有人的混面（无法归因，残留噪音如实呈现）。flow-state 写走既有 writeAtomicSync 串行面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。基线落 flow-state 持久化（断点续跑/归档留档都在）；收口重入幂等重算同窗口；跨仓基线 sha 被 gc 的极端形态走 B 档回退不阻断。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。cross_baselines 键为注册 key、值取自各工作区自己的 local.yaml 注册路径（多工作区各记各的快照）；对账读的是本变更 flow-state 里的基线。跨仓写面：零（全程只读跨仓 git）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：token 归因依赖提交消息约定——跨仓提交不带变更名时零命中回退全窗口，外来已提交内容会进冻结面与 totals（审计污染可见）。缓解：AGENTS 规则 11 本就要求提交消息带变更名（跨仓不应例外）；回退面是可见噪音（unplanned 行+锚 label 自述「零 token 命中回退全窗口」），与主仓夹带嫌疑 advisory 同语义。次风险：共享跨仓未提交态天然混面（token 无法归因未提交内容）——文档披露的残留，根治需跨仓 worktree 隔离（另立项）。试过放弃的方案：①仅记基线不做 token 过滤——实验实证外来提交进窗污染冻结面，主面必须过滤；②flow done 时反向推断基线（窗口内最早提交的父）——交错时序下推断错位（正是 B 档病灶），start 时点快照才是唯一可靠锚；③跨仓也建 worktree——策略面大（往外部仓写状态），thin 首步不碰。均否。
