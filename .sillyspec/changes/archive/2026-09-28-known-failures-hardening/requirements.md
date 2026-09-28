---
author: flow-machine-draft
created_at: 2026-09-28T06:39:48.180Z
---
# 需求规格（Requirements）— 2026-09-28-known-failures-hardening

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 豁免模式支持锚定式语法：以^开头或以$结尾的模式按正则匹配整行（trim 后），无锚定者维持子串（跨
Given 系统就绪
When 豁免模式支持锚定式语法：以^开头或以$结尾的模式按正
Then 匹配整行（trim 后），无锚定者维持子串（跨仓向后兼容）

### FR-02: 硬失败行保护：测试运行器权威失败标记行（含✖、not ok、--- FAIL、failing tes
Given 测试 相关模块就绪
When 硬失败行保护：测试运行器权威失败标记行（含✖、not ok、--- FAIL、failing tests、行首 AssertionError 等形态）只能被锚定
Then 行为符合本条标准描述

### FR-03: 分层入库：新增入库的 .sillyspec/known-failures.yaml 承载工具债类豁免
Given 系统就绪
When 分层入库：新增入库的 .sillyspec/known-failures.yaml 承载工具债类豁免（先例 redlines.yaml），loader 合并读取
Then 行为符合本条标准描述

### FR-04: 既有 27 条逐条审计——陈旧垃圾删除、可锚定者锚定、无法与真实失败区分者加临时注记并注明结构化报告
Given 系统就绪
When 既有 27 条逐条审计——陈旧垃圾删除、可锚定者锚定、无法与真实失败区分者加临时注记并注明结构化报告落地后删
Then 行为符合本条标准描述

### FR-05: 裁判输出可审计：豁免通过时逐行标注命中模式与其形态（锚定或裸子串警告），裸子串命中给出收敛提示
Given 系统就绪
When 裁判输出可审计：豁免通过时逐行标注命中模式与其形态（锚定或裸子串警告），裸子串命中给出收敛提示
Then 行为符合本条标准描述

### FR-06: 既有 known-failures 测试扩展覆盖：锚定式豁免硬行、裸子串不豁免硬行、合并读取、go 
Given 测试 相关模块就绪
When 既有 known-failures 测试扩展覆盖：锚定式豁免硬行、裸子串不豁免硬行、合并读取、go FAIL 行不被吞四个关键行为
Then 行为符合本条标准描述

### FR-07: 跨仓零破坏：消费者仓 local.yaml 裸子串模式语义不变（仅新增硬行保护与其收窄）
Given 系统就绪
When 跨仓零破坏：消费者仓 local.yaml 裸子串模式语义不变（仅新增硬行保护与其收窄）
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/verify-postcheck-known-failures.test.mjs「锚定式豁免硬行（✖）」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/verify-postcheck-known-failures.test.mjs「M1: 裸 --- 不再吞 go --- FAIL: 行」「M1: 裸 AssertionError 不再吞真实断言行」「M1: 裸 ✖ 不豁免硬行」+「兼容: 裸子串豁免非硬 fixture 行」（具体模式不受限）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/verify-postcheck-known-failures.test.mjs「合并装载: 入库文件解析 24 条」「合并装载: local 迁移后为空」

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/verify-postcheck-known-failures.test.mjs「裁判: 裸子串命中披露收敛提示」「裁判: 锚定式命中无收敛提示」

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/verify-postcheck-known-failures.test.mjs 全部 74 断言（node 直跑 74 pass 0 fail）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：跨仓零破坏为语义约束（泛用词停用方向安全——具体模式行为不变由「兼容: 裸子串豁免非硬 fixture 行」与既有 26 项旧断言（含按文件名豁免 ✕/× 行）共同锁定）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：PER_TEST_FAIL_RE 补 ✖ 为单字符正则项扩展（node:test 实际标记），由「锚定式豁免硬行（✖）」用例锁定
