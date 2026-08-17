---
author: qinyi
created_at: 2026-08-16T23:35:00+08:00
updated_at: 2026-08-16T23:35:00+08:00
---

# 符号影响面报告（Symbol Impact）— 并发状态分裂三坑修复

> execute「加载上下文」步落盘。逐 task 结论。

- task-01（marker 原子化）：改动 `src/run/stage.js`（:96-112 主写入点——execute 启动路径，**行为变更：失败从静默变 throw**）、`src/run/gates.js`（:444 补写点，gate 内 throw）、`src/run/prompt.js`（:518 补写点，console.error 降级）、`src/task-review.js`（:795 补写点，去 catch 静默保 fail-open）。**无导出符号签名变更**（均为函数内行为增强 + 新增 mkdir 调用）；`generateTaskReviewDrafts` 契约不变。
- task-02（applyByMerge 预对齐）：`src/worktree-apply.js` 的 `applyByMerge`（:717）内部新增预对齐步骤；**签名与返回结构不变**（result.errors/warnings 语义扩展 warning 项）。
- task-03（livingDocDrift）：`src/run/shared.js` docsCheckHint 结果对象**新增字段** `livingDocDrift`（向后兼容，消费方 quick-audit.js 输出）；复用 import `collectDocRefs`（docs-check.js 纯函数只读调用）。
- task-04（验证+文档）：无签名级变更。

影响面结论：零既有导出签名破坏；行为变更集中在 task-01 的失败语义（静默→分层显性，D-001@v1 设计内）。既有 211 测试中若断言静默行为的需同步适配（task-01 已声明）。
