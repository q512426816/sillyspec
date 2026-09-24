---
author: flow-machine-draft
created_at: 2026-09-24T16:12:07.183Z
---
# 需求规格（Requirements）— 2026-09-25-thin-dogfood-fixes

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:054097ec4a38c6d313317d449d973b2b7f9de67558c83b0af7c6bcdfcdea637d:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-dogfood-fixes 留痕重锚 -->
### FR-01: flow start 重入时幂等补生成缺失机器稿：缺哪补哪、已存在不碰、ledg
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow start 重入时幂等补生成缺失机器稿：缺哪补哪、已存在不碰、ledger 合并不改既有段；criteria 来源优先从既有 proposal 成功标准机器段回提（input 缺省不退化）

### FR-02: flow done 的 ledger 门与 distill 的 delivera
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow done 的 ledger 门与 distill 的 deliverableFiles 都经并行会话归属切分（复用 splitOwnVsForeignDiffFiles）：他侧声明文件剔除并打印一行提示，FR 域路由不再吃进他侧文件

### FR-03: flow done ledger 子步收尾输出实测面对账行（test/lint 
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow done ledger 子步收尾输出实测面对账行（test/lint 命令、时长、结果文件路径）

### FR-04: 新增测试覆盖补生成回提与实测面输出，flow 系测试全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then 新增测试覆盖补生成回提与实测面输出，flow 系测试全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->
