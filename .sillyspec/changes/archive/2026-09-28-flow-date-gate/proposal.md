---
author: flow-machine-draft
created_at: 2026-09-28T06:51:06.973Z
---
# 提案书（Proposal）— 2026-09-28-flow-date-gate

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:08768614e5d48c7356057b3aecd92351073ed14a34ff88d8790faa2d3875f864:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-flow-date-gate 留痕重锚 -->
任务原话转写：轻量变更（flow start）此前未设变更名日期前缀门禁：--change roadmap-copy-purge 类无日期前缀名被照单物化并入档，破坏归档字典序时间线与 brainstorm step6 既定规则（YYYY-MM-DD-<简短描述>，厚流程已在 run --change / change-rename 两处 CLI 边界强制）。本变更把同款门禁补到 flow 族：flow start 净新建（活跃/归档目录均无该名）时 assertDatedChangeName 拒收并给教学文案；恢复/收编路径不追诉；默认自动名对齐日期前缀形态。
成功标准：
- flow start --change friction-signal-hint（净新建、无日期前缀）exit 2 且报错含 YYYY-MM-DD-<简短描述> 教学文案与重试提示
- flow start --change 2026-09-28-xxx（合规名）照常创建轻量变更
- 已存在目录（恢复/brainstorm 收编/归档名）时同名 start 不被日期门拦截（存量不追诉）
- 无 --change 时默认自动名符合 DATED_CHANGE_NAME_RE（YYYY-MM-DD-flow-<hex> 形态）
- 既有 flow 族测试全部适配通过（test+lint 双绿）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:c146b72181b3ae7789696ceafe603aaa73f3ffcbbd12ad80010980a5ceaf38a6:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-flow-date-gate 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. flow start --change friction-signal-hint（净新建、无日期前缀）exit 2 且报错含 YYYY-MM-DD-<简短描述> 教学文案与重试提示
2. flow start --change 2026-09-28-xxx（合规名）照常创建轻量变更
3. 已存在目录（恢复/brainstorm 收编/归档名）时同名 start 不被日期门拦截（存量不追诉）
4. 无 --change 时默认自动名符合 DATED_CHANGE_NAME_RE（YYYY-MM-DD-flow-<hex> 形态）
5. 既有 flow 族测试全部适配通过（test+lint 双绿）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:85d627ad13cd7f3a0f08c601fcb74f6ecafcdf8c7776aa1fbeafdfb97d4cee78:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-28-flow-date-gate 留痕重锚 -->
1. flow start --change friction-signal-hint（净新建、无日期前缀）exit 2 且报错含 YYYY-MM-DD-<简短描述> 教学文案与重试提示
2. flow start --change 2026-09-28-xxx（合规名）照常创建轻量变更
3. 已存在目录（恢复/brainstorm 收编/归档名）时同名 start 不被日期门拦截（存量不追诉）
4. 无 --change 时默认自动名符合 DATED_CHANGE_NAME_RE（YYYY-MM-DD-flow-<hex> 形态）
5. 既有 flow 族测试全部适配通过（test+lint 双绿）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
