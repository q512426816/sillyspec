---
schema_version: 1
doc_type: module-card
module_id: skills-docs
author: zcode-pitfall-clearance-1015
created_at: 2026-10-15T08:40:00+08:00
---

# skills-docs

## 职责

随包分发的 Agent skill 文档面——`.claude/skills/` 下各阶段 SKILL.md（sillyspec-brainstorm /
sillyspec-plan / sillyspec-execute 等）：阶段操作指引、Stage Review 产物契约（目录命名/字段/
docHash）、review.json 写入路径口径。

## 定位

Agent 侧的第一手操作文档（安装 sillyspec 后落入消费仓 .claude/skills/）。口径必须与 CLI 实际
校验逻辑同源：stage-review 目录命名（2026-10-15-pitfall-batch-clearance 统一为「目录名 =
`<stage>-` + marker 值原样」，读侧 resolveStageReviewDir 容错错位目录）、命令示例、字段清单。

## 边界

- 只读文档面，无运行时逻辑；行为真相源在 src/stage-review.js 等实现
- 改口径必须与实现同步（否则重演 stage-review-dir-naming-mismatch 三方不一致坑）
