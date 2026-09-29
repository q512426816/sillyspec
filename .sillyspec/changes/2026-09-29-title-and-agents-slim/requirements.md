---
author: flow-machine-draft
created_at: 2026-09-29T01:15:37.997Z
---
# 需求规格（Requirements）— 2026-09-29-title-and-agents-slim

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: changes.title 三段链路闭合（start 写入 --title>input 首行>名兜底
Given 测试 相关模块就绪
When changes.title 三段链路闭合（start 写入 --title>input 首行>名兜底、resume/adopt 补写、serializeForS
Then 行为符合本条标准描述

### FR-02: AGENTS.md 移出操作教学（轻量变更节并入选道、速查压缩为恢复查看三行），模板 templat
Given 测试 相关模块就绪
When AGENTS.md 移出操作教学（轻量变更节并入选道、速查压缩为恢复查看三行），模板 templates/agents-instruction.md 同步，模板
Then 行为符合本条标准描述

### FR-03: 标题约定落 sillyspec-flow skill 并修正 commands.test 退役过期行
Given 系统就绪
When 标题约定落 sillyspec-flow skill 并修正 commands.test 退役过期行
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/change-title-flow.test.mjs 全部 4 用例（deriveChangeTitle 推导单元 + flow start fresh/resume/回填 e2e + serializeForSync 上行携带锚点）+ test/change-title-backfill.test.mjs 既有机制回归

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/quick-retired.test.mjs「R5 模板/仓库 AGENTS.md」锚定用例（轻量变更/flow start 在位、零 quick 表述）+ test/init-agents-injection.test.mjs / init-tool-multi / init-no-skills 注入回归

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：纯文档面（skill 文本与 AGENTS.md 模板），行为锚由 FR-02 的模板锚定测试承担
