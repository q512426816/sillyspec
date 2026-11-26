---
author: flow-machine-draft
created_at: 2026-11-11T08:09:40.599Z
---
# 设计记录（Design Record）— 2026-11-11-push-shell-token-tolerance

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两处代码修复，均在 `src/push.js`，加少量 `src/index.js` 渲染：

1. **参数容忍**：在 `parsePushArgs` 的现有循环内、flag 解析之后增加两级判定——遇到 `|`/`||`/`&&`/`;`/`&` 立即 `break`（shell 语义下当前命令参数到此结束，丢弃其后 token）；遇到 shell 重定向 token（`2>&1`、`1>&2`、`2>/dev/null`、`>nul`、裸 `>`/`>>`/`1>`/`2>` 及其目标文件等）则 `continue`（裸重定向符额外跳过后一个目标文件 token）。每次忽略/截断向 `warnings` 推一条可读告警。判定放在 flag 解析之后，保证 `--change <值>` 这类合法值不会被误剥离。返回结构增加 `warnings` 字段，由 `index.js` 在 human 模式打印。
2. **错误详情**：`pushBranch` 不再用 `stdio: inherit`（该模式让 `execFileSync` 拿不到 stderr，错误只剩 `Command failed` 首行）。改为默认 pipe 捕获，结束后把捕获的 stdout/stderr 转发到进程 stderr（human 模式）；失败时把 detail 合入错误信息，`--json` 模式保持 stdout 纯 JSON、不转发。

选择「循环内判定」而非「解析前整串预剥离」：预剥离会误吞 `--change 2>&1` 这类合法值（值位置还未被 flag 消费），内联判定天然尊重 flag 值消费顺序。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `parsePushArgs(argv)` 返回值由 `{ok, options}` / `{ok:false, errors}` 扩展为始终携带 `warnings: string[]`（向后兼容，现有调用方忽略该字段也可工作）。合法输入解析结果不变。
- `sillyspec push` 命令行为变化：代执行环境残留的 shell token 不再导致 exit 2，而是被忽略并在 stderr 打印告警；管道/链式控制符后的参数被丢弃。
- human 模式 git push 的输出改为「结束后转发」（不再实时逐行），成功与失败均转发到 stderr；错误信息包含底层 stderr。
- `--json` 模式输出格式与 stdout 纯净性不变。
- 无端点、无配置文件格式变化。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/push.js | parsePushArgs 容忍 shell token；pushBranch 捕获并透出完整错误 |
| 修改 | src/index.js | push 成功路径打印解析告警 |
| 修改 | test/push-plan.test.mjs | 新增解析容忍用例 |
| 修改 | test/push-cli.test.mjs | 新增 human 错误详情与 json 纯净用例 |
| 修改 | .sillyspec/changes/2026-11-11-push-shell-token-tolerance/tasks.md | 任务勾选证据 |

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 参数解析与顺序无关，控制符按“其后全部丢弃”的 shell 语义处理，与用户书写顺序一致。重定向 token 的识别是逐 token 判定，不依赖它们出现在开头或结尾；`--flag value` 的 value 在判定前已被消费，不会被误剥离。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 本次是纯解析逻辑与子进程输出捕获，不引入新的共享文件或状态。push 本身的文件锁、备份 ref、CAS 语义不变；转发输出只写进程 stderr，不触碰仓库状态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 解析阶段 fail-closed 行为不变（真正非法参数仍 exit 2）。pushBranch 捕获失败时仍抛错并由上层保留压扁结果与备份 ref，重试/undo 语义不变；输出转发不改变退出码。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 解析只作用于当前进程 argv，不读写跨仓数据；告警只输出到 stderr。多实例各自独立进程，无共享内存。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- **风险 1：误吞真实位置参数**。位置参数本来就被 fail-closed 拒绝；只有出现 shell 控制符或重定向 token 时才改变行为，且每次忽略都有告警可见。`--change 2>&1` 这类值因 flag 消费优先不受影响，已用测试钉住。
- **风险 2：human 模式输出不再实时**。`inherit` 改 pipe 后，pre-push hook 的输出在子进程结束后一次性显示，长时间 hook 期间终端安静。换取的是错误一次给全（本次用户实测痛点）；注释中明确记录该取舍。若未来需要实时 + 完整错误，可改用 `spawn` 流式转发，属后续优化。
- **死路：解析前整串预剥离 shell token**。会误吞 `--change`/`--base` 的值，放弃。
- **死路：只改提示文案不改行为**。用户诉求是「能执行」而非「看懂报错」，仅提示仍会阻断，放弃。
- **死路：human 模式失败后重跑一次带 pipe 的 push 以取错误**。可能产生二次推送副作用，放弃。
