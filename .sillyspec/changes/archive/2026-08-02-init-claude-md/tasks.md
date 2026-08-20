---
author: qinyi
created_at: 2026-08-02
scale: small
---

# 任务清单（Tasks）— init 为 Claude Code 生成 CLAUDE.md

> scale=small，实现路径：`sillyspec run quick --linked-changes 2026-08-02-init-claude-md`。
> quick 按本文档 + design.md 执行；--done 前须 `npm test` + `npm run lint`。

## 实现任务

- [ ] **T1：提炼通用模板** — 新增 `templates/claude-instruction.md`
  - 从 sillyspec 自身 `CLAUDE.md` 提炼：保留项目说明（通用版）+ 核心规则（依据先行/完整流程/quick/执行顺序/判规模/B 模式/实证核验/进度存储/文档验收/禁改测试/hook 不跳过/跨平台/任务隔离/quicklog 精修/多 agent 并行/不奉承）
  - 去掉：multi-agent-platform 文件迁移段、dogfood 项目说明、规则 14（worktree cwd）/18/19（sillyspec 自身约束）、「文件生命周期文档同步」「提示词文档同步」整段、npm 发布状态、**汇报格式段**
  - 模板正文**不含**版本注释（版本由 init.js 写入时拼）；不含 `爸爸~爸爸~`

- [ ] **T2：src/init.js 加注入函数** — 版本感知幂等三态四分支
  - 新增 `export function injectClaudeInstructions(projectDir)`
  - 版本：`getVersion()`（已存在，init.js:325）
  - 模板路径常量：`join(__dirname, '..', 'templates', 'claude-instruction.md')`
  - 标记：完整态 `<!-- SillySpec v{ver} — 由 sillyspec init 生成，可自由编辑；重跑 init 同版本不更新 -->`；追加态 `<!-- SillySpec v{ver} START — ...勿手动编辑此段 -->` ... `<!-- SillySpec END -->`
  - 三态四分支：不存在→写完整模板；存在无标记→追加受管段（复用 INJECTION_CONTENT）；同版本标记→跳过；异版本→追加态替换块 / 完整态仅 stderr 提示
  - 检测正则：`/<!-- SillySpec v(\S+)(\s+START)?/`，`START` 区分追加态
  - `doInstall` 调用点：现有「注入指令文件」循环之后、skills 复制之前，`if (tools.includes('claude')) injectClaudeInstructions(projectDir)`
  - claude **不**加入 `INSTRUCTION_TOOLS`（三工具循环不变）

- [ ] **T3：测试** — 新增 `test/init-claude-injection.test.mjs`
  - import `{ injectClaudeInstructions }` from `../src/init.js`
  - 用临时目录 + mkdtemp，每用例独立 CLAUDE.md
  - 用例：①无文件→写全文（断言含核心规则、不含 `爸爸~爸爸~`、顶部版本注释）②有文件无标记→追加受管段（原文保留、块标记存在）③同版本标记→不改写（内容/mtime 不变）④异版本追加态→块刷新（块外内容保留）⑤异版本完整态→不覆盖 + 提示（捕获 stderr/console.error）⑥CRLF 文件兼容

- [ ] **T4：验证** — `npm test` + `npm run lint` 全绿

- [ ] **T5：文档同步核查**
  - 本变更不动 `src/stages/*`、`src/run.js`、`src/progress.js` → `file-lifecycle.md` 无需同步（核查确认）
  - 不动 `src/stages/*.js` prompt / `src/run/prompt.js` → `docs/prompt/` 无需同步（核查确认）
  - 不涉及 SillySpec SKILLS 变更 → `.claude/skills/` 无需同步
  - 若 quicklog 需登记，--done 后手动精修

## 依赖与顺序

T1（模板）→ T2（代码，依赖模板路径）→ T3（测试，依赖导出）→ T4（验证）→ T5（文档核查）。无并行需求，单 agent 顺序执行。
- [x] ql-20260802-001-b6d8 init 为 Claude Code 生成 CLAUDE.md（版本感知三态四分支注入）
