---
author: flow-machine-draft
created_at: 2026-09-25T06:04:14.256Z
---
# 需求规格（Requirements）— 2026-09-25-fr-compound-split

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 合取标准拆分为独立 FR
Given 成功标准条目内含「A/B」或「A；B」的合取标准
When extractSuccessCriteria 收集节内条目
Then 合取标准拆为独立条目（分号恒拆；斜杠仅在非路径形态拆）

### FR-02: 路径形态不拆
Given 条目含扩展名点或多处斜杠（src/flow.js、backend/app/x.py 形态）
When 复合拆分判定
Then 条目完整保留不被斜杠误劈

### FR-03: 拆后条目进入参考摘录
Given 成功标准为「后端端点可访问/鉴权生效」与「前端正常渲染」
When flow start 起草 requirements
Then 参考摘录呈现 FR-01 后端端点可访问、FR-02 鉴权生效、FR-03 前端正常渲染三行
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: extractSuccessCriteria 增复合拆分：条目按分号恒拆、按斜杠仅在非路径形态拆（无扩展名点且不超一处斜杠）
FR-02: 参考摘录呈现拆后条目（FR-01 A、FR-02 B、FR-03 C 形态）
FR-03: 新增测试覆盖拆/不拆路径/分号三态；flow 系全绿
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-compound-split.test.mjs ①（斜杠/分号拆分断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-compound-split.test.mjs ②（src/flow.js 与多目录路径不拆断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-compound-split.test.mjs ③（参考摘录 FR-01/02/03 形态断言）
