---
author: flow-machine-draft
created_at: 2026-09-24T22:22:30.207Z
---
# 需求规格（Requirements）— 2026-09-25-thin-release-pack

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:6fdeca9abfc247367b460be4c2d8d72a00f8f2e06ce27abb94c197fba740ae6b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-release-pack 留痕重锚 -->
### FR-01: package.json 版本 3.29.6→3.30.0（AGENTS.md 
Given flow 薄跑道在跑
When flow done 裁决执行
Then package.json 版本 3.29.6→3.30.0（AGENTS.md 受管段版本差升级链解锁）

### FR-02: flow start 简报（fresh 与 adopt 两路）钉交付纪律一行：收
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow start 简报（fresh 与 adopt 两路）钉交付纪律一行：收口前交付代码显式 pathspec 提交——冻结件范围=baseline..HEAD 提交面，未提交代码不进审计

### FR-03: verify-result 回执：实测面断点续跑后从 verify-runs 最
Given flow 薄跑道在跑
When flow done 裁决执行
Then verify-result 回执：实测面断点续跑后从 verify-runs 最新 test-result.json 回读；HEAD 字段改名收口时 HEAD，等于基线时注明代码未提交

### FR-04: 测试：回执回填断言（⑮ 扩展）+ 简报纪律行断言；flow 系全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then 测试：回执回填断言（⑮ 扩展）+ 简报纪律行断言；flow 系全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
package.json version 字段（发版面人工核对）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ①（交付纪律行断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑮（回填断言）+ test/flow-parity.test.mjs ②（回执六要素）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + stage-burst 全套 + test:core 176
