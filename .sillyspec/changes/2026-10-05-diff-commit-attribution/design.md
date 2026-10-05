---
author: flow-machine-draft
created_at: 2026-10-05T04:38:09.259Z
---
# 设计记录（Design Record）— 2026-10-05-diff-commit-attribution

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新增「提交事实归属」切分器：一次 `git log --name-only --format=<NUL>+<subject>` 拿到 baseline..HEAD 每个提交的 message 与触碰文件，解析 message 携带的变更名后缀（项目提交惯例 `(2026-MM-DD-名)`），按文件聚合出「全量提交均属他侧变更」的文件集。接入两处，且都在函数内部自取 baseline_commit（读当前变更 flow-state.yaml，或从 ownPrefix 反解变更名）——flow.js 调用点零改动（该文件并行会话在途）：① `foreign-declared.js` 的 `splitOwnVsForeignDiffFiles` 把提交归属并入 foreignMap（与既有声明面合并）；② `flow-parity.js` 的 `filterCommittedFace` 在现状过滤后剔除纯他侧提交的交付文件。选提交事实而非扩大声明面扫描（扫 archive/）的原因：提交归属是已发生的事实行刑，不违反否决决策 sentinel-evidence-freeze⑤（其禁的是「陈旧声明抢已提交文件」——意图抢夺）；扫 archive/ 反而会让历史归档变更的清单永久参与抢文件，正是该决策要防的。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增导出 `parseChangeNamesFromSubject(subject)`（纯函数：提交标题 → 变更名数组）与 `buildCommitAttribution(logText)`（纯函数：git log 文本 → Map<file,{owners:Set,unknown:boolean}>）；`splitOwnVsForeignDiffFiles` 与 `filterCommittedFace` 签名不变（新逻辑经 opts/自取注入，缺省与旧调用完全兼容）。CLI 无变化；行为变化仅一处——多会话混窗时他侧纯提交文件不再进本变更冻结面与 own 面。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用：git log 读取的是已定序的提交历史（DAG 线性化），无乱序输入面；单次快照读取，无事件流。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   只读 git 历史与 flow-state.yaml；竞态窗口内他侧新提交可能未被本次快照看到——后果是少剔一个他侧文件（保守方向，与现状等价），不会误剔自己的文件。自身无任何写面。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全：无中间态落盘（每次调用即时算即时用）；flow-state.yaml 读取失败即降级现状行为。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   无串台面：归属计算全部限定在当前仓当前变更的 baseline..HEAD 窗口内，不读他仓、不写任何共享状态；临时仓/主仓/会话专属 worktree 各自独立计算。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：提交 message 未携带变更名后缀的裸提交会污染归属（用户手提交 `fix: typo` 触碰过他侧文件 → 该文件判 unknown → 保留 own → 漏剔）——fail-closed 方向（多冻不错杀），与现状等价不劣化；文档化于 FR-02。放弃的方案：①扫 archive/ 下变更的声明清单参与 foreignMap——历史变更清单永久抢文件，恰是否决决策 sentinel-evidence-freeze⑤ 防的形态，且 7 天陈旧规则对已归档目录语义混乱；②按提交作者 email 归属——多会话共用同一 git 身份（本仓两实测会话同 user），作者维度无区分度；③改 flow.js 调用点显式传 baseline——该文件并行会话在途，整文件提交会夹带他侧未提交改动（规则 11），故全部改为函数内自取。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/foreign-declared.js | 新增 parseChangeNamesFromSubject/buildCommitAttribution 导出；split 内自取 baseline 并合并提交归属进 foreignMap |
| 修改 | src/flow-parity.js | filterCommittedFace 现状过滤后剔除纯他侧提交文件（best-effort git） |
| 新增 | test/commit-attribution-split.test.mjs | 解析纯函数单测 + 临时 git 仓混窗集成 + 降级现状三面 |
