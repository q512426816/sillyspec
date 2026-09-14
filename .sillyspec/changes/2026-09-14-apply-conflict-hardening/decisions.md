---
author: qinyi
created_at: 2026-09-14 05:35:07
generated_by: sillyspec-fourpiece-init
change: 2026-09-14-apply-conflict-hardening
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->

## D-001@v1: mergeDirtyOverlapThreeWay 写回后补显式 pathspec git add + apply-manifest.json 指纹
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 如何闭合 merge 写回不进暂存区的唯一自动缺口，并让 apply 后丢失/篡改可检测？
- answer: §64 护栏①：mergeDirtyOverlapThreeWay clean 写回（worktree-apply.js:143）后立即 `git add -- <该批文件显式 pathspec>`（对齐 archive git add 下沉先例）；apply 成功尾声落 apply-manifest.json（文件→sha256 指纹，全量 applied 面=patch 面∪merge 面），供 verify/doctor 做 apply 后漂移检测（staged/worktree 与指纹比对，不一致显式警告）。
- normalized_requirement: merge 写回文件全部进暂存区（含新增）；manifest 覆盖本次 apply 全部落盘文件与内容指纹；检测面 advisory 起步（D-3 先例）
- impacts: [FR-1, FR-2]
- evidence: troubleshooting §64 护栏①；worktree-apply.js:143 writeFileSync 无 add；用户 2026-09-14 评审裁定
- 模块域：worktree, core-engine

## D-002@v1: apply 前活跃 quick 会话 guard.json 文件集相交 fail-closed 检测
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 如何阻止 apply 在他人 quick 会话在途时落盘重叠文件？
- answer: §64 护栏②：apply（含 archive 内置 apply）前读各活跃 quick 会话 guard.json 的 allowedFiles 声明，与本次 apply 文件集相交——非空交集即拒绝 apply（fail-closed）提示串行化，--force 解锁。判定勿用 changes.last_active 当心跳（只在 CLI 写操作刷新非周期心跳，直接用会误判活跃性）；活跃性判定=guard 存在且会话非完成态（复用 collectRecentForeignDelivery/collectGuardReservedQuicklogIds 既有活跃扫描口径）。
- normalized_requirement: 相交检测在 withMainRepoLock 内执行（锁内判定锁内 apply，无 TOCTOU 窗口）；--force 显式解锁留痕；检测结果进 apply 输出与 result 对象
- impacts: [FR-3]
- evidence: troubleshooting §64 护栏②；用户 2026-09-14 评审裁定（guard.json --files 声明 > last_active）
- 模块域：worktree, change-management, cli-entry

## D-003@v1: rescue 提示补「落地后立即 git add 锁定」指引
- type: boundary
- priority: P2
- status: accepted
- source: user
- question: 人工 rescue 路径的裸奔窗口如何收窄？
- answer: §64 护栏①尾项：generateRescueCommands 输出末尾追加一行指引——rescue 指令人工执行后立即 `git add -- <files>` 锁定（staged 对 restore/clean 免疫）。纯文案改动。
- normalized_requirement: rescue 输出含该指引行；不改 rescue 命令本体
- impacts: [FR-1]
- evidence: troubleshooting §64；本次事故实际路径=人工 rescue 未暂存被冲
- 模块域：worktree

## D-004@v1: 文件所有权登记表暂不做，记入 ROADMAP
- type: boundary
- priority: P1
- status: accepted
- source: user
- question: 要不要做跨会话文件所有权登记（claims+心跳）？
- answer: 不做。裸 git 拦不住（git 无 hook 可拦截 restore/checkout 工作区写入），单独做收益不抵复杂度；D-001+D-002 把 sillyspec 面最大杀伤面（apply）管住+窗口秒级化后，裸 git 破坏面只剩理论值。复潮条件：D-001/D-002 落地后仍复现 apply 冲掉或裸 git 冲掉造成实际损失 ≥2 次。
- normalized_requirement: 本变更不实现登记表；ROADMAP.md 记一行观察项含复潮条件
- impacts: [FR-4]
- evidence: troubleshooting §64 护栏③；用户 2026-09-14 评审裁定
- 模块域：worktree

## D-005@v1: 方案 A——manifest 落变更目录（verify-facts 先例）+ doctor 既有检查项
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: manifest 落点与检测形态选哪案（A 变更目录+doctor / B .runtime+verify 硬对账 / C 砍 manifest）？
- answer: 用户选 A（2026-09-14 对话轮，确认 manifest 体量后拍板）：apply-manifest.json 落变更目录（verify-facts.json「CLI 全权写审计底稿」同款先例，随归档留存可审计）；漂移检测走 doctor 既有检查项形态（decision-touch-cli-drift D-001/D-002 先例：不加新命令/新步骤/新占位符）。体量依据：每文件≈150B（路径+sha256+JSON 结构），典型 apply 10-40 文件=3-6KB，极端 50 文件<8KB。拒绝 B（.runtime 随清理丢历史，检测时点优势不抵）；拒绝 C（丢 §64 护栏①后半「apply 后丢失/篡改可检测」价值）。
- normalized_requirement: manifest JSON 格式 {change, appliedAt, baseHash, files:[{path, sha256}]}；CLI 全权写（agent 勿手改）；doctor 检查项比对 staged+worktree 实际内容 hash 与指纹，不一致告警（advisory）
- impacts: [FR-1, FR-2]
- evidence: 方案选择轮次（2026-09-14 --wait/--continue）；verify-facts.json 先例（2026-09-07-ir-stage-p3b D-002）；decision-touch-cli-drift D-001/D-002
- 模块域：worktree, core-engine
