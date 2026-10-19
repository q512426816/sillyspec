---
author: flow-machine-draft
created_at: 2026-10-19T02:39:15.721Z
---
# 提案书（Proposal）— 2026-10-19-init-drop-gemini-opencode

## 动机

任务原话转写：init 移除 gemini/opencode 工具支持

动机：用户要求工具矩阵瘦身——init 不再提供 gemini（GEMINI.md）与 opencode（INSTRUCTIONS.md）两个工具选项，不再生成/注入这两份指令文件。选道依据：上一轮已定位 init.js 工具映射面（VALID_TOOLS/INSTRUCTION_FILE_MAP/detectTools/skills 目录），需求已含决策。

成功标准（用户 2026-10-19 范围修正后口径——去掉的是两文件生成，不是 agent 类型）：
- init 不再生成/注入 GEMINI.md 与 INSTRUCTIONS.md（gemini/opencode 工具类型保留）
- 选中 gemini/opencode 时指引落点统一并到 AGENTS.md（OpenCode 原生读 AGENTS.md；Gemini CLI 加载边界记 file-lifecycle）
- 相关测试与文档（README/file-lifecycle/scan）同步，测试面跑绿
- 边界：VALID_TOOLS/交互列表/detectTools/.opencode skills/agent-session-log 探测器全部不动

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. init 不再生成/注入 GEMINI.md 与 INSTRUCTIONS.md（既有文件不迁移不清理）
2. gemini/opencode 选中后改产 AGENTS.md（同源同全文注入器）
3. 相关测试与文档（README/file-lifecycle/scan/行号锚）同步，测试面跑绿
4. 边界：工具类型、检测分支、skills 复制、会话日志探测器不动

## 成功标准（可验证）

1. `sillyspec init <dir> --tool gemini,opencode --no-skills` 后项目根无 GEMINI.md/INSTRUCTIONS.md、有 AGENTS.md（含完整指引）
2. 既有 GEMINI.md/INSTRUCTIONS.md 重跑 init 后内容与 mtime 不变
3. init 系测试套件 + doc-ref-check + docs gate（≤52）全绿
