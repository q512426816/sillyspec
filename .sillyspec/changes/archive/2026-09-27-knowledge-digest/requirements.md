---
author: flow-machine-draft
created_at: 2026-09-27T05:23:04.935Z
---
# 需求规格（Requirements）— 2026-09-27-knowledge-digest

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 新增 knowledge digest 命令：四类信号扫描（rot 待复核标记按域计数/收件箱积压/
Given 系统就绪
When 新增 knowledge digest 命令：四类信号扫描（rot 待复核标记按域计数/收件箱积压/伪域 auto-* 与 unmapped 占比/绑定路径解析
Then 行为符合本条标准描述

### FR-02: 落域机械改进：归档蒸馏落域为伪域（auto-*/unmapped）时，按交付路径推导建议域（back
Given 系统就绪
When 落域机械改进：归档蒸馏落域为伪域（auto-*/unmapped）时，按交付路径推导建议域（backend/app/modules/<seg>
Then <seg> 等）并在归档输出显式提示（advisory 不阻断）

### FR-03: 伪域条目+建议进 digest 信号
Given 系统就绪
When 伪域条目+建议进 digest 信号
Then 行为符合本条标准描述

### FR-04: digest 的绑定扫描与 repair-paths 同口径（resolveTestFileRel 
Given 系统就绪
When digest 的绑定扫描与 repair-paths 同口径（resolveTestFileRel 单源复用）
Then 行为符合本条标准描述

### FR-05: 全仓测试绿
Given 测试 相关模块就绪
When 全仓测试绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-digest.test.mjs「① 四信号阈值」＋「④ CLI --json 端到端」（healthy 静默/逐类超阈/unmapped 基线消音只报增量）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-digest.test.mjs「④」（--json 平铺 data 面，signals 数组可直接消费）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-digest.test.mjs「② suggestDomainFromFiles」（backend 模块最强/daemon/frontend/src 段/目录段兜底/空 null）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-digest.test.mjs「①」坏绑定与 repair-paths 同口径（resolveTestFileRel 单源，实跑本仓 8 个全中）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：整体验证面——test:core exit 0 + 新测试 3 用例 + 触达面 16 绿；本仓实跑 digest 首跑即中 305/39/757/8 四信号（变更内 EXP 证据在收口输出）
