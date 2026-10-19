---
author: flow-machine-draft
created_at: 2026-10-19T02:39:15.721Z
---
# 需求规格（Requirements）— 2026-10-19-init-drop-gemini-opencode

> 范围修正（用户 2026-10-19 口头澄清）：去掉的是 GEMINI.md / INSTRUCTIONS.md 两份文件的生成，不是 gemini/opencode 工具类型——VALID_TOOLS、交互列表、detectTools 检测、.opencode/skills 复制全部保留。

## 功能需求

### FR-01: init 不再生成/注入 GEMINI.md 与 INSTRUCTIONS.md

- init 必须不再创建或改写项目根的 GEMINI.md / INSTRUCTIONS.md：`INSTRUCTION_TOOLS`/`INSTRUCTION_FILE_MAP` 常量与 `injectInstructions` 导出必须整体删除，`--tool gemini` / `--tool opencode` 选中后项目根必须不出现这两份文件；既有文件必须不迁移不清理（字节不动）。

#### 场景：选中 gemini/opencode 跑 init

- Given 一个空项目目录
- When 执行 `sillyspec init <dir> --tool gemini,opencode --no-skills`
- Then 项目根不出现 GEMINI.md 与 INSTRUCTIONS.md

### FR-02: gemini/opencode 的指引落点统一并到 AGENTS.md

- 选中 gemini 或 opencode 时，SHOULD 与 claude/codex/zcode 走同一 `injectAgentsInstructions` 注入 AGENTS.md（同源同全文）——OpenCode 原生读 AGENTS.md（官方 Rules 文档口径）；Gemini CLI 现仍默认 GEMINI.md、AGENTS.md 未全面原生，此落点对 gemini 是可查规则源而非自动加载面（用户可自行在 GEMINI.md 引用），该边界必须写进 file-lifecycle。

#### 场景：--tool gemini 单选

- Given 一个空项目目录
- When 执行 `sillyspec init <dir> --tool gemini --no-skills`
- Then AGENTS.md 生成且含完整指引模板；GEMINI.md 不生成

### FR-03: 相关测试与文档（README/file-lifecycle/scan）同步，测试面跑绿

- 测试面必须同步：init-tool-multi 增「gemini,opencode 选中不产两文件、产 AGENTS.md」断言、init-agents-injection 删 Cases 12-14（GEMINI/INSTRUCTIONS 注入用例）；README 工具表、file-lifecycle 指令文件条目、scan/PROJECT.md、platform-interface-map 与 CONVENTIONS 行号锚必须同步，改后 doc-ref-check 必须全绿、docs gate 失效数不得超过棘轮基线 52。

### FR-04: 边界：工具类型与检测面不动

- VALID_TOOLS 七值、交互多选列表、detectTools 的 GEMINI.md/INSTRUCTIONS.md 检测分支、skillToolDirs 的 opencode 映射、交互横幅必须保持变更前行为；src/agent-session-log.js 的 opencode 会话探测器（loose 档）及其测试/文档必须完全不触碰。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/init-tool-multi.test.mjs「Test 5: --tool gemini,opencode → 不产 GEMINI.md/INSTRUCTIONS.md」
FR-02: test/init-tool-multi.test.mjs「Test 5 同场景断言 AGENTS.md 生成」
FR-03: test/init-agents-injection.test.mjs「Cases 12-14 删除后全绿」+ test/doc-ref-check.test.mjs「platform-interface-map 锚全绿」
FR-04: 不适用：保留面零代码变更即无新测试面；既有 init-zcode-skills（检测信号）与 agent-session-log 套件随回归跑绿即保障
