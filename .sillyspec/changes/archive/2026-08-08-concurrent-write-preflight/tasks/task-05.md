---
id: task-05
title: full regression + doc sync assessment
title_zh: 全量回归测试 + 文档同步评估
author: qinyi
created_at: 2026-08-08 13:16:00
priority: P0
depends_on: [task-01, task-02, task-03, task-04]
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-006@v1, D-007@v1]
allowed_paths:
  - src/run/concurrent-detect.js
---

## goal
> 跑 npm test 与 npm run lint 全量回归确保零回归，评估是否触发 file-lifecycle/prompt/SKILL 文档同步，措辞对齐 D-006。

## implementation
- npm test 全量跑，确认含新增 2 测试文件且既有套件零回归
- npm run lint 通过
- 评估文档同步：本变更无新阶段/步骤/输出文件/prompt/SKILL 改动（只加 warn），预期无 file-lifecycle/prompt/SKILL 同步；如实记录评估结论
- 措辞检查（D-006）：warn 文案与验收文案用「完成时报告」或注明时机，不用误导的「写前预检」
- D-007 verify/archive 排除理由写入评估结论（verify 产物校验 fail-closed、archive 低频，留 fast-follow）

## acceptance
- npm test 全绿（EXIT 0，含 concurrent-detect 与 concurrent-preflight-hooks 两新文件）
- npm run lint 通过
- 既有测试零回归
- 文档同步评估有结论（预期无改动，记录理由）
- 措辞对齐 D-006（无「写前预检」误导）

## verify
- npm test
- npm run lint

## constraints
- 回归类 task，allowed_paths 填被验证的关键入口 concurrent-detect.js（无源码改动）
- 若评估发现确需文档同步，补改并重跑测试
- 不为通过测试而改测试（规则11）
