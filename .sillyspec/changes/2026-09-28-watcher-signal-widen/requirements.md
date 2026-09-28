---
author: flow-machine-draft
created_at: 2026-09-28T09:57:02.602Z
---
# 需求规格（Requirements）— 2026-09-28-watcher-signal-widen

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 快照增两源：verify-runs 本变更最新实测结论（目录名 status duration 入 
Given 系统就绪
When 快照增两源：verify-runs 本变更最新实测结论（目录名 status duration 入 snap.gateRun）
Then 行为符合本条标准描述

### FR-02: specBase local.yaml mtime 事实（snap.localConfig，内容不上
Given 系统就绪
When specBase local.yaml mtime 事实（snap.localConfig，内容不上行只留痕）
Then 行为符合本条标准描述

### FR-03: 基础事件增两条：gate-run（实测结论变化——停滞判定的活跃信号，计入 lastActivity
Given 系统就绪
When 基础事件增两条：gate-run（实测结论变化——停滞判定的活跃信号，计入 lastActivityAt）与 config-change（本地配置有变更事实）
Then 行为符合本条标准描述

### FR-04: 假勾选消解：ruleFakeCheck 改带状态——无证据翻格先记 pending 并警告
Given 系统就绪
When 假勾选消解：ruleFakeCheck 改带状态——无证据翻格先记 pending 并警告
Then 行为符合本条标准描述

### FR-05: 后续快照区间新提交或 review mtime 补上证据时发 fake-check-cleared 
Given 系统就绪
When 后续快照区间新提交或 review mtime 补上证据时发 fake-check-cleared 事件并清 pending（时间线可见消解）
Then 行为符合本条标准描述

### FR-06: runCrossRepoFullTest 与 runFullCommand 两处 execSync 
Given 系统就绪
When runCrossRepoFullTest 与 runFullCommand 两处 execSync 剥离 NODE_TEST_CONTEXT（与 runOneM
Then 行为符合本条标准描述

### FR-07: 既有 watcher 测试全绿并扩展：新源快照字段、两新事件、pending 消解路径、env 清洗
Given 测试 相关模块就绪
When 既有 watcher 测试全绿并扩展：新源快照字段、两新事件、pending 消解路径、env 清洗单点共用
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/watcher.test.mjs「watcher-signal-widen: gate-run 与 config-change 事件」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/watcher.test.mjs 同上用例（gate-run 计入 baseEvents——停滞活跃信号由事件非空机制承接）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/watcher.test.mjs「watcher-signal-widen: 假勾选 pending 消解路径」（三拍：警告挂 pending → 提交到发 cleared info → 平态无事件）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：env 单点为三调用点共用（node --check + stripNestedTestEnv 导出；行为由 tap-judge 集成用例族覆盖同构面）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/watcher.test.mjs 全部 20 用例（node --test 实测 20/20）+ tap-judge 6/6、known-failures 回归全绿

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
