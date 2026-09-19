---
author: qinyi
created_at: 2026-09-19 17:05:00
---
# 模块影响分析（Module Impact）— 评审材料包 CLI 注入接线

> 骨架由 plan --done CLI 生成；影响类型与 review 标记为语义判断，以 git diff 为准（真实 > 记录）。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | `src/review-material-pack.js` | 接口变更（加法导出 assembleStageReviewMaterials＋五个私有抽取器；既有导出零改动；safeGit .value 与 fileList 前缀两修复） | 否（32 断言定向覆盖） |
| runtime | `src/run/prompt.js` | 逻辑变更（tier 注入块新增装配调用与主链 join 目标变量化；outputStep 签名零改动） | 否（端到端冒烟＋源码钉） |
| stages | `src/stages/brainstorm.js` | 逻辑变更（Grill 输入材料节加 {REVIEW_MATERIALS} 槽＋补位指引） | 否 |
| stages | `src/stages/plan.js` | 逻辑变更（审查步 independent 段加槽＋补位指引；填卡步未动） | 否 |
| stages | `src/stages/execute.js` | 逻辑变更（acceptance 对照设计检查操作节加槽＋补位指引） | 否 |
| （测试，无模块） | `test/review-material-pack.test.mjs` | 新增组四断言（既有组一二三零改动） | 否 |
| （文档镜像，无模块） | `docs/prompt/_extracted.json`（对账注记：.json 扩展名不在 audit 反引号启发式的扩展集内——文件在 diff 在矩阵，纯启发式盲区非缺列） | 配置变更（_extract.mjs 再生产物） | 否 |
| （文档镜像，无模块） | `docs/prompt/brainstorm.md` | 配置变更（Grill 节镜像含槽；#2 段为既存漂移回同步） | 否 |
| （文档镜像，无模块） | `docs/prompt/verify.md` | 配置变更（流水线诚实回同步——先于本变更的既存漂移，提交 741f707 披露） | 否 |
| core-engine（模块卡自身） | `.sillyspec/docs/sillyspec/modules/core-engine.md` | 文档变更（新增 review-material-pack.js 接口节——五导出契约） | 否 |
| （知识库，无模块） | `.sillyspec/knowledge/decisions/unmapped.md` | 配置变更（decision-distill CLI 归档步自动产物，非 agent 手写） | 否 |
| （知识库，无模块） | `.sillyspec/knowledge/fr/core-engine.md` | 配置变更（decision-distill CLI 归档步自动产物） | 否 |

## 未匹配文件

以下变更文件未命中 _module-map.yaml 任何模块 paths：

- 首版骨架把全部清单文件判未匹配（plan --done 生成时点的匹配异常）；已按 _module-map.yaml 实际 paths 人工归属：`src/review-material-pack.js`→core-engine、`src/run/prompt.js`→runtime（src/run/ 前缀）、三模板 `src/stages/brainstorm.js`、`src/stages/plan.js`、`src/stages/execute.js`→stages。`test/`、`docs/prompt/` 镜像与 `.sillyspec/knowledge/` 产物确属游离（无模块 paths 覆盖，历史如此）。

## 影响类型说明

逻辑变更 / 数据结构变更 / 接口变更 / 调用关系变更 / 配置变更 / 新增；不确定的影响标 needs review。

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `.sillyspec/docs/sillyspec/modules/core-engine.md` | 已插入「src/review-material-pack.js — 评审材料包组装」接口节（五导出含 assembleStageReviewMaterials 契约） | done |
| _module-map.yaml（未改动） | 无需更新（无 paths 变化；未匹配项为骨架生成异常与历史游离面，非索引过期） | skipped |
| core-engine 卡超预算治理 | split-changelog 预览涉及 hooks/setup/sync 等多他模块卡（超本变更面，并行会话活跃）——不顺手 --force，顺延独立处理（verify-result 移交项在案） | skipped |
