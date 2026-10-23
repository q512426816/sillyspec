---
author: flow-machine-draft
created_at: 2026-10-23T07:46:40.283Z
---
# 提案书（Proposal）— 2026-10-23-knowledge-scope-discoverability

## 动机

任务原话转写：知识作用域发现面三处引导

动机与背景：用户追问（2026-10-23 原话）：「知识注入有四档作用域 在哪引导用户配置啊」——2026-10-23-knowledge-scope-inject 落了机制（always/repo/module/关键词 marker），但零发现面：用户不知道 marker 语法、不知道去哪写、不知道当前状态。按仓内既有发现面模式补三处：①新子命令 sillyspec knowledge scope（纯读：列四档现状+marker 语法教学+放置位置，空态明示「当前仅关键词档在用」；--json 机读）②templates/agents-instruction.md 知识库行补一句作用域指引（消费仓 init 即得）③sillyspec-config 技能增「知识注入作用域」节（agent 配置引导面）。autopilot 直跑到底，--no-prestage 声明需求已含决策。

成功标准：
- sillyspec knowledge scope [--json]：扫描 knowledge/*.md 作用域标记并输出四档现状（always/repo 条目清单、module 域分布、关键词档说明）；无任何 scoped 条目时明示「当前仅关键词档在用」+marker 三形态语法与放置位置（top-level knowledge/*.md section heading 下）；--json 单对象 {always,repo,modules,guide}；纯读零写盘
- knowledge help/子命令清单列 scope；templates/agents-instruction.md 知识库行含作用域指引一句（含 knowledge scope 命令指针）；sillyspec-config 技能含标记语法+命令+「无标记=关键词」说明
- 测试：CLI e2e（有空态文案/有条目清单/--json 形态）+ 模板与技能文案锚；既有 knowledge 套件零改动回归绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. sillyspec knowledge scope [--json]：扫描 knowledge/*.md 作用域标记并输出四档现状（always/repo 条目清单、module 域分布、关键词档说明）；无任何 scoped 条目时明示「当前仅关键词档在用」+marker 三形态语法与放置位置（top-level knowledge/*.md section heading 下）；--json 单对象 {always,repo,modules,guide}；纯读零写盘
2. knowledge help/子命令清单列 scope；templates/agents-instruction.md 知识库行含作用域指引一句（含 knowledge scope 命令指针）；sillyspec-config 技能含标记语法+命令+「无标记=关键词」说明
3. 测试：CLI e2e（有空态文案/有条目清单/--json 形态）+ 模板与技能文案锚；既有 knowledge 套件零改动回归绿

## 成功标准（可验证）

1. sillyspec knowledge scope [--json]：扫描 knowledge/*.md 作用域标记并输出四档现状（always/repo 条目清单、module 域分布、关键词档说明）；无任何 scoped 条目时明示「当前仅关键词档在用」+marker 三形态语法与放置位置（top-level knowledge/*.md section heading 下）；--json 单对象 {always,repo,modules,guide}；纯读零写盘
2. knowledge help/子命令清单列 scope；templates/agents-instruction.md 知识库行含作用域指引一句（含 knowledge scope 命令指针）；sillyspec-config 技能含标记语法+命令+「无标记=关键词」说明
3. 测试：CLI e2e（有空态文案/有条目清单/--json 形态）+ 模板与技能文案锚；既有 knowledge 套件零改动回归绿
