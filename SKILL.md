---
name: sillyspec
description: "规范驱动开发工具包。绿地项目用 /sillyspec:init，棕地项目用 /sillyspec:scan。可用命令：init、scan、explore、brainstorm、plan、execute、verify、archive、status、resume、continue、quick、workspace。"
version: "2.0.0"
---

# SillySpec v2.0

融合 Superpowers + OpenSpec + GSD，14 个真实 slash commands。

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

## 15 个命令

| 命令 | 用途 |
|---|---|
| `/sillyspec:init` | 绿地项目初始化 |
| `/sillyspec:scan` | 棕地项目扫描（7 份文档） |
| `/sillyspec:explore` | 自由思考模式 |
| `/sillyspec:brainstorm` | 需求探索+规范生成 |
| `/sillyspec:plan` | 实现计划 |
| `/sillyspec:execute` | TDD 执行 |
| `/sillyspec:verify` | 验证（可选） |
| `/sillyspec:archive` | 归档 |
| `/sillyspec:status` | 查看进度 |
| `/sillyspec:continue` | 自动下一步 |
| `/sillyspec:handoff` | 保存状态 |
| `/sillyspec:resume` | 恢复工作 |
| `/sillyspec:quick` | 快速模式 |
| `/sillyspec:workspace` | 多项目工作区管理（add/remove/status） |
