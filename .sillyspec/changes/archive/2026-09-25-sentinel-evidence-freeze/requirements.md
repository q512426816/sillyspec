---
author: flow-machine-draft
created_at: 2026-09-25T10:35:38.655Z
---
# 需求规格（Requirements）— 2026-09-25-sentinel-evidence-freeze

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 哨兵证据扩展+冻结面归属修复
Given 平台狗粮五负面逐条收口
When ②证据面扩全消息 ⑤冻结面修复三件
Then 全部负面有解无遗留
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: 哨兵证据从 %s（仅 subject）扩展到 %B（完整提交消息）——commit body 里的 task-NN 也算证据
FR-02: 简报勾选纪律同步说清楚证据位置
FR-03: 冻结面修复：baseline..HEAD 已提交面不再过 foreign 声明切分（我提交的就是我的）
FR-04: dirty 面保持切分不变
FR-05: 被排除的 dirty 文件打警告（不再静默）
FR-06: flow done 加 --refreeze flag：重置 patch 子步标记，下次 done 重新冻结
FR-07: 测试：哨兵 %B 证据 / 已提交面不被 foreign 抢 / --refreeze 重冻结
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 sentinel %B 场景隐式覆盖+patch 子步行为回归）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 sentinel %B 场景隐式覆盖+patch 子步行为回归）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 sentinel %B 场景隐式覆盖+patch 子步行为回归）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 sentinel %B 场景隐式覆盖+patch 子步行为回归）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 sentinel %B 场景隐式覆盖+patch 子步行为回归）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 sentinel %B 场景隐式覆盖+patch 子步行为回归）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-*.test.mjs 67 例全套（含 sentinel %B 场景隐式覆盖+patch 子步行为回归）
