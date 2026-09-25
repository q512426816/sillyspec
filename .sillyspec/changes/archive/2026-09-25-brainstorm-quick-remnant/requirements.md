---
author: flow-machine-draft
created_at: 2026-09-25T04:24:04.252Z
---
# 需求规格（Requirements）— 2026-09-25-brainstorm-quick-remnant

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:10916e037666c9ef69a562c30f70c020b5bed127f5084fceccda7fe9649e2ec9:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-brainstorm-quick-remnant 留痕重锚 -->
### FR-01: complete.js brainstorm small 完成文案改指 flow
Given 平台按当前契约运行
When 本变更交付并运行
Then complete.js brainstorm small 完成文案改指 flow start 收编（不再是 run quick --linked-changes）

### FR-02: stages/brainstorm.js 两处 small 档 quick 指引
Given 平台按当前契约运行
When 本变更交付并运行
Then stages/brainstorm.js 两处 small 档 quick 指引改指轻量变更（步骤 prompt 与规范文件模板各一处）

### FR-03: run/complete.js 的 quick 末步四参数预告文案保留（存量 q
Given 平台按当前契约运行
When 本变更交付并运行
Then run/complete.js 的 quick 末步四参数预告文案保留（存量 quick 会话收尾仍需，不改）

### FR-04: 测试面无行为断言依赖旧文案；flow 系全绿
Given 平台按当前契约运行
When 本变更交付并运行
Then 测试面无行为断言依赖旧文案；flow 系全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决（FR 语义改写不走此槽——直接编辑机器段后跑 flow amend-draft 留痕，槽内容不进 FR 索引）——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 全套（无行为断言依赖旧文案，57 例全绿即证零回归）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
同 FR-01（模板文本无独立测试面）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
src/run/complete.js:971 quick 四参数预告保留（人工核对）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + stage-burst + deps-cwd + sentinel-wiring 57 例 + lint
