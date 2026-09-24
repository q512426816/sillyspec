---
author: flow-machine-draft
created_at: 2026-09-24T16:12:07.182Z
---
# 提案书（Proposal）— 2026-09-25-thin-dogfood-fixes

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:7fd7006455158e7c3f9c13ce56d053278adbb3126d8073283a9012cf745006bf:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-dogfood-fixes 留痕重锚 -->
任务原话转写：动机：2026-09-24 薄流程狗粮（thin-design-record 变更）实测暴露三问题收尾——在途变更拿不到工具升级后的新工件（draft 谱系是 flow start 时点快照）；baseline..HEAD 不分作者，并行会话提交会混入本变更测试范围与 FR 域路由；门实测面黑盒，agent 无从核对自己的测试有没有被扫到。
成功标准：
- flow start 重入时幂等补生成缺失机器稿：缺哪补哪、已存在不碰、ledger 合并不改既有段；criteria 来源优先从既有 proposal 成功标准机器段回提（input 缺省不退化）
- flow done 的 ledger 门与 distill 的 deliverableFiles 都经并行会话归属切分（复用 splitOwnVsForeignDiffFiles）：他侧声明文件剔除并打印一行提示，FR 域路由不再吃进他侧文件
- flow done ledger 子步收尾输出实测面对账行（test/lint 命令、时长、结果文件路径）
- 新增测试覆盖补生成回提与实测面输出，flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:df06df814a4b36195c80a7e7b1b9045a42a2bb8f2a39bfb2b54c2694c581f109:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-dogfood-fixes 留痕重锚 -->
按成功标准机械推导，共 4 条验收面：
1. flow start 重入时幂等补生成缺失机器稿：缺哪补哪、已存在不碰、ledger 合并不改既有段；criteria 来源优先从既有 proposal 成功标准机器段回提（input 缺省不退化）
2. flow done 的 ledger 门与 distill 的 deliverableFiles 都经并行会话归属切分（复用 splitOwnVsForeignDiffFiles）：他侧声明文件剔除并打印一行提示，FR 域路由不再吃进他侧文件
3. flow done ledger 子步收尾输出实测面对账行（test/lint 命令、时长、结果文件路径）
4. 新增测试覆盖补生成回提与实测面输出，flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:b8ab3446e1a3ccea3217327ec53c0ed995186346afdbdb67dbf64842400599dd:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-dogfood-fixes 留痕重锚 -->
1. flow start 重入时幂等补生成缺失机器稿：缺哪补哪、已存在不碰、ledger 合并不改既有段；criteria 来源优先从既有 proposal 成功标准机器段回提（input 缺省不退化）
2. flow done 的 ledger 门与 distill 的 deliverableFiles 都经并行会话归属切分（复用 splitOwnVsForeignDiffFiles）：他侧声明文件剔除并打印一行提示，FR 域路由不再吃进他侧文件
3. flow done ledger 子步收尾输出实测面对账行（test/lint 命令、时长、结果文件路径）
4. 新增测试覆盖补生成回提与实测面输出，flow 系测试全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
