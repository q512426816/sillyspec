---
author: flow-machine-draft
created_at: 2026-11-21T23:27:44.739Z
---
# 提案书（Proposal）— 2026-11-22-include-param-primitives

## 动机

任务原话转写：prompt include 参数化与首批纪律原语抽取

动机与背景：ROADMAP「mattpocock/skills 吸收路线」批 3b（依赖批 3a survey 已归档就绪）。批 3a 盘点（docs/sillyspec/prompt-primitives-survey.md）发现 B 类 25 条散文级重复纪律段、高优 8 条跨阶段逐字/近逐字重复；现有 {{include:}} 机制（src/run/shared.js resolvePromptIncludes）无参数化管道，侧重差异只能整段复制改词。本变更落地 include 参数化语法，并按 survey 施工顺序抽高优 2+5（零参数直抽）与高 4/9（参数化抽取），每批跑金档再生与 include 计数测试。

成功标准：
- resolvePromptIncludes 支持 {{include:name|key=value}} 参数化语法，模板内参数占位被实参替换；无参写法向后兼容，模板缺失仍保留占位符并 warn
- 高 2「前台同步执行禁后台」与高 5「评审豁免声明」抽为 templates/prompts/ 模板，原 6 处引用位改 include 引用，渲染文本语义不变
- 高 4「审查子代理纪律包」与高 9「材料包基准面四句」以参数化模板抽取，budget/pack 等侧重差异以参数传入
- docs/prompt/ 金档经 _extract.mjs 再生与改动一致；include 计数测试核对更新跑绿；知识注入段仍禁 include
- 新增单测覆盖参数化解析/渲染/缺参行为并跑绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. resolvePromptIncludes 支持 {{include:name|key=value}} 参数化语法，模板内参数占位被实参替换；无参写法向后兼容，模板缺失仍保留占位符并 warn
2. 高 2「前台同步执行禁后台」与高 5「评审豁免声明」抽为 templates/prompts/ 模板，原 6 处引用位改 include 引用，渲染文本语义不变
3. 高 4「审查子代理纪律包」与高 9「材料包基准面四句」以参数化模板抽取，budget/pack 等侧重差异以参数传入
4. docs/prompt/ 金档经 _extract.mjs 再生与改动一致；include 计数测试核对更新跑绿；知识注入段仍禁 include
5. 新增单测覆盖参数化解析/渲染/缺参行为并跑绿

## 成功标准（可验证）

1. resolvePromptIncludes 支持 {{include:name|key=value}} 参数化语法，模板内参数占位被实参替换；无参写法向后兼容，模板缺失仍保留占位符并 warn
2. 高 2「前台同步执行禁后台」与高 5「评审豁免声明」抽为 templates/prompts/ 模板，原 6 处引用位改 include 引用，渲染文本语义不变
3. 高 4「审查子代理纪律包」与高 9「材料包基准面四句」以参数化模板抽取，budget/pack 等侧重差异以参数传入
4. docs/prompt/ 金档经 _extract.mjs 再生与改动一致；include 计数测试核对更新跑绿；知识注入段仍禁 include
5. 新增单测覆盖参数化解析/渲染/缺参行为并跑绿
