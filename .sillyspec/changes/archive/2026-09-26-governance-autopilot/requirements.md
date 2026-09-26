---
author: flow-machine-draft
created_at: 2026-09-26T09:20:26.199Z
---
# 需求规格（Requirements）— 2026-09-26-governance-autopilot

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: GWT 骨架预填
Given 成功标准列表
When draftRequirements 调 draftGwtSkeleton 逐条生成 Given/When/Then
When FR 区含完整 GWT 块（非空槽）且头部说明骨架已预填

### FR-02: 自动勾选
Given tasks.md 有未勾条目且区间提交含 task-NN token
When flow done 哨兵检查前解析 token 并代勾
When 有证据但未勾的条目被自动勾选（_autoTicked>0 时 console.log）；已勾的不重复操作

### FR-03: 自动绑定补全
Given 绑定槽为空且 verify-runs 有测试结果
When flow done 绑定校验前读 test-result.json 提取测试文件路径
When 空槽被自动补全（agent 可覆盖）；无测试结果时 fail-soft 放行

### FR-04: 向后兼容
Given 已有 agent 填写的内容（FR/绑定/勾选）
When 三条自动机制运行
Then 已有内容不被覆盖（tick 只代勾未勾的、bind 只填空槽、GWT 只在起草时生成）


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全） -->
test/governance-autopilot.test.mjs 用例①

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全） -->
test/governance-autopilot.test.mjs 用例②（_evidencedTasks/机器代勾/正则钉）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全） -->
test/governance-autopilot.test.mjs 用例③（_testFiles/test-result.json/fail-soft/覆盖语义钉）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全） -->
test/flow-draft.test.mjs ⑩（已有内容不被覆盖）+ flow-protocol.test.mjs 零回归（35 用例）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段
<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名，如 test/foo.test.mjs「用例组」或 test/foo.test.mjs#用例；无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段
