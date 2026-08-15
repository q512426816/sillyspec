---
id: task-01
title: 抽离校验核心模块
title_zh: 抽离校验核心模块
author: qinyi
created_at: 2026-08-15 16:16:00
priority: P0
depends_on: []
blocks: [task-02, task-04, task-05]
allowed_paths:
  - src/docs-check.js
repo: main
goal: >
  从 test/doc-ref-check.test.mjs 抽离两层校验核心到独立模块 src/docs-check.js：
  纯函数（collectDocRefs/validateRefLine/looksLikeCodeSymbol/候选解析三段回退/glob walker）
  + IO 入口 runDocsCheck。检测力与现有测试完全一致（D-007 两层全保留）。
implementation:
  - 抽 REF_RE 引用提取正则为 collectDocRefs（全文扫描，D-006）
  - 抽候选解析三段回退（仓库根相对 → src/ 前缀重试 → 裸文件名 src/ 全树递归）
  - 抽 looksLikeCodeSymbol + ±5 行窗口关键词断言为可配项（keywordAssert）
  - 手写 glob walker（**/* 两形态 + skip 排除 + 复杂 glob 抛错，D-008；maxDepth 兜底；Windows 路径归一化）
  - runDocsCheck({ projectRoot, paths }) 入口返回 { ok, total, invalid, warnings }
acceptance:
  - 纯函数无 fs 依赖（glob walker 与 runDocsCheck 除外）
  - 候选解析行为与现测试一致（同输入同输出）
verify:
  - npm test（既有套件不回归）
  - node --test test/docs-check.test.mjs（task-04 落地后）
constraints:
  - 不引 glob 依赖（D-008）
  - Windows 路径分隔符归一化（规则 13）
---

## 验收标准

- collectDocRefs 对现有 dogfood 文档提取的引用集合与旧实现一致
- 候选解析三段回退顺序与现测试一致
- glob walker 支持 docs/**/*.md 与字面路径；复杂 glob exit 2
- keywordAssert=false 时 warnings 提示且不校验关键词
