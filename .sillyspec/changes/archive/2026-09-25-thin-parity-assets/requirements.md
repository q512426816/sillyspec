---
author: flow-machine-draft
created_at: 2026-09-24T17:50:32.021Z
---
# 需求规格（Requirements）— 2026-09-25-thin-parity-assets

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:e826caad509176f4ee0dc63cae88f4797da3e4e2027a085dd7e11d2873b149f7:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-parity-assets 留痕重锚 -->
### FR-01: flow done patch 子步后打模块文档对账：交付文件命中模块图模块→列
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow done patch 子步后打模块文档对账：交付文件命中模块图模块→列出模块与文档路径，模块代码变更而文档未动给强提示（advisory）

### FR-02: 归档前机器合成 verify-result.md 落变更目录（结论/实测面/评审
Given flow 薄跑道在跑
When flow done 裁决执行
Then 归档前机器合成 verify-result.md 落变更目录（结论/实测面/评审/绑定/冻结 sha/基线区间），随归档留档

### FR-03: distill 收割 design 槽4 实质作答合成 decisions.md
Given flow 薄跑道在跑
When flow done 裁决执行
Then distill 收割 design 槽4 实质作答合成 decisions.md（已有 decisions 不覆盖），随既有蒸馏链进 knowledge

### FR-04: 评审失败路径（缺件/无效/FAIL）先落遥测再 exit；review 子步续跑
Given flow 薄跑道在跑
When flow done 裁决执行
Then 评审失败路径（缺件/无效/FAIL）先落遥测再 exit；review 子步续跑 skip 时回填评审结论

### FR-05: 新增测试四件；flow 系全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then 新增测试四件；flow 系全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ①（命中/未更新/已同步/前缀/无图五态）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ② + test/flow-protocol.test.mjs ⑮（归档回执断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ③（收割/不适用/不覆盖三态）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑯（FAIL 遥测断言）+ ⑮（末条 PASS 断言）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + flow-parity + stage-burst 46 例
