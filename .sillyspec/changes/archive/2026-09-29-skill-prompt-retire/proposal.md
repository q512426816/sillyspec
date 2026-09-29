---
author: flow-machine-draft
created_at: 2026-09-29T07:35:25.178Z
---
# 提案书（Proposal）— 2026-09-29-skill-prompt-retire

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:be9d406bac93894534852af88537c201928495fb19501fce27bf1dc05339fd36:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-skill-prompt-retire 留痕重锚 -->
任务原话转写：动机：.claude/skills/ 与提示词面存在过时项：①sillyspec-quick skill 引导新工作走已退役的 quick 通道（v3.30.0 退役，仅剩在途收尾）；②sillyspec-export skill 指向已不存在的 export 命令；③sillyspec-resume skill 教的是退役前时代恢复协议（progress show/next），对 thin 变更不提 flow start 恢复简报——恢复口径已由 flow skill 与 AGENTS.md 承担、查看态由 state skill 承担；④src/hooks/worktree-guard.js 的 '(none)' 拦截菜单把 BUG 修复指去退役 quick 且缺默认快道 flow start（真·过时提示词）；⑤docs/prompt/README.md 总览表 quick 行未标退役。全仓零代码引用被删 skill（grep 核验）。

成功标准：
- 删除 .claude/skills/sillyspec-quick、sillyspec-export、sillyspec-resume 三个目录；其余 skill 零改动
- worktree-guard STAGE_HINTS['(none)'] 菜单：quick 行改为 flow start 轻量道（bug 修复/小改动的默认快道），brainstorm/auto 行保留
- docs/prompt/README.md 总览表 quick 行补「（通道已退役——仅存量收尾）」标注
- 既有测试全绿（worktree-guard 相关用例如断言旧文案则按新口径适配）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:2942027e101e69b72bb36af894a564fd3db64a9d421afecb4c7c7eddb4b753f3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-skill-prompt-retire 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. 删除 .claude/skills/sillyspec-quick、sillyspec-export、sillyspec-resume 三个目录
2. 其余 skill 零改动
3. worktree-guard STAGE_HINTS['(none)'] 菜单：quick 行改为 flow start 轻量道（bug 修复/小改动的默认快道），brainstorm/auto 行保留
4. docs/prompt/README.md 总览表 quick 行补「（通道已退役——仅存量收尾）」标注
5. 既有测试全绿（worktree-guard 相关用例如断言旧文案则按新口径适配）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:a56279845d997031e8f174ff3b9ba93d0e14568954633f9dcc6688eb8fda0ec0:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-skill-prompt-retire 留痕重锚 -->
1. 删除 .claude/skills/sillyspec-quick、sillyspec-export、sillyspec-resume 三个目录
2. 其余 skill 零改动
3. worktree-guard STAGE_HINTS['(none)'] 菜单：quick 行改为 flow start 轻量道（bug 修复/小改动的默认快道），brainstorm/auto 行保留
4. docs/prompt/README.md 总览表 quick 行补「（通道已退役——仅存量收尾）」标注
5. 既有测试全绿（worktree-guard 相关用例如断言旧文案则按新口径适配）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
