---
author: flow-machine-draft
created_at: 2026-09-25T04:54:34.560Z
---
# 提案书（Proposal）— 2026-09-25-thin-freeze-git-hygiene

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:0bead5a4a7346611108ed4d9f6d492eb3685577bda6f75b5a9cef7a71600dc38:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-freeze-git-hygiene 留痕重锚 -->
任务原话转写：动机：冻结面与 git 历史解耦——多轮修改的中间提交不该被迫留存，用户可能只要一个最终干净提交；全程零提交也该能完整冻结。原则：patch 冻结件=审计真相（sha 锚定不可变），git 历史=展示层可自由重写。
成功标准：
- flow done 新增 --freeze-dirty：显式声明非他侧声明的 dirty 交付文件全归本变更并入冻结面（独占 worktree 自动路径的手动版）
- 共享主仓 dirty 警告文案改为三选一指引（commit 后重跑 / --freeze-dirty / 专属 worktree）；简报同步软化为冻结面规则说明
- 归档完成时打印 git 整理指引：head 不等于 baseline 时提示 reset --soft 压扁为单提交，注明审计真相在冻结件不依赖历史形态
- 新增/更新测试覆盖 flag 入冻与指引输出；flow 系全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:703968d5162ed58ec78e87282b26973232b6ae0f1d18e36799ce6f93d462d00a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-freeze-git-hygiene 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. flow done 新增 --freeze-dirty：显式声明非他侧声明的 dirty 交付文件全归本变更并入冻结面（独占 worktree 自动路径的手动版）
2. 共享主仓 dirty 警告文案改为三选一指引（commit 后重跑 / --freeze-dirty / 专属 worktree）；简报同步软化为冻结面规则说明
3. 归档完成时打印 git 整理指引：head 不等于 baseline 时提示 reset --soft 压扁为单提交，注明审计真相在冻结件不依赖历史形态
4. 新增/更新测试覆盖 flag 入冻与指引输出；flow 系全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:bd49f3a0f0727385ee2aef4cdc8b737520e1ac4241106c10e95752bdc2f46088:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-freeze-git-hygiene 留痕重锚 -->
1. flow done 新增 --freeze-dirty：显式声明非他侧声明的 dirty 交付文件全归本变更并入冻结面（独占 worktree 自动路径的手动版）
2. 共享主仓 dirty 警告文案改为三选一指引（commit 后重跑 / --freeze-dirty / 专属 worktree）；简报同步软化为冻结面规则说明
3. 归档完成时打印 git 整理指引：head 不等于 baseline 时提示 reset --soft 压扁为单提交，注明审计真相在冻结件不依赖历史形态
4. 新增/更新测试覆盖 flag 入冻与指引输出；flow 系全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
