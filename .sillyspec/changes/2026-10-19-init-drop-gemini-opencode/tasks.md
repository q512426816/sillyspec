---
author: flow-machine-draft
created_at: 2026-10-19T02:39:15.721Z
---
# 任务注册表（Tasks）— 2026-10-19-init-drop-gemini-opencode

- [x] task-01: src/init.js 收缩——删 INSTRUCTION_TOOLS/INSTRUCTION_FILE_MAP/injectInstructions 与 doInstall 注入循环、AGENTS.md 注入条件扩含 gemini/opencode、TOOL_LABELS 去文件后缀、injectFullInstructions 注释同步；验证：动态 import init.js 无报错 + grep 无 injectInstructions 残留
- [ ] task-02: 测试同步——init-tool-multi 增 Test 5（gemini,opencode 选中：不产 GEMINI.md/INSTRUCTIONS.md、产 AGENTS.md）、init-agents-injection 删 Cases 12-14 与 import；验证：两套件单跑全绿
- [ ] task-03: 文档同步——README 工具表两行、file-lifecycle 条目改下线留痕、scan/PROJECT.md OpenCode 行、platform-interface-map 与 CONVENTIONS 行号锚重定位；验证：doc-ref-check 全绿 + docs gate 失效数 ≤52
- [ ] task-04: 回归面全量验证——npm test 按变更推断面跑绿（init 系套件 + FR 关联回归）
