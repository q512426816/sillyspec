---
author: flow-machine-draft
created_at: 2026-10-23T07:46:40.283Z
---
# 需求规格（Requirements）— 2026-10-23-knowledge-scope-discoverability

## 功能需求

### FR-01: sillyspec knowledge scope [--json]：扫描 knowledge/*.md 作用域标记并输出四档现状（always/repo 条目清单、module 域分布、关键词档说明）；无任何 scoped 条目时明示「当前仅关键词档在用」+marker 三形态语法与放置位置（top-level knowledge/*.md section heading 下）；--json 单对象 {always,repo,modules,guide}；纯读零写盘

- sillyspec knowledge scope MUST 纯读输出四档作用域现状（always/repo 条目、module 域分布、关键词档说明），无 scoped 条目时 MUST 明示仅关键词档在用并给出 marker 三形态语法与放置位置；--json MUST 输出单对象；help MUST 列 scope；模板与技能 MUST 含引导文案。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-02: knowledge help/子命令清单列 scope；templates/agents-instruction.md 知识库行含作用域指引一句（含 knowledge scope 命令指针）；sillyspec-config 技能含标记语法+命令+「无标记=关键词」说明

- sillyspec knowledge scope MUST 纯读输出四档作用域现状（always/repo 条目、module 域分布、关键词档说明），无 scoped 条目时 MUST 明示仅关键词档在用并给出 marker 三形态语法与放置位置；--json MUST 输出单对象；help MUST 列 scope；模板与技能 MUST 含引导文案。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

### FR-03: 测试：CLI e2e（有空态文案/有条目清单/--json 形态）+ 模板与技能文案锚；既有 knowledge 套件零改动回归绿

- sillyspec knowledge scope MUST 纯读输出四档作用域现状（always/repo 条目、module 域分布、关键词档说明），无 scoped 条目时 MUST 明示仅关键词档在用并给出 marker 三形态语法与放置位置；--json MUST 输出单对象；help MUST 列 scope；模板与技能 MUST 含引导文案。

#### 场景：主路径

（按需保留或改写：Given 前提 / When 触发 / Then 可判定预期——每边界情形一个场景块，归档索引用场景名作摘要）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯发现面（只读命令+文案），既有 knowledge 套件即回归锚
FR-02: 不适用：纯发现面（只读命令+文案），既有 knowledge 套件即回归锚
FR-03: 不适用：纯发现面（只读命令+文案），既有 knowledge 套件即回归锚
