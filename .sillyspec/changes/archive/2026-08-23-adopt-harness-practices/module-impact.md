---
author: qinyi
created_at: 2026-08-23T21:45:00+08:00
---

# 模块影响分析（Module Impact）— deepseek-harness 实践落地

## 模块影响矩阵

| 模块 | 影响类型 | 说明 |
|---|---|---|
| stages | 修改 | archive.js 插入 decision-distill 步骤+末步 git add；brainstorm.js Step6 决策模板四字段+Step2 路由说明；verify.js 检查指引+_globalGuardrails；quick.js :103 文案+step3 模板；doctor.js 决策待复核检查项 |
| core-engine | 修改 | knowledge-match.js 扫描 decisions/ 库+decisionHits 字段；verify-postcheck.js skip 真跳过接线+evidence-auto 推荐逻辑 |
| docs-consistency | 修改 | docs-check.js 决策规则族（advisory/锚点校验/behind 阈值）；docs-debt.js 导出 computeModuleBehind（不改现有行为） |
| change-management | 修改 | quicklog.js 根因块嵌套四子字段解析（顶层边界不动，旧条目回退） |
| setup | 修改 | config-schema.js test_strategy 枚举扩 skip/evidence-auto + 新键 decisions.behind_threshold |
| runtime | 修改 | run/prompt.js brainstorm Step2 decisionHits 注入 + verify 分支 evidence-auto 占位符 |
| （新增源文件） | 新增 | src/decision-distill.js——已归属 docs-consistency（与 docs-check 决策规则同域，_module-map.yaml paths 已补） |
| 测试 | 新增 | test/decisions-lifecycle.test.mjs、test/quicklog-postmortem-fields.test.mjs；修改 config 相关既有测试 |
| 文档/镜像 | 修改 | docs/prompt/_extracted.json + brainstorm/verify/archive/quick 四处镜像 + docs/prompt/README.md 占位符表 |

## 未匹配文件

| 文件 | 处置说明 |
|------|----------|
| src/decision-distill.js（新） | ~~新文件未入 _module-map.yaml 任何模块 paths——execute 期归入最贴近模块~~ **已处置**：归入 docs-consistency（与 docs-check 决策规则同域），sync-module-docs 步已把 paths 补进 _module-map.yaml，模块卡契约摘要已收录该文件行 |

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/stages.md` | 更新stages模块卡：关键逻辑加决策知识库闭环/brainstorm 防复潮路由/verify 指引与纪律/quick 嵌套子字段/doctor 5→6 步五段，步骤表 archive 5→6，注意事项补步骤顺序；变更条目入 stages.changelog.md sidecar | done |
| `modules/core-engine.md` | 更新core-engine模块卡：knowledge-match/verify-postcheck 两条目扩 decisionHits 与 skip/evidence-auto 行为；变更条目入 core-engine.changelog.md sidecar | done |
| `modules/docs-consistency.md` | 更新docs-consistency模块卡：契约摘要 docs-check/docs-debt 两行扩 + 新增 src/decision-distill.js 行，关键逻辑加决策规则族 advisory 语义与写侧边界，依赖关系补 moduleIndex 注入；变更条目入 docs-consistency.changelog.md sidecar | done |
| `modules/change-management.md` | 更新change-management模块卡：当前设计加根因块嵌套四子字段段，注意事项补合法形态不变量；变更条目入 change-management.changelog.md sidecar | done |
| `modules/setup.md` | 更新setup模块卡：当前设计 config-schema 段补枚举与新 live 键；变更条目入 setup.changelog.md sidecar | done |
| `modules/runtime.md` | 更新runtime模块卡：注意事项加 run/prompt 双占位符注入（fail-soft）条目；变更条目入 runtime.changelog.md sidecar | done |
| `_module-map.yaml` | 补 decision-distill.js 的模块 paths 映射（docs-consistency paths 追加一行） | done |
