---
author: flow-machine-draft
created_at: 2026-10-13T12:01:44.383Z
---
# 设计记录（Design Record）— 2026-10-13-commit-guard-s3

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 src/commit-guard.js：加第三信号 S3。机理（本会话临时仓实验实证）：`git commit -- <路径>` 时 git 构造临时索引（HEAD + 该路径工作树内容）并以 GIT_INDEX_FILE 指给 pre-commit 钩子；真实暂存区在 .git/index（linked worktree 为 .git/worktrees/<n>/index，用 rev-parse --git-path index 解析）。S3 = 钩子环境下逐路径比对两索引的 blob sha：不一致 ＝ 提交将携带「未暂存的工作树内容」（暂存净版被 pathspec 语义绕过）——正是 055080e4 三十八行夹带的形态。为什么做在钩子层而非 CLI 收口侧：commit 时刻是唯一信息窗口（外来 hunk 此刻还是工作树上的活内容；收口时已物理进库、文件级归属检查因该文件在声明面而放行）。纯函数 analyzeIndexDivergence 抽取（解析 ls-files -s 行 → 四态判定）供直测；git 接线在 main 内 fail-open。检测只读临时索引（next-index-*.lock），不写。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

commit-guard.js 新增导出 analyzeIndexDivergence(tempEntries, realEntries)（纯函数，输入 ls-files -s 解析条目，输出 {signal, files, message} 形警告——与 analyzeStagedFace 同构）；main() 增 S3 接线：GIT_INDEX_FILE 未设或等于 rev-parse --git-path index 解析值时跳过（普通全量提交零开销零告警）。行为变化：仅「pathspec 提交 + 路径两索引不一致」形态多一条 stderr 警告 + write-audit 留痕（via: commit-guard，signal: index_divergence_on_pathspec_commit）；exit 恒 0 不变；.husky/pre-commit 零改动（仍 node src/commit-guard.js）。无命令/端点/文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。比对是两索引快照的确定性逐路径映射（sha 等值判定，无顺序依赖）；钩子在单次提交进程内执行，临时索引该窗口内 git 保证稳定（.lock 文件归本提交进程所有）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

检测只读：临时索引与真实索引各一次 ls-files -s 快照读，零写面。真实索引被并行会话 add 的竞态：读到的是竞态前后某个一致快照，最坏把「竞态后一致」误判为零告（漏报面，非误报面）——fail-open 语义内可接受。并行会话 add 恰好把同文件 add 成相同内容 → 两索引一致 → 零告（正确：无夹带）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。钩子随提交进程生命周期，异常全捕获静默 exit 0；无跨进程状态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。真索引用 rev-parse --git-path index 在当前仓解析（linked worktree 正确路由）；GIT_INDEX_FILE 是本提交进程注入的进程级环境变量不跨会话；警告只写本仓 .sillyspec 审计（无 .sillyspec 时跳过留痕只打 stderr——与 S1/S2 同款）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：CRLF/clean filter 形态下「假不一致」——add 与 pathspec 提交构造临时索引都走同一 clean filter，理论恒等；实验仓有 CRLF warning 未干扰。若真仓出现 filter 假阳性（理论上仅 .gitattributes 变更窗口内），fail-open 只多一条警告不阻断，噪声可控。次风险：GIT_INDEX_FILE 语义随 git 版本漂移（实验锚定当前 git 2.x 行为：pathspec 提交设临时索引、全量提交不设或设真索引）——两形态都有跳过护栏，语义漂移最坏退化为零告（漏报不误报）。试过放弃的方案：①比对工作树文件 mtime/hash 与暂存区——绕远且 filter 归一化要自己做，直接比索引 blob 更贴近提交语义；②S3 升格阻断——与 fail-open 硬约束冲突（守卫挂全会话共享 .husky，绝不能拦人提交），升格是策略决策另行裁决；③收口侧检测——信息窗口已过（外来 hunk 已进库），实证无效。均否。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？
