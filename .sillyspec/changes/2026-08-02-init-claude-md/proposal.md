---
author: qinyi
created_at: 2026-08-02
---

# 提案书（Proposal）— init 为 Claude Code 生成 CLAUDE.md

## 动机

`sillyspec init` 对 Claude Code 的支持不完整：能检测 `.claude` 目录、复制 sillyspec-* skills 到 `.claude/skills/`，但**不生成 `CLAUDE.md`**——而 CLAUDE.md 是 Claude Code 读取项目工程纪律/流程约定的主入口。新项目用 Claude Code 时拿不到 SillySpec 的流程纪律，与 codex/gemini/opencode（均注入指引文件）体验不对等。

## 关键问题

1. **claude 指引缺失**：codex→AGENTS.md、gemini→GEMINI.md、opencode→INSTRUCTIONS.md 都有，唯独 claude 没有 CLAUDE.md。`INSTRUCTION_TOOLS` 故意只列三者，claude 仅检测不生成。
2. **注入无版本信息、不幂等于升级**：现有 `injectInstructions` 仅靠 `## SillySpec` 文本标记判"已注入"，不带版本。重复 init 同版本虽跳过，但 SillySpec 升级后无法识别"旧版本待刷新"，也无法在文件里体现生成版本。
3. **sillyspec 自身 CLAUDE.md 不能直接当通用模板**：含 dogfood（"本项目用 SillySpec 自身管理"）、npm 发布状态、multi-agent-platform 文件迁移、`爸爸~爸爸~` 个人汇报格式等，注入公共项目不合适。

## 变更范围

- 新增 `templates/claude-instruction.md`：从 sillyspec 自身 CLAUDE.md 提炼的**通用**工程纪律模板（去 dogfood/npm/multi-agent/汇报格式段，保留核心规则 + 流程）。
- `src/init.js` 新增 `injectClaudeInstructions(projectDir)`（导出）：版本感知幂等三态四分支；`doInstall` 里 `tools.includes('claude')` 时调用。claude 不进 `INSTRUCTION_TOOLS`，现有三工具注入零改动。
- 新增 `test/init-claude-injection.test.mjs`：四态覆盖（新文件写全文 / 追加受管段 / 同版本跳过 / 升级刷新块 + 完整态仅提示）。

## 不在范围内（显式清单）

- **不做 Cursor**：`.cursor/rules/*.mdc` 带 frontmatter，结构不同，留后续变更。
- **不改 codex/gemini/opencode 注入逻辑**：改其标记方案会破坏既有安装幂等检测。
- **不内置汇报格式段**：公共模板不含个人称呼，各项目自定。
- **不自动升级覆盖完整模板**：用户生成后会自由编辑，升级仅提示。

## 成功标准（可验证）

- S1：`sillyspec init` 选中 claude 且项目无 CLAUDE.md → 生成含通用核心规则的 CLAUDE.md（不含 `爸爸~爸爸~`、不含 dogfood/multi-agent），顶部带 `SillySpec v{版本}` 注释。
- S2：已有 CLAUDE.md 无 SillySpec 标记 → 追加受管段，原内容保留。
- S3：重复 init 同版本 → CLAUDE.md 不被改写（mtime/内容不变）。
- S4：升级（异版本）追加态 → 受管块刷新，块外用户内容保留；完整态 → 不覆盖，stderr 给升级提示。
- S5：未选 claude / 现有三工具 → 行为零变化。
- S6：`npm test` + `npm run lint` 通过。
