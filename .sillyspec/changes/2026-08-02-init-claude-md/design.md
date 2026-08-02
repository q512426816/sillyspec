---
scale: small
tier: self
author: qinyi
created_at: 2026-08-02
---

# 设计文档（Design）— init 为 Claude Code 生成 CLAUDE.md

## 背景

`sillyspec init` 当前对 Claude Code 的支持不完整：`detectTools` 能检测 `.claude` 目录、`doInstall` 会把 sillyspec-* skills 复制到 `.claude/skills/`，但**不生成 `CLAUDE.md`**——而 CLAUDE.md 是 Claude Code 在项目里读取工程纪律/流程约定的主入口。相比之下，codex/gemini/opencode 都会通过 `INSTRUCTION_TOOLS` + `injectInstructions` 注入 AGENTS.md/GEMINI.md/INSTRUCTIONS.md。claude 缺这一环，导致新项目用 Claude Code 时拿不到 SillySpec 的流程纪律。

此外，现有 `injectInstructions` 只靠 `## SillySpec` 文本标记判幂等，**不带版本信息**：重复 init 同版本也会走"标记存在→跳过"，但无法区分"同版本已注入"与"旧版本注入待升级"；且无法在文件里体现是哪个 SillySpec 版本生成的。

## 设计目标

1. `sillyspec init` 选中 Claude Code 时，自动在项目根生成 `CLAUDE.md`（通用工程纪律模板）。
2. 模板从 sillyspec 自身 CLAUDE.md 提炼，**去掉** dogfood / npm 发布 / multi-agent-platform / sillyspec 自身约束 / 汇报格式段，**保留**通用核心规则 + 流程。
3. 注入策略三态对齐 `injectInstructions` 骨架：新文件写完整模板 / 已存在无标记追加简短段 / 已存在有标记按版本判定。
4. **版本感知幂等**：写入内容带 `SillySpec v{版本}` 标记；重复 init 同版本 → 跳过不写；升级（版本不同）→ 受管块刷新或提示。
5. 模板存 `templates/claude-instruction.md`，init.js 运行时读取（非硬编码）。

## 非目标（Non-Goals）

- **不做 Cursor**：`.cursor/rules/*.mdc` 带 frontmatter（description/globs/alwaysApply），与 CLAUDE.md 单文件结构不同，留后续变更单独设计。
- **不改 codex/gemini/opencode 现有注入逻辑**：三工具继续走 `INSTRUCTION_TOOLS` + `## SillySpec` 文本标记（改其标记方案会破坏既有安装的幂等检测，导致重复追加）。版本感知本变更**仅 claude**。
- **不内置个性化汇报格式**：通用模板面向公共 npm 用户，`爸爸~爸爸~` 是个人称呼，整段去掉（各项目自定）。
- **不自动升级覆盖完整模板**：用户生成 CLAUDE.md 后会自由编辑，升级时只提示、不自动覆盖。

## 拆分判断

单模块（cli-entry / init）、3 文件、无 schema/状态机/API 变更，无需批量模式、无需拆分子变更。规模 small，brainstorm 后转 `quick --linked-changes` 执行。

## 总体方案

### 方案选型：A — claude 独立注入函数（已确认）

claude **不**加入 `INSTRUCTION_TOOLS`（保持现有三工具循环零改动），单独写 `injectClaudeInstructions(projectDir)`。理由：claude 是唯一需要 FULL 模板的工具，独立函数让差异显式化；与现有 `skillToolDirs`/`detectTools` 对 claude 的分治特殊处理同一模式；最小爆炸半径、最低回归风险。

### 版本感知幂等设计

版本来源：复用 `getVersion()`（init.js 已有，读 package.json）。

managed 内容带版本标记，两种模式标记形态不同：

**完整模板态（新文件，整文件即模板）**
顶部一行版本注释（轻量，不限制编辑）：
```
<!-- SillySpec v3.25.6 — 由 sillyspec init 生成，可自由编辑；重跑 init 同版本不更新 -->
{模板正文}
```

**追加态（已存在 CLAUDE.md，追加受管段）**
用版本块标记包裹（受管段，明确"勿手动编辑此段"）：
```
<!-- SillySpec v3.25.6 START — 由 sillyspec init 注入，勿手动编辑此段 -->
{INJECTION_CONTENT 复用}
<!-- SillySpec END -->
```

**三态判定（版本感知）**：
1. `CLAUDE.md` 不存在 → 写完整模板（带顶部版本注释）。
2. 文件存在，无任何 `<!-- SillySpec v` 标记 → 追加受管段（带版本块标记）。
3. 文件存在，命中 `<!-- SillySpec v(\S+)` 标记：
   - 提取版本 == 当前版本 → **跳过**（同版本幂等，不写）。
   - 提取版本 != 当前版本（升级）：
     - 追加态（有 `START...END` 块）→ 用当前版本的受管段**替换该块**（刷新，块外用户内容保留）。
     - 完整模板态（仅顶部注释、无块）→ **不自动覆盖**，stderr 打印升级提示（避免覆盖用户改动）；提示文案：「SillySpec 升级 vX→vY，CLAUDE.md 未自动更新（保留你的改动）。如需采用新模板：备份后删除 CLAUDE.md 再跑 sillyspec init。」

> 该版本感知逻辑**仅作用于 claude**。codex/gemini/opencode 维持现 `## SillySpec` 标记的"有则跳过"行为（本变更不动）。

### 调用点

`doInstall` 中，现有「注入指令文件（codex/gemini/opencode）」循环之后、skills 复制之前，加：
```js
if (tools.includes('claude')) {
  injectClaudeInstructions(projectDir);
}
```

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | `templates/claude-instruction.md` | 通用 CLAUDE.md 模板（提炼自 sillyspec 自身 CLAUDE.md，去 dogfood/npm/multi-agent/汇报格式段；正文不带版本注释，版本注释由 init.js 注入时动态拼） |
| 修改 | `src/init.js` | 新增 `injectClaudeInstructions(projectDir)`（版本感知三态 + 块标记）；`doInstall` 加调用点 |
| 新增 | `test/init-claude-injection.test.mjs` | 四态覆盖：新文件写全文 / 追加受管段 / 同版本跳过 / 升级刷新块 + 完整态升级仅提示 |

## 接口定义

```js
// src/init.js（新增，function 声明，getVersion 可直接调用）
// ⚠️ export 导出（与 getVersion/cleanupRuntimeResidue 同列），供 test/ 直接单测
// （既有 init 测试不直接 import init，导出是最干净的可测路径，无 cmdInit 重依赖）

/**
 * 为 Claude Code 注入 CLAUDE.md（版本感知幂等）。
 * - 不存在：写完整模板（templates/claude-instruction.md）+ 顶部版本注释
 * - 存在无标记：追加受管段（INJECTION_CONTENT）+ 版本块标记
 * - 存在同版本标记：跳过
 * - 存在异版本标记：追加态刷新块 / 完整态仅提示
 * @param {string} projectDir - 源码项目根
 */
export function injectClaudeInstructions(projectDir) { ... }
```

模板路径常量（与现有 `templates/workflows` 读取同模式，init.js:209）：
```js
const CLAUDE_TEMPLATE_PATH = join(__dirname, '..', 'templates', 'claude-instruction.md');
```

标记常量：
```js
const SILLYSPEC_VERSION_RE = /<!-- SillySpec v(\S+)(?:\s+(full|START))?/;
// 完整态顶部注释：`<!-- SillySpec v{ver} — 由 sillyspec init 生成... -->`
// 追加态块：`<!-- SillySpec v{ver} START -->` ... `<!-- SillySpec END -->`
```

> 不涉及生命周期契约（session/lease/agent_run/daemon/lifecycle/state_transition/claim/heartbeat 均无）。

## 数据模型

无。本变更不涉及 sillyspec.db / 任何表结构 / SQLite schema。`getVersion()` 仅读 package.json。

## 兼容策略（brownfield）

- **未选 claude 工具**：行为零变化（`tools.includes('claude')` 为假，不调用）。
- **现有三工具注入**：完全不动 `INSTRUCTION_TOOLS` / `INSTRUCTION_FILE_MAP` / `injectInstructions`，codex/gemini/opencode 行为与既有安装一致。
- **既有项目已有 CLAUDE.md（非 SillySpec 生成）**：命中"存在无标记 → 追加受管段"，原内容保留，不覆盖。
- **既有项目 CLAUDE.md 是旧版 SillySpec 生成（无版本标记，仅有 `## SillySpec` 文本）**：claude 此前根本不生成 CLAUDE.md，故不存在该历史态；若用户手动加过 `## SillySpec`，按"无 `<!-- SillySpec v` 标记"处理 → 追加受管段（可接受，幂等后续重跑同版本跳过）。
- 回退路径：删除 CLAUDE.md 重跑 init 即可重建。

## 风险登记

| 编号 | 风险 | 等级 | 应对 |
|---|---|---|---|
| R-01 | 模板文件未随 npm 发布，运行时找不到 | P1 | `templates/` 已随包发布（workflows/prompts 先例，init.js:209 已运行时读取）；测试断言 `existsSync(CLAUDE_TEMPLATE_PATH)` |
| R-02 | 版本块正则跨平台/换行失配（CRLF） | P1 | 正则用 `[^\n]*`/dotall 谨慎处理；读写统一不加 CRLF 干预（writeFileSync 用模板原样字节）；测试覆盖 CRLF 场景 |
| R-03 | 升级时完整模板态用户已深度编辑，提示文案误导 | P2 | 文案明确"保留你的改动 + 手动重建路径"，不自动覆盖 |
| R-04 | 追加态升级刷新误删块外用户内容 | P2 | 仅替换 `START...END` 之间内容，块外字节原样保留；测试断言块外内容不变 |
| R-05 | 模板内容与 sillyspec 自身 CLAUDE.md 双写漂移 | P2 | templates/claude-instruction.md 是独立通用模板，不是 sillyspec 自身 CLAUDE.md 的镜像；execute 时一次性提炼，后续各自演进 |

## 决策追踪

- **D-001@v1 范围只做 Claude、不做 Cursor**：来自需求澄清（Cursor `.mdc` 结构不同，留后续）。覆盖 FR-06。
- **D-002@v1 去掉汇报格式段**：来自需求澄清（公共模板不含个人称呼 `爸爸~爸爸~`）。覆盖 FR-05。
- **D-003@v1 方案 A 独立注入函数**：来自方案对比（最小爆炸半径，不碰现有三工具）。覆盖 FR-01/FR-02。
- **D-004@v1 版本感知仅 claude**：本设计决策（改三工具标记方案会破坏既有安装幂等检测）；扩到全工具为后续事项。覆盖 FR-03/FR-04。

## 自审（Self-Review）

- [x] 文件变更清单 3 项，均落在 init 模块 + templates/，无跨模块涟漪。
- [x] 三态 + 版本感知四分支均有测试覆盖（含 CRLF、块外保留、升级提示）。
- [x] 兼容策略覆盖"未选 claude / 三工具不动 / 既有 CLAUDE.md / 回退"四路径。
- [x] 无生命周期契约关键词命中，无需契约表。
- [x] 无 schema 变更，不涉及 migration。
- [x] 版本来源复用 getVersion()，无新增依赖。
- [x] 模板存 templates/，npm 发布已覆盖（R-01）。
- [x] 跨平台：路径 join、正则换行、字节原样写入均有应对（R-02）。
- [x] scale=small / tier=self（≤3 文件、单模块），自审通过，无需独立审查子代理。
