---
author: flow-machine-draft
created_at: 2026-10-19T02:39:15.721Z
---
# 设计记录（Design Record）— 2026-10-19-init-drop-gemini-opencode

## 做法概述

下线 GEMINI.md / INSTRUCTIONS.md 两份专属指令文件的生成面，gemini/opencode 工具类型保留。src/init.js 三点改动：删 `INSTRUCTION_TOOLS`/`INSTRUCTION_FILE_MAP` 常量与 `injectInstructions` 导出及 doInstall 里的注入循环（这是写这两文件的唯一路径）；AGENTS.md 注入条件从 claude/codex/zcode 扩到含 gemini/opencode（选中即落 AGENTS.md，同源同全文）；TOOL_LABELS 去掉「(通过 GEMINI.md)/(通过 INSTRUCTIONS.md)」后缀。依据：OpenCode 官方默认指令文件已是 AGENTS.md（opencode.ai/docs/rules），INSTRUCTIONS.md 属旧口径；AGENTS.md 是本仓既定跨工具内容源。Gemini CLI 现仍默认 GEMINI.md（AGENTS.md 未全面原生）——对 gemini 而言 AGENTS.md 是可查规则源，用户可自行在 GEMINI.md 引用，边界记入 file-lifecycle。

范围修正留痕：初版方案（2026-10-19 首稿）曾按「移除 gemini/opencode 工具类型」设计，用户澄清后收窄为「只去两文件生成、类型保留」——本稿为修正版。

## 接口契约

- CLI 行为：`--tool` 合法值不变（七值）；`--tool gemini`/`--tool opencode` 仍可选中，产物变化 = 不再产出 GEMINI.md/INSTRUCTIONS.md、改为产出 AGENTS.md（完整指引）；opencode 的 `.opencode/skills` 复制不变。
- src/init.js 导出：删 `injectInstructions(tool, projectDir)`；`injectAgentsInstructions`/`injectClaudePointer`/`detectTools`/`cmdInit` 签名不变。
- detectTools 识别信号不变（GEMINI.md/INSTRUCTIONS.md 在场仍反推 gemini/opencode——老安装重跑 init 时据此选中并刷新 AGENTS.md）。
- 文件系统可见行为：init 不再创建/改写项目根 GEMINI.md 与 INSTRUCTIONS.md；既有文件不迁移不清理。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用——静态产物面收缩，无事件/输入流。唯一「迟到」形态是老安装里已存在的 GEMINI.md/INSTRUCTIONS.md：设计为不触碰（见接口契约），detectTools 仍识别它们为 gemini/opencode 信号，重跑 init 走 AGENTS.md 注入，无顺序依赖。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   不变——删的是 init 进程内同步写路径，且被删面正是会写这两文件的唯一写入方；AGENTS.md 注入路径是既有单写方路径的扩用，并发写面只减不增。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   老安装升级后重跑 init：GEMINI.md/INSTRUCTIONS.md 保持原样（受管段停留旧版本不再刷新，下线语义，file-lifecycle 记边界），AGENTS.md 照常注入/升级。CLI 单命令进程，无会话态可中断。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   注入目标均为项目根单文件、按目录隔离，无跨仓串面；detectTools 目录级检测不变；agent-session-log 的 opencode 探测器（数据目录级、平台日志协议）不动，与 init 工具面无共享状态。

## 风险与死路

最大风险：Gemini CLI 用户选中 gemini 后 AGENTS.md 不被其自动加载（该 CLI 现默认 GEMINI.md），规则「看得见但没生效」——缓解：file-lifecycle 明写边界与自行引用办法；相比继续生成 GEMINI.md，这是用户明确要求的取舍。放弃的方案：①连同 gemini/opencode 工具类型一起下线（初版方案）——用户澄清否决，类型要保留；②选中 gemini/opencode 时什么都不生成——工具类型变成空壳选项（gemini 无 skills 目录，选中即零产物），AGENTS.md 落点至少保留规则源与 opencode 的原生加载；③保留 injectInstructions 但改成写 AGENTS.md——绕一圈等价于方案②的扩用，徒留死代码。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/init.js | 删 INSTRUCTION_TOOLS/INSTRUCTION_FILE_MAP/injectInstructions/注入循环；AGENTS.md 注入条件扩含 gemini/opencode；TOOL_LABELS 去文件后缀；injectFullInstructions 注释同步 |
| 改 | test/init-tool-multi.test.mjs | 增 Test 5：--tool gemini,opencode → 不产两文件、产 AGENTS.md |
| 改 | test/init-agents-injection.test.mjs | 删 Cases 12-14 与 injectInstructions import，头注释同步 |
| 改 | README.md | 工具表 OpenCode/Gemini 行产物位置改 AGENTS.md 口径 |
| 改 | docs/sillyspec/file-lifecycle.md | GEMINI.md/INSTRUCTIONS.md 条目改为下线留痕 + gemini 加载边界 |
| 改 | docs/sillyspec/platform-interface-map.md | init.js 行号锚随删行重定位（doc-ref-check 保绿） |
| 改 | .sillyspec/docs/sillyspec/scan/CONVENTIONS.md | init.js:301 行号锚同步漂移 |

实查修正：.sillyspec/docs/sillyspec/scan/PROJECT.md 不在清单——其「支持的 AI 工具」表只列 skills 落点（OpenCode 行 = `.opencode/skills/`，属保留面，零变更）；docs/sillyspec/scan/PROJECT.md 同口径不动。
