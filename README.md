<p align="center">
  <img src="logo.jpg" width="80" />
</p>

# SillySpec v3.0 — 规范驱动开发工具包

> 融合 Superpowers + OpenSpec + GSD，从"你说要啥"到"代码能跑"的完整流程。
> Claude Code / Cursor / Codex / OpenCode / OpenClaw 都能用。
>
> 📖 **在线文档**：https://sillyspec.ppdmq.top/

## 安装

需要 Node.js >= 18。所有平台一条命令：

```bash
npx sillyspec init
```

> 📦 首次运行自动安装 CLI，之后 `sillyspec status`/`sillyspec next` 等命令也可直接使用。

**指定工具：**
```bash
npx sillyspec init --tool claude
npx sillyspec init --tool cursor
npx sillyspec init --tool openclaw
```

**工作区模式（多项目）：**
```bash
npx sillyspec init --workspace
```

**指定目录：**
```bash
npx sillyspec init --dir /path/to/project
```

### 支持的 AI 工具

| 工具 | `--tool` 参数 | 输出目录 | 格式 |
|---|---|---|---|
| Claude Code (commands) | `claude` | `.claude/commands/sillyspec/` | slash commands |
| Claude Code (skills) | `claude_skills` | `.claude/skills/sillyspec-<name>/` | SKILL.md |
| Cursor | `cursor` | `.cursor/commands/` | custom commands |
| Codex | `codex` | `~/.agents/skills/sillyspec-<name>/` | SKILL.md |
| OpenCode | `opencode` | `.opencode/skills/sillyspec-<name>/` | SKILL.md |
| OpenClaw | `openclaw` | `.openclaw/skills/sillyspec-<name>/` | SKILL.md |

安装后重新打开终端，启动 Claude Code：

```bash
claude --dangerously-skip-permissions
```

> 💡 **推荐使用跳过权限模式。** SillySpec 的命令会频繁执行 `git commit`、文件读写、校验脚本等操作，停下来 50 次批准会失去意义。这是 GSD 和 OpenSpec 的预期使用方式。

## 入口选择

```
绿地项目（空目录）：/sillyspec:init
棕地项目（有代码）：/sillyspec:scan
随时自由思考：      /sillyspec:explore "想法"
大模块（多页面）：  /sillyspec:brainstorm（直接贴原型图）
```

## 完整工作流

```
绿地：init → brainstorm → plan → execute → [verify] → archive
棕地：scan → brainstorm → plan → execute → [verify] → archive
大模块：brainstorm(多图) → 拆分 → MASTER.md → stage-1 全流程 → stage-2 全流程 → ... → archive
```

### 也可以跳过

- 小 bug：`/sillyspec:quick "修复 xxx"`
- 不确定要做什么：`/sillyspec:explore "想法"`
- 中断恢复：`/sillyspec:resume`
- 不知道下一步：`/sillyspec:continue`

## 命令列表

### 核心流程

| 命令 | 用途 |
|---|---|
| `/sillyspec:init` | 绿地项目：深度提问→需求→路线图 |
| `/sillyspec:scan` | 棕地项目：交互式引导扫描，生成代码库文档 |
| `/sillyspec:brainstorm` | 需求探索+规范生成：直接产出 design.md + tasks.md |
| `/sillyspec:plan` | 实现计划：文件路径+任务描述+Wave 分组 |
| `/sillyspec:execute` | TDD 执行：子代理并行+用户自选确认频率 |
| `/sillyspec:verify` | 验证（可选）：对照规范+测试套件+代码审查+E2E |
| `/sillyspec:archive` | 归档：规范沉淀到 knowledge/ |

### 辅助工具

| 命令 | 用途 |
|---|---|
| `/sillyspec:status` | 查看进度 |
| `/sillyspec:continue` | 自动下一步 |
| `/sillyspec:explore` | 自由思考：画图、讨论、调研 |
| `/sillyspec:quick` | 快速模式：跳过完整流程 |
| `/sillyspec:commit` | 智能提交 |
| `/sillyspec:state` | 查看当前工作状态 |
| `/sillyspec:resume` | 恢复工作：支持大模块阶段进度 |
| `/sillyspec:workspace` | 工作区管理：多项目子项目 |
| `/sillyspec:export` | 导出成功方案为可复用模板 |

## CLI 命令

```bash
sillyspec status [--json]    显示当前项目状态
sillyspec next [--json]      显示下一步命令
sillyspec check [--json]     检查文档完整性
sillyspec setup              安装推荐 MCP 工具（交互式）
sillyspec setup --list       查看已安装 MCP 状态
sillyspec init               初始化（零交互，自动检测工具）
sillyspec init --tool <name> 指定工具安装
sillyspec init --workspace   工作区模式
sillyspec init --interactive 交互式引导
```

## MCP 增强

通过 `sillyspec setup` 安装 MCP 工具增强 AI 能力：

- **Context7** — 查询最新库文档和 API 参考
- **grep.app** — 搜索开源代码实现
- **Chrome DevTools** — 浏览器自动化，支持 E2E 验证

## E2E 测试流程

```
plan:  识别 UI 功能 → 检测测试能力（E2E框架 > 通用测试 > 浏览器MCP）→ 添加 E2E 任务
execute: 编码完成后编写 E2E 测试（测试文件或 e2e-steps.md）
verify: 按优先级执行 → 用户确认修复策略 → 自动修复循环（quick）→ 结果记录
```

自动修复支持跨会话：测试结果持久化在 `.sillyspec/local.yaml`，按变更名隔离。

## 可靠性保障

SillySpec 不仅仅是 prompt，还有硬校验：

- **锚定确认** — brainstorm/plan/execute/verify 执行前必须逐个确认读过规范文件
- **Hard Gate 自检** — 关键命令生成文件后强制自检格式，不通过则修正
- **校验脚本** — shell 脚本可自动化验证 AI 输出（validate-proposal/plan/scan/all）
- **框架隐形规则扫描** — scan 阶段自动检测多租户/逻辑删除/审计字段/实体基类，写入 CONVENTIONS.md
- **实体继承规范扫描** — 新建表时必须包含基类所有字段，防止 Unknown column
- **归档确认** — archive 操作前展示内容等待用户确认

## 防幻觉机制

| 环节 | 机制 |
|---|---|
| scan | 强制扫描数据库 schema + 框架隐形规则 + 实体基类字段 |
| brainstorm | 必须读 ARCHITECTURE.md 数据模型，支持原型图分析 |
| execute | 写代码前强制读现有源码，禁止编造方法调用 |
| 全流程 | shell 校验脚本兜底 |

## 目录结构

```
sillyspec/
├── bin/sillyspec.js              # CLI 入口
├── src/
│   ├── index.js                  # status/next/check 命令
│   ├── init.js                   # init 逻辑 + 工具适配器
│   └── setup.js                  # MCP 工具安装
├── templates/                    # 命令模板（19 个）
├── SKILL.md                      # 技能描述
└── README.md
```

## 致谢

- [Superpowers](https://github.com/obra/superpowers) — 工程纪律
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) — 需求管理
- [GSD](https://github.com/gsd-build/get-shit-done) — 上下文工程

## License

MIT
