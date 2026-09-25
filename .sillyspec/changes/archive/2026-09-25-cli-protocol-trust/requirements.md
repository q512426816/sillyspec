---
author: flow-machine-draft
created_at: 2026-09-25T15:24:49.577Z
---
# 需求规格（Requirements）— 2026-09-25-cli-protocol-trust

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 双死路 flag 登记
Given CLI 报错指引指向未登记 flag（--same-session 消费于 runStage 逃生口、--force 消费于 quick cancel）
When 两 flag 登记 knownFlags
Then 照报错指引重跑可执行不再 exit 2

### FR-02: flag 一致性钉
Given flag 消费/声明漂移类缺陷反复发生（历史三次自修+本次两实例）
When test/flag-contract 静态扫描三种消费形态 vs 白名单
Then 任何被消费未声明的 flag 测试红（整类灭绝钉）

### FR-03: 摘录续行合并与渲染放宽
Given 括号换行的单条标准被行级切分拆成碎片、tasks 行 60 字硬切半词
When extractSuccessCriteria 前置续行合并 + clipTaskText 句界感知截断 + 碎片特征警告
When 括号未闭合条目并回成单条、截断带句读+省略号、碎片警告不阻断

### FR-04: verify 批量对齐前补亲测
Given 批量乐观对齐跳过 noAI 亲测步致 PASS 封顶拒四步绕行
When 对齐面含 verifyRunQualityScan 步先跑 executeVerifyQualityScan（幂等，失败弃批量）
Then 批量不省任何门承诺恢复；亲测失败保持单步推进无新死路

### FR-05: 归档链 knowledge 侧窄化 add
Given distill 产物（fr 域/decisions/INDEX）untracked 漏提交
When archiveNarrowedGitAdd 按 status 窄化逐文件 add knowledge 面
Then 归档链暂存面覆盖蒸馏产物（fail-soft）



## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/flag-contract.test.mjs 用例②（双实例在案断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/flag-contract.test.mjs 用例①（消费⊆声明+消费面非平凡自检）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/draft-continuation.test.mjs 用例①①b②②b（合并/豁免/截断/短条目）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/run-complete-noai-done-gate.test.mjs 零回归（noAI 硬门原语义不变——批量前置亲测走同函数同语义，行为等价单步路径）；时序变化由 R17 复验覆盖

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/archive-cli-git-add.test.mjs + test/archive-chain.test.mjs 零回归（既有窄化 add 语义不变，knowledge 面为纯增量 fail-soft）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~05
<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~05
<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~05
<!--AGENT:测试绑定FR-09 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~05
<!--AGENT:测试绑定FR-10 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段，验收面并入 FR-01~05
