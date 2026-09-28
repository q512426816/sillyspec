---
author: flow-machine-draft
created_at: 2026-09-28T06:51:06.976Z
---
# 需求规格（Requirements）— 2026-09-28-flow-date-gate

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: flow start --change friction-signal-hint（净新建、无日期前缀
Given 系统就绪
When flow start --change friction-signal-hint（净新建、无日期前缀）exit 2 且报错含 YYYY-MM-DD-<简短描述>
Then 行为符合本条标准描述

### FR-02: flow start --change 2026-09-28-xxx（合规名）照常创建轻量变更
Given 系统就绪
When flow start --change 2026-09-28-xxx（合规名）照常创建轻量变更
Then 行为符合本条标准描述

### FR-03: 已存在目录（恢复/brainstorm 收编/归档名）时同名 start 不被日期门拦截（存量不追诉
Given 系统就绪
When 已存在目录（恢复/brainstorm 收编/归档名）时同名 start 不被日期门拦截（存量不追诉）
Then 行为符合本条标准描述

### FR-04: 无 --change 时默认自动名符合 DATED_CHANGE_NAME_RE（YYYY-MM-D
Given 系统就绪
When 无 --change 时默认自动名符合 DATED_CHANGE_NAME_RE（YYYY-MM-DD-flow-<hex> 形态）
Then 行为符合本条标准描述

### FR-05: 既有 flow 族测试全部适配通过（test+lint 双绿）
Given 测试 相关模块就绪
When 既有 flow 族测试全部适配通过（test+lint 双绿）
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-name-date-gate.test.mjs 用例7a（roadmap-copy-purge 净新建 exit 2 + 教学文案 + 未物化）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-name-date-gate.test.mjs 用例7b（2026-09-28-my-fix 放行物化）＋ test/flow-protocol.test.mjs ①②③（合规名全链）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-name-date-gate.test.mjs 用例7c（brainstorm 预段收编放行）/ 7d（归档名在场放行）＋ test/flow-protocol.test.mjs ②（flow-state 恢复简报）/ ⑬（adopt 收编）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-name-date-gate.test.mjs 用例7e（无 --change 物化名匹配 ^\d{4}-..-..-flow-[0-9a-f]+$）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs（22/22）＋ flow-checkpoints/flow-draft/flow-parity/flow-route/flow-tick-prototype/flow-done-carry-suspect-advisory/sentinel-wiring/fr-governance-sweep/thin-fr-inject-parity（37/37）＋ npm run lint 双绿
