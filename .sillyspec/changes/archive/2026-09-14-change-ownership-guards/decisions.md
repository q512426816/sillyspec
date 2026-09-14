---
author: qinyi
created_at: 2026-09-14 11:15:52
generated_by: sillyspec-fourpiece-init
change: 2026-09-14-change-ownership-guards
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: change 所有权+心跳——owner_session 列 + 活跃会话拒绝 + --takeover
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 如何阻止并行会话对他人 change 执行 apply/cleanup/archive 等接管类操作？
- answer: §65 护栏①：changes 表加 owner_session 列（v6 迁移，四处版本号同步 bump——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version）；run/<stage> 与 quick 启动时写 owner（会话标识=sessionId 或 pid@host，首次创建者获得，已有值不覆盖）；每次 CLI 写操作已刷新 last_active（现成心跳）；apply/cleanup/archive/归档内置 apply 前查所有权——owner 非本会话且 last_active 在活跃窗（15 分钟，可配）内 → 拒绝并列出 owner/最后活跃，--takeover 显式接管（重写 owner+留痕）；owner 停活跃（窗口外）→ 放行并提示接管完成。
- normalized_requirement: 所有权校验在 withMainRepoLock 锁内（判定与执行无 TOCTOU）；--takeover 留 result/输出痕迹；本会话自己的 change 零行为变化
- impacts: [FR-01]
- evidence: §65 现象①（worktree 被对方 09943ff 一条龙接管）；progress/change-registry.js:153/:176 last_active 既有刷新点
- 模块域：progress, worktree, cli-entry

## D-002@v1: 归档收口——worktree 有未 apply 交付物时归档硬拦
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 如何消灭「归档完成但交付物未进主仓」悬空状态？
- answer: §65 护栏②：archive step3（确认归档）前检查 worktree 未 apply 交付面（复用 applyWorktree checkOnly）——非空即阻断归档并给两条出路：先跑 worktree apply 或 --skip-apply 显式跳过留痕（明确知道自己要手动处理）。归档与 apply 不自动串联（自动 apply 在有脏重叠时行为复杂，人确认更稳）。
- normalized_requirement: checkOnly 非零交付面 → 归档阻断（错误信息含 apply 指引）；--skip-apply 留痕放行；无 worktree/零交付面零变化
- impacts: [FR-02]
- evidence: §65 根因①放大器（两变更连续踩到悬空态）；applyWorktree checkOnly 现成
- 模块域：worktree, runtime

## D-003@v1: review 放行通道收紧——allowed_paths 相交校验
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 如何堵 review 声明放行外来文件的后门？
- answer: §65 护栏③：apply 校验的「review 声明放行」路径（reviewAdmittedFiles）加相交过滤——review changedFiles 只放行与该 task allowed_paths ∪ design 清单 ∪ 本变更 linked-change 声明面相交的文件；不相交的外来文件从 admitted 剔除、归入违规清单并显式报告（review 声明了越权文件的嫌疑留审计）。
- normalized_requirement: admitted 面 ⊆ allow 面（design ∪ target_files ∪ allowed_paths ∪ linked 声明）；外来声明文件进 violations 报告行；有据越界（facade 转发）因在 allowed_paths/清单内不受影响
- impacts: [FR-03]
- evidence: §65 现象②（11 个并行会话文件经 review 声明真实放行）；worktree-apply.js reviewAdmittedFiles 路径 :917 区域
- 模块域：worktree

## D-004@v1: 归因源切换——worktree 模式 changedFiles 取 worktree 分支 diff
- type: architecture
- priority: P1
- status: accepted
- source: user
- question: 如何从源头消除主仓脏窗口对 review/审计归因的污染？
- answer: §65 护栏④：worktree 隔离模式的变更，其 review 草稿/changedFiles 归因一律取 worktree 分支 diff（git diff base..HEAD + worktree porcelain，现 verify 对账已用同口径）为唯一事实源；主仓脏窗口仅用于 in-place-fallback 模式。存量草稿归属逻辑（autoDraftAttribution）按模式分流。
- normalized_requirement: worktree 模式下归因零依赖主仓工作区状态；in-place 模式行为不变；verify 对账口径统一（消除双口径漂移）
- impacts: [FR-03]
- evidence: §65 根因②（review changedFiles 按主仓脏窗口归因混入并行文件）；verify reconcile 已用 worktree diff 口径（run/verify 侧先例）
- 模块域：runtime, worktree

## D-005@v1: 方案 A——DB 所有权（owner_session 列 v6 迁移 + last_active 心跳 + 锁内校验）
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 所有权判定载体选哪案（A DB 列 / B 锁文件 / C 仅提示）？
- answer: 用户选 A（2026-09-14 对话轮单字确认）：changes 表加 owner_session 列（schema v6 迁移，四处版本号同步——db.js DDL/DB_SCHEMA_VERSION/shared.js CURRENT_VERSION/progress._version，附迁移测试）；last_active 既有刷新点即心跳（run 命令每次写操作更新，活跃窗 15 分钟可配 local.yaml change-ownership.heartbeat_minutes）；所有权校验内嵌 withMainRepoLock 锁内。拒绝 B（DB/文件双真相源+平台模式 specRoot 分裂锁易丢+与 last_active 重复）；拒绝 C（§65 实证 warn 挡不住代劳——对方会话不读 warn）。
- normalized_requirement: 单一真相源=进度库 changes 表；owner 首建写不覆盖（--takeover 例外）；本地.yaml 可配活跃窗；平台同步 payload 带 owner_session（消费侧本变更不强制）
- impacts: [FR-01]
- evidence: 方案选择轮次（2026-09-14 --wait/--answer 单字 A）；§65 护栏①
- 模块域：progress, worktree
