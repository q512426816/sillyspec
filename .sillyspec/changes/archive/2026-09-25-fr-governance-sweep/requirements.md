---
author: flow-machine-draft
created_at: 2026-09-25T12:27:31.614Z
---
# 需求规格（Requirements）— 2026-09-25-fr-governance-sweep

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: flow.mode 缺省 thin 现状声明（承接 FR-runtime-020）
承接: FR-runtime-020
Given local.yaml 无 flow 配置（2026-09-25-thin-default-flip 后实现现状）
When readFlowConfig(specBase)
Then mode === 'thin'（缺省即轻量道）；显式 mode: legacy 回旧道——旧条目 FR-runtime-020（依据 D-010@v2）所述「缺省翻回 legacy」已被推翻，本条承接取代之

### FR-02: patchText null=采集失败改判需评审
Given flow.js patch 子步 fail-soft 失败时 catch 传 patchText=null（有真实交付但 patch 恰好失败）
When classifyReviewNeed 收到 null
Then 不进「无交付 diff（纯治理面变更）」豁免证据，改判 reasons「交付 diff 不可得——豁免证据不成立，需评审」（防线虚焊修复）

### FR-03: 空 patch=真无交付 diff 豁免照旧
Given patchText 为空字符串（真无交付 diff，纯治理面变更）
When classifyReviewNeed 收到空串
Then 豁免证据「无交付 diff（纯治理面变更）」照旧成立——两种 null 来源（null/空）分径互不干扰

### FR-04: resume 声明通道落盘
Given --review/--no-review 对在途变更（resume 重入 start）静默失效（只打恢复简报即 return，不落 review_force）
When resume 时带声明 flag
Then writeFlowState 落盘 review_force 并打印回执——与新变更（fresh）/adopt 两路口径一致；未带 flag（null）不覆盖既有声明

### FR-05: status 归档检测精确匹配
Given 归档目录名恒等 change 名（archiveDestDirName 恒等返回）
When flow status 检测变更是否已归档
Then readdirSync 比对用全等（e === change）——查询 flow-check 不再误命中 flow-checkpoints

### FR-06: flow-review 头注释如实陈述豁免优先序
Given 头注释宣称「承诺词一票升级，任何信号压不住」与实现矛盾（--no-review 声明通道先判直接豁免）
When 读者依头注释理解定档优先序
Then 注释补「唯⑤声明通道 --no-review 显式豁免除外；实现即此优先序」——注释与实现一致

### FR-07: 测试覆盖
Given 本变更四个行为面（分径×2/resume 声明/精确匹配）
When 跑 test/fr-governance-sweep.test.mjs（4 用例：null 需评审+空豁免分径、resume --review e2e 落盘断言、精确匹配钉、头注释钉）
Then 4/4 绿；flow-review 既有 3 用例与 flow 族套件零回归


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs 用例④（flow.mode=legacy 拒跑）+ 缺省 thin 可跑（用例⑭）——现状行为既有覆盖；承接翻链由 flow done distill 实际执行验证（收口后 knowledge/fr/runtime.md 的 FR-runtime-020 应 superseded_by 新条目）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-sweep.test.mjs 用例①（null → required + reasons 含「不可得」+ 不进豁免证据）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-sweep.test.mjs 用例①（空串 → 豁免证据「纯治理面」照旧）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-sweep.test.mjs 用例②（resume --review e2e：flow-state.yaml 断言 review_force: true + 回执打印）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-sweep.test.mjs 用例③（精确匹配文本钉 + 无子串形态钉）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-sweep.test.mjs 用例④（头注释优先序钉）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-sweep.test.mjs 4/4 绿 + test/flow-review.test.mjs 既有 3 用例零回归

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：FR-08 为机器摘录拆行残段（原输入第 6 条标准被换行截断），语义已并入 FR-07，无独立验收面
