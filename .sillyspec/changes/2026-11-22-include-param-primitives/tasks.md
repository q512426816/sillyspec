---
author: flow-machine-draft
created_at: 2026-11-21T23:27:44.739Z
---
# 任务注册表（Tasks）— 2026-11-22-include-param-primitives

- [x] task-01: resolvePromptIncludes 支持 {{include:name|key=value}} 参数化语法，模板内参数占位被实参替换；无参写法向后兼容，模板缺失仍保留占位符并 warn
- [x] task-02: 高 2「前台同步执行禁后台」与高 5「评审豁免声明」抽为 templates/prompts/ 模板，原 6 处引用位改 include 引用，渲染文本语义不变
- [x] task-03: 高 4「审查子代理纪律包」与高 9「材料包基准面四句」以参数化模板抽取，budget/pack 等侧重差异以参数传入
- [x] task-04: docs/prompt/ 金档经 _extract.mjs 再生与改动一致；include 计数测试核对更新跑绿；知识注入段仍禁 include
- [x] task-05: 新增单测覆盖参数化解析/渲染/缺参行为并跑绿
