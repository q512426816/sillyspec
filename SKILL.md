---
name: sillyspec
description: "规范驱动开发工具包 v3.6。绿地项目用 /sillyspec:init，棕地项目用 /sillyspec:scan。可用命令：init、scan、scan-quick、explore、brainstorm、plan、execute、verify、archive、commit、export、status、resume、continue、quick、state、workspace、workspace-sync。"
version: "3.6.1"
---

# SillySpec v3.6

融合 Superpowers + OpenSpec + GSD，从"你说要啥"到"代码能跑"的完整流程。
Claude Code / Cursor / Codex / OpenCode / OpenClaw 都能用。

## 入口选择

| 项目类型 | 首选命令 |
|---|---|
| 全新项目（空目录） | `/sillyspec:init` |
| 已有代码的项目 | `/sillyspec:scan` |
| 多项目工作区 | `/sillyspec:workspace` |
| 随时自由思考 | `/sillyspec:explore` |

## 完整工作流

```
绿地：init → brainstorm → plan → execute → [verify] → archive
棕地：scan → brainstorm → plan → execute → [verify] → archive
工作区：workspace → (init/scan per project) → brainstorm → ...
```

## 19 个命令

### 核心流程

| 命令 | 用途 |
|---|---|
| `/sillyspec:init` | 绿地项目初始化 |
| `/sillyspec:scan` | 棕地项目扫描（7 份文档） |
| `/sillyspec:brainstorm` | 需求探索 + 生成设计文档 |
| `/sillyspec:plan` | 编写实现计划（Wave 分组） |
| `/sillyspec:execute` | TDD 执行 + 子代理并行 |
| `/sillyspec:verify` | 验证（测试 + 代码审查 + E2E） |
| `/sillyspec:archive` | 归档变更 |

### 辅助工具

| 命令 | 用途 |
|---|---|
| `/sillyspec:status` | 查看项目进度和状态 |
| `/sillyspec:continue` | 自动判断并执行下一步 |
| `/sillyspec:explore` | 自由思考模式 |
| `/sillyspec:quick` | 快速任务，跳过完整流程 |
| `/sillyspec:resume` | 恢复工作 |
| `/sillyspec:state` | 查看当前工作状态 |
| `/sillyspec:commit` | 智能提交 |
| `/sillyspec:export` | 导出成功方案为可复用模板 |
| `/sillyspec:scan-quick` | 快速扫描（STACK + STRUCTURE） |
| `/sillyspec:workspace` | 多项目工作区管理 |
| `/sillyspec:workspace-sync` | 同步工作区子项目状态 |

## CLI 命令

```bash
sillyspec status [--json]    显示当前项目状态
sillyspec next [--json]      显示下一步命令
sillyspec check [--json]     检查文档完整性
sillyspec setup              安装推荐 MCP 工具
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
plan: 识别 UI 功能 → 检测测试框架/浏览器 MCP → 添加 E2E 任务
execute: 编码完成后编写 E2E 测试（测试文件或 e2e-steps.md）
verify: 按优先级执行（E2E框架 > 通用测试 > 浏览器MCP）→ 自动修复循环
```
