---
author: qinyi
created_at: 2026-06-19T12:40:00+08:00
---

# Conventions

## ESM Only

项目 `"type": "module"`，所有 `.js` 文件使用 ES Module（`import`/`export`），禁止 CJS `require()`。`.cjs` 文件除外（如 git hooks）。

最低 Node.js 18，可安全使用 `fs/promises`、`structuredClone`、`fetch` 等原生 API。

## Naming

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `change-list.js` |
| 函数名 | camelCase | `parseFileChangeList` |
| 导出类 | PascalCase | `DB`、`ProgressManager` |
| 常量/配置 | UPPER_SNAKE_CASE 或小写字符串 | `SCAN_STATUS` |

## Error Handling

- CLI 层：`process.exit(1)` 终止并打印错误信息
- 业务逻辑层：抛出具体错误消息字符串，由调用方捕获
- 数据库操作：`DB` 类封装错误处理
- 无自定义 Error 类，使用原生 `Error` 或字符串消息

## Logging

- `console.log` / `console.error` / `console.warn` 直接输出
- 用户友好提示用 `chalk` 着色
- 进度展示用 `ora`（spinner）
- 交互式提示用 `@inquirer/prompts`

## CLI Entry

`bin/sillyspec.js` → `src/index.js`，所有命令通过 `main()` 函数分发。单入口，不使用 bin 多文件。

## Zero Config Init

`sillyspec init` 自动检测开发工具（Claude Code、Cursor 等），非交互式默认。`sillyspec init --interactive` 保留完整引导。
