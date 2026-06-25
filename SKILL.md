---
name: sillyspec
description: "规范驱动开发工具包。绿地用 /sillyspec:init，棕地用 /sillyspec:scan，全自动用 /sillyspec:auto。完整流程：scan → brainstorm → plan → execute → verify → archive。支持 TDD、子代理并行、worktree 隔离、E2E 验证。兼容 Claude Code / Cursor / Codex / OpenCode / OpenClaw。"
---

# SillySpec

从"你说要啥"到"代码能跑"的规范驱动开发工具包。
Claude Code / Cursor / Codex / OpenCode / OpenClaw 通用。

## 快速开始

| 场景 | 命令 |
|---|---|
| 全自动流程 | `/sillyspec:auto <需求描述>` |
| 全新项目（空目录） | `/sillyspec:init` |
| 已有代码的项目 | `/sillyspec:scan` |
| 多项目工作区 | `/sillyspec:workspace` |
| 自由思考 | `/sillyspec:explore` |

## 完整工作流

```
绿地：init → brainstorm → plan → execute → verify → archive
棕地：scan → brainstorm → plan → execute → verify → archive
全自动：auto（自动推进全部阶段，支持用户确认门控）
```

## 核心命令

| 命令 | 用途 |
|---|---|
| `/sillyspec:auto` | 全自动推进全部流程 |
| `/sillyspec:init` | 绿地项目初始化 |
| `/sillyspec:scan` | 棕地项目扫描（生成 7 份文档） |
| `/sillyspec:brainstorm` | 需求探索 + 生成设计文档 |
| `/sillyspec:plan` | 编写实现计划（Wave 分组 + 拓扑排序） |
| `/sillyspec:execute` | TDD 执行 + 子代理并行 |
| `/sillyspec:verify` | 验证（测试 + 代码审查 + E2E） |
| `/sillyspec:archive` | 归档变更 |

## 辅助命令

| 命令 | 用途 |
|---|---|
| `/sillyspec:status` | 查看项目进度和状态 |
| `/sillyspec:continue` | 自动判断并执行下一步 |
| `/sillyspec:explore` | 自由思考模式 |
| `/sillyspec:quick` | 快速任务，跳过完整流程 |
| `/sillyspec:resume` | 恢复工作 |
| `/sillyspec:doctor` | 项目自检 |
| `/sillyspec:commit` | 智能提交 |
| `/sillyspec:export` | 导出成功方案为可复用模板 |
| `/sillyspec:workspace` | 多项目工作区管理 |

## CLI 命令

```bash
sillyspec run auto            全自动推进全部流程
sillyspec run scan            执行代码扫描阶段
sillyspec run brainstorm      执行需求探索阶段
sillyspec run plan            执行实现计划阶段
sillyspec run execute         执行开发阶段（子代理并行 + worktree 隔离）
sillyspec run verify          执行验证阶段
sillyspec run archive         执行归档阶段
sillyspec run quick           快速任务
sillyspec run explore         自由探索
sillyspec progress show       显示当前项目状态
sillyspec setup               安装推荐 MCP 工具
sillyspec init                初始化（零交互，自动检测工具）
```

## 核心特性

- **规范驱动** — 所有代码产出先有设计文档支撑，文档是 AI 的记忆
- **TDD 强制** — execute 阶段强制先写测试再写实现
- **子代理并行** — 同一 Wave 内任务并行执行，加快交付
- **Worktree 隔离** — execute 在独立 worktree 中工作，不污染主分支
- **拓扑排序 Wave** — plan 阶段根据蓝图依赖关系自动重排 Wave 分组
- **E2E 验证** — 内置 E2E 测试流程，支持 Playwright / 浏览器 MCP
- **模块文档** — 支持模块级知识库，AI 执行时按需加载相关模块上下文
- **进度管理** — SQLite 持久化进度，断点恢复
- **MCP 增强** — 一键安装 Context7、grep.app、Chrome DevTools

## MCP 工具

```bash
sillyspec setup              安装全部推荐 MCP
sillyspec setup --list       查看已安装 MCP 状态
```
