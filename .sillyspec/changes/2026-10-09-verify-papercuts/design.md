---
author: zcode-verify-friction
created_at: 2026-10-09T20:55:00+08:00
---
# 设计记录（Design Record）— 2026-10-09-verify-papercuts

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

四小修各一处单点：①cmd-existence.js 的 SCRIPT_CMD_RE 把 script 名从 \S+ 收敛为 [A-Za-z0-9:_.\-]+——全角标点/&&/| 自然截断，不再拼入 script 名误报。②verify-probes.js 新增 applySkeletonPreservingHuman（--force 分支接线）：机器段全量重刷、纯人工段已填则原样保留、矩阵段与探针容器按首列键携载已填行；备份保留兜底。③verify-postcheck.js 救援窗口第三候选：无分支/审计 tag 时，近 30 提交中消息含变更名者的触及面进 declared-rescue 窗口（不进 union、只救声明而 missing）。④git-helper.js stageArchiveArtifacts 的 add 附 :(exclude) 排除归档嵌套 .sillyspec/ 并在场提示；历史异物 git rm --cached + .gitignore 防线。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增导出 applySkeletonPreservingHuman(existingText, skeletonText)（纯函数）；SCRIPT_CMD_RE 语义收紧（validateScriptCommands 返回结构不变）；reconcileTargetFiles sources 新增标签 main:log-msg-window(declared-rescue-only:HEAD)（字符串展示面）；stageArchiveArtifacts 签名/返回不变。无端点/文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立：四修均为无状态解析/一次性窗口采集，无事件面。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   applySkeletonPreservingHuman 纯函数（写盘沿既有单命令进程语义）；救援窗口只读 git log；add 的 exclude 不影响他进程暂存面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   --force 中断沿既有备份+写盘语义，无新半态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   消息锚定窗口按「提交消息含本变更名」过滤，他变更提交天然不入窗；exclude pathspec 只作用于归档子树。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：②的段携载把 stale 人工面带进新骨架——沿 refreshProbeSections 既定安全方向（宁可少刷新不误删），stale 行追加段尾留 agent 裁决，gate 一致性抽查独立把关。放弃的方案：①按空白截断（script 名合法字符外还有大量 Unicode，白名单比黑名单稳定）；③无锚 blanket 20 提交全入窗（他变更文件污染窗口，必须消息锚定）；②只备份不携载（现状——找回回填来回比携载贵，当日实证）。
