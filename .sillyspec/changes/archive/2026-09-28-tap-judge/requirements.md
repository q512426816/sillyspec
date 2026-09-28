---
author: flow-machine-draft
created_at: 2026-09-28T09:15:41.329Z
---
# 需求规格（Requirements）— 2026-09-28-tap-judge

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: deps(auto-js) 批改 node:test 双报告器（spec 到 stderr 人读、t
Given 系统就绪
When deps(auto-js) 批改 node:test 双报告器（spec 到 stderr 人读、tap 到 stdout 机读），judgeTapOutput
Then 零断裂

### FR-02: 豁免匹配复用 buildExemptPats 与 matchExemptLine 共用单点（锚定式、
Given 系统就绪
When 豁免匹配复用 buildExemptPats 与 matchExemptLine 共用单点（锚定式、裸子串、泛用停用语义与既有完全一致）
Then 行为符合本条标准描述

### FR-03: P1 根因修复：runOneModule execSync 剥离 NODE_TEST_CONTEXT
Given 系统就绪
When P1 根因修复：runOneModule execSync 剥离 NODE_TEST_CONTEXT（父级 node:test 进程 env 泄漏致内层 nod
Then 行为符合本条标准描述

### FR-04: local.yaml 豁免 D 组三条按删除条件移除（⑮ 与两条 fixture——根因已修）
Given 系统就绪
When local.yaml 豁免 D 组三条按删除条件移除（⑮ 与两条 fixture——根因已修）
Then 行为符合本条标准描述

### FR-05: 单测六用例含真实双报告器集成（发现并锁定嵌套 env 坑）
Given 系统就绪
When 单测六用例含真实双报告器集成（发现并锁定嵌套 env 坑）
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/tap-judge.test.mjs「TAP 失败：锚定式豁免 1 条 + 未豁免 1 条 → failed 且 remaining 精确到用例行」+「TAP 全过 exit 0 → passed 带计数」+「集成：双报告器命令 stdout 为纯 TAP 且可判账」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/verify-postcheck-known-failures.test.mjs 全部 74 断言回归全绿（共用单点抽取后语义零漂移）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/tap-judge.test.mjs「集成」用例（自身剥 NODE_TEST_CONTEXT 的坑注释）+ 脏 env 复现与清洗后 22/22 实测（design 槽1 记录）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：豁免清单删减核对（local.yaml gitignored 本地文件，D 组三条与根因修复一一对应）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/tap-judge.test.mjs 全部 6 用例（node --test 实测 6/6）+ task-done/flow-protocol/known-failures 回归全绿
