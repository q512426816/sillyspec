---
author: flow-machine-draft
created_at: 2026-11-15T17:47:10.362Z
---
# 设计记录（Design Record）— 2026-11-16-cross-exclude-dogfood-guard

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 `src/worktree-cross.js` 的 `ensureCrossWorktrees`：`ensureRepoLocalExclude(repoRoot, '.sillyspec/')` 调用前加 dogfood 豁免判定——目标仓 `git ls-files .sillyspec` 非空（自身跟踪 .sillyspec 内容，sillyspec 自托管/dogfood 形态）则跳过追加。选最小切口而非改 `ensureRepoLocalExclude` 本体：函数本体是通用幂等追加器（签名只管"写条目"），"要不要写"是跨仓语义，归调用点判；宿主仓路径零触碰。

背景（2026-11-16 生产实证）：sillyspec 主仓被写入该条目后，显式 pathspec 的 `git add/commit -- .sillyspec/...` 对已跟踪文件报「paths are ignored」exit 1（发布期两笔提交被拦出假失败——报错却部分生效），且 .sillyspec 下新文件从 status 未跟踪提示中消失。本机存量条目已手工清除，本变更为代码面根治。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增内部判定 `repoTracksSillyspec(repoRoot)`（模块内函数，不新增对外导出；测试经 ensureCrossWorktrees 全链覆盖）：`git -C <repoRoot> ls-files .sillyspec` 非空 → true。worktree-cross.js 现有导出签名全部不动。
- 行为变化：dogfood 仓的 `.git/info/exclude` 不再被追加 `.sillyspec/`；既有条目不清除（幂等语义只保不重复——存量清理是本机手工动作，不做自动清除以免越权改用户本地 git 状态）。
- 失败语义：ls-files 失败（git 不可达）按"非 dogfood"处理照旧追加——上游 ensureCrossWorktrees 对 git 不可达本有抛错兜底，此处保守默认维持宿主仓 untracked 保障。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   判定在 worktree 创建前同步执行（同一执行流内先判定后落盘），无乱序窗口。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   上游 `getCrossWorktreeMeta` 幂等复用先拦（existing 即 reuse 不重复走创建段）；本判定只读 ls-files，无新增写面；exclude 写面本有幂等去重（entryRe 正则）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   判定每次创建路径实时执行（非缓存），仓形态变化（用户开始跟踪 .sillyspec）下次 execute 即生效；中断点在判定后落盘前最多回到现状（条目被写，可手工清除），无半写态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   改动只在 sillyspec 进程内，写面仅目标仓 .git/info/exclude（豁免后 dogfood 仓该写面为零）；仓级隔离，无跨仓串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：豁免误判（目标仓真有跟踪内容却判定为空）→ dogfood 仓被追加 exclude，回到现状（可手工清除，无数据损失）。判定用与文件内既有 git 工具同源的非 shell 调用，误判面极小。试过但放弃：① `ensureRepoLocalExclude` 本体加参数——通用追加器掺业务判定，签名污染且其它潜在调用点被迫表态；② `git check-ignore` 探测——测的是"是否被忽略"而非"是否被跟踪"，语义错位（.gitignore 与跟踪状态正交）；③ 自动清除存量误伤条目——越权改用户本地 git 状态，留手工清并文档留痕。
