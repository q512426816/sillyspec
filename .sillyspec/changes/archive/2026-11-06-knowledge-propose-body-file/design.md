---
author: flow-machine-draft
created_at: 2026-11-06T14:29:33.291Z
---
# 设计记录（Design Record）— 2026-11-06-knowledge-propose-body-file

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 `cmdPropose`（src/stages/knowledge.js:534-590）的参数解析段新增 `--body-file <路径>`：与既有 `--title/--category/--body/--from` 同款 indexOf 取值，读文件（readFileSync utf8）作 body，后续 slug 生成/frontmatter 拼接/writeAtomicSync 落盘全部复用既有 --body 路径零改写。校验序前置：`--body` 与 `--body-file` 同给 → `body_source_conflict`；文件不存在 → `body_file_missing`；读抛错 → `body_file_read_failed`——三类错误全部在 `mkdirSync(proposedDir)` 之前返回，错误路径零目录创建零落盘。选该方案是因为它是平台会话工具反馈原话建议的形态（「支持 --body-file 从文件读正文，彻底绕开命令行传参」），且是唯一同时规避「命令行长度上限」与「策略层对命令行文本的误判」两个问题的通道——正文不经过 argv。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- CLI 子命令参数新增：`sillyspec knowledge propose --title <t> [--body-file <路径>] [--body <文本>] [--category <c>] [--from <f>]`；`--body` 与 `--body-file` 互斥。
- 输出 JSON 新增三个失败错误码：`body_source_conflict`（两源同给）、`body_file_missing`（路径不存在，附 path）、`body_file_read_failed`（读取抛错，附 reason 摘要）——形态对齐既有 `{ code, ...详情 }` 的 error 对象（如 knowledge_dir_missing）。
- `--body-file` 相对路径按进程 cwd 解析（readFileSync 直读，不做 specDir/知识库目录拼接）——与 CLI 其余文件参数（如 docs-check 基线路径）口径一致。
- 函数签名零变化：cmdPropose(dir, args, opts) 不变；无导出面变化。
- 帮助文案两处同步：cmdKnowledge --help 的 propose 行、src/index.js:156-160 usage 的 knowledge 行。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   答：成立。参数取值用 indexOf 与 argv 顺序无关（同款重复参数「最后一次 indexOf 命中」既有语义保持）；正文文件为一次性快照读（校验通过后单次 readFileSync），读取后源文件再被修改不影响本次落盘内容；无事件流无迟到概念。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   答：与既有 --body 路径完全一致——writeAtomicSync 原子写同 slug 文件后写覆盖先写（输出 action: updated），无撕裂；并发不同 slug 互不干扰。本变更未新增并发面（读源文件发生在写盘之前，源文件是调用方自备的临时/既有文件，不与本命令的写盘目标重叠——proposed/ 目录不是合理的 --body-file 输入，即便误传也只是读到旧内容，不构成竞态）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   答：安全。三类参数错误在 mkdirSync 之前早退（零目录零文件）；读文件失败同样早退；唯一写盘点 writeAtomicSync 要么完整要么不落（既有原子写保证）。中断窗口内无半成品状态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   答：不会。--body-file 路径由调用方显式给出、按进程 cwd 解析，不与 specDir（opts.specDir 优先的 .sillyspec 定位）发生任何拼接；落盘目标 proposed/ 沿用 resolveKnowledgeDir 既有作用域逻辑零改动。跨平台路径（Windows 盘符/反斜杠）由 readFileSync 原生处理，无需归一。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：错误码误吞真实故障——`body_file_read_failed` 把权限/编码等异因归并为一码，排查时只看码不够。缓解：error 对象附 reason 摘要（err.message），不裸吞。放弃的方案：① `--body-file -` 读 stdin——Windows 下 agent 子进程 stdin 编码形态复杂（PowerShell/Bash 管道行为不一致），且「文件路径」对 agent 调用方（先 Write 正文文件再调 CLI）是最简单通用形态，放弃；② 支持 `--body-file` 与 `--body` 调用时合并拼接——语义含糊（谁先谁后无共识），显式互斥报错优于隐式约定，放弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/knowledge.js | cmdPropose 加 --body-file 解析/互斥/错误码；cmdKnowledge --help 文案补 --body-file |
| 修改 | src/index.js | 顶部 usage 的 knowledge propose 行补 --body-file |
| 新增 | test/knowledge-propose-body-file.test.mjs | 五组用例：主路径/互斥/错误码/既有零回归/文案同步 |
