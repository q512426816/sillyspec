---
author: flow-machine-draft
created_at: 2026-09-29T07:37:47.369Z
---
# 需求规格（Requirements）— 2026-09-29-flow-agent-log-report

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: flow start/done/amend-draft 执行后，runtimeRoot 下 agen
Given 系统就绪
When flow start/done/amend-draft 执行后，runtimeRoot 下 agent-session-log.json 的本会话 own 条目
Then 行为符合本条标准描述

### FR-02: 上报走 recordAgentLogInvocation 同一通道（推送收敛/own 打标/双向互斥
Given 系统就绪
When 上报走 recordAgentLogInvocation 同一通道（推送收敛/own 打标/双向互斥语义复用，不另造轮子）
Then 行为符合本条标准描述

### FR-03: 上报失败仅 warn/忽略，flow 协议面 exit code 不受影响
Given 系统就绪
When 上报失败仅 warn/忽略，flow 协议面 exit code 不受影响
Then 行为符合本条标准描述

### FR-04: run 族既有行为不变（既有 run agent-log 测试全绿）
Given 测试 相关模块就绪
When run 族既有行为不变（既有 run agent-log 测试全绿）
Then 行为符合本条标准描述

### FR-05: 新增测试覆盖 flow 入口的登记调用面
Given 测试 相关模块就绪
When 新增测试覆盖 flow 入口的登记调用面
Then 行为符合本条标准描述

### FR-06: 全量测试绿 + lint 绿
Given 测试 相关模块就绪
When 全量测试绿 + lint 绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-agent-log-report.test.mjs ①（start 登记 change_key）＋②（status 重入 invocations/change_key 持久）＋③（done 周期 last_command=done）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-agent-log-report.test.mjs ①（quick_id 恒空/change_key 互斥面）＋ test/agent-session-log.test.mjs（recordAgentLogInvocation 通道本体：own 打标/推送收敛/合并语义）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-agent-log-report.test.mjs ①（SILLYSPEC_AGENT_LOG_PUSH=0 关上报仍留底、exit 0）＋④（非 agent 环境不写盘不报错、协议面 exit 0）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/agent-session-log.test.mjs（run 族登记/上报通道回归全量）＋ test/cli-top-level-aliases.test.mjs（runCommand 入口面）＋ test/flow-protocol.test.mjs / test/flow-status-heartbeat.test.mjs / test/flow-parity.test.mjs（flow 族行为不变）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-agent-log-report.test.mjs 全部四用例（红→绿实证：实现前 ①②③ 红、④ 绿）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：独立测试文件——全量面由 flow done 收口 CLI 亲测（node --test 全量 + npm run lint，本地预跑 34/34 子集绿 + lint 绿）
