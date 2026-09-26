---
author: flow-machine-draft
created_at: 2026-09-26T06:38:22.139Z
---
# 需求规格（Requirements）— 2026-09-26-tick-loop-nudge

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: status 勾选提醒
Given 起点简报的勾选指令几小时后失效（R19 实证一把勾）
When flow status 在②执行阶段且勾选滞后且区间有提交
When 提醒行在场（边干边勾+勿攒收口）；①阶段或勾齐时不刷

### FR-02: tasks.md 头部纪律行
Given 任务面常驻工件是第二注入通道
When draftTasks 渲染头部含边干边勾纪律+完成判定语义（实现到位+测试跑绿即勾）+pathspec 提交要求

### FR-03: 简报交付纪律补丁
Given R19 发现 tasks.md untracked 直至归档
When 交付纪律行明示 tasks.md 一并 pathspec 提交
When 理由（勾选证据进 git 历史）与 status 提醒的交叉引用在场

### FR-04: 哨兵时点判定
Given 一把勾模式（tasks.md 首次提交==最后提交）或 untracked 形态
When 哨兵 complete 分支（token 证据齐）放行时
When warn 行为提醒各一（不阻断，fail-soft）



## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/tick-loop-nudge.test.mjs 用例①（条件钉：②阶段/滞后/有提交/防噪）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/tick-loop-nudge.test.mjs 用例②（纪律行/完成判定/pathspec 要求钉）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由） -->
test/tick-loop-nudge.test.mjs 用例③（简报行+理由+交叉引用钉）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/tick-loop-nudge.test.mjs 用例④（一把勾/untracked warn+锚定+fail-soft 钉）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~04
<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~04
<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~04
<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~04
