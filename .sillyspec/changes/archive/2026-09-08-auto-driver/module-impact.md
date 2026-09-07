---
author: qinyi
created_at: 2026-09-08T07:08:00+08:00
---

# 模块影响分析（Module Impact）— 2026-09-08-auto-driver

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| runtime | src/run/prompt.js | 接口变更（outputStep 第 10 参 autoMeta + requiresUser 导出 + SS-META 渲染） | 是（渲染层行为） |
| cli-entry | src/run/command.js | 逻辑变更（三态 --change/wait-interactive/收尾总结/autoMeta 透传） | 是（auto 入口） |
| docs-consistency | .claude/skills/sillyspec-auto/SKILL.md | 配置变更（三段指令退役改 SS-META 消费，93→约 50 行） | 否 |
| docs-consistency | docs/prompt/README.md | 配置变更（SS-META 块条目） | 否 |
| docs-consistency | docs/sillyspec/file-lifecycle.md | 配置变更（批次注记） | 否 |
| runtime | NEW:test/auto-driver-meta.test.mjs | 新增 | 否 |
| runtime | NEW:test/auto-wait-interactive.test.mjs | 新增 | 否 |

## 未匹配文件

（无——全部命中模块索引。）

## 更新结果

| 模块文档 | 更新结论 |
|---|---|
| modules/runtime.md | done——SS-META 渲染/requiresUser 四源/wait 直通/收尾总结（prompt.js/command.js） |
| modules/cli-entry.md | done——三态 --change/零活跃建变更/旗标解析（command.js 入口） |
| modules/docs-consistency.md | done——auto SKILL 瘦身 93→47 行 + README/lifecycle 注记 |
