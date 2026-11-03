---
author: flow-machine-draft
created_at: 2026-11-03T16:19:02.103Z
---
# 设计记录（Design Record）— 2026-11-04-knowledge-search-positional

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 `src/stages/knowledge.js` 的 `cmdSearch` 参数解析段加位置参数回退：`--query` 缺失时，扫描 args 取**首个非 flag 且非 flag 值**的 token 作查询词。选 CLI 兼容而非「只改文档」的原因：AGENTS.md 由 init 分发且「重跑 init 同版本不更新」，存量各仓的 `search "<关键词>"` 写法只有 CLI 侧兼容才能一次性全部变真；反向（全量改文档）治不了存量。模板文本（templates/agents-instruction.md）零改动即为真；主 CLI help（index.js knowledge 段）现只展示 `--query` 形态，补位置参数为首要形态使各面一致。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `cmdSearch(dir, args, opts)` 签名不变；args 解析语义扩展：`['词']`、`['--limit','2','词']`、`['词','--limit','2']` 均合法（词=查询词）。
- 优先级：`--query` 存在且值合法时压过位置参数；flag-as-value（`--query --limit`）仍按缺参。
- 位置参数扫描规则：跳过 `--` 开头 token 及 `--limit` 的值 token；`--include-resolved` 为布尔 flag 无值。查询词以 `--` 开头时不支持位置形态（必须走 `--query`）。
- CLI 可见面：`sillyspec knowledge search "<关键词>"` 新增合法形态；`--query` 兼容不变；退出码/输出 JSON 载荷形态不变。
- 涉及文件：src/stages/knowledge.js（解析段 + 子 help 行微调）、src/index.js（knowledge 段 help 行）、test/knowledge-search-positional.test.mjs（新增）。AGENTS.md 模板与两仓既有 AGENTS.md 零改动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   参数序任意（位置词在前/在后、flag 在中间）均由同一扫描器归一——扫描与 `--query` 判定独立，不存在顺序敏感分支；无运行期事件流，不适用乱序。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   纯只读命令（检索 + console 输出），无落盘面；知识库文件并发修改由既有读侧语义覆盖，本变更不新增写面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   无状态（单次进程调用即出即走）；中断无残留（不写 .runtime）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   解析只作用于本次 args 数组；`--spec-dir` 等跨仓参数路径不变，无跨工作区串面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：位置参数扫描误拾 flag 值（如 `['--limit', '2']` 把 `2` 当查询词）——以「跳过已知 flag 的值 token」防护，且仅在 `--query` 缺失时扫描。放弃的方案：① 只改文档（AGENTS.md/help 全部改成 `--query`）——存量仓 AGENTS.md 不随 init 刷新，逐仓手改不可持续，且位置形态对 agent 更自然（4 处文档已在用）；② 引入通用 argv 解析库/通用 parser 重构整个 knowledge 子命令面——单命令三 flag 的面不值得引入解析框架，最小解析器即可闭合。
