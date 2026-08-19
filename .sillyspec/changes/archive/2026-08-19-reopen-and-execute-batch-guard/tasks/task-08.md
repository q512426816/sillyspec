---
id: task-08
title: parse-conflicts-from-git-apply-stderr
title_zh: 解析 git apply 错误输出中的冲突列表
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-06]
decision_ids: []
allowed_paths:
  - src/worktree-apply.js
provides: {}
expects_from: {}
goal: >
  apply 3way 冲突时不再静默吞掉冲突文件列表，解析 git 原始错误提取冲突文件
implementation:
  - worktree-apply.js 629 行捕获 git apply 抛错时的 stderr
  - rollbackApply 函数扩展接受原始错误信息参数
  - 解析 stderr 中的 conflict 行
    - error: patch failed <file>
    - <file> does not exist in index
    - CONFLICT <content> <file>
  - 解析结果与现有 git status --diff-filter=U 探测合并
  - 双源皆空时打印原始 stderr 尾部（截 800 字符）
acceptance:
  - 冲突错误信息必含文件列表或原始 stderr
  - 不再只报（未能获取冲突文件列表）
  - status 探测与 stderr 解析结果去重合并
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - stderr 解析容错，解析失败不抛错
  - 原始 stderr 较长时只打印尾部，避免淹没关键信息
related_tests: []

---
