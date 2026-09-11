---
author: qinyi
created_at: 2026-09-11 15:05:00
---

# 模块影响分析

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| docs-consistency | src/decision-distill.js | 数据结构变更（条目增可选 files 字段+「文件：」条件渲染行；解析/渲染幂等，存量零迁移） | 否（Grill+plan 双审过；ql-020 同文件区域隔离已声明） |
| core-engine | src/knowledge-match.js | 接口变更（新导出 matchDecisionsByFiles；锚点单独标签读入不进 reason 回填链；matchKnowledge 既有语义零改动） | 否 |
| runtime | src/semantic-guard.js（新增） | 新增 | 否（纯函数+只读 git，Grill 独立审查 21 项过） |
| runtime | src/run/prompt.js | 逻辑变更（quick step1 渲染层追加注入分支，独立判定口径不嵌占位符守卫；既有注入零改动） | 否 |
| runtime | src/run/quick-audit.js | 逻辑变更（runQuickTestLintGate 内追加断言检测步骤 0+返回对象增 semanticGuard 字段；test/lint 实测判定零改动） | 否（调用方 complete-handlers 零改动已核） |
| setup | src/config-schema.js | 配置变更（注册 semantic_guard.enabled 键） | 否 |

## 未匹配文件

- `test/semantic-guard.test.mjs`（新增）、`test/decision-file-field.test.mjs`（新增）、`test/semantic-guard-prompt-inject.test.mjs`（新增）—— 测试文件，按仓例不入模块索引，游离正常

## 文档文件（git diff 实际路径，模块索引产品不进影响矩阵）

- `.sillyspec/docs/sillyspec/modules/_module-map.yaml` —— runtime paths 补录 src/semantic-guard.js（task-07）
- `.sillyspec/docs/sillyspec/modules/{core-engine,docs-consistency,setup,runtime}.changelog.md` —— 四模块 changelog 各一条（task-07）

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `.sillyspec/docs/sillyspec/modules/core-engine.changelog.md` | knowledge-match 反查条目（task-07，commit c7304c7） | done |
| `.sillyspec/docs/sillyspec/modules/docs-consistency.changelog.md` | decision-distill 文件字段条目（task-07，commit c7304c7） | done |
| `.sillyspec/docs/sillyspec/modules/setup.changelog.md` | config-schema semantic_guard 条目（task-07，commit c7304c7） | done |
| `.sillyspec/docs/sillyspec/modules/runtime.changelog.md` | semantic-guard 模块+两消费端条目（task-07，commit c7304c7） | done |
| `.sillyspec/docs/sillyspec/modules/_module-map.yaml` | runtime paths 补录 src/semantic-guard.js（task-07 手工——rebuild merge 语义不扫源码） | done |
