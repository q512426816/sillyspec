---
author: flow-machine-draft
created_at: 2026-09-26T01:13:44.373Z
---
# 需求规格（Requirements）— 2026-09-26-verify-gate-restrictfiles

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: verify 门 restrictFiles 接线
Given verify 测试对账门未传 restrictFiles（quick 门传了），变更全提交后同形下 0 命中可能假 skip
When 门调用传入 resolveVerifyChangedFiles（includeWorkingTree，同 lint scope 口径）且空清单不传
When 解析异常 fail-open 走全量硬门

### FR-02: verify 渲染长会话税提示
Given R18 实证 verify 段轮均上下文为 brainstorm 段 3-4 倍（长会话税）
When verify 步骤说明书首部渲染提示
Then 跨阶段会话得到「新开会话跑 verify 续跑」建议（上下文重置降轮均）



## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/verify-gate-restrictfiles.test.mjs 用例①（接线钉+空清单不传钉+同源口径钉）+ gates 相关 25 用例零回归

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/verify-gate-restrictfiles.test.mjs 用例②（提示文本钉）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01/02
<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01/02
<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01/02
