---
author: flow-machine-draft
created_at: 2026-09-26T02:17:39.340Z
---
# 需求规格（Requirements）— 2026-09-26-reconcile-source-isolation

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: B1 meta 分支锚点第三候选
Given 非约定命名分支（如实验分支 r18/sf-full）使 sillyspec/<change> 与审计 tag 均落空
When 扫 worktrees meta 按 changeName 键匹配取 meta.branch（rev-parse 验证 ref 在场）
When diffRef 命中该分支、merge-base diff 源恢复（sources 记 meta-branch 标识）

### FR-02: 死锁诊断
Given post-apply 形态 actual 源全空（典型「主仓被并行会话推进」——提交/暂存被他人裸提交扫走）
When parallelAdvanceHint 在场并经 notes 带出
When 提示含形态说明/明禁暂存物化自救/安全出路（登记分支锚定或按 AGENTS 规则 18 对账核销）

### FR-03: 不误报
Given 有文件面（porcelain 有行）或有锚定源（diff/apply-pathspec）
When 诊断条件不满足
Then 无 hint；既有源与形态 A 零变化（61 用例零回归）



## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/reconcile-source-isolation.test.mjs 用例①（非约定分支经 meta 键命中+diff 面取到前进文件）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/reconcile-source-isolation.test.mjs 用例②场景 a（源全空出 hint 含并行推进/禁物化）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/reconcile-source-isolation.test.mjs 用例②场景 b（有未提交面不误报）+ reconcile/residual 相关 61 用例零回归

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~03
