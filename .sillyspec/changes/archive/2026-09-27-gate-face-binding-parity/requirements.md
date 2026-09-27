---
author: flow-machine-draft
created_at: 2026-09-27T00:19:43.381Z
---
# 需求规格（Requirements）— 2026-09-27-gate-face-binding-parity

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: runVerifyTestCheck 接受 faceOverride：在场时跳过快照内二次推导（含收
Given 测试 相关模块就绪
When runVerifyTestCheck 接受 faceOverride：在场时跳过快照内二次推导（含收窄），直接用调用方权威面算动态子集——commit-then
Then 行为符合本条标准描述

### FR-02: quick-audit 透传 faceOverride，flow done ledger 门接线（c
Given 系统就绪
When quick-audit 透传 faceOverride，flow done ledger 门接线（changedFiles 即权威面）
Then 行为符合本条标准描述

### FR-03: full 流程 brainstorm --done 对有 FR 块而无绑定面的 requiremen
Given 系统就绪
When full 流程 brainstorm --done 对有 FR 块而无绑定面的 requirements 追加绑定槽（复用 thin 追加逻辑单源）
Then 行为符合本条标准描述

### FR-04: verify 侧既有 auto-bind 因槽在场而闭环，R23-full 形态（trace 0 行
Given 系统就绪
When verify 侧既有 auto-bind 因槽在场而闭环，R23-full 形态（trace 0 行）不再复现
Then 行为符合本条标准描述

### FR-05: renderExample 的 test_strategy 行注释化（主仓与实验快照一致）
Given 系统就绪
When renderExample 的 test_strategy 行注释化（主仓与实验快照一致）
Then 行为符合本条标准描述

### FR-06: 全仓测试绿
Given 测试 相关模块就绪
When 全仓测试绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/gate-face-binding-parity.test.mjs「① faceOverride commit-then-done」（盲区旧态 dynamic-empty 复现 + override 后动态子集真跑已提交交付）+「① 空/缺省零行为变化」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/gate-face-binding-parity.test.mjs 同上（quick-audit 透传使 flow done 收口吃到权威面——本次收口实录「文件面=调用方权威面 17 个」）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/gate-face-binding-parity.test.mjs「② ensureBindingSlots 单源行为」（有 FR 块追加/已有槽 no-op/无块缺省槽/缺席 no-op）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：闭环证据是链路性的——槽在场（FR-03）+ verify --done 既有 auto-bind（gates.js full-autopilot-parity，已测）即可闭环；E2E 级 full 流程复跑留 R24

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/config-schema.test.mjs（renderExample 模板契约 456 断言全绿，含 test_strategy 注释态）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：整体验证面——test:core exit 0 + 触达面 48 测试绿 + 全仓 653 文件（doc-ref-check 12 红 = 他会话 shared.js 未提交 WIP 连带，非本变更文件面，提交信息已披露）
