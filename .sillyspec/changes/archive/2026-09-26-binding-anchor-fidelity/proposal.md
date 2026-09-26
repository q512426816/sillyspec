---
author: flow-machine-draft
created_at: 2026-09-26T07:53:32.794Z
---
# 提案书（Proposal）— 2026-09-26-binding-anchor-fidelity

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:1f7e1d0451e60ce767dc27af8d8ebe4e42ab855b57eb58f6860af3a75c9d3885:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-binding-anchor-fidelity 留痕重锚 -->
任务原话转写：FR 测试绑定提取两缺陷：①extractRequirementBindings 只认路径 token——绑定槽里「路径「用例」组」的方法级引用被截成文件级（坑 test-trace-extract-truncates-case-suffix），知识面永远到不了方法级；②裸文件名/残缺路径段不做解析，绑定行路径在仓里找不到文件，测试核对麻烦。修提取保真＋全路径解析，下游文件面消费不被锚点后缀破坏。

成功标准：
- 绑定槽路径后紧邻的用例锚（「…」组 / #… / ::… / > …四形态）完整进 test-trace tests 行；「：」后的描述文字不误捕
- 裸文件名或路径段解析为项目相对全路径（存在性优先＋仓内唯一后缀命中；无唯一命中原样保留）
- 消费面（残差实测 resolveTraceResidual / watcher 归属 resolveTestFileOwners / rot 覆盖判定 covHit 与 rotSuspectFlow）按文件路径取值不受锚点后缀破坏
- 绑定槽模板与 flow 收口指引同步收紧书写约定（项目相对全路径＋用例名）
- npm run test:core 与 npm run lint 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:c20171ccdf3f1cca4f445220650e0c0c23bcb54c0ced06695b1c83b7d0479e27:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-binding-anchor-fidelity 留痕重锚 -->
按成功标准机械推导，共 7 条验收面：
1. 绑定槽路径后紧邻的用例锚（「…」组 / #… / ::… / > …四形态）完整进 test-trace tests 行
2. 「：」后的描述文字不误捕
3. 裸文件名或路径段解析为项目相对全路径（存在性优先＋仓内唯一后缀命中
4. 无唯一命中原样保留）
5. 消费面（残差实测 resolveTraceResidual / watcher 归属 resolveTestFileOwners / rot 覆盖判定 covHit 与 rotSuspectFlow）按文件路径取值不受锚点后缀破坏
6. 绑定槽模板与 flow 收口指引同步收紧书写约定（项目相对全路径＋用例名）
7. npm run test:core 与 npm run lint 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:b9b4815a16f65864e0b70167557204d73ae77155c4025257b46bbd410072a649:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-binding-anchor-fidelity 留痕重锚 -->
1. 绑定槽路径后紧邻的用例锚（「…」组 / #… / ::… / > …四形态）完整进 test-trace tests 行
2. 「：」后的描述文字不误捕
3. 裸文件名或路径段解析为项目相对全路径（存在性优先＋仓内唯一后缀命中
4. 无唯一命中原样保留）
5. 消费面（残差实测 resolveTraceResidual / watcher 归属 resolveTestFileOwners / rot 覆盖判定 covHit 与 rotSuspectFlow）按文件路径取值不受锚点后缀破坏
6. 绑定槽模板与 flow 收口指引同步收紧书写约定（项目相对全路径＋用例名）
7. npm run test:core 与 npm run lint 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
