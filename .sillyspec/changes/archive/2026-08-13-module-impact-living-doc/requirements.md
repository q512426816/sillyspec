---
author: qinyi
created_at: 2026-08-13 09:30:00
---

# Requirements：module-impact 分阶段生成

## 功能需求

- **FR-01**：large 变更在 plan 的「审查计划」(review_plan) 步骤生成 module-impact.md 首版（LLM 步骤，agent 读得到 prompt；输入 = plan.md 任务列表 + design.md 文件变更清单。注：review_plan 在 generate_blueprints 之前，TaskCard/allowed_paths 此时未生成——粒度同 archive 现状）
- **FR-02**：新增 validator `plan.module-impact.exists`（severity=error，condition `scale≠small`，root=change，path=module-impact.md）——large 缺 module-impact.md 阻断 plan 完成
- **FR-03**：validatePlanOutputs 新增 design.md frontmatter scale 读取链路，`evaluateRules('plan', { changeDir, scale })`（参照 validateBrainstormOutputs:264-272）——否则 FR-02 的 condition 不生效
- **FR-04**：execute 主代理在每个 Wave 完成后汇总该 Wave 实际代码变更更新 module-impact.md（非 task 子代理各改，避免并行覆盖）
- **FR-05**：verify「输出验证报告」步骤核对 module-impact.md 与实际代码变更一致
- **FR-06**：archive 的 extract-module-impact 步骤改为「最终确认 module-impact.md（核对一致）」后进 sync-module-docs；若改名配 `migratedFrom: ['extract-module-impact']`
- **FR-07**：无 _module-map.yaml 时降级生成只含 unmapped 部分的 module-impact.md + 提示跑 scan（复用 archive.js:38 fail-safe，不阻断）
- **FR-08**：scale=small 豁免，不要求 module-impact.md（quick 路径轻量，不增加仪式产物）

## 非功能需求

- **NFR-01**：保持 SillySpec 流程控制器定位——module-impact 内容生成是 agent 分析活，CLI 不实现影响矩阵算法（不抽公共生成函数）
- **NFR-02**：兼容 Windows/Linux/macOS（prompt 文本无平台依赖；validator 路径走 stage-contract 既有 root 机制）
- **NFR-03**：prompt 注入不显著膨胀——plan review_plan / execute Wave prompt 追加的指引复用 archive 既有核心文本，注释同源
