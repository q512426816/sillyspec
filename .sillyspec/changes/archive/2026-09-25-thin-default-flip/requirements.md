---
author: flow-machine-draft
created_at: 2026-09-24T16:51:56.064Z
---
# 需求规格（Requirements）— 2026-09-25-thin-default-flip

## 功能需求（成功标准机械摘录）
<!-- MACHINE-DRAFT:requirements-frs:5e0b30314a54dd873299c32bed91dc3e498a68dcad7b792f8f65e8d95984f56f:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-default-flip 留痕重锚 -->
### FR-01: readFlowConfig 缺省 thin；legacy 拒跑文案与 conf
Given flow 薄跑道在跑
When flow done 裁决执行
Then readFlowConfig 缺省 thin；legacy 拒跑文案与 config-schema flow.mode 描述示例同步翻转；本仓 local.yaml 狗粮开关段移除验证缺省生效

### FR-02: run quick 渲染入口打一行过渡横幅指路 flow start（--don
Given flow 薄跑道在跑
When flow done 裁决执行
Then run quick 渲染入口打一行过渡横幅指路 flow start（--done 收尾不吵），quick 全功能不变

### FR-03: flow start 清晰度门通过后跑 classifyChange 预判：mo
Given flow 薄跑道在跑
When flow done 裁决执行
Then flow start 清晰度门通过后跑 classifyChange 预判：mode=full 时打一行升档建议，advisory 不阻断

### FR-04: agents-instruction 规则 6、9、17 同步：quick 存量
Given flow 薄跑道在跑
When flow done 裁决执行
Then agents-instruction 规则 6、9、17 同步：quick 存量过渡、倒推 B 薄道优先、quicklog 存量标注

### FR-05: 新增测试覆盖缺省 thin 与预判提示；flow 系与 test:core 全绿
Given flow 薄跑道在跑
When flow done 裁决执行
Then 新增测试覆盖缺省 thin 与预判提示；flow 系与 test:core 全绿
<!-- MACHINE-DRAFT:requirements-frs:end -->

<!--AGENT:槽1 需求例外裁决——例外裁决书写面（机器段之外合法） -->

## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/stage-burst.test.mjs ⑩ 用例（空配置→thin/显式 legacy 重钉）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
npm run test:core 全量（quick 系含 quick-laststep-fourfields-preview 等 176 例零破坏）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑭ 用例（预判正负例断言）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
templates/agents-instruction.md 规则 6、9、17（人工核对面）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs + test/stage-burst.test.mjs 37 例全套
