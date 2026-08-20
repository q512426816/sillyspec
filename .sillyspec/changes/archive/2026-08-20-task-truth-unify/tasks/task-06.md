---
author: qinyi
created_at: 2026-08-20T11:55:00+08:00
id: task-06
title: 文档三线同步 + 全量回归
title_zh: 文档三线同步与全量回归收口
priority: P1
goal: file-lifecycle/docs-prompt/skills 三线一致；全量测试 lint 绿；审计清单终验无遗漏
implementation: 按 CLAUDE.md 两节同步规则更新 file-lifecycle、_extract.mjs 再生六镜像、五技能同步、模块文档索引补录；npm test+lint 全量；task-01 清单逐项勾对
acceptance: 三线文档一致；npm test 0 失败+lint 通过；清单逐项勾对记录在本卡
verify: npm test + npm run lint 全量通过，并以 grep 复核文档无旧契约残留
constraints: 文档改动以源码为准机械同步（prompt 镜像禁手改正文）
depends_on: [task-03, task-04, task-05]
blocks: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/_extracted.json
  - docs/prompt/brainstorm.md
  - docs/prompt/brainstorm-auto.md
  - docs/prompt/plan.md
  - docs/prompt/execute.md
  - docs/prompt/verify.md
  - docs/prompt/archive.md
  - .claude/skills/sillyspec-brainstorm/SKILL.md
  - .claude/skills/sillyspec-plan/SKILL.md
  - .claude/skills/sillyspec-execute/SKILL.md
  - .claude/skills/sillyspec-verify/SKILL.md
  - .claude/skills/sillyspec-archive/SKILL.md
  - .sillyspec/docs/sillyspec/modules/stages.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
---

# task-06: 文档三线同步 + 全量回归

## 修改文件（必填）
- `docs/sillyspec/file-lifecycle.md`：tasks.md/plan.md 生命周期与契约描述更新（brainstorm 骨架→plan 展开写回→execute 双路勾选→verify 对照→archive 校验）
- `docs/prompt/`：跑 `node docs/prompt/_extract.mjs` 再生 + 五文件镜像替换（brainstorm/plan/execute/verify/archive）
- `.claude/skills/` 五技能：勾选与文件指向同步
- 模块文档 `modules/stages.md`、`modules/runtime.md`：变更索引补录本变更

## 实现要求
1. 按 CLAUDE.md「文件生命周期文档同步」「提示词文档同步」两节规则执行
2. 全量回归：npm test + npm run lint 全绿
3. 终验：task-01 审计清单逐项核对（读/写方向全部指向 tasks.md 或保持 plan.md Wave 结构），无遗漏项

## 验收标准
- [ ] file-lifecycle/docs/prompt/skills 三线一致
- [ ] npm test 全量 0 失败 + lint 通过
- [ ] 审计清单逐项勾对记录在本卡
