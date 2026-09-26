---
author: flow-machine-draft
created_at: 2026-09-26T00:21:43.801Z
---
# 提案书（Proposal）— 2026-09-26-thin-gate-module-source

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:aa43f182f7c9bcdfcdcf068a573602cd9f8500ce514d19345a03a504caf99c20:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-gate-module-source 留痕重锚 -->
任务原话转写：动机：thin 轻量变更协议要求「先提交再 flow done」——收口门跑 test 时 HEAD 已含全部改动，而 module 命中源在无 worktree meta 时回退 git diff HEAD（仅未提交改动）恒为空，导致 0 命中假 skip（2026-09-25-quick-channel-retire 收口实证：72 个门文件在手、test 门 skipped、诊断打印 diff 0 个文件）。quick 会话全部提交后同形；匹配器本身无辜（同清单实测命中 cli-core+run-gates）。
改动面：runVerifyTestCheck（src/verify-postcheck.js）命中源为空数组（含他者声明过滤后为空）且调用方传了 restrictFiles（flow 的 baseline..HEAD 归属面 / quick 的审计∪声明面——与快照 overlay 同源）时，以清单兜底作命中源；仅兜空不替代非空源；git 不可用（源为 null，hitCount=-1）语义不变。strategy 未配置（deps-auto 缺省收窄）分支同款兜底。不触碰并行会话在改文件（change-list/fs-atomic/spec-sync/stages/knowledge）。
成功标准：
- 全部已提交的仓 + test_strategy: module + restrictFiles 含 src 文件 → 命中配置模块并实测子集（status=passed、command=module[...]），不再 0 命中 skip
- 同仓不带 restrictFiles → 维持 0 命中 skip 语义与诊断文案（回归保护）
- 未配置 test_strategy 的仓 + restrictFiles 含测试文件 → deps-auto 子集实测（非 skip）
- 全量 npm test 与 npm run lint 绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:fa0cbd35a52350ea3bc9c64b879e34028c4945029b9c0e110ec33b017dcf97ce:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-gate-module-source 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. 全部已提交的仓 + test_strategy: module + restrictFiles 含 src 文件 → 命中配置模块并实测子集（status=passed、command=module[...]），不再 0 命中 skip
2. 同仓不带 restrictFiles → 维持 0 命中 skip 语义与诊断文案（回归保护）
3. 未配置 test_strategy 的仓 + restrictFiles 含测试文件 → deps-auto 子集实测（非 skip）
4. 全量 npm test 与 npm run lint 绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:3a695a3e31e811644f7acf3b3d988d0adca767a3f6937aa68d79d0e89ee54ec3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-gate-module-source 留痕重锚 -->
1. 全部已提交的仓 + test_strategy: module + restrictFiles 含 src 文件 → 命中配置模块并实测子集（status=passed、command=module[...]），不再 0 命中 skip
2. 同仓不带 restrictFiles → 维持 0 命中 skip 语义与诊断文案（回归保护）
3. 未配置 test_strategy 的仓 + restrictFiles 含测试文件 → deps-auto 子集实测（非 skip）
4. 全量 npm test 与 npm run lint 绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
