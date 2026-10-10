---
author: flow-machine-draft
created_at: 2026-10-10T11:54:36.660Z
---
# 决策记录（Decisions）— 2026-10-10-cross-wt-repo-local-placement

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：R-01 跨仓仓的 .git 目录只读/异常导致 exclude 写失败（warn 降级，worktree 成 untracked 噪音——apply 清单校验兜底，不阻断）；R-02 仓内 .sillyspec 目录会被用户的 IDE 全局搜索/索引扫到重复内容（主仓同形态用户已习惯，execute 期临时存在、cleanup 即删）；R-03 候选寻址的探测顺序依赖注册表权威性——注册表条目指向已亡目录而旧公式处恰有他者残留 meta 时会误命中（注册表写读同链路维护，残留面与 sweep 治理重合）。 试过但放弃的方案：自动兄弟目录（<path> 旁猜一个 sillyspec-worktrees）——向用户仓外未知位置写目录侵入性大且名字无约定，仓内受控命名空间（.sillyspec/）语义更干净；删除旧公式兜底（注册表已够）——存量 worktree（升级前的变更收口中断态）会失联，兼容成本为零则不做断崖。
