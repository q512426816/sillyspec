---
author: qinyi
created_at: 2026-08-13 13:35:00
plan_level: light
---

# 实现计划（Plan）— quick --done 同文件并发检测 + hunk 分离提示

## 概述
方案 A（hash 对比）：guard.json 加 `allowedFilesHash` + `auditQuickCompletion` 末尾检测 warn（advisory）。详见 design.md。Task 卡片详情见 `tasks/task-NN.md`。

## Wave 1: task-01（录 hash）

- [x] task-01: stage.js step1 录 allowedFilesHash

## Wave 2: task-02（检测 warn，depends_on task-01）

- [x] task-02: shared.js auditQuickCompletion 同文件并发检测 + warn

## Wave 3: task-03 + task-04（文档 + 测试）

- [x] task-03: 文档同步 file-lifecycle + SKILL
- [x] task-04: 补 test/quick-same-file-concurrent.test.mjs

## Wave 4: task-05（验证）

- [x] task-05: 验证 npm test + lint

## 依赖关系
- task-02 depends_on task-01（allowedFilesHash 数据依赖）
- task-03 depends_on task-01 + task-02
- task-04 depends_on task-02
- task-05 depends_on task-01..04
