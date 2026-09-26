---
author: flow-machine-draft
created_at: 2026-09-26T02:17:39.339Z
---
# 提案书（Proposal）— 2026-09-26-reconcile-source-isolation

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:f5acfec432ee27d725fbdda1876336f243129809878477976b137dab61809315:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-reconcile-source-isolation 留痕重锚 -->
任务原话转写：动机：R18-SF-full 实证 verify target_files 对账死锁——三因叠加：①B1 分支名约定 sillyspec/<change> 对非约定命名分支（实验分支 r18/sf-full）落空致锚定 diff 源缺失；②agent 被逼发明「暂存物化」自救（touch 文件进共享暂存区）随即被主仓并行会话裸提交扫走，4 种面重建 matched=0 死循环；③无死锁诊断指路。调查结论：物化是 agent 自创行为非 CLI 机制，治本=锚定源硬化+诊断先行。
成功标准：
- B1 第三候选：sillyspec/<change> 与审计 tag 均落空时扫 worktrees meta 按 changeName 键匹配取真实 branch 作 diffRef（meta.branch 由 worktree 建立时写入；sources 记 meta-branch 标识）
- 死锁诊断：post-apply 形态 actual 源全空时 parallelAdvanceHint（指明「主仓被并行会话推进」形态+禁暂存物化自救+安全出路：恢复/登记分支锚定或按 AGENTS 规则 18 对账核销），经 notes 带出到对账输出
- 有文件面/有锚定源时不误报（诊断条件限定 post-apply+全空）
- 测试：meta 分支锚定（非约定分支名经 changeName 键命中+diff 面取到前进文件）/死锁诊断两态（全空出 hint 有文件不误报）+ reconcile/residual 相关 61 用例零回归
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:4c8b86d731d1a6f3740af87f4f9f4bd835301298bd905966a005031718e11748:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-reconcile-source-isolation 留痕重锚 -->
按成功标准机械推导，共 8 条验收面：
1. B1 第三候选：sillyspec
2. <change> 与审计 tag 均落空时扫 worktrees meta 按 changeName 键匹配取真实 branch 作 diffRef（meta.branch 由 worktree 建立时写入
3. sources 记 meta-branch 标识）
4. 死锁诊断：post-apply 形态 actual 源全空时 parallelAdvanceHint（指明「主仓被并行会话推进」形态+禁暂存物化自救+安全出路：恢复
5. 登记分支锚定或按 AGENTS 规则 18 对账核销），经 notes 带出到对账输出
6. 有文件面
7. 有锚定源时不误报（诊断条件限定 post-apply+全空）
8. 测试：meta 分支锚定（非约定分支名经 changeName 键命中+diff 面取到前进文件）/死锁诊断两态（全空出 hint 有文件不误报）+ reconcile/residual 相关 61 用例零回归
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:afa2814f9bc3f6dec06064c7945e83a2f8cfa8fa02cb684176f11cb26794975a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-reconcile-source-isolation 留痕重锚 -->
1. B1 第三候选：sillyspec
2. <change> 与审计 tag 均落空时扫 worktrees meta 按 changeName 键匹配取真实 branch 作 diffRef（meta.branch 由 worktree 建立时写入
3. sources 记 meta-branch 标识）
4. 死锁诊断：post-apply 形态 actual 源全空时 parallelAdvanceHint（指明「主仓被并行会话推进」形态+禁暂存物化自救+安全出路：恢复
5. 登记分支锚定或按 AGENTS 规则 18 对账核销），经 notes 带出到对账输出
6. 有文件面
7. 有锚定源时不误报（诊断条件限定 post-apply+全空）
8. 测试：meta 分支锚定（非约定分支名经 changeName 键命中+diff 面取到前进文件）/死锁诊断两态（全空出 hint 有文件不误报）+ reconcile/residual 相关 61 用例零回归
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
