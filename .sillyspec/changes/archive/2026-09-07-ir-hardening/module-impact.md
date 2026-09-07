---
author: qinyi
created_at: 2026-09-07T23:15:00+08:00
---

# 模块影响分析（Module Impact）— 2026-09-07-ir-hardening

> 骨架由 `sillyspec module-impact --change` 生成后按本变更文件清单（design.md）手工归类——工作树含并行 quick 批次脏文件，矩阵只登记本变更 14 文件。

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 需 review |
|---|---|---|---|
| core-engine | src/constants.js | 配置变更（IR_STRICT_SINCE 常量） | 否 |
| progress | src/progress/change-registry.js | 接口变更（getChangeCreatedAt 只读访问器） | 否 |
| progress | src/progress.js | 接口变更（facade 透传） | 否 |
| runtime | src/verify-postcheck.js | 逻辑变更（strictMode 两档 + isStrictChange） | 是（gate 语义） |
| runtime | src/run/gates.js | 逻辑变更（strictViolation ERROR 路由 + envelope code） | 是（gate 语义） |
| docs-consistency | src/design-facts.js | 接口变更（validateDesignFileList 新函数） | 是（新 gate） |
| runtime | src/run/complete.js | 逻辑变更（brainstorm 末步接线清单核验） | 是（新 gate） |
| cli-entry | src/index.js | 逻辑变更（delta project + sidecar + 回执接线） | 否 |
| docs-consistency | src/docs-check.js | 逻辑变更（--fix 后失效计数） | 否 |
| runtime | src/archive-delta.js | 接口变更（withSummary + writeLastDeltaSidecar） | 否 |
| stages | src/run/scan-profile.js | 逻辑变更（scanResumeCheck advisory） | 否 |
| runtime | src/run/complete-handlers.js | 逻辑变更（归档 delta 处 sidecar 写入） | 否 |
| docs-consistency | src/scan-postcheck.js | 配置变更（supportedFixes 文案可执行化） | 否 |
| docs-consistency | NEW: test/ir-strict-mode.test.mjs | 新增 | 否 |
| docs-consistency | NEW: test/design-file-list-gate.test.mjs | 新增 | 否 |
| runtime | NEW: test/delta-scan-feedback.test.mjs | 新增 | 否 |
| docs-consistency | NEW: test/docs-fix-receipt.test.mjs | 新增 | 否 |

## 未匹配文件

（无——本变更文件全部命中模块索引；骨架阶段列出的 .claude/skills 等脏文件属并行 quick 批次，不属本变更。）

## 更新结果

| 模块文档 | 更新结论 |
|---|---|
| modules/runtime.md | done——严格模式闸门/P3b/P3a/design 清单 gate/sidecar 接线（verify-postcheck/gates/complete/complete-handlers/archive-delta/scan-profile） |
| modules/progress.md | done——getChangeCreatedAt 只读访问器 + facade 透传（change-registry.js/progress.js） |
| modules/docs-consistency.md | done——validateDesignFileList 新 gate + docs check --fix 回执 + supportedFixes 可执行化（design-facts/docs-check/scan-postcheck） |
| modules/stages.md | done——executeScanResumeCheck 增量 advisory（scan-profile.js，scan 步骤 4 noAI 动作内） |
| modules/cli-entry.md | done——delta project 同口径 + sidecar 写入 + 回执接线 + --suggest 退役（index.js） |
| modules/core-engine.md | done——IR_STRICT_SINCE 常量（constants.js） |
