---
author: qinyi
created_at: 2026-08-13 13:15:00
---

# 模块影响分析（Module Impact）— module-impact 活文档改造

> 本变更即 module-impact 机制改造（dogfood 自指）。archive step2 终审时本变更 change 目录无 module-impact.md（plan 阶段在改造前跑，review_plan 注入尚未生效），按降级语义补生成。_module-map.yaml schema_version=1 解析受限，按文件目录归类。

## 影响矩阵

| 模块/层 | 影响类型 | 相关文件 | 更新摘要 | needs_review |
|---------|----------|----------|----------|-------------|
| 阶段定义层 | 逻辑变更（prompt 注入） | src/stages/plan.js, src/stages/execute.js, src/stages/verify.js, src/stages/archive.js | plan review_plan 注入生成 module-impact 首版指引；execute Wave 步骤加主代理汇总更新；verify 输出报告加核对；archive extract-module-impact 改终审（不改名 D-005@v2） | false |
| 校验引擎层 | 数据结构变更（规则新增 + 链路补全） | src/stage-contract-spec.js, src/stage-contract.js | 新增 plan.module-impact.exists（error, condition scale≠small, root=change）；validatePlanOutputs 加 design.md scale 读取链路（evaluateRules 传 scale） | false |
| 文档层 | 配置变更（文档同步） | docs/sillyspec/file-lifecycle.md, docs/prompt/plan.md, docs/prompt/execute.md, docs/prompt/verify.md, docs/prompt/archive.md, docs/prompt/_extracted.json | file-lifecycle 记录 module-impact 多阶段生成；docs/prompt 镜像再生（archive extract 终审 + plan review_plan 生成 + execute Wave 汇总 + verify 核对） | false |
| 测试层 | 逻辑变更（fixture 跟进新规则） | test/stage-contract.test.mjs, test/noai-completion-gate.test.mjs, test/run-complete-step-validator-rollback.test.mjs | 3 测试 plan fixture 补 module-impact.md（plan.module-impact.exists 新规则的合理连锁） | false |

## 未匹配文件
（无——本变更 11 个改动文件均按目录归类到上述 4 层）
