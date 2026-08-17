---
author: qinyi
created_at: 2026-08-17 10:30:00
updated_at: 2026-08-17 10:30:00
---

# 符号影响面分析

## 检查方法

- `rg "closeQuickLinkedChanges|isChangeTasksComplete|closeSingleQuickLinkedChange" src/`：确认当前代码无同名符号。
- `rg "import.*complete-handlers" src/`：确认现有 import 路径，task-01 新增导出函数不会改现有 import 语句。
- 人工复核各 task 涉及的文件与变更类型。

## 各 task 结论

| task | 变更类型 | 受影响调用点 | 是否在 allowed_paths 内 | 说明 |
|---|---|---|---|---|
| task-01 | 新增导出函数 `closeQuickLinkedChanges` + 内部辅助函数 | 当前无外部调用点；task-02 将在同文件内调用 | 是（`src/run/complete-handlers.js`） | 新增符号，无现有调用点破坏 |
| task-02 | 同文件内调用新增函数 | `handleQuickStageCompletion` 内部调用 `closeQuickLinkedChanges` | 是（`src/run/complete-handlers.js`） | 无函数签名级变更 |
| task-03 | 修改 prompt 字符串 | 无 | — | 不涉及代码签名 |
| task-04 | 新增测试文件 | 无 | — | 不涉及 src 签名 |
| task-05 | 修改文档 / 刷新 prompt 镜像 | 无 | — | 不涉及代码签名 |
| task-06 | 运行测试与提交 | 无 | — | 不涉及代码签名 |

## 总体结论

- 无 class 构造函数参数变更。
- 无 interface / DTO / API client 方法签名变更。
- 无现有函数/方法签名变更（仅新增函数）。
- 新增导出函数调用点仅在 `src/run/complete-handlers.js` 内部，已被 task-01/task-02 覆盖。
- 无需扩展 allowed_paths。
