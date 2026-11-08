---
author: flow-machine-draft
created_at: 2026-11-08T03:17:55.344Z
---
# 设计记录（Design Record）— 2026-11-08-flow-askuser-confirm

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

轻量变更目前没有完整流程的 wait 机制（`run <stage> --wait --json`），断点①②③只提示「把结果给用户看」，Agent 于是用纯文字提问等回复。本变更只在教导面（CLI 输出文案 + skill + 命令卡）补强约束：凡向用户征询确认/选择，必须用 AskUserQuestion 工具呈现选项，禁止纯文字问答。

改动面四处：`src/flow.js` 主 start 横幅（断点①、【你要做的】、三断点纪律、恢复简报）与 adopt 路径断点①；`assets/command-cards/flow.md` 的断点①说明；`.claude/skills/sillyspec-flow/SKILL.md` 断点①段落；两测试文件补文案断言。不改流程状态机、不新增 CLI 参数、不新增 JSON 契约。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无命令签名 / 参数 / 文件格式变化；只改 CLI 人类可读输出文案与 skill/命令卡文本。新增断言：`test/flow-order-canon.test.mjs`（横幅与 skill 含 AskUserQuestion）、`test/flow-checkpoints.test.mjs`（三断点纪律含 AskUserQuestion）。既有断言锚保持不变：「三断点纪律（顺序纪律：①未过不动码」「spec 断点」「执行断点」「归档断点」「flow approve」「补 spec 面」。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——纯文案，不承载状态；任何时刻读到的都是同一份静态指引。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用——无共享数据写入；多会话各自读 CLI 输出互不影响。文案改动若与其他会话的 flow.js 改动冲突，按显式 pathspec 提交、以最新态重跑测试判别。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用——不改变 flow 生命周期状态机；断点①②③的机器门（approve/实测）行为不变。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用——文案为项目内全局指引，不涉及跨仓/跨工作区数据。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险：文案约束对不读 CLI 输出的 Agent 无效；缓解为同时落到 skill 与命令卡，三面覆盖。另一风险是文案变长挤占测试切片窗口（flow-order-canon ① 用 400 字符切片），需同步放大切片并确保既有断言仍命中。

放弃方案：① 给 flow 增加 `--wait --json` 式结构化问询——需引入 flow 级 wait 状态机，属功能级改造、超出本次小调整范围；② 只改 skill 不改 CLI 文案——实证 Agent 常直接跑 CLI 不加载 skill，约束会落空；③ 提升为项目通用规则（CLAUDE.md/AGENTS.md）——影响面超出轻量变更，且用户需求限定轻量变更确认/批准环节。

## 文件变更清单

| 操作 | 路径 | 说明 |
|------|------|------|
| 修改 | src/flow.js | 断点① / 【你要做的】/ 三断点纪律 ①②③ / 恢复简报 / adopt 路径 / verify-drafts / flow done 拦截 / 归档断点 / 拒绝通道文案注入 AskUserQuestion 约束 |
| 修改 | assets/command-cards/flow.md | 命令卡断点①说明补 AskUserQuestion 与三选项 |
| 修改 | .claude/skills/sillyspec-flow/SKILL.md | skill 断点①段落补 AskUserQuestion 用法 |
| 修改 | test/flow-order-canon.test.mjs | 新增横幅/恢复简报/命令卡/skill 含 AskUserQuestion 断言，切片 400→700 |
| 修改 | test/flow-checkpoints.test.mjs | 新增三断点纪律含 AskUserQuestion 与禁纯文字断言 |

