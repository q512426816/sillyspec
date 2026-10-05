---
author: flow-machine-draft
created_at: 2026-10-05T06:28:30.810Z
---
# 提案书（Proposal）— 2026-10-05-uivisual-word-narrow

## 动机

任务原话转写：动机：两个实测确认的小缺陷。① UI 触达检测词表（src/ui-visual.js UI_TOUCH_PATTERNS）含后端高频通用词 /渲染/、/组件/、/样式/——对 proposal+requirements 全文 ≥1 命中即判 UI 触达：CLI 文本变更的 input 写「聚合函数+渲染+对应单测」（渲染=后端 render 输出常规用语）即被误判，flow start 渲染整段 UI 变更执行须知（约 15 行噪音）+ 收口探针 12 warn 缺 visual-evidence.md（2026-10-05-knowledge-stats-freshness 实测实证）。误判面=默认档一行警告+开工误导；模块头注释明示设计权衡「误漏面由文件面扩展名兜底」（detectUiTouchInPaths 的 tsx/jsx/vue/svelte/css/scss/less/html）。既有正例每条都有第二信号托底（页面/前端/UI/视觉/tsx），移除三词零伤正例。② design 模板对锚行（四问原文/FR 标题）零防呆提示——「问题行句号被 agent 手写成问号」在 2026-10-05 两度实测踩坑（dogfood-audit-fixes 与 hindsight-checkbox-noise 的 design 起草，均被 v2 锚对比正确拒收但返工一轮），flow start 指引应加「锚行从模板复制勿手打」。改动面：src/ui-visual.js 词表 + src/flow-draft.js 模板注释 + 对应测试。
成功标准：
- detectUiTouch 词表必须移除后端高频通用词（渲染/组件/样式）；CLI 变更描述含「渲染输出/组件/输出样式」等后端通用语必须零命中；既有正例（页面/前端/UI/视觉/tsx 扩展名）检测能力必须不变
- flow start 起草的 design.md 模板指引必须含锚行防呆提示（四问/FR 标题锚从模板原样复制勿手打）
- 单测覆盖：新误伤反例（渲染/组件/样式后端语）至少三条 + 既有正例回归 + 模板文案断言

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. detectUiTouch 词表必须移除后端高频通用词（渲染/组件/样式）；CLI 变更描述含「渲染输出/组件/输出样式」等后端通用语必须零命中；既有正例（页面/前端/UI/视觉/tsx 扩展名）检测能力必须不变
2. flow start 起草的 design.md 模板指引必须含锚行防呆提示（四问/FR 标题锚从模板原样复制勿手打）
3. 单测覆盖：新误伤反例（渲染/组件/样式后端语）至少三条 + 既有正例回归 + 模板文案断言

## 成功标准（可验证）

1. detectUiTouch 词表必须移除后端高频通用词（渲染/组件/样式）；CLI 变更描述含「渲染输出/组件/输出样式」等后端通用语必须零命中；既有正例（页面/前端/UI/视觉/tsx 扩展名）检测能力必须不变
2. flow start 起草的 design.md 模板指引必须含锚行防呆提示（四问/FR 标题锚从模板原样复制勿手打）
3. 单测覆盖：新误伤反例（渲染/组件/样式后端语）至少三条 + 既有正例回归 + 模板文案断言
