---
author: flow-machine-draft
created_at: 2026-09-26T01:24:45.967Z
---
# 需求规格（Requirements）— 2026-09-26-review-unsupervised-exit

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 豁免凭据三态
Given 无嵌套派发能力环境需要诚实出口
When readReviewUnsupervisedWaiver 读变更目录 review-unsupervised.md
When 含 unsupervised 字样放行/不含拒认（防误放）/缺文件 null

### FR-02: 四消费点接线
Given 评审门四处（doctor-align/review-json 硬门/Stage Review tier 分支/Execute Task Review）
When 豁免凭据在场
When 先于校验放行（warn+遥测 review-unsupervised-escape）；两凭据皆无照旧 fail-closed

### FR-03: 生成侧豁免指引
Given brainstorm Grill/plan/execute QA 三处 tier=independent 指引只教派发
When 插入豁免分支句
When 无派发能力→不产 review.json 不自审表演→写声明文件即豁免（含文件名与 unsupervised 字样要求）



## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/review-unsupervised-exit.test.mjs 用例①（三态）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/review-unsupervised-exit.test.mjs 用例②（四点接线钉+遥测事件名钉）+ 评审相关 35 用例零回归

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/review-unsupervised-exit.test.mjs 用例③（三文件指引钉：文件名+不自审语义）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
