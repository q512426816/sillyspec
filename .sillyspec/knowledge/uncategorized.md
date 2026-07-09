---
author: qinyi
created_at: 2026-06-04 16:55:00
---

# 未分类知识

> execute/quick 执行中发现的坑暂存于此，用户审阅后归类到对应文件并更新 INDEX.md。

## ql-20260604-001-7a4c | hook 依赖必须显式存在

`src/hooks/worktree-guard.js` 会被测试直接以 ESM 导入。不要在 hook 中引入 `package.json` 未声明的外部包；简单本地配置解析优先使用项目内已有实现或标准库，否则 `npm test` 会在导入阶段失败。

## ql-20260709-001-m1i1 | parseSimpleYaml 缩进判断必须用原始 line 而非 trimmed

`src/sync.js` 的 `parseSimpleYaml` 判断「行是否为缩进子段」时必须用原始 `line.startsWith(' ')`，不能用 `trimmed.startsWith(' ')`——trimmed 已 `.trim()` 去掉前导空格，`startsWith(' ')` 恒为 false，导致所有缩进子段（如 `platform:` 下的 `url`/`token`/`last_connected`）被误判为 root 行，section 恒解析为空 `{}`。后果：`SyncManager._getPlatform()` 返回 `{}`，`sync`/`syncDocuments`/`checkApproval`/`approve`/`reject` 的 `platform.url` 为 undefined，所有平台请求必失败。机器接口 v1 变更（2026-07-09，task-05）修复此 pre-existing bug。建议归类到 known-issues.md 或 patterns.md（配置解析）。

## ql-20260709-002-a7c3 | Windows 下 process.exit 触发 UV_HANDLE_CLOSING assertion 覆盖退出码

CLI 命令用 `process.exit(exitCode)` 强制退出时，若事件循环仍有未关闭的异步 handle（如 ProgressManager 的 sql.js db、dynamic import 残留），Windows 上会触发 `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`（src/win/async.c），把正确的 exitCode 覆盖成 127，破坏 daemon 依赖的退出码契约（0/1/2）。解法：用 `process.exitCode = exitCode` + `break`/return 让进程自然排空退出（与 sync.js approve/reject 一致风格）。机器接口 v1 的 gate/derive 路由（src/index.js task-03）踩此坑并修复。建议归类到 known-issues.md（平台特定坑）。

## ql-20260709-003-d5e9 | validateTaskReviews 真实签名是单 opts 解构，非 (changeDir, {gitDir})

`src/task-review.js` 的 `validateTaskReviews(opts)` 是**单个 opts 对象解构** `{ planContent, runtimeRoot, executeRunId, allowCannotVerify=true, changeDir=null, gitDir=null }`，返回 `{ ok, errors, warnings, requiredEvidence }`。task 蓝图/文档常误写为 `validateTaskReviews(changeDir, {gitDir})`。聚合调用（如 gate/derive）需自行组装：planContent 读 `changes/<c>/plan.md`、runtimeRoot = specBase/.runtime（或平台 runtimeRoot）、executeRunId 从 `<runtimeRoot>/current-execute-run-id-<changeName>` 读、gitDir 优先 WorktreeManager.getMeta().worktreePath（校验 mode!=='in-place-fallback'）。现成范式见 `src/run.js:3223-3249` 与 `src/machine-interface.js` runGate/runDerive。建议归类到 patterns.md（task-review 调用范式）。
