---
author: flow-machine-draft
created_at: 2026-09-26T00:55:08.577Z
---
# 需求规格（Requirements）— 2026-09-26-thin-agent-tasks

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 聚类器回退
Given WORK_UNIT_BUCKETS 域枚举无法穷举开放世界任务形态（用户否决）
When 删除 groupCriteriaToUnits/WORK_UNIT_BUCKETS，draftTasks 恢复逐条标准预填
When 源码零残留（回退钉）

### FR-02: 覆写语义指引
Given 任务面是 agent 的实现计划（机器预填只是零冷启动兜底）
When fresh/adopt 简报与 advisory 三处文案改为「预填草稿可按实际实现路径覆写（保持 task-NN 行形态）」
When tasks.md 头注释声明计划面归 agent

### FR-03: 教训决策落档
Given 本会话第三次犯「枚举开放世界」同款错误
When design 槽4 写成显式决策记录（三次实例+正确模式：开放分类归 agent，机器锚定封闭面）
When distill 蒸馏进 knowledge/decisions（下个会话知识注入可命中）



## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/thin-workunits.test.mjs（改写后）用例①②（聚类器零残留钉+逐条渲染恢复钉）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
test/thin-workunits.test.mjs 用例③④（覆写语义文案钉+头注释钉）+ test/flow-tick-prototype.test.mjs 断言同步（行为正当更新）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」） -->
不适用：决策记录由 distill 蒸馏链落 knowledge（收口后人工核验 decisions 域文件——见收口后验证）

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
