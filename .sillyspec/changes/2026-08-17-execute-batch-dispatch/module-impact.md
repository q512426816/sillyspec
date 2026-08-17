---
author: qinyi
created_at: 2026-08-17 16:53:00
---

# 模块影响分析

## 变更：2026-08-17-execute-batch-dispatch

## 模块影响矩阵
| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| stages | prompt 行为变更 | src/stages/execute.js | buildWavePrompt 调度指令改 batch 模式（默认独立 + 三条件合并 ≤3；审查职责不变；并行铁律改写） | false |
| stages | 文档同步 | .sillyspec/docs/sillyspec/modules/stages.md | 变更索引追加本条目（task-03） | false |
| dispatch | 测试增强 | test/dispatch/execute-dispatch-integration.test.mjs | 新增 batch 调度断言（不改 src/dispatch/ 源码） | false |

## 未匹配文件
| 文件路径 | 说明 |
|----------|------|
| .sillyspec/changes/2026-08-17-execute-batch-dispatch/* | 本变更四件套/plan/TaskCard（变更目录自身） |
| docs/prompt/_extracted.json | prompt 镜像再生产物（task-03，机械生成） |
| docs/prompt/execute.md | prompt 人类可读镜像（task-03，逐字替换） |
| docs/prompt/index.html | prompt 站点镜像（task-03，_build-site.mjs 机械生成） |
| .claude/skills/sillyspec-execute/SKILL.md | 对外 SKILL 调度描述核对（task-03，对外纯净性约束） |

## 说明
源码改动集中在 stages 模块单文件（execute.js）；dispatch 模块仅测试文件触及，无 src 改动。docs/prompt 镜像三件为机械再生（源=src/stages/execute.js），不构成独立语义面。
