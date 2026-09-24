---
author: flow-machine-draft
created_at: 2026-09-24T16:32:39.753Z
---
# 需求规格（Requirements）— 2026-09-25-thin-patch-scope-fix

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:b27ba063f97e05bd359690510960b32f9aae04c8779d76bd3b23085ec2c126e1:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-patch-scope-fix 留痕重锚 -->
### FR-01: patch 面改为：baseline..HEAD 提交面（.sillyspec/
Given flow 薄跑道在跑
When flow done 裁决执行
Then patch 面改为：baseline..HEAD 提交面（.sillyspec/ 下仅保留本变更目录）∪ 本变更目录全部工作树件（排除 change.patch/change-patch.json 自引用）；提交面仍过他侧声明切分

### FR-02: flow done 完成语案的「六子步」硬文案改为按 SUBSTEPS.leng
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow done 完成语案的「六子步」硬文案改为按 SUBSTEPS.length 动态（现在是七子步）

### FR-03: 测试断言 patch 面零泄漏（非本变更目录的 .sillyspec 文件不得入
Given flow 薄跑道在跑
When flow done 裁决执行
Then 测试断言 patch 面零泄漏（非本变更目录的 .sillyspec 文件不得入 patch）；flow 系测试全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑥b 用例（change-patch.json files 零泄漏断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs（① 末步完成输出面）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-draft.test.mjs + test/flow-protocol.test.mjs + test/flow-route.test.mjs 全套
