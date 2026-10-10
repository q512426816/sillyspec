---
author: flow-machine-draft
created_at: 2026-10-10T11:38:11.730Z
---
# 设计记录（Design Record）— 2026-10-10-cross-wt-repo-local-placement

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

跨仓 worktree 旧默认落主仓 specBase 下，暗含「主仓与跨仓同一文件系统」假设——主仓在 WSL /root、跨仓在 /mnt/<盘>/ Windows 盘时（2026-10-10 fire-equipment D-007 实证形态），隔离副本与该仓唯一构建工具链分居互不可访文件系统。用户提议把默认落位改到跨仓仓内：`<跨仓仓根>/.sillyspec/.runtime/worktrees/<change>--<repoKey>`——天然同盘同文件系统，工具链可达性问题自动消解，且写进的是仓内受控命名空间而非仓外猜测目录，与主仓 worktree 的自家乡形态同构。仓内落位的 untracked 噪音面用 `.git/info/exclude` 幂等追加 `.sillyspec/` 保障（本仓生效、不进版本库、不碰用户 .gitignore 工作区文件；worktree add 前落盘，已实证 status 干净）。寻址链升级为有序候选：注册表条目 → 仓内新公式（知 repoRoot 时）→ 主仓 specBase 旧公式（legacy 存量兜底）——上一版本创建在旧位置的 worktree 全链（meta 读取/list/cleanup/verify 对账）仍可达；显式落位配置（repos.worktree / crossPlacement）优先级仍最高，显式指仓根内维持拒绝。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `resolveCrossWorktreePath(specBase, change, repoKey, repoRoot?)` 第 4 参语义扩展（跨仓仓根，知则寻址仓内新默认）；新增导出 `resolveCrossWorktreePathCandidates`（有序去重候选列表——需要「找真实在场位置」的读取方逐候选探测）。
- `ensureCrossWorktrees` 默认落位改为仓内（meta 新增 `placementMode`：repo-local / explicit-inline / explicit-legacy）；新增导出 `ensureRepoLocalExclude(repoRoot, entry)`（.git/info/exclude 幂等追加，失败 warn 不阻断）；显式配置指仓根内拒绝语义保留。
- `listCrossWorktreeMetas` 扫描源扩为三源（主仓 specBase 旧目录 ∪ 各注册仓仓内新默认目录 ∪ 注册表），签名不变；`getCrossWorktreeMeta` 改候选遍历（注册表 → 仓内 → 旧公式），返回契约不变（null=无/损坏）。
- local.yaml 无新键；worktree.crossPlacement / repos.worktree 语义不变（优先级文档同步见 config-schema——本变更未改 config-schema，legacy 键 desc 已含优先级说明仍准确）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。候选寻址是纯函数（同输入恒同输出）；存量 worktree 在旧位置时候选链逐级探测必然命中旧公式级；注册表条目（上一变更引入）恒优先——新旧版本 CLI 混跑时（旧版只认旧公式、新版候选链含旧公式）双向兼容。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

exclude 追加用 writeAtomicSync（整文件原子写）且幂等（已含条目即跳过）——两个变更并发对同一仓首次建 worktree 时都写同一行，后写覆盖内容一致无差异；worktree 目录键含 changeName 不碰撞；注册表 read-modify-merge 沿用上一变更设计。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。exclude 写失败仅 warn（最坏回落「worktree 成 untracked 噪音」，apply 清单校验本就过滤，不丢数据）；create 中断后 meta/注册表/exclude 的残留均为幂等可重入态（ensure 复用短路、cleanup 幂等删键）；worktree 在仓内多出的 .sillyspec 目录随 cleanup 一并删除（safeRemoveWorktreeDir 只删 worktreePath 自身）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。仓内落位目录在跨仓仓根内、键带 changeName--repoKey 防碰撞；两个主仓实例注册同一跨仓仓时，各自变更的 worktree 同落跨仓 .sillyspec 下但目录名不同变更名隔离；exclude 是跨仓仓级共享（幂等同行），无作用域泄漏。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：R-01 跨仓仓的 .git 目录只读/异常导致 exclude 写失败（warn 降级，worktree 成 untracked 噪音——apply 清单校验兜底，不阻断）；R-02 仓内 .sillyspec 目录会被用户的 IDE 全局搜索/索引扫到重复内容（主仓同形态用户已习惯，execute 期临时存在、cleanup 即删）；R-03 候选寻址的探测顺序依赖注册表权威性——注册表条目指向已亡目录而旧公式处恰有他者残留 meta 时会误命中（注册表写读同链路维护，残留面与 sweep 治理重合）。
试过但放弃的方案：自动兄弟目录（<path> 旁猜一个 sillyspec-worktrees）——向用户仓外未知位置写目录侵入性大且名字无约定，仓内受控命名空间（.sillyspec/）语义更干净；删除旧公式兜底（注册表已够）——存量 worktree（升级前的变更收口中断态）会失联，兼容成本为零则不做断崖。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/worktree-cross.js | ensure 默认落位仓内 + ensureRepoLocalExclude + placementMode + list/get 候选寻址 |
| 修改 | src/cross-placement.js | resolveCrossWorktreePath 加 repoRoot 参 + resolveCrossWorktreePathCandidates 新导出 |
| 修改 | src/run/multi-repo-context.js | resolve 调用传 crossRepoPath |
| 修改 | src/cross-repo-reconcile.js | B' 档候选遍历探测 |
| 修改 | test/cross-worktree-placement.test.mjs | 默认断言改仓内 + exclude/status 断言 + legacy 兼容用例 |
| 修改 | test/cross-repo-worktree-isolation.test.mjs | 路径引用改仓内新公式 |
