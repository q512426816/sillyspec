# 安装指南

## 系统要求

- **Node.js** >= 18
- 支持 macOS / Linux / Windows

## 安装

```bash
npm i -g sillyspec@latest
```

> 💡 **强烈推荐全局安装。** `npx` 方式虽然能跑，但每次有额外下载开销，且可能出现命令找不到的问题。

## 升级

```bash
npm i -g sillyspec@latest
```

就这么简单，覆盖安装即可。

## 支持的 AI 工具

| 工具 | `--tool` 参数 | 输出目录 | 格式 |
|------|---------------|----------|------|
| Claude Code (commands) | `claude` | `.claude/commands/sillyspec/` | slash commands |
| Claude Code (skills) | `claude_skills` | `.claude/skills/sillyspec-<name>/` | SKILL.md |
| Cursor | `cursor` | `.cursor/commands/` | custom commands |
| Codex | `codex` | `~/.agents/skills/sillyspec-<name>/` | SKILL.md |
| OpenCode | `opencode` | `.opencode/skills/sillyspec-<name>/` | SKILL.md |
| OpenClaw | `openclaw` | `.openclaw/skills/sillyspec-<name>/` | SKILL.md |

## init 选项

```bash
sillyspec init                    # 自动检测工具
sillyspec init --tool claude      # 指定工具
sillyspec init --workspace        # 工作区模式（多项目）
sillyspec init --interactive      # 交互式引导
sillyspec init --dir /path/to    # 指定目录
```

## MCP 增强

安装推荐的 MCP 工具（如 Playwright、文件搜索等）：

```bash
sillyspec setup          # 安装
sillyspec setup --list   # 查看已安装状态
```
