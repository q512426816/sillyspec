---
id: task-03
title: 'Unify report output to stdout (FR-5)'
title_zh: '报告出口统一 stdout——index.js 报告段 console.error→console.log（D-005）'
author: 'qinyi'
created_at: 2026-09-08 09:37:00
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-005@v1]
allowed_paths:
  - src/index.js
target_files: [src/index.js]
goal: >
  非 JSON 模式下 docs check 失效清单/重锚报告/修复回执/修复指引从 console.error 改 console.log；
  stderr 仅留 ⚠️ 诊断（console.warn）与配置错误（exit 2 路径）。gate 零改动面（Grill 实证已在 stdout）。
implementation:
  - index.js docs check 分支（~1622-1655）：报告段所有 console.error → console.log（失效清单条目/重锚报告/修复回执/修复指引五行）
  - 保留 console.error：配置错误 DocsCheckConfigError catch（exit 2）
  - 保留 console.warn：⚠️ warnings（keywordAssert 关闭提示、变更名 advisory）
  - --json 分支不动（console.log JSON.stringify 已是 stdout）
  - exit code 逻辑不动
acceptance:
  - docs check 失败时 stdout 捕获含「❌ docs check: N/M 处引用失效」
  - 同场景 stderr 不含失效清单（仅 ⚠️ 行或为空）
  - --json 输出与改前逐字节一致
  - exit code 语义不变（0/1/2）
verify:
  - node --check src/index.js
  - 测试在 task-04（子进程断言通道）
constraints:
  - 文本内容逐字不变（只改通道）
  - console.warn 的 ⚠️ 行不改（属诊断非报告）
  - gate 分支不动（Grill 实证已在 stdout）
---

## 上下文

design.md §总体方案 Phase 1 报告出口段；用户 2026-09-08 实证痛点（capture_output 只读 stdout 拿空）。
