---
author: flow-machine-draft
created_at: 2026-09-24T18:12:42.772Z
---
# 需求规格（Requirements）— 2026-09-25-thin-platform-args

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:b267cd0a57258d269031fcaad6e939742ce402616d4ec4fb1a99ebaafbeec8a3:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-platform-args 留痕重锚 -->
### FR-01: cmdFlow 的 specBase 改经 resolvePlatformSpe
Given flow 薄跑道在跑
When flow done 裁决执行
Then cmdFlow 的 specBase 改经 resolvePlatformSpecDir（显式 --spec-dir/--spec-root > 平台指针 > 本地），指针失效 fail-closed 报错不静默回退；--runtime-root 透传 resolveRuntimeRoot

### FR-02: cmdFlowStart/Done 的 ProgressManager 全部以 
Given flow 薄跑道在跑
When flow done 裁决执行
Then cmdFlowStart/Done 的 ProgressManager 全部以 specDir=specBase 构造（DB 行、change 目录、归档链与工件同根，ENOENT 消失）；平台 writer 预建的空变更目录放行为全新 start（非空且无头脑风暴产物仍拒）

### FR-03: flow start/done/amend-draft 变更名白名单校验（拒穿越
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow start/done/amend-draft 变更名白名单校验（拒穿越/default/quick-hex/分隔符，exit 2 给合法格式）

### FR-04: 清晰度门两选一文案补过门格式样例（独立节头行+列表行）
Given flow 薄跑道在跑
When flow done 裁决执行
Then 清晰度门两选一文案补过门格式样例（独立节头行+列表行）

### FR-05: 新增测试：外置 spec 根全链（start→done 归档落外置根、本地零残留
Given flow 薄跑道在跑
When flow done 裁决执行
Then 新增测试：外置 spec 根全链（start→done 归档落外置根、本地零残留）、空目录预建放行、名称校验四态、指针恢复；flow 系全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑱（外置根 start/done/本地零残留/.runtime 库断言）+ ㉑（指针恢复）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑲（空目录放行/非空拒收两态）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑳（穿越/分隔符/default/quick-hex/中文合法五态）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ㉑（独立节头行+列表行样例断言）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + stage-burst 50 例 + test:core 176 例
