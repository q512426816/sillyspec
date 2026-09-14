---
author: qinyi
created_at: 2026-08-23T22:40:00+08:00
---

# 决策知识 — worktree

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-901@v1 worktree 清理先解链 node_modules junction 再删目录
来源：seed-2026-08-23（历史坑手工回填）
状态：implemented
锚点：src/worktree.js:81
最近确认：71a7fe6
理由：删除/重建 worktree 目录必须先经 unlinkNodeModulesLinks/safeRemoveWorktreeDir 解链根目录与 meta.depsModules 各子模块的 node_modules junction 再 rmSync——裸 rmSync 或 Git Bash rm -rf 会跟随 junction 穿透删掉主仓 node_modules（user-inputs 两次事故实录），幽灵目录清理同理走统一出口。

## D-001@v1 mergeDirtyOverlapThreeWay 写回后补显式 pathspec git add + apply-manifest.json 指纹
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：§64 护栏①：mergeDirtyOverlapThreeWay clean 写回（worktree-apply.js:143）后立即 `git add -- <该批文件显式 pathspec>`（对齐 archive git add 下沉先例）；apply 成功尾声落 apply-manifest.json（文件→sha256 指纹，全量 applied 面=patch 面∪merge 面），供 verify/doctor 做 apply 后漂移检测（staged/worktree 与指纹比对，不一致显式警告）。

## D-002@v1 apply 前活跃 quick 会话 guard.json 文件集相交 fail-closed 检测
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：§64 护栏②：apply（含 archive 内置 apply）前读各活跃 quick 会话 guard.json 的 allowedFiles 声明，与本次 apply 文件集相交——非空交集即拒绝 apply（fail-closed）提示串行化，--force 解锁。判定勿用 changes.last_active 当心跳（只在 CLI 写操作刷新非周期心跳，直接用会误判活跃性）；活跃性判定=guard 存在且会话非完成态（复用 collectRecentForeignDelivery/collectGuardReservedQuicklogIds 既有活跃扫描口径）。

## D-003@v1 rescue 提示补「落地后立即 git add 锁定」指引
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：§64 护栏①尾项：generateRescueCommands 输出末尾追加一行指引——rescue 指令人工执行后立即 `git add -- <files>` 锁定（staged 对 restore/clean 免疫）。纯文案改动。

## D-004@v1 文件所有权登记表暂不做，记入 ROADMAP
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：不做。裸 git 拦不住（git 无 hook 可拦截 restore/checkout 工作区写入），单独做收益不抵复杂度；D-001+D-002 把 sillyspec 面最大杀伤面（apply）管住+窗口秒级化后，裸 git 破坏面只剩理论值。复潮条件：D-001/D-002 落地后仍复现 apply 冲掉或裸 git 冲掉造成实际损失 ≥2 次。

## D-005@v1 方案 A——manifest 落变更目录（verify-facts 先例）+ doctor 既有检查项
状态：implemented
变更：2026-09-14-apply-conflict-hardening
锚点：未记录
最近确认：23dc755
理由：用户选 A（2026-09-14 对话轮，确认 manifest 体量后拍板）：apply-manifest.json 落变更目录（verify-facts.json「CLI 全权写审计底稿」同款先例，随归档留存可审计）；漂移检测走 doctor 既有检查项形态（decision-touch-cli-drift D-001/D-002 先例：不加新命令/新步骤/新占位符）。体量依据：每文件≈150B（路径+sha256+JSON 结构），典型 apply 10-40 文件=3-6KB，极端 50 文件<8KB。拒绝 B（.runtime 随清理丢历史，检测时点优势不抵）；拒绝 C（丢 §64 护栏①后半「apply 后丢失/篡改可检测」价值）。
