---
author: flow-machine-draft
created_at: 2026-10-13T07:49:56.024Z
---
# 设计记录（Design Record）— 2026-10-13-flow-diff-cmd

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 src/flow.js：dispatcher 加 `sub === 'diff'` 分支调新函数 cmdFlowDiff（只读查询，非协议调用——不动状态机）。双态同构：归档变更读 `.sillyspec/changes/archive/<名>/change-patch.json` 的 scopeAudit.rows/totals 渲染（含 verdict 列）；活跃变更实时算——已提交交付面 = `git diff --name-only baseline..HEAD` 经 filterCommittedFace（与 patch 子步冻结面同口径，ownPrefix 剔治理件保 .sillyspec/docs/），行数用 collectNumstatByPath（同源零件）；未提交交付面 = `git status --porcelain -uall` 按同规则过滤后对 HEAD 算 numstat（untracked 按文件行数、二进制 null 档）。为什么选这个方案：两态数据都已存在（归档件由 writeCloseTraceArtifacts 落、活跃面零件由 patch 子步落），缺的只是查询/渲染口——纯增量零风险；只读纪律照 scan diff 先例（跳过 triggerPullActiveChange、不写盘），此前有 token 不接 index.js 被静默吞的坑记档，分发走 dispatcher 显式分支。--json 输出双态同构（rows/totals/mode/baseline），作为平台后续轮锚对账的消费口。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新子命令 `sillyspec flow diff --change <名> [--json]`（flow 族第三个只读面，与 flow status 同级）。新增 cmdFlowDiff({change, cwd, specBase, json})；复用 filterCommittedFace（flow-parity.js）、collectNumstatByPath（scope-audit.js）、readFlowState（flow-state.js）、validateChangeName 白名单。变更不存在 → exit 1（提示 status 查列表/检查拼写）；无 git 基线 → 显式提示 exit 0；--json 输出 {change, mode, baseline?, rows[], totals}（rows 含 state: committed|archived|dirty 区分三源）。既有 flow start/done/status 行为零变化；文件格式零变化（只读不写）。usage 报错行补 diff。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。查询是时点快照：活跃态取「调用时刻」的 baseline..HEAD 与工作树实态，与 flow done 冻结面同口径同时点语义；并行会话在查询期间新提交/新改动只影响下一次查询（幂等只读）。归档态读冻结件，天然时点稳定（sha256 锚定的留档）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

只读命令零写面：不写 flow-state、不 git add/commit。读归档件与读 git 索引均为原子读或快照读，并发写者最多造成本次渲染口径落在中间态（下一轮查询自愈），无数据损坏面。披露精度（评审 F2）：diff 分支照 flow 族全子命令惯例 best-effort 调 reportAgentLog——agent 环境在场时写 .runtime/agent-session-log.json（既有横切观测面、withFileLock 串行，非本变更新增、不触碰变更数据；探测不到 agent 环境则不写）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。无状态机参与（不 mark 子步、不改 st）；中断即退出，无半态。活跃变此后被归档，同命令自动切到归档态读件（changes/ 目录消失 → 落到 archive/ 查找），生命周期两态无缝。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。baseline 取自该 change 自己的 flow-state.yaml（各工作区各读各的）；冻结面口径剔 ownPrefix（.sillyspec/changes/<本变更>/）只剔自己的治理件，他会话在途文件按「事实呈现」显示（查询面如实反映工作树，不做归属裁决——归属是收口门的事，查询不越权）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：活跃态与归档态数字对不上造成困惑——活跃实时算含未提交 dirty 面，归档件只含冻结时点面，收口前后同命令数字必然不同。缓解：输出显式标 mode（active/archived）与 state（committed/dirty），dirty 面单列不混入合计口径歧义（合计含 dirty 并注明）。次风险：untracked 大文件按行数统计的 IO——单文件读行数成本可忽略，排除目录级扫描（只 stat porcelain 列出的文件）。试过放弃的方案：①复用 worktree diff 的通道——那是 worktree 元数据驱动的另一族（需 --base 手给），变更名直查语义不符；②活跃态也走冻结件（flow done 时预写轻量 json）——给只读查询加写面违背最小侵入，且收口前就要维护第二份真相源；③顺带做「计划外」verdict 对账（活跃态比 design 声明面）——有价值但属收口门职责（夹带嫌疑 advisory 已有），查询口不越权，留后续。均否。
