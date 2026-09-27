---
author: flow-machine-draft
created_at: 2026-09-27T05:40:53.731Z
---
# 提案书（Proposal）— 2026-09-27-hunk-attribution-gate

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:5b367017fad3139f72994e58aa7a6747026071c4f8aafc9c5bc2a471c4a9d4f6:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-hunk-attribution-gate 留痕重锚 -->
任务原话转写：背景：本会话实证事故——flow.js 被两个会话并发编辑，文件级 pathspec 提交把并行会话 25 行在途代码夹带进冻结面（规则 11 防文件级夹带，防不住同文件异行）；归档评审以「无承诺锚的活代码交付」抓出。用户裁决：不默认挂工作树（合并税过重，仓内 wt 系坑史为证），改为把提交面对账从文件级升到 hunk 级归属门。
成功标准：
- 声明面归集：design 文件变更清单与 requirements 测试绑定路径复用既有解析器合并（parseFileChangeList 与 extractRequirementBindings 同源）
- 提交面 hunk 对账：flow done 时逐文件统计 baseline..HEAD 的 hunk 数，不在声明面的文件列入未归因清单并警告
- 跨变更竞争检测：其他活跃变更的声明面与提交面相交时，列出竞争文件、对方变更名与 hunk 数（同文件无法按行归属，显式暴露）
- 在途残留信号：提交面文件当前工作树仍有未提交 diff 时警告活跃并发 WIP
- 分级配置：local.yaml hunk_gate 三档（warn 默认、error、off），非 git 环境与异常 fail-soft 降级跳过
- 单测覆盖：声明面归集、hunk 对账、竞争检测、残留信号、三档分级、fail-soft 降级
- 不改 worktree 机制与既有「提交面夹带嫌疑 advisory」块（并行会话归属代码，保留原样，本门独立输出）
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:9ca3d8761b0d7abe7aa1930b7f9d6ba6e6546dac83d3e66b74be40faac1cdb15:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-hunk-attribution-gate 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. 声明面归集：design 文件变更清单与 requirements 测试绑定路径复用既有解析器合并（parseFileChangeList 与 extractRequirementBindings 同源）
2. 提交面 hunk 对账：flow done 时逐文件统计 baseline..HEAD 的 hunk 数，不在声明面的文件列入未归因清单并警告
3. 跨变更竞争检测：其他活跃变更的声明面与提交面相交时，列出竞争文件、对方变更名与 hunk 数（同文件无法按行归属，显式暴露）
4. 在途残留信号：提交面文件当前工作树仍有未提交 diff 时警告活跃并发 WIP
5. 分级配置：local.yaml hunk_gate 三档（warn 默认、error、off），非 git 环境与异常 fail-soft 降级跳过
6. 单测覆盖：声明面归集、hunk 对账、竞争检测、残留信号、三档分级、fail-soft 降级
7. 不改 worktree 机制与既有「提交面夹带嫌疑 advisory」块（并行会话归属代码，保留原样，本门独立输出）
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:cb33673ddb591ca93cf587dfec836440d0b0a5ed7bf67e4a0cab24a5e80df896:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-hunk-attribution-gate 留痕重锚 -->
1. 声明面归集：design 文件变更清单与 requirements 测试绑定路径复用既有解析器合并（parseFileChangeList 与 extractRequirementBindings 同源）
2. 提交面 hunk 对账：flow done 时逐文件统计 baseline..HEAD 的 hunk 数，不在声明面的文件列入未归因清单并警告
3. 跨变更竞争检测：其他活跃变更的声明面与提交面相交时，列出竞争文件、对方变更名与 hunk 数（同文件无法按行归属，显式暴露）
4. 在途残留信号：提交面文件当前工作树仍有未提交 diff 时警告活跃并发 WIP
5. 分级配置：local.yaml hunk_gate 三档（warn 默认、error、off），非 git 环境与异常 fail-soft 降级跳过
6. 单测覆盖：声明面归集、hunk 对账、竞争检测、残留信号、三档分级、fail-soft 降级
7. 不改 worktree 机制与既有「提交面夹带嫌疑 advisory」块（并行会话归属代码，保留原样，本门独立输出）
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
