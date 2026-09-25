---
author: flow-machine-draft
created_at: 2026-09-25T01:11:36.723Z
---
# 需求规格（Requirements）— 2026-09-25-thin-fr-quality

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:6a9efd6091537f58f0dc231f936b1f98c51183db010c241f9f290dbdce677ed2:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-quality 留痕重锚 -->
### FR-01: extractSuccessCriteria 增编号条目通道：正文存在三条以上编
Given flow 轻量跑道在跑
When flow done 裁决执行
Then extractSuccessCriteria 增编号条目通道：正文存在三条以上编号行为条目且多于成功标准节条目时取而代之（去重）；adopt/proposal 回提路径关闭该通道维持原语义

### FR-02: draftRequirements 的 GWT 模板字面换为需求语义（Given
Given flow 轻量跑道在跑
When flow done 裁决执行
Then draftRequirements 的 GWT 模板字面换为需求语义（Given 平台按当前契约运行/When 本变更交付并运行/Then 条目），例外槽提示改写走 flow amend-draft 留痕通道；flow start 简报加 FR 候选改写指引

### FR-03: reconcileModuleDocs 增未覆盖目录检测：交付目录不在任何模块 
Given flow 轻量跑道在跑
When flow done 裁决执行
Then reconcileModuleDocs 增未覆盖目录检测：交付目录不在任何模块 paths 下时点名提示『FR 将落伪域，建议登记模块卡』（advisory）

### FR-04: 新增测试三件；flow 系全绿
Given flow 轻量跑道在跑
When flow done 裁决执行
Then 新增测试三件；flow 系全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs ⑬（取代/关闭/不足/标题与字面四态断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs ⑬（新 GWT 字面 + 口号清零断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ①（other 单文件 + observation 双文件地图提示断言）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + stage-burst 54 例 + test:core 176 例
