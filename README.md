<p align="center">
  <img src="logo.jpg" width="96" />
</p>

<h1 align="center">SillySpec</h1>

<p align="center">规范驱动开发工具包 · 流程状态机，让 AI 严格按步骤来</p>

<p align="center">
  融合 Superpowers + OpenSpec + GSD，从「你说要啥」到「代码能跑」的完整流程<br>
  兼容 Claude Code / Cursor / Codex / OpenCode / OpenClaw / Gemini
</p>

<p align="center">
  📖 <a href="https://sillyspec.ppdmq.top/">在线文档</a> &nbsp;·&nbsp; 🐙 <a href="https://github.com/q512426816/sillyspec">GitHub</a>
</p>

---

> 💡 **核心理念：Code is Cheap, Context is Expensive.**
>
> 文档是核心资产，代码是文档的产物。没有文档就没有代码——文档是 AI 的记忆，是团队协作的基础，是后续维护的唯一依据。

## 它解决什么问题

AI agent（Claude Code / Cursor 等）直接上手编码时，容易跳过需求澄清、方案设计、任务拆解这些关键步骤，产出偏离预期、且无法审计。

SillySpec 把一个变更的完整生命周期固化为一组**强制阶段**——每个阶段都有明确的入口契约、产物文件名和门禁校验，AI 必须按状态机推进，不能跳步、不能偷工。进度、决策、产物全部持久化到 SQLite，可审计、可回溯、可断点恢复。

## 快速开始

需要 Node.js >= 18，一条命令完成初始化：

```bash
npx sillyspec init
```

首次运行会自动安装 CLI，并检测你正在使用的 AI 工具。之后 `/sillyspec:brainstorm`、`sillyspec progress show` 等命令即可直接使用。

**指定 AI 工具：**

| 工具 | `--tool` | 产物位置 |
|---|---|---|
| Claude Code（推荐） | `claude` | `.claude/skills/sillyspec-*/` |
| Cursor | `cursor` | `.cursor/skills/sillyspec-*/` |
| OpenAI Codex | `codex` | `AGENTS.md` |
| OpenCode | `opencode` | `INSTRUCTIONS.md` |
| OpenClaw | `openclaw` | `.openclaw/skills/sillyspec-*/` |
| Gemini | `gemini` | `GEMINI.md` |

```bash
npx sillyspec init --tool claude      # 指定工具
npx sillyspec init --workspace        # 多项目工作区模式
npx sillyspec init --dir /path/to/x   # 指定项目目录
npx sillyspec init --interactive      # 完整引导
```

> 💡 启动 AI 时推荐使用跳过权限模式（如 `claude --dangerously-skip-permissions`）。SillySpec 会频繁执行 git、文件读写、校验脚本等操作，逐个批准会打断节奏——这也是 GSD / OpenSpec 的预期使用方式。

## 从哪里开始

| 场景 | 命令 |
|---|---|
| 全自动，一句话到代码 | `/sillyspec:auto <需求描述>` |
| 全新项目（空目录） | `/sillyspec:init` |
| 已有代码的项目 | `/sillyspec:scan` |
| 多项目工作区 | `/sillyspec:workspace` |
| 随时自由思考 | `/sillyspec:explore "想法"` |

## 完整工作流

```
绿地：init  → brainstorm → plan → execute → [verify] → archive
棕地：scan  → brainstorm → plan → execute →  verify  → archive
全自动：auto（自动推进全部阶段，支持用户确认门控）
大模块：brainstorm（多图）→ 拆分 → MASTER.md → 逐 stage 全流程 → archive
```

**也可以跳过完整流程：**

- 小改动：`/sillyspec:quick "修复 xxx"`
- 不确定做什么：`/sillyspec:explore`
- 中断恢复：`/sillyspec:resume`
- 不知道下一步：`/sillyspec:continue`

## 命令一览

### 核心流程

| 命令 | 用途 |
|---|---|
| `/sillyspec:init` | 绿地项目：深度提问 → 需求文档 → 路线图 |
| `/sillyspec:scan` | 棕地项目：扫描代码库，生成 7 份架构文档 + 模块映射 |
| `/sillyspec:brainstorm` | 需求探索 + 规范生成：产出 design.md + tasks.md |
| `/sillyspec:plan` | 实现计划：文件路径 + 任务描述 + Wave 拓扑分组 |
| `/sillyspec:execute` | TDD 执行：子代理并行 + worktree 隔离 |
| `/sillyspec:verify` | 验证：对照规范 + 测试套件 + 代码审查 + E2E |
| `/sillyspec:archive` | 归档：规范沉淀到 knowledge/ |
| `/sillyspec:auto` | 全自动推进全部阶段 |

### 辅助工具

| 命令 | 用途 |
|---|---|
| `/sillyspec:status` · `/sillyspec:state` | 查看进度 / 当前工作状态 |
| `/sillyspec:continue` | 自动判断并执行下一步 |
| `/sillyspec:explore` | 自由思考：画图、讨论、调研 |
| `/sillyspec:quick` | 快速模式：跳过完整流程 |
| `/sillyspec:resume` | 恢复工作（支持大模块阶段进度） |
| `/sillyspec:doctor` | 项目自检与状态修复 |
| `/sillyspec:commit` | 智能提交 |
| `/sillyspec:workspace` | 多项目工作区管理 |
| `/sillyspec:export` | 导出成功方案为可复用模板 |

## CLI 命令

```bash
sillyspec run <stage>            执行阶段（auto/brainstorm/plan/execute/verify/archive/scan/quick/explore）
sillyspec run <stage> --done     完成当前步骤并推进到下一步
sillyspec run <stage> --status   查看阶段进度
sillyspec progress show          显示当前项目状态
sillyspec init                   初始化（零交互，自动检测工具）
sillyspec setup                  安装推荐 MCP 工具（交互式）
sillyspec setup --list           查看已安装 MCP 状态
sillyspec doctor                 全量自检 + 修复进度
```

## 核心特性

- **规范驱动** — 所有代码产出先有设计文档支撑，文档是 AI 的记忆
- **阶段状态机** — 以 stage + step 粒度强制流转，gate-status + progress.db 双轨记录状态
- **TDD 强制** — execute 阶段先写测试再写实现
- **子代理并行** — 同一 Wave 内任务并行执行，加快交付
- **Worktree 隔离** — execute 在独立 git worktree 中工作，不污染主分支
- **拓扑排序 Wave** — plan 阶段按蓝图依赖关系自动重排 Wave 分组
- **进度持久化** — SQLite（sql.js WASM）持久化，支持断点恢复
- **模块文档** — 模块级知识库，AI 执行时按需加载相关上下文
- **E2E 验证** — 内置 E2E 测试流程，支持 Playwright / 浏览器 MCP，跨会话自动修复
- **平台同步** — 可选对接 SillyHub，文档同步 + 团队审批

## 可靠性保障

SillySpec 不只是 prompt，还有硬校验兜底：

- **锚定确认** — 各阶段执行前必须逐个确认读过规范文件
- **Hard Gate 自检** — 关键命令生成文件后强制自检格式，不通过则修正
- **postcheck 识别偷懒** — 自动识别占位符、fallback、未分析等 AI 偷懒模式
- **校验脚本** — shell 脚本自动化验证 AI 输出（validate-proposal/plan/scan/all）
- **归档确认** — archive 操作前展示内容等待用户确认

## 防幻觉机制

| 环节 | 机制 |
|---|---|
| scan | 强制扫描代码库结构 / 约定 / 集成 / 测试 / 债务，生成 7 份文档 |
| brainstorm | 必须读 ARCHITECTURE.md 数据模型，支持原型图分析 |
| execute | 写代码前强制读现有源码，禁止编造方法调用 |
| 全流程 | postcheck + 校验脚本兜底 |

## MCP 增强

通过 `sillyspec setup` 一键安装 MCP 工具，增强 AI 能力：

- **Context7** — 查询最新库文档和 API 参考
- **grep.app** — 搜索开源代码实现
- **Chrome DevTools** — 浏览器自动化，支持 E2E 验证

## 目录结构

```
sillyspec/
├── bin/sillyspec.js          # CLI 入口（shebang）
├── src/
│   ├── index.js              # 命令分发
│   ├── run.js                # 阶段状态机引擎
│   ├── init.js / setup.js    # 初始化 + MCP 工具安装
│   ├── progress.js / db.js   # SQLite 进度存储
│   ├── sync.js               # SillyHub 平台同步
│   ├── workflow.js           # 工作流编排 + postcheck
│   ├── worktree*.js          # worktree 隔离执行
│   ├── hooks/                # worktree 守卫等钩子
│   └── stages/               # 各阶段定义（scan/brainstorm/plan/execute/verify/...）
├── templates/workflows/      # 工作流定义（scan-docs / archive-impact）
├── test/                     # 原生 node:test 测试套件
├── packages/dashboard/       # 独立可视化面板子包
├── SKILL.md                  # 技能描述
└── README.md
```

## 致谢

- [Superpowers](https://github.com/obra/superpowers) — 工程纪律
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) — 需求管理
- [GSD](https://github.com/gsd-build/get-shit-done) — 上下文工程

## License

MIT
