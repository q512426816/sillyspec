---
author: flow-machine-draft
created_at: 2026-11-23T02:35:53.977Z
---
# 设计记录（Design Record）— 2026-11-23-worktree-fallback-consent

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 `worktree.js create()` 的 worktree add 失败分支（:882-893）：删「可能是沙箱权限限制」的静默降级，改 fail-closed 抛错（原始 stderr + 三条处置指引）；显式同意（`opts.allowInPlace` 或 local.yaml `worktree.fallback: allow`）时才降级，且降级动作重排为「先 checkout 专用分支、成功后落 meta」。选择同意制而非彻底删除 in-place 通道：全历史唯一实锤事故（2026-07-15，长路径，已由 core.longpaths 缓解）证明通道危险，但部分受限环境（沙箱 CI）可能确需直写——同意制把「要不要冒这个险」交还用户，与跨仓 fail-closed（worktree-cross.js:122）+ 主仓分支冲突三选一菜单的既有治理风格一致。

三处配套：① worktree-guard `isInsideRegisteredWorktree` 对无 `explicit` 标记的遗留 in-place meta 停止整树授权（排雷存量：这类 meta 让主仓写入与 git commit 全放行，是事故的放大器）；② `readWorktreePolicy` 加读 `worktree.fallback` 键（flag > policy > fail-closed 缺省，同 adopt_branch 优先级铁律）；③ config-schema 文档化新键。测试策略：`git worktree add` 的确定性失败用「分支名以 .lock 结尾」制造（git 拒绝 .lock 后缀分支，validateChangeName 放行）——跨平台无沙箱技巧；checkout 幸福路径抽 `switchMainToWorktreeBranch` 导出直测（同 inferChangeFromWorktreeCwd 导出先例）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `WorktreeManager.create(changeName, opts)`：opts 新增 `allowInPlace?: boolean`（缺省 false）。返回值新增 meta 字段 `explicit?: true`、`fallbackReason?: string`（仅降级路径）；正常 worktree 路径返回值零变化
- `worktree.js` 新增导出 `switchMainToWorktreeBranch(cwd, branch, baseHash, opts)`：in-place 降级的分支切换 helper（分支不存在→`checkout -b branch baseHash`；存在→`checkout branch`；`baseHash≠HEAD`→跳过+warn 返回 skipped）；失败抛错。导出供测试直测
- `readWorktreePolicy(repoRoot)` 返回值新增 `fallback: 'allow'|'block'` 键（读 `worktree.fallback`，仅 `allow` 字面量为 allow，其余/缺省 block）
- CLI：`sillyspec run execute --change <名> --allow-in-place`（command.js quickOpts 路由，与 --adopt-branch 同款仅 execute 阶段生效）；`sillyspec worktree create` 顶层命令不收该 flag（其降级出口只有 local.yaml）
- worktree-guard `isInsideRegisteredWorktree`：行为变化仅限 `mode==='in-place-fallback' && explicit!==true` 的 meta（不授权）；正常 worktree / native-worktree / explicit in-place meta 判定不变
- meta.json 格式：新增可选字段 `explicit`（boolean）、`fallbackReason`（string）；既有消费方（wt-commit/apply/cleanup 的 mode 判定）不读新字段，零漂移

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

降级后写 meta 与 checkout 的顺序固定为 checkout→meta（meta 是授权凭证，凭证不先于隔离态成立——checkout 失败即抛错不落 meta）。中途断电/中断：checkout 成功但 meta 未落 → 主仓停在 `sillyspec/<change>` 分支、无 meta——下次 create 走「分支已存在三选一菜单」，无静默状态；meta 落了但调用方崩溃 → 与现行 in-place 残留同形态，cleanup 可清（isInPlace 分支只清 meta，:1563+），且新 meta 带 explicit 会被 guard 正常授权，无半授权态。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

并发赢家重查（:875-880）先于降级判定，两 agent 同名首建的分裂态（一 worktree 一 in-place）维持现状拦截不降级。checkout 本身持 git index 锁，天然串行；与并行会话主仓在途提交的互斥依赖 git 侧锁冲突报错——checkout 失败即整体 fail-closed，不产生半态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

显式 in-place 变更收口走既有 cleanup isInPlace 分支（meta-only 清理）与 apply 的 in-place no-op 路径，本变更不触碰；遗留无-explicit meta 在下次 cleanup 时同款清除，guard 排雷只是让它「无害地躺到被清」。db 的 no_worktree 与本设计正交（no_worktree=禁止源码写入的更严面，explicit in-place=允许直写，两者不叠用，语义各表）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

`worktree.fallback` 读的是主仓根 `.sillyspec/local.yaml`（readWorktreePolicy 既有定位，worktree cwd 下也解析回主仓）；`--allow-in-place` 只影响当次 execute，不落任何记忆（配置才是记忆面）——与 adopt_branch 的 flag/policy 分工同构。跨仓 worktree 不经本分支（ensureCrossWorktrees 既有 fail-closed 不动）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：**存量消费仓在受限环境里静默依赖降级通道跑批**——升级后 execute 在那些仓会从「带警告跑通」变成「启动报错」。评估可接受：全历史取证（腾讯云/阿里云/zcode/本地归档）零真实降级记录（唯一实锤是长路径，已另有缓解），报错信息含完整处置指引且留 local.yaml 出口；这正是本变更的目的（把静默风险变成显式决策）。次风险：`.lock` 后缀分支名 fixture 若未来 validateChangeName 收紧字符集会失效——测试断言带场景注释，收紧时改用 `~` 类非法字符即可。

试过放弃的方案：① 彻底删除 in-place 降级通道不留出口——放弃：沙箱/受限环境可能确有直写需求，删通道等于替用户决策，与「显式同意」治理风格相悖；② 降级时不切分支只加显式警告——放弃：坑1 实证「停在用户当前分支直写」正是事故核心，警告不改变污染面；③ meta 先落再 checkout（实现更简单）——放弃：授权凭证先于隔离态落盘会在 checkout 失败时留下「guard 全放行 + 用户分支被占」的最坏组合，顺序必须反过来。
